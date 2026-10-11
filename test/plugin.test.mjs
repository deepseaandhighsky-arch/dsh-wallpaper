import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = await readFile(resolve(root, 'client.js'), 'utf8');
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));

function storage() {
  const data = new Map();
  return {
    data,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, String(value)); },
  };
}

// Minimal asynchronous IDB transaction stub. Write batches commit together
// after all requests finish, and failed requests abort the entire batch.
// This is NOT a replacement for a real Chromium storage integration test.
function fakeIndexedDB() {
  const data = new Map();
  const faults = { nextWrite: false, nextDelete: false, cannotOpen: false };
  let storeCreated = false;
  const db = {
    objectStoreNames: { contains: () => storeCreated },
    createObjectStore: () => { storeCreated = true; },
    close() {},
    transaction(_storeName, mode) {
      assert.equal(storeCreated, true);
      const draft = new Map(data);
      let pending = 0;
      let failed = false;
      let completionQueued = false;
      const tx = {
        error: null,
        abort() { failed = true; this.onabort?.(); },
        objectStore() {
          function makeRequest(operation, operationKind) {
            const request = { error: null, result: undefined };
            pending++;
            queueMicrotask(() => {
              if (failed) return;
              try {
                if ((operationKind === 'put' && faults.nextWrite)
                  || (operationKind === 'delete' && faults.nextDelete)) {
                  faults.nextWrite = false;
                  faults.nextDelete = false;
                  throw new Error('Simulated IDB write failure');
                }
                request.result = operation();
                request.onsuccess?.();
                pending--;
                if (!pending && !completionQueued) {
                  completionQueued = true;
                  queueMicrotask(() => {
                    if (failed) return;
                    if (mode === 'readwrite') {
                      data.clear();
                      for (const [k, v] of draft) data.set(k, v);
                    }
                    tx.oncomplete?.();
                  });
                }
              } catch (error) {
                request.error = error;
                tx.error = error;
                failed = true;
                tx.onabort?.();
              }
            });
            return request;
          }
          return {
            get: key => makeRequest(() => draft.get(key), 'get'),
            put: (record, key) => {
              assert.equal(mode, 'readwrite');
              return makeRequest(() => { draft.set(key, record); return key; }, 'put');
            },
            delete: key => {
              assert.equal(mode, 'readwrite');
              return makeRequest(() => { draft.delete(key); return undefined; }, 'delete');
            },
          };
        },
      };
      return tx;
    },
  };
  return {
    data,
    faults,
    open() {
      if (faults.cannotOpen) throw new Error('Simulated IDB open failure');
      const request = { result: db, error: null };
      queueMicrotask(() => {
        if (!storeCreated) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };
}

function mount({ indexedDB = fakeIndexedDB(), localStorage = storage() } = {}) {
  let moduleDef;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    Fragment: Symbol('Fragment'),
    useSyncExternalStore: (_subscribe, get) => get(),
    useState: init => [typeof init === 'function' ? init() : init, () => {}],
    useRef: init => ({ current: init }),
    useEffect: () => {},
  };
  const window = {
    __ModuleLoader__: { load(module) { moduleDef = module; } },
    indexedDB,
    localStorage,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  };
  vm.runInNewContext(script, { window, Blob, File, URL, Promise, console }, { filename: 'client.js' });
  assert.equal(moduleDef.id, manifest.name);
  const module = moduleDef.factory(name => {
    if (name === 'react') return React;
    if (name === 'react-dom') return { createPortal: children => children };
    throw new Error(`Unexpected external module: ${name}`);
  });
  const slots = new Map();
  const locales = new Map();
  let language = 'zh';
  const disposers = [];
  module.apply({
    effect(callback) {
      const dispose = callback();
      if (typeof dispose === 'function') disposers.push(dispose);
    },
    locale: {
      register(namespace, dictionaries) {
        locales.set(namespace, dictionaries);
        return () => locales.delete(namespace);
      },
      bind(namespace) {
        return key => locales.get(namespace)?.[language]?.[key] ?? key;
      },
    },
    slots: {
      inject(_name, callback) { callback(); },
      register(options, Component) {
        slots.set(options.name, { options, Component });
        return () => slots.delete(options.name);
      },
    },
  });
  const settings = slots.get('settings.section');
  const element = settings.Component({ t: key => key });
  const controller = element.props.controller;
  return {
    controller,
    slots,
    locales,
    setLanguage: value => { language = value; },
    dispose: () => { for (const d of disposers.reverse()) d(); },
  };
}
const settled = () => new Promise(resolve => setImmediate(resolve));
const image = (name = 'wallpaper.png') => new File([Uint8Array.of(137, 80, 78, 71)], name, { type: 'image/png' });
const video = (name = 'motion.mp4') => new File([new Uint8Array(300)], name, { type: 'video/mp4' });

test('v0.3 rc.7 manifest and shipped bundle paths follow DSH loader contract', async () => {
  assert.equal(manifest.version, '0.3.0-rc.7');
  assert.equal(manifest.type, 'module');
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(manifest.dsh.client.platform, 'web');
  assert.equal(manifest.dsh.client.immediately, true);
  assert.equal(manifest.exports['./client'], './client.js');
  for (const filename of ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg']) {
    assert.ok((await readFile(resolve(root, filename))).length > 0);
  }
  for (const locale of ['zh', 'en']) {
    const doc = JSON.parse(await readFile(resolve(root, `locale/${locale}.json`), 'utf8'));
    assert.ok(doc.meta.title);
    assert.ok(doc.meta.description);
  }
  assert.match(await readFile(resolve(root, 'cordis.patch.yml'), 'utf8'), /name: '@local\/dsh-video-wallpaper'/);
  assert.ok((await readdir(root)).includes('README.md'));
});

test('registers a standalone settings section and a separate background overlay', async () => {
  const rt = mount();
  await settled();
  assert.equal(rt.slots.get('shell.overlay').options.id, 'local-video-wallpaper');
  const section = rt.slots.get('settings.section');
  assert.equal(section.options.name, 'settings.section');
  assert.equal(section.options.id, 'wallpaper');
  assert.equal(section.options.order, 5);
  assert.equal(section.options.locale, 'local.video-wallpaper');
  assert.equal(section.options.children, undefined);
  assert.equal(rt.slots.has('settings.general.item'), false);
  assert.ok(rt.locales.get('local.video-wallpaper').zh.image);
  assert.ok(rt.locales.get('local.video-wallpaper').en.video);
  assert.equal(rt.controller.getSnapshot().ready, true);
  assert.equal(rt.controller.getSnapshot().mode, 'off');
  rt.dispose();
});

test('settings left navigation label follows locale without re-registering', () => {
  const rt = mount();
  const section = rt.slots.get('settings.section');
  const label = section.options.label;
  assert.equal(typeof label, 'function');
  assert.equal(label(), '壁纸背景');
  rt.setLanguage('en');
  assert.equal(label(), 'Wallpaper background');
  assert.equal(rt.slots.get('settings.section'), section);
  rt.dispose();
});

test('standalone settings entry depends on the official Settings shell', () => {
  assert.deepEqual(manifest.dsh.client.inject, [
    '@deepseek-ai/dsh-client-ui-layout',
    '@deepseek-ai/dsh-client-ui-settings-general',
  ]);
  assert.doesNotMatch(script, /ctx\.slots\.inject\('settings\.general\.item'/);
});

test('saves and restores independent image and video files', async () => {
  const idb = fakeIndexedDB();
  const prefs = storage();
  const first = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  const img = image();
  const clip = video();
  await first.controller.chooseFile('image', img);
  assert.equal(first.controller.getSnapshot().mode, 'image');
  await first.controller.chooseFile('video', clip);
  assert.equal(first.controller.getSnapshot().mode, 'video');
  assert.equal(first.controller.getSnapshot().media.image.name, 'wallpaper.png');
  assert.equal(first.controller.getSnapshot().media.video.name, 'motion.mp4');
  assert.equal(idb.data.get('image').blob, img);
  assert.equal(idb.data.get('video').blob, clip);
  first.dispose();

  const second = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  assert.equal(second.controller.getSnapshot().mode, 'video');
  assert.equal(second.controller.getSnapshot().media.image.name, 'wallpaper.png');
  assert.equal(second.controller.getSnapshot().media.video.name, 'motion.mp4');
  second.controller.setOption('mode', 'image');
  assert.equal(second.controller.getSnapshot().media.video.name, 'motion.mp4');
  second.dispose();
});

test('mode off persists without deleting either saved wallpaper', async () => {
  const idb = fakeIndexedDB();
  const prefs = storage();
  const rt = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  await rt.controller.chooseFile('image', image());
  await rt.controller.chooseFile('video', video());
  rt.controller.setOption('mode', 'off');
  assert.equal(rt.controller.getSnapshot().mode, 'off');
  assert.equal(idb.data.size, 2);
  rt.dispose();
  const restored = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  assert.equal(restored.controller.getSnapshot().mode, 'off');
  assert.ok(restored.controller.getSnapshot().media.image);
  assert.ok(restored.controller.getSnapshot().media.video);
  restored.dispose();
});

test('image input refuses GIF, SVG, text, empty blobs, and mismatched MIME', async () => {
  const rt = mount();
  await settled();
  await rt.controller.chooseFile('image', image());
  for (const file of [
    new File(['GIF89a'], 'animated.gif', { type: 'image/gif' }),
    new File(['<svg/>'], 'vector.svg', { type: 'image/svg+xml' }),
    new File(['note'], 'notes.txt', { type: 'text/plain' }),
    new File(['spoof'], 'fake.png', { type: 'video/mp4' }),
  ]) {
    await rt.controller.chooseFile('image', file);
    assert.equal(rt.controller.getSnapshot().errorKey, 'invalidImage');
    assert.equal(rt.controller.getSnapshot().media.image.name, 'wallpaper.png');
  }
  await rt.controller.chooseFile('image', new File([], 'empty.png', { type: 'image/png' }));
  assert.equal(rt.controller.getSnapshot().errorKey, 'emptyFile');
  rt.dispose();
});

test('video input refuses an image and preserves previously saved video', async () => {
  const rt = mount();
  await settled();
  await rt.controller.chooseFile('video', video());
  await rt.controller.chooseFile('video', image());
  assert.equal(rt.controller.getSnapshot().errorKey, 'invalidVideo');
  assert.equal(rt.controller.getSnapshot().media.video.name, 'motion.mp4');
  rt.dispose();
});

test('settings clamp and persist both common image/video adjustments', async () => {
  const prefs = storage();
  const idb = fakeIndexedDB();
  const first = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  first.controller.setOption('blur', 999);
  first.controller.setOption('dim', -2);
  first.controller.setOption('opacity', 0);
  first.controller.setOption('tint', 3);
  first.controller.setOption('fit', 'not-valid');
  first.controller.setOption('paused', true);
  first.controller.setOption('mode', 'image');
  assert.equal(first.controller.getSnapshot().blur, 20);
  assert.equal(first.controller.getSnapshot().dim, 0);
  assert.equal(first.controller.getSnapshot().opacity, 0.15);
  assert.equal(first.controller.getSnapshot().tint, 0.96);
  assert.equal(first.controller.getSnapshot().fit, 'cover');
  first.dispose();
  const second = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  assert.equal(second.controller.getSnapshot().paused, true);
  assert.equal(second.controller.getSnapshot().mode, 'image');
  assert.equal(second.controller.getSnapshot().blur, 20);
  assert.equal(second.controller.getSnapshot().opacity, 0.15);
  second.dispose();
});

test('removing active image turns the wallpaper off, retaining the video', async () => {
  const idb = fakeIndexedDB();
  const rt = mount({ indexedDB: idb });
  await settled();
  await rt.controller.chooseFile('video', video());
  await rt.controller.chooseFile('image', image());
  await rt.controller.removeFile('image');
  assert.equal(rt.controller.getSnapshot().mode, 'off');
  assert.equal(rt.controller.getSnapshot().media.image, null);
  assert.ok(rt.controller.getSnapshot().media.video);
  assert.equal(idb.data.has('image'), false);
  assert.equal(idb.data.has('video'), true);
  rt.dispose();
});

test('removing inactive wallpaper preserves the current mode and media', async () => {
  const idb = fakeIndexedDB();
  const rt = mount({ indexedDB: idb });
  await settled();
  await rt.controller.chooseFile('image', image());
  await rt.controller.chooseFile('video', video());
  await rt.controller.removeFile('image');
  assert.equal(rt.controller.getSnapshot().mode, 'video');
  assert.ok(rt.controller.getSnapshot().media.video);
  rt.dispose();
});

test('upgrades saved v0.1 video and preferences without deleting image data', async () => {
  const idb = fakeIndexedDB();
  const prefs = storage();
  const legacyClip = video('legacy.mp4');
  idb.data.set('wallpaper', { blob: legacyClip, name: legacyClip.name });
  prefs.setItem('dsh-local-video-wallpaper-prefs-v1', JSON.stringify({
    enabled: true, dim: .33, blur: 4, paused: true, fit: 'contain', tint: .72,
  }));
  const first = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  const state = first.controller.getSnapshot();
  assert.equal(state.media.video.name, 'legacy.mp4');
  assert.equal(state.mode, 'video');
  assert.equal(state.paused, true);
  assert.equal(state.blur, 4);
  assert.equal(state.dim, .33);
  assert.equal(idb.data.has('wallpaper'), false);
  assert.equal(idb.data.get('video').name, 'legacy.mp4');
  assert.ok(prefs.getItem('dsh-local-video-wallpaper-prefs-v2'));
  first.dispose();
  const second = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  assert.equal(second.controller.getSnapshot().media.video.name, 'legacy.mp4');
  second.dispose();
});

test('v0.1 disabled preference migrates to off, even with video', async () => {
  const idb = fakeIndexedDB();
  const prefs = storage();
  const clip = video();
  idb.data.set('wallpaper', { blob: clip, name: clip.name });
  prefs.setItem('dsh-local-video-wallpaper-prefs-v1', JSON.stringify({ enabled: false }));
  const rt = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  assert.equal(rt.controller.getSnapshot().mode, 'off');
  assert.ok(rt.controller.getSnapshot().media.video);
  rt.dispose();
});

test('legacy video does not revive after deletion or replacement', async () => {
  const idb = fakeIndexedDB();
  const prefs = storage();
  const clip = video('old.mp4');
  idb.data.set('wallpaper', { blob: clip, name: clip.name });
  const rt = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  await rt.controller.removeFile('video');
  assert.equal(idb.data.has('video'), false);
  assert.equal(idb.data.has('wallpaper'), false);
  rt.dispose();
  const restart = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  assert.equal(restart.controller.getSnapshot().media.video, null);
  restart.dispose();
});

test('failed persistence keeps both prior files and the active mode untouched', async () => {
  const idb = fakeIndexedDB();
  const rt = mount({ indexedDB: idb });
  await settled();
  await rt.controller.chooseFile('image', image('wallpaper.png'));
  idb.faults.nextWrite = true;
  await rt.controller.chooseFile('image', image('replacement.png'));
  assert.equal(rt.controller.getSnapshot().errorKey, 'saveFailed');
  assert.equal(rt.controller.getSnapshot().media.image.name, 'wallpaper.png');
  assert.equal(idb.data.get('image').name, 'wallpaper.png');
  idb.faults.nextDelete = true;
  await rt.controller.removeFile('image');
  assert.equal(rt.controller.getSnapshot().errorKey, 'removeFailed');
  assert.equal(rt.controller.getSnapshot().media.image.name, 'wallpaper.png');
  rt.dispose();
});

test('no IndexedDB keeps image/video independently in memory', async () => {
  const rt = mount({ indexedDB: null });
  await settled();
  assert.equal(rt.controller.getSnapshot().persistent, false);
  await rt.controller.chooseFile('image', image());
  await rt.controller.chooseFile('video', video());
  assert.equal(rt.controller.getSnapshot().media.image.name, 'wallpaper.png');
  assert.equal(rt.controller.getSnapshot().media.video.name, 'motion.mp4');
  await rt.controller.removeFile('video');
  assert.equal(rt.controller.getSnapshot().media.video, null);
  assert.ok(rt.controller.getSnapshot().media.image);
  rt.dispose();
});

test('controller disposal ignores asynchronous storage completions', async () => {
  const rt = mount();
  await settled();
  const action = rt.controller.chooseFile('image', image());
  const stateAtDisposal = rt.controller.getSnapshot();
  rt.dispose();
  await action;
  assert.strictEqual(rt.controller.getSnapshot(), stateAtDisposal);
  // A disposed controller must not publish the delayed media write.
  assert.equal(rt.controller.getSnapshot().media.image, null);
});

test('image + video rendering shares a React portal and cleans up object URLs', () => {
  assert.match(script, /createPortal\(/);
  assert.match(script, /closest\('\[data-shell-overlay\]'\)/);
  assert.match(script, /h\('img'/);
  assert.match(script, /h\('video'/);
  assert.match(script, /URL\.createObjectURL\(/);
  assert.match(script, /URL\.revokeObjectURL\(/);
  assert.match(script, /visibilitychange/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(script, /:where\(:has\(> \[data-dsh-vw-stage\]\)\)/);
  assert.doesNotMatch(script, /\bfetch\s*\(|XMLHttpRequest|sendBeacon/);
  assert.doesNotMatch(script, /require\(['"]@deepseek-ai\/dsh-client-ui-primitives['"]\)/);
});


test('diagnostics report background mounting and media failures without mutating preferences', async () => {
  const idb = fakeIndexedDB();
  const rt = mount({ indexedDB: idb });
  await settled();
  await rt.controller.chooseFile('image', image());
  const initial = rt.controller.getSnapshot();
  assert.deepEqual(JSON.parse(JSON.stringify(initial.runtime)), {
    overlay: false, frame: false, stage: false, media: 'idle', mainSurface: '',
  });
  rt.controller.setRuntime('overlay', true);
  rt.controller.setRuntime('frame', true);
  rt.controller.setRuntime('stage', true);
  rt.controller.setRuntime('media', 'ready');
  const state = rt.controller.getSnapshot();
  assert.equal(state.runtime.overlay, true);
  assert.equal(state.runtime.frame, true);
  assert.equal(state.runtime.stage, true);
  assert.equal(state.runtime.media, 'ready');
  assert.equal(state.mode, 'image');
  rt.dispose();
});

test('diagnostic display is independent of mode and settings surface renders preview mount', async () => {
  const rt = mount();
  await settled();
  await rt.controller.chooseFile('image', image());
  const row = rt.slots.get('settings.section');
  const slotElement = row.Component({ t: key => key });
  const tree = slotElement.type(slotElement.props);
  const types = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    types.push(node.type);
    if (Array.isArray(node.children)) node.children.forEach(walk);
  }
  walk(tree);
  assert.ok(types.some(t => t && t.name === 'MediaPreview'));
  assert.match(script, /data-dsh-vw-diagnostic/);
  assert.match(script, /runtimeNoSlot/);
  assert.match(script, /runtimeNoFrame/);
  assert.match(script, /PLUGIN_VERSION = '0.3.0-rc.7'/);
  rt.dispose();
});

test('static wallpaper UI opacity can be reduced below legacy 40 percent floor', async () => {
  const rt = mount();
  await settled();
  assert.equal(rt.controller.getSnapshot().tint, 0.35);
  rt.controller.setOption('tint', 0.12);
  assert.equal(rt.controller.getSnapshot().tint, 0.12);
  rt.dispose();
});


test('regional CSS targets actual DSH paint surfaces instead of slot wrappers', () => {
  // The chat root MUST be transparent or the header/body opacities stack.
  assert.match(script, /\[data-slot="main\.conversation"\] > \[data-phase\] \{\s+background: transparent !important;/);
  assert.match(script, /\[data-slot="main\.conversation"\] > \[data-phase\] > \[data-conversation-content\]/);
  assert.match(script, /\[data-slot="conversation\.header"\] > header/);
  assert.match(script, /\[data-slot="sidebar"\] > div/);
  assert.match(script, /\[data-composer-card\]/);
  assert.match(script, /\[data-composer-seat\]/);
  assert.match(script, /__DSH_VW_CHAT_ALPHA__/);
  assert.match(script, /__DSH_VW_SIDEBAR_ALPHA__/);
  assert.match(script, /__DSH_VW_HEADER_ALPHA__/);
  assert.match(script, /__DSH_VW_COMPOSER_ALPHA__/);
  assert.doesNotMatch(script, /\[class\*="centerCol"\] > :where\(div\)/);
});

test('test pattern is transient, works without a media file and keeps user content', async () => {
  const idb = fakeIndexedDB();
  const prefs = storage();
  const rt = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  assert.equal(rt.controller.getSnapshot().media.image, null);
  assert.equal(rt.controller.getSnapshot().testPattern, false);
  assert.equal(rt.controller.getSnapshot().mode, 'off');
  rt.controller.toggleTestPattern();
  assert.equal(rt.controller.getSnapshot().testPattern, true);
  assert.equal(rt.controller.getSnapshot().mode, 'off');
  assert.equal(idb.data.size, 0);
  assert.equal(prefs.data.size, 0);
  rt.controller.toggleTestPattern();
  assert.equal(rt.controller.getSnapshot().testPattern, false);
  rt.controller.toggleTestPattern();
  rt.controller.setOption('mode', 'image');
  assert.equal(rt.controller.getSnapshot().testPattern, false);
  assert.equal(idb.data.size, 0);
  rt.dispose();
  const reopened = mount({ indexedDB: idb, localStorage: prefs });
  await settled();
  assert.equal(reopened.controller.getSnapshot().testPattern, false);
  reopened.dispose();
});

test('importing a media file disables temporary test pattern and preserves both formats', async () => {
  const rt = mount();
  await settled();
  rt.controller.toggleTestPattern();
  await rt.controller.chooseFile('image', image());
  assert.equal(rt.controller.getSnapshot().testPattern, false);
  assert.equal(rt.controller.getSnapshot().mode, 'image');
  rt.controller.toggleTestPattern();
  await rt.controller.chooseFile('video', video());
  assert.equal(rt.controller.getSnapshot().testPattern, false);
  assert.equal(rt.controller.getSnapshot().mode, 'video');
  assert.ok(rt.controller.getSnapshot().media.image);
  assert.ok(rt.controller.getSnapshot().media.video);
  rt.dispose();
});

test('test pattern uses media-free render gate and exposes paint diagnostics', () => {
  assert.match(script, /state\.testPattern \|\| \(media && src\)/);
  assert.match(script, /dsh-vw-pattern/);
  assert.match(script, /getComputedStyle\(root\)\.backgroundColor/);
  assert.match(script, /data-dsh-vw-paint/);
  assert.match(script, /mainSurface/);
  assert.match(script, /shellCssForRegions\(state\)/);
});

test('separate region paints avoid double layering, and disabling scene removes injected CSS', () => {
  assert.match(script, /:root \[data-slot="main\.conversation"\] > \[data-phase\]/);
  assert.match(script, /background: transparent !important;/);
  assert.match(script, /rgba\(255, 255, 255, __DSH_VW_CHAT_ALPHA__\)/);
  assert.match(script, /rgba\(255, 255, 255, __DSH_VW_HEADER_ALPHA__\)/);
  assert.match(script, /rgba\(255, 255, 255, __DSH_VW_COMPOSER_ALPHA__\)/);
  assert.match(script, /body\[data-ds-dark-theme\]/);
  assert.match(script, /rgba\(19, 21, 26, __DSH_VW_CHAT_ALPHA__\)/);
  assert.match(script, /frame && state\.ready && \(state\.testPattern \|\| \(media && src\)\)/);
  assert.match(script, /h\('style', \{ 'data-dsh-vw-styles': '' \}/);
});

test('regional alpha interpolation is complete, clamped, and separately controlled', () => {
  const cssMatch = script.match(/const SHELL_CSS = `([\s\S]*?)`;/);
  const formatterMatch = script.match(/function shellCssForRegions\(state\) \{[\s\S]*?\n    \}\n    const FORM_CSS/);
  assert.ok(cssMatch);
  assert.ok(formatterMatch);
  const source = formatterMatch[0].replace(/\n    const FORM_CSS$/, '');
  const frostMatch = script.match(/const FROST_CSS = `([\s\S]*?)`;/);
  assert.ok(frostMatch);
  const formatter = vm.runInNewContext(
    `(() => { const SHELL_CSS = ${JSON.stringify(cssMatch[1])};
      const FROST_CSS = ${JSON.stringify(frostMatch[1])};
      const clamp = (value, low, high, fallback) => Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;
      ${source}
      return shellCssForRegions;
    })()`,
  );
  const base = {regionChat: .2, regionSidebar: .9, regionHeader: .6, regionComposer: .95, testPattern:false};
  const css = formatter(base);
  assert.doesNotMatch(css, /__DSH_VW_/);
  assert.match(css, /rgba\(255, 255, 255, 0\.2\)/);
  assert.match(css, /rgba\(255, 255, 255, 0\.6\)/);
  assert.match(css, /rgba\(255, 255, 255, 0\.95\)/);
  assert.match(css, /--dsw-specific-sidebar-fill\) 90%/);
  const changed = formatter({ ...base, regionSidebar: 0 });
  assert.notEqual(css, changed);
  assert.match(changed, /--dsw-specific-sidebar-fill\) 0%/);
  assert.equal((css.match(/rgba\(255, 255, 255, 0\.2\)/g)||[]).length, 3);
  const pattern = formatter({ ...base, testPattern: true });
  assert.match(pattern, /rgba\(255, 255, 255, 0\.1\)/);
  assert.match(pattern, /--dsw-specific-sidebar-fill\) 90%/);
  assert.match(formatter({ ...base, regionComposer: 12 }), /rgba\(255, 255, 255, 1\)/);
});

test('region controls start at readable defaults, persist and clamp individually', async () => {
  const localStorage = storage();
  const idb = fakeIndexedDB();
  const first = mount({ localStorage, indexedDB: idb });
  await settled();
  const baseline = first.controller.getSnapshot();
  assert.equal(baseline.regionChat, 0.35);
  assert.equal(baseline.regionSidebar, 0.90);
  assert.equal(baseline.regionHeader, 0.35);
  assert.equal(baseline.regionComposer, 0.94);
  first.controller.setOption('regionChat', 0.17);
  first.controller.setOption('regionSidebar', 0.73);
  first.controller.setOption('regionHeader', 0.64);
  first.controller.setOption('regionComposer', 1.4);
  const edited = first.controller.getSnapshot();
  assert.equal(edited.regionChat, 0.17);
  assert.equal(edited.regionSidebar, 0.73);
  assert.equal(edited.regionHeader, 0.64);
  assert.equal(edited.regionComposer, 1);
  assert.equal(edited.tint, 0.17); // backward-compatible downgrade tint
  assert.equal(edited.opacity, baseline.opacity); // wallpaper media untouched
  first.dispose();
  const reopened = mount({ localStorage, indexedDB: idb });
  await settled();
  assert.equal(reopened.controller.getSnapshot().regionChat, 0.17);
  assert.equal(reopened.controller.getSnapshot().regionSidebar, 0.73);
  assert.equal(reopened.controller.getSnapshot().regionHeader, 0.64);
  assert.equal(reopened.controller.getSnapshot().regionComposer, 1);
  reopened.controller.resetRegions();
  assert.equal(reopened.controller.getSnapshot().regionChat, 0.35);
  assert.equal(reopened.controller.getSnapshot().regionSidebar, 0.90);
  assert.equal(reopened.controller.getSnapshot().regionHeader, 0.35);
  assert.equal(reopened.controller.getSnapshot().regionComposer, 0.94);
  reopened.dispose();
});

test('v0.2.x tint migration restores chat/header and protects sidebar + composer', async () => {
  const localStorage = storage();
  localStorage.setItem('dsh-local-video-wallpaper-prefs-v2', JSON.stringify({
    tint: 0.32, opacity: 0.4, dim: 0.11, blur: 4, fit: 'cover', mode: 'image',
  }));
  const rt = mount({ localStorage });
  await settled();
  const state = rt.controller.getSnapshot();
  assert.equal(state.regionChat, 0.32);
  assert.equal(state.regionHeader, 0.32);
  assert.equal(state.regionSidebar, 0.90);
  assert.equal(state.regionComposer, 0.94);
  assert.equal(state.opacity, 0.4);
  assert.equal(state.dim, 0.11);
  assert.equal(state.blur, 4);
  rt.controller.setOption('regionSidebar', .8);
  assert.equal(JSON.parse(localStorage.getItem('dsh-local-video-wallpaper-prefs-v2')).regionChat, .32);
  rt.dispose();
});

test('settings contains four independent labelled sliders plus reset control', async () => {
  const rt = mount();
  await settled();
  const section = rt.slots.get('settings.section');
  const tree = section.Component({ t: key => key });
  const content = tree.type(tree.props);
  const names = [];
  const sliderValues = {};
  function inspect(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'input' && node.props.type === 'range') {
      sliderValues[node.props['aria-label']] = node.props.value;
    }
    if (typeof node.type === 'string' && node.type === 'button') {
      names.push(node.children[0]);
    }
    for(const child of node.children || []) inspect(child);
  }
  inspect(content);
  assert.equal(sliderValues.regionChat, .35);
  assert.equal(sliderValues.regionSidebar, .9);
  assert.equal(sliderValues.regionHeader, .35);
  assert.equal(sliderValues.regionComposer, .94);
  assert.ok(names.includes('regionReset'));
  assert.equal(Object.hasOwn(sliderValues, 'tint'), false);
  rt.dispose();
});


test('sidebar workspace list fade is suppressed only during mounted wallpaper scene', () => {
  const css = script.match(/const SHELL_CSS = `([\s\S]*?)`;/);
  assert.ok(css);
  const selector = ':root [data-slot="sidebar.workspaces"] [class*="treeBody"] > span[class*="fade"]';
  assert.ok(css[1].includes(selector));
  const rule = css[1].slice(css[1].indexOf(selector));
  assert.match(rule, /^.*?\{\s*display: none !important;\s*\}/s);
  assert.doesNotMatch(css[1], /\[class\*="treeBody"\]\s*\{\s*display:\s*none/i);
  // Style insertion and cleanup remains gated by a loaded media/pattern scene.
  assert.match(script, /frame && state\.ready && \(state\.testPattern \|\| \(media && src\)\)/);
  assert.match(script, /h\('style', \{ 'data-dsh-vw-styles': '' \}/);
});

test('sidebar scrollbar remains usable with subtler hover-aware theme colors', () => {
  const css = script.match(/const SHELL_CSS = `([\s\S]*?)`;/);
  assert.ok(css);
  assert.match(css[1], /\[data-slot="sidebar\.workspaces"\] \[class\*="treeBody"\] > \[class\*="list"\] \{/);
  assert.match(css[1], /--dsh-scrollbar-thumb: color-mix\(/);
  assert.match(css[1], /--dsh-scrollbar-thumb-hover: color-mix\(/);
  assert.doesNotMatch(css[1], /scrollbar-width:\s*none/);
  assert.doesNotMatch(css[1], /overflow-y:\s*hidden/);
});


test('legacy wallpaper blur is unchanged; panel frost defaults off and persists separately', async () => {
  const localStorage = storage();
  localStorage.setItem('dsh-local-video-wallpaper-prefs-v2', JSON.stringify({
    mode: 'image', dim: 0.11, blur: 4, opacity: .40,
    tint: .32, regionChat: .27, regionHeader: .48, regionSidebar: .88, regionComposer: .96,
  }));
  const rt = mount({ localStorage });
  await settled();
  const prev = rt.controller.getSnapshot();
  assert.equal(prev.blur, 4);
  assert.equal(prev.panelBlur, 0);
  assert.equal(prev.regionChat, .27);
  rt.controller.setOption('panelBlur', 6);
  let value = rt.controller.getSnapshot();
  assert.equal(value.panelBlur, 6);
  assert.equal(value.blur, 4);
  assert.equal(value.opacity, .4);
  assert.equal(value.regionSidebar, .88);
  assert.equal(JSON.parse(localStorage.getItem('dsh-local-video-wallpaper-prefs-v2')).panelBlur, 6);
  rt.controller.setOption('panelBlur', 18);
  assert.equal(rt.controller.getSnapshot().panelBlur, 12);
  rt.controller.setOption('panelBlur', -3);
  assert.equal(rt.controller.getSnapshot().panelBlur, 0);
  rt.controller.setOption('panelBlur', 5);
  rt.dispose();
  const reloaded = mount({ localStorage });
  await settled();
  assert.equal(reloaded.controller.getSnapshot().panelBlur, 5);
  assert.equal(reloaded.controller.getSnapshot().blur, 4);
  reloaded.dispose();
});

test('settings exposes independent wallpaper and panel blur sliders', async () => {
  const rt = mount();
  await settled();
  const section = rt.slots.get('settings.section');
  const element = section.Component({ t: key => key });
  const tree = element.type(element.props);
  const sliders = {};
  const texts = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'input' && node.props.type === 'range') sliders[node.props['aria-label']] = node.props;
    if (typeof node.type === 'string') {
      for (const child of node.children || []) if (typeof child === 'string') texts.push(child);
    }
    for (const child of node.children || []) walk(child);
  }
  walk(tree);
  assert.equal(sliders.blur.value, 0);
  assert.equal(sliders.blur.max, 20);
  assert.equal(sliders.panelBlur.value, 0);
  assert.equal(sliders.panelBlur.max, 12);
  assert.ok(texts.includes('panelBlurHelp'));
  assert.notEqual(sliders.blur['aria-label'], sliders.panelBlur['aria-label']);
  rt.dispose();
});

test('frost material CSS is opt-in, region-scoped and never blurs text through filter', () => {
  const shell = script.match(/const SHELL_CSS = `([\s\S]*?)`;/);
  const frost = script.match(/const FROST_CSS = `([\s\S]*?)`;/);
  const impl = script.match(/function shellCssForRegions\(state\) \{[\s\S]*?\n    \}\n    const FORM_CSS/);
  assert.ok(shell); assert.ok(frost); assert.ok(impl);
  const render = vm.runInNewContext(`(() => {
    const SHELL_CSS=${JSON.stringify(shell[1])};
    const FROST_CSS=${JSON.stringify(frost[1])};
    const clamp=(v,lo,hi,fallback)=>Number.isFinite(Number(v))?Math.min(hi,Math.max(lo,Number(v))):fallback;
    ${impl[0].replace(/\n    const FORM_CSS$/, '')}
    return shellCssForRegions;
  })()`);
  const opts={regionChat:.3,regionSidebar:.9,regionHeader:.45,regionComposer:.94,panelBlur:0,testPattern:false};
  const off=render(opts);
  assert.doesNotMatch(off,/backdrop-filter\s*:/);
  const on=render({...opts,panelBlur:6});
  assert.match(on, /@supports \(/);
  assert.match(on, /backdrop-filter: blur\(6px\)/);
  assert.match(on, /-webkit-backdrop-filter: blur\(6px\)/);
  assert.ok(on.includes('[class*="sidebarCol"]::before'));
  assert.match(on, /\[class\*="sidebarCol"\]::before \{\s*content:\s*'';\s*position:\s*absolute;\s*inset:\s*0;\s*z-index:\s*-1;\s*pointer-events:\s*none;/);
  assert.doesNotMatch(on, /\[class\*="sidebarCol"\]\s*,/);
  assert.ok(on.includes('> [data-conversation-content]'));
  assert.ok(on.includes('> [data-slot="conversation.header"] > header'));
  assert.ok(on.includes('[data-composer-card]'));
  assert.doesNotMatch(on, /(?:^|\n)\s*filter:\s*blur\(/);
  assert.doesNotMatch(on, /__DSH_VW_/);
  assert.equal((on.match(/\bbackdrop-filter: blur\(6px\)/g) || []).length, 2);
  assert.match(render({...opts,panelBlur:999}), /backdrop-filter: blur\(12px\)/);
  assert.doesNotMatch(render({...opts,panelBlur:0}), /backdrop-filter\s*:/);
  // Both ImageSurface and VideoSurface preserve their geometry; media blur is
  // instead drawn as a separate sibling OVER the media but UNDER the dimmer.
  assert.doesNotMatch(script, /filter: `blur\(\$\{state\.blur\}px\)`/);
  assert.match(script, /className: 'dsh-vw-media-blur'/);
  assert.match(script, /backdropFilter: `blur\(\$\{state\.blur\}px\)`/);
  assert.doesNotMatch(script, /filter: `blur\(\$\{state\.panelBlur\}px\)`/);
  // Remove the portal and its style together when wallpaper is disabled.
  assert.match(script,/frame && state\.ready && \(state\.testPattern \|\| \(media && src\)\)/);
});

test('Windows fixed sidebar toggle stays viewport-positioned with independent frost layer', () => {
  const shell=script.match(/const SHELL_CSS = `([\s\S]*?)`;/);
  const frost=script.match(/const FROST_CSS = `([\s\S]*?)`;/);
  assert.ok(shell && frost);
  // Sidebar column remains positioned above the wallpaper so a negative-level
  // ::before cannot fall behind its background / the wallpaper layer.
  assert.match(shell[1], /:where\(:has\(> \[data-dsh-vw-stage\]\)\) > :where\(div:not\(\[data-dsh-vw-stage\]\)\) \{\s*position: relative;\s*z-index: 1;/);
  assert.match(frost[1], /\[class\*="sidebarCol"\]::before/);
  assert.match(frost[1], /pointer-events: none/);
  assert.match(frost[1], /z-index: -1/);
  assert.doesNotMatch(frost[1], /\[class\*="sidebarCol"\]\s*,/);
  assert.doesNotMatch(frost[1], /\[data-slot="sidebar"\] > div\s*\{/);
  assert.doesNotMatch(frost[1], /^\s*(?:transform|contain|filter|perspective)\s*:/m);
});

test('opacity terminology is mathematically consistent and legacy stored alpha remains unchanged', async () => {
  const prefs = storage();
  prefs.setItem('dsh-local-video-wallpaper-prefs-v2', JSON.stringify({
    mode:'image', opacity:.40, dim:.11, blur:4, tint:.32,
  }));
  const rt = mount({ localStorage:prefs });
  await settled();
  const x = rt.controller.getSnapshot();
  assert.equal(x.opacity, .40); // unchanged: opacity, NOT transparency
  assert.equal(x.regionChat, .32);
  assert.equal(x.regionHeader, .32);
  const { zh, en } = rt.locales.get('local.video-wallpaper');
  assert.equal(zh.opacity, '壁纸不透明度');
  assert.match(zh.opacityHelp, /100%.*完全不透明/);
  assert.match(zh.regionGroup, /不透明度/);
  assert.match(en.opacityHelp, /100%.*fully opaque/);
  assert.match(script, /opacity: state\.opacity/);
  assert.doesNotMatch(script, /opacity:\s*1\s*-\s*state\.opacity/);
  rt.dispose();
});

test('built-in looks only change visual controls; media, mode, pause and motion remain safe', async () => {
  const prefs = storage();
  const idb = fakeIndexedDB();
  const rt = mount({ localStorage:prefs,indexedDB:idb });
  await settled();
  const img = image('my-photo.png');
  const clip = video('my-video.mp4');
  await rt.controller.chooseFile('image',img);
  await rt.controller.chooseFile('video',clip);
  rt.controller.setOption('paused',true);
  rt.controller.setOption('allowReducedMotion',true);
  const original = rt.controller.getSnapshot();
  for(const [id,expected] of [
    ['reading',{opacity:.48,regionChat:.92,regionSidebar:.98,regionHeader:.94,
      regionComposer:.99,panelBlur:0,blur:8,dim:.08}],
    ['balanced',{opacity:.80,regionChat:.56,regionSidebar:.78,regionHeader:.62,
      regionComposer:.94,panelBlur:5,blur:2,dim:.08}],
    ['immersive',{opacity:1,regionChat:.22,regionSidebar:.34,regionHeader:.20,
      regionComposer:.80,panelBlur:0,blur:0,dim:0}],
  ]){
    rt.controller.applyPreset(`builtin:${id}`);
    const state = rt.controller.getSnapshot();
    for(const [k,v] of Object.entries(expected)) assert.equal(state[k],v);
    assert.equal(state.mode,'video');
    assert.equal(state.paused,true);
    assert.equal(state.allowReducedMotion,true);
    assert.equal(state.media.image.blob,img);
    assert.equal(state.media.video.blob,clip);
    assert.equal(state.selectedPresetId,`builtin:${id}`);
    assert.equal(JSON.parse(prefs.getItem('dsh-local-video-wallpaper-prefs-v2')).opacity,expected.opacity);
  }
  assert.equal(rt.controller.getSnapshot().compareBase.opacity,original.opacity);
  rt.dispose();
  const reopened = mount({indexedDB:idb,localStorage:prefs});
  await settled();
  assert.equal(reopened.controller.getSnapshot().opacity,1);
  assert.equal(reopened.controller.getSnapshot().media.video.blob,clip);
  assert.equal(reopened.controller.getSnapshot().media.image.blob,img);
  assert.equal(reopened.controller.getSnapshot().compareBase,null);
  reopened.dispose();
});

test('save, update, delete and restore multiple named custom presets without touching media', async () => {
  const prefs=storage(), idb=fakeIndexedDB();
  const rt=mount({localStorage:prefs,indexedDB:idb});
  await settled();
  await rt.controller.chooseFile('image',image('stay-here.png'));
  rt.controller.setOption('regionChat',.27);
  rt.controller.setOption('opacity',.53);
  const a=rt.controller.saveCustomPreset('  晚间 阅读  ');
  assert.match(a,/^vw_/);
  assert.equal(rt.controller.getSnapshot().customPresets[0].name,'晚间 阅读');
  rt.controller.setOption('regionChat',.65);
  const b=rt.controller.saveCustomPreset('日间');
  assert.match(b,/^vw_/);
  assert.notEqual(a,b);
  assert.equal(rt.controller.getSnapshot().customPresets.length,2);
  rt.controller.applyPreset(`custom:${a}`);
  assert.equal(rt.controller.getSnapshot().regionChat,.27);
  assert.equal(rt.controller.getSnapshot().opacity,.53);
  rt.controller.setOption('opacity',.77);
  rt.controller.updateCustomPreset(a);
  assert.equal(rt.controller.getSnapshot().customPresets.find(x=>x.id===a).values.opacity,.77);
  assert.equal(rt.controller.getSnapshot().customPresets.find(x=>x.id===b).values.opacity,.53);
  const img=rt.controller.getSnapshot().media.image.blob;
  rt.dispose();

  const again=mount({localStorage:prefs,indexedDB:idb});
  await settled();
  assert.equal(again.controller.getSnapshot().customPresets.length,2);
  again.controller.applyPreset(`custom:${a}`);
  assert.equal(again.controller.getSnapshot().opacity,.77);
  assert.equal(again.controller.getSnapshot().media.image.blob,img);
  again.controller.deleteCustomPreset(a);
  assert.equal(again.controller.getSnapshot().customPresets.length,1);
  assert.equal(again.controller.getSnapshot().customPresets[0].id,b);
  assert.equal(JSON.parse(prefs.getItem('dsh-local-video-wallpaper-custom-presets-v1')).length,1);
  again.dispose();
});

test('custom preset names cannot silently overwrite, preset limits and invalid saved items are ignored', async () => {
  const prefs=storage();
  prefs.setItem('dsh-local-video-wallpaper-custom-presets-v1',JSON.stringify([
    {id:'vw_hello1',name:'Safe',values:{opacity:.23}},
    {id:'vw_bad02',name:'Safe',values:{opacity:.41}},
    {id:'not-valid',name:'Invalid',values:{opacity:.1}},
    {id:'vw_good2',name:'Malformed',values:null},
  ]));
  const rt=mount({localStorage:prefs});
  await settled();
  assert.equal(rt.controller.getSnapshot().customPresets.length,1);
  assert.equal(rt.controller.saveCustomPreset('safe'),null);
  assert.equal(rt.controller.getSnapshot().errorKey,'presetDuplicate');
  assert.equal(rt.controller.saveCustomPreset('   '),null);
  assert.equal(rt.controller.getSnapshot().errorKey,'presetInvalidName');
  for(let i=0;i<11;i++) assert.ok(rt.controller.saveCustomPreset(`mine ${i}`));
  assert.equal(rt.controller.getSnapshot().customPresets.length,12);
  assert.equal(rt.controller.saveCustomPreset('thirteenth'),null);
  assert.equal(rt.controller.getSnapshot().errorKey,'presetFull');
  rt.controller.applyPreset('custom:missing');
  assert.equal(rt.controller.getSnapshot().errorKey,'presetMissing');
  rt.dispose();
});

test('compare base captures first visual edit and compare toggling never overwrites persistent settings', async () => {
  const prefs=storage();
  const rt=mount({localStorage:prefs});
  await settled();
  const base=rt.controller.getSnapshot();
  assert.equal(base.compareBase,null);
  rt.controller.setOption('opacity',.77);
  assert.equal(rt.controller.getSnapshot().compareBase.opacity,base.opacity);
  rt.controller.setOption('regionSidebar',.35);
  assert.equal(rt.controller.getSnapshot().compareBase.regionSidebar,base.regionSidebar);
  const saved=prefs.getItem('dsh-local-video-wallpaper-prefs-v2');
  rt.controller.showComparison('before');
  assert.equal(rt.controller.getSnapshot().compareView,'before');
  assert.equal(rt.controller.getSnapshot().opacity,.77);
  assert.equal(prefs.getItem('dsh-local-video-wallpaper-prefs-v2'),saved);
  rt.controller.showComparison('current');
  assert.equal(prefs.getItem('dsh-local-video-wallpaper-prefs-v2'),saved);
  rt.controller.showComparison('before');
  rt.controller.setOption('opacity',.64); // edits are always applied to CURRENT, not Before
  assert.equal(rt.controller.getSnapshot().opacity,.64);
  assert.equal(rt.controller.getSnapshot().compareView,'current');
  rt.controller.restoreComparison();
  assert.equal(rt.controller.getSnapshot().compareBase,null);
  assert.equal(rt.controller.getSnapshot().compareView,'current');
  assert.equal(rt.controller.getSnapshot().opacity,base.opacity);
  assert.equal(rt.controller.getSnapshot().regionSidebar,base.regionSidebar);
  assert.equal(JSON.parse(prefs.getItem('dsh-local-video-wallpaper-prefs-v2')).opacity,base.opacity);
  rt.dispose();
});

test('manual baseline and finish comparison work independently of persistence', async () => {
  const prefs=storage();
  const rt=mount({localStorage:prefs});
  await settled();
  rt.controller.setOption('dim',.3);
  rt.controller.beginComparison();
  assert.equal(rt.controller.getSnapshot().compareBase.dim,.3);
  rt.controller.setOption('dim',.6);
  rt.controller.showComparison('before');
  assert.equal(rt.controller.getSnapshot().compareView,'before');
  rt.controller.finishComparison();
  assert.equal(rt.controller.getSnapshot().compareBase,null);
  assert.equal(rt.controller.getSnapshot().dim,.6);
  assert.equal(JSON.parse(prefs.getItem('dsh-local-video-wallpaper-prefs-v2')).dim,.6);
  rt.dispose();
});

test('presets and before/after thumbnails are registered in Settings and never clone private conversations', async () => {
  const rt=mount();
  await settled();
  const slot=rt.slots.get('settings.section');
  const row=slot.Component({t:key=>key});
  const root=row.type(row.props);
  const children=[];
  const walk=node=>{
    if(!node || typeof node!=='object')return;
    children.push(node);
    for(const ch of node.children||[])walk(ch);
  };
  walk(root);
  assert.ok(children.some(node=>node.type?.name==='PresetControls'));
  assert.ok(children.some(node=>node.type?.name==='CompareControls'));
  assert.ok(script.includes("'data-dsh-vw-compare-samples'"));
  assert.ok(script.includes('CompareShowBefore')===false);
  assert.match(script,/const painted = state\.compareView === 'before' && state\.compareBase/);
  assert.match(script,/shellCssForRegions\(painted\)/);
  assert.match(script,/state: painted/);
  assert.doesNotMatch(script,/document\.querySelectorAll\([^)]*chat\.message/);
  rt.dispose();
});

test('presets localStorage errors do not destroy original wallpaper settings or imported media', async () => {
  const base=storage();
  const prefs={...base,
    getItem(key){if(key==='dsh-local-video-wallpaper-custom-presets-v1')throw Error('blocked');return base.getItem(key);},
    setItem(key,value){if(key==='dsh-local-video-wallpaper-custom-presets-v1')throw Error('blocked');base.setItem(key,value);},
  };
  const rt=mount({localStorage:prefs});
  await settled();
  await rt.controller.chooseFile('image',image());
  assert.equal(rt.controller.getSnapshot().presetsPersisted,false);
  assert.ok(rt.controller.saveCustomPreset('Temporary'));
  assert.equal(rt.controller.getSnapshot().presetsPersisted,false);
  assert.equal(rt.controller.getSnapshot().errorKey,'presetSaveFailed');
  assert.equal(rt.controller.getSnapshot().customPresets.length,1);
  assert.equal(rt.controller.getSnapshot().media.image.name,'wallpaper.png');
  rt.controller.setOption('blur',4);
  assert.equal(JSON.parse(base.getItem('dsh-local-video-wallpaper-prefs-v2')).blur,4);
  rt.dispose();
});

test('UI preset buttons and A/B cards are actual independently rendered React components', async () => {
  const rt=mount();
  await settled();
  rt.controller.setOption('opacity',.66);
  const rootSlot=rt.slots.get('settings.section');
  const settings=rootSlot.Component({t:key=>key});
  // Recursively evaluate function components with the existing minimal hook
  // harness. This checks the child tree, rather than only scanning strings.
  const expand=node=>{
    if(!node || typeof node!=='object') return [];
    const element=typeof node.type==='function' ? node.type(node.props) : node;
    if(!element || typeof element!=='object') return [];
    return [element,...(element.children||[]).flatMap(expand)];
  };
  const nodes=expand(settings);
  const names=nodes.filter(x=>x.type==='button' && !x.props['data-dsh-vw-preset']).map(x=>x.children.join(''));
  for (const id of ['reading','balanced','immersive']) {
    const button=nodes.find(x=>x.type==='button' && x.props['data-dsh-vw-preset']===id);
    assert.ok(button, `${id} preset action is mounted`);
    assert.equal(button.children[0].children[0], 'preset'+id.replace(/^./,c=>c.toUpperCase()));
    assert.equal(button.children[1].children[0], 'preset'+id.replace(/^./,c=>c.toUpperCase())+'Desc');
  }
  assert.ok(names.includes('compareRestore'));
  assert.ok(names.includes('compareFinish'));
  const previews=nodes.filter(x=>x.type==='div' && x.props.className==='dsh-vw-sample');
  assert.equal(previews.length,2);
  const bodies=nodes.filter(x=>x.type==='div' && x.props.className==='dsh-vw-sample-body');
  assert.equal(bodies.length,2);
  // Both miniatures' chat masks are driven by actual saved alpha values.
  assert.match(bodies[0].props.style.background,/35%/);
  assert.match(bodies[1].props.style.background,/35%/);
  const input=nodes.find(x=>x.type==='input' && x.props.type==='range' && x.props['aria-label']==='opacity');
  assert.equal(input.props.value,.66);
  const button=nodes.find(x=>x.type==='button' && x.props['data-dsh-vw-preset']==='reading');
  button.props.onClick();
  assert.equal(rt.controller.getSnapshot().opacity,.48);
  assert.equal(rt.controller.getSnapshot().selectedPresetId,'builtin:reading');
  rt.dispose();
});

test('preview Before uses baseline visual masks while Current retains new masks', async () => {
  const rt=mount();
  await settled();
  rt.controller.setOption('regionChat',.18);
  rt.controller.setOption('regionSidebar',.49);
  const row=rt.slots.get('settings.section').Component({t:key=>key});
  const nested=row.type(row.props);
  function collect(node){
    if(!node || typeof node!=='object')return [];
    const n=typeof node.type==='function'?node.type(node.props):node;
    if(!n || typeof n!=='object')return [];
    return [n,...(n.children||[]).flatMap(collect)];
  }
  const els=collect(nested);
  const b=els.filter(x=>x.type==='div'&&x.props.className==='dsh-vw-sample-body');
  assert.equal(b.length,2);
  assert.match(b[0].props.style.background,/35%/); // initial default
  assert.match(b[1].props.style.background,/18%/); // changed current
  const side=els.filter(x=>x.type==='div'&&x.props.className==='dsh-vw-sample-side');
  assert.match(side[0].props.style.background,/90%/);
  assert.match(side[1].props.style.background,/49%/);
  const video=els.filter(x=>x.type==='video'&&x.props.className==='dsh-vw-sample-media');
  assert.equal(video.length,0); // no external media or privacy data when none imported
  rt.dispose();
});

test('unrecognized built-in prototype keys cannot be applied as presets', async () => {
  const rt=mount();
  await settled();
  const prev=rt.controller.getSnapshot().opacity;
  rt.controller.applyPreset('builtin:constructor');
  assert.equal(rt.controller.getSnapshot().errorKey,'presetMissing');
  assert.equal(rt.controller.getSnapshot().opacity,prev);
  rt.dispose();
});


test('wallpaper media blur does not rescale image/video or redraw their crop', () => {
  // Regression: rc.5 set transform:scale(1.04) when blur changed from 0 to 1,
  // and the dual preview used scale(1.05). Both moved a subject in the image.
  assert.doesNotMatch(script, /scale\(1\.0(?:4|5)\)/);
  assert.doesNotMatch(script, /transform:\s*state\.blur\s*>\s*0/);
  assert.doesNotMatch(script, /transform:\s*values\.blur\s*>\s*0/);
  assert.doesNotMatch(script, /filter:\s*`blur\(\$\{(?:state|values)\.blur\}/);
  assert.equal((script.match(/objectFit: state\.fit/g) || []).length, 2);
  assert.equal((script.match(/opacity: state\.opacity/g) || []).length, 2);
  assert.match(script, /!state\.testPattern && state\.blur > 0 && src/);
  assert.match(script, /className: 'dsh-vw-media-blur'/);
  assert.match(script, /className: 'dsh-vw-sample-blur'/);
  assert.match(script, /source && mediaBlur \?/);
  assert.match(script, /pointer-events: none/);
});

test('media blur and UI frost remain two independent effects', () => {
  const scene = script.match(/function WallpaperScene\([\s\S]*?\n    function WallpaperHost/);
  const region = script.match(/function shellCssForRegions\([\s\S]*?\n    const FORM_CSS/);
  const thumb = script.match(/function ComparisonSample\([\s\S]*?\n    function ComparisonSamples/);
  assert.ok(scene && region && thumb);
  assert.match(scene[0], /backdropFilter: `blur\(\$\{state\.blur\}px\)`/);
  assert.doesNotMatch(scene[0], /state\.panelBlur/);
  assert.match(region[0], /state\.panelBlur/);
  assert.doesNotMatch(region[0], /state\.blur(?![A-Za-z])/);
  assert.match(thumb[0], /values\.blur > 0/);
  assert.match(thumb[0], /values\.panelBlur > 0/);
  // The DOM never needs a second video decoder: one overlay blurs either
  // an <img> or the existing single <video> frame in place.
  assert.equal((scene[0].match(/className: 'dsh-vw-media-blur'/g) || []).length, 1);
});


test('Reading, Balanced and Immersive presets have unambiguously different composited wallpaper presence', async () => {
  const rt = mount();
  await settled();
  const results = {};
  for (const mode of ['reading', 'balanced', 'immersive']) {
    rt.controller.applyPreset(`builtin:${mode}`);
    const state = rt.controller.getSnapshot();
    results[mode] = {
      media: state.opacity,
      background: state.regionChat,
      approxChatWallpaper: state.opacity * (1 - state.regionChat),
      approxSidebarWallpaper: state.opacity * (1 - state.regionSidebar),
      blur: state.blur,
      panelBlur: state.panelBlur,
    };
  }
  assert.ok(results.reading.approxChatWallpaper < .05);
  assert.ok(results.balanced.approxChatWallpaper > .30 && results.balanced.approxChatWallpaper < .45);
  assert.ok(results.immersive.approxChatWallpaper > .70);
  assert.ok(results.immersive.approxChatWallpaper > 2 * results.balanced.approxChatWallpaper);
  assert.ok(results.balanced.approxChatWallpaper > 7 * results.reading.approxChatWallpaper);
  assert.ok(results.reading.approxSidebarWallpaper < .02);
  assert.ok(results.immersive.approxSidebarWallpaper > .60);
  assert.ok(results.reading.blur > results.balanced.blur && results.balanced.blur > results.immersive.blur);
  assert.equal(results.reading.panelBlur,0);
  assert.equal(results.balanced.panelBlur,5);
  assert.equal(results.immersive.panelBlur,0);
  rt.dispose();
});

test('official Plugins page gets mode-sensitive content opacity without moving desktop controls', () => {
  const shell = script.match(/const SHELL_CSS = `([\s\S]*?)`;/)?.[1];
  const frost = script.match(/const FROST_CSS = `([\s\S]*?)`;/)?.[1];
  assert.ok(shell && frost);
  assert.match(shell, /:root \[data-plugin-panel\] \{\s*background: rgba\(255, 255, 255, __DSH_VW_CHAT_ALPHA__\) !important;/);
  assert.match(shell, /\[data-plugin-panel\] \{\s*background: rgba\(19, 21, 26, __DSH_VW_CHAT_ALPHA__\) !important;/);
  assert.doesNotMatch(frost, /data-plugin-panel/);
  assert.doesNotMatch(shell, /\[data-plugin-panel\] \{[^}]*?(position|transform|filter|contain)\s*:/);
  assert.match(script, /regionNote: '内容区底色也应用于插件列表页/);
  // Configuration remains limited to current scene: no style when wallpaper is disabled.
  assert.match(script,/frame && state\.ready && \(state\.testPattern \|\| \(media && src\)\)/);
});

test('preset labels communicate all three different designs in both supported languages', () => {
  for(const [key,value] of Object.entries({
    presetReadingDesc:'文字最清楚',
    presetBalancedDesc:'半透明面板',
    presetImmersiveDesc:'壁纸完整清晰',
  })) assert.match(script, new RegExp(`${key}: '${value}`));
  assert.match(script,/presetReadingDesc: 'Text first/);
  assert.match(script,/presetBalancedDesc: 'Translucent surfaces/);
  assert.match(script,/presetImmersiveDesc: 'Crisp wallpaper/);
});
