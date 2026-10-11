/* DSH Desktop/Web image + video wallpaper Client bundle.
 * The shipped Creator decoration template provides the loader contract.
 * Runtime imports only the shared React and react-dom platform modules.
 * User media stays in browser/Electron origin storage; never uploaded.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-video-wallpaper',
  factory(require) {
    'use strict';
    const React = require('react');
    const ReactDOM = require('react-dom');
    const h = React.createElement;
    const PLUGIN_VERSION = '0.3.0-rc.7';

    // Reuse v0.1's store so saved videos can be migrated safely.
    const DB_NAME = 'dsh-local-video-wallpaper-v1';
    const STORE_NAME = 'media';
    const LEGACY_VIDEO_KEY = 'wallpaper';
    const KEYS = Object.freeze({ image: 'image', video: 'video' });
    const OLD_PREFS_KEY = 'dsh-local-video-wallpaper-prefs-v1';
    const PREFS_KEY = 'dsh-local-video-wallpaper-prefs-v2';
    const CUSTOM_PRESETS_KEY = 'dsh-local-video-wallpaper-custom-presets-v1';
    const MAX_CUSTOM_PRESETS = 12;
    const ACCEPT_IMAGE = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
    const ACCEPT_VIDEO = 'video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,.mp4,.webm,.ogv,.ogg,.mov,.m4v';
    const DEFAULTS = Object.freeze({
      mode: 'off',
      paused: false,
      dim: 0.18,
      blur: 0, // Media-only filter. Keep this key for existing preferences.
      panelBlur: 0, // 0px preserves the existing UI and avoids GPU backdrop cost.
      tint: 0.35, // Legacy v0.2 setting; keep for downgrade-safe migration.
      regionChat: 0.35,
      regionSidebar: 0.90,
      regionHeader: 0.35,
      regionComposer: 0.94,
      opacity: 1,
      fit: 'cover',
      allowReducedMotion: false,
    });
    // Built-in looks are illustrative, not a migration: existing users keep
    // their exact saved values until they explicitly choose one. None of these
    // presets touch wallpaper media, mode, pause, or reduced-motion controls.
    const VISUAL_KEYS = Object.freeze([
      'dim', 'blur', 'panelBlur', 'opacity',
      'regionChat', 'regionSidebar', 'regionHeader', 'regionComposer', 'fit',
    ]);
    // These three looks intentionally span different visual experiences, not
    // slightly different values of the same wash. The effective wallpaper
    // contribution inside the chat plane is approx opacity * (1-regionChat):
    // Reading 0.038, Balanced 0.352, Immersive 0.78. This is a design metric,
    // not a claim of physical luminance (blur, colors and overlays also matter).
    const BUILTIN_PRESETS = Object.freeze({
      reading: Object.freeze({ dim: .08, blur: 8, panelBlur: 0, opacity: .48,
        regionChat: .92, regionSidebar: .98, regionHeader: .94, regionComposer: .99, fit: 'cover' }),
      balanced: Object.freeze({ dim: .08, blur: 2, panelBlur: 5, opacity: .80,
        regionChat: .56, regionSidebar: .78, regionHeader: .62, regionComposer: .94, fit: 'cover' }),
      immersive: Object.freeze({ dim: 0, blur: 0, panelBlur: 0, opacity: 1,
        regionChat: .22, regionSidebar: .34, regionHeader: .20, regionComposer: .80, fit: 'cover' }),
    });
    function visualValues(state) {
      const result = {};
      for (const key of VISUAL_KEYS) result[key] = state[key];
      return result;
    }
    function equalVisual(left, right) {
      return Boolean(left && right) && VISUAL_KEYS.every(key => Object.is(left[key], right[key]));
    }
    function validatePresetName(value) {
      return typeof value === 'string'
        ? value.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 32).trim() : '';
    }
    function sanitizeCustomPresets(input) {
      if (!Array.isArray(input)) return [];
      const result = [];
      const ids = new Set();
      const names = new Set();
      for (const item of input.slice(0, 64)) {
        if (result.length >= MAX_CUSTOM_PRESETS) break;
        const name = validatePresetName(item?.name);
        const id = typeof item?.id === 'string' && /^vw_[a-z0-9_-]{4,64}$/i.test(item.id) ? item.id : '';
        if (!name || !id || !item.values || typeof item.values !== 'object'
            || ids.has(id) || names.has(name.toLocaleLowerCase())) continue;
        const saved = normalize({ ...DEFAULTS, ...item.values });
        result.push({ id, name, values: visualValues(saved) });
        ids.add(id);
        names.add(name.toLocaleLowerCase());
      }
      return result;
    }
    const ZH = {
      title: '壁纸背景',
      description: '为 DSH 界面设置本地图片或视频背景，不会上传至 DSH 服务端。',
      loading: '正在读取本地壁纸…',
      mode: '壁纸模式',
      off: '关闭',
      image: '静态图片',
      video: '动态视频',
      noImage: '尚未选择图片',
      noVideo: '尚未选择视频',
      chooseImage: '选择图片',
      replaceImage: '更换图片',
      removeImage: '移除图片',
      chooseVideo: '选择视频',
      replaceVideo: '更换视频',
      removeVideo: '移除视频',
      pause: '暂停',
      play: '播放',
      dim: '暗度',
      blur: '壁纸自身模糊',
      panelBlur: '面板磨砂强度',
      panelBlurHelp: '只模糊面板后方的壁纸，不模糊文字。建议 4–6px；面板越透明越容易看到磨砂效果。动态视频上过高的数值可能增加 GPU 负担。',
      tint: '界面底色覆盖（旧版）',
      regionGroup: '分区底色不透明度',
      regionHelp: '只调整界面底色，不改变壁纸本身。数值越大，底板越不透明；顶部导航指对话内导航，不含系统原生标题栏。',
      regionChat: '聊天正文',
      regionSidebar: '左侧栏',
      regionHeader: '顶部导航',
      regionComposer: '输入框',
      regionReset: '恢复推荐不透明度',
      regionNote: '内容区底色也应用于插件列表页；壁纸关闭后全部恢复 DSH 默认外观。',
      opacity: '壁纸不透明度',
      opacityHelp: '100% = 壁纸图层完全不透明（仍可能被界面底色遮住）；数值越低越透明。只修正名称，不反转旧数值。',
      fit: '画面适配',
      cover: '铺满（裁剪）',
      contain: '完整显示（留边）',
      motion: '允许在系统“减少动态效果”时播放视频',
      reduced: '系统已启用“减少动态效果”，视频默认暂停；图片不受影响。',
      local: '两个壁纸文件分别保存在当前 DSH Desktop / 浏览器的本地存储中，不跨设备同步。',
      memory: '当前环境无法持久化壁纸，导入的文件仅在本次页面会话有效。',
      invalidImage: '请选择 PNG、JPG 或 WebP 图片（不支持 GIF 动图）。',
      invalidVideo: '请选择有效的视频文件（推荐 H.264 MP4 或 WebM）。',
      emptyFile: '不能使用空文件。',
      saveFailed: '保存失败，可能是磁盘空间不足；原壁纸未被替换。',
      removeFailed: '删除失败；原壁纸仍然保留。',
      prefsFailed: '偏好设置保存失败，刷新后可能恢复之前的设置。',
      imageFailed: '图片解码失败，请重新选择图片文件。',
      playbackFailed: '视频播放失败，请使用 H.264 MP4 / WebM 或手动点击播放。',
      busy: '正在保存…',
      preview: '关闭模式不创建媒体解码器；图片和视频的暗度、模糊、不透明度可共用调节。',
      fileSize: '文件大小',
      selectHint: '导入图片或视频后会自动切换到对应模式；另一种壁纸保持保存。',
      previewLabel: '文件预览（用于排除解码问题）',
      runtimeLabel: '背景诊断',
      runtimeOff: '未启用壁纸模式。',
      runtimeMissing: '当前模式没有导入文件。',
      runtimeStarting: '正在初始化本地媒体。',
      runtimeNoSlot: '未检测到全局背景挂载位；请确认插件已激活、版本兼容，然后重启 Desktop。',
      runtimeNoFrame: '已加载扩展位，但无法定位 DSH Desktop 主窗口。',
      runtimeNoStage: '已定位主窗口，但背景渲染层尚未建立。',
      runtimeLoading: '背景渲染层已建立，正在解码媒体。',
      runtimeLoaded: '媒体已解码，背景层已挂载。如果画面被遮挡，可单独降低“聊天正文”等分区的底色不透明度。',
      runtimeFailed: '媒体解码失败。请尝试标准 JPG/PNG 或 H.264 MP4。',
      runtimeVersion: '插件版本',
      testPattern: '显示测试图案（检查背景层）',
      testPatternHint: '测试图案不使用图片或视频。启用后关闭设置窗口查看；测试完请关闭此开关。',
      runtimePattern: '测试图案已挂载。如果关闭设置窗口后仍不可见，请提供下方背景色诊断结果。',
      paintStatus: '聊天正文实际底色',
      presetGroup: '外观预设',
      presetHelp: '三种刻意拉开差异的外观：阅读重文字、均衡重玻璃、沉浸重壁纸。仅改变外观参数，不更换媒体或播放状态；升级不会自动套用预设。',
      presetReading: '阅读',
      presetReadingDesc: '文字最清楚 · 壁纸柔和失焦',
      presetBalanced: '均衡',
      presetBalancedDesc: '半透明面板 · 适度磨砂',
      presetImmersive: '沉浸',
      presetImmersiveDesc: '壁纸完整清晰 · 注意文字对比度',
      presetCurrent: '当前外观',
      presetManual: '自由调整',
      presetModified: '（已修改）',
      presetCustomTitle: '我的自定义预设',
      presetName: '预设名称',
      presetNamePlaceholder: '例如：晚间阅读',
      presetSave: '另存为新预设',
      presetOverwrite: '更新选中预设',
      presetDelete: '删除',
      presetDeleteConfirm: '确认删除',
      presetCancel: '取消',
      presetNone: '还没有自定义预设',
      presetLimit: '最多保存 12 个自定义预设，存储在本地，不跨设备同步。',
      presetDuplicate: '已有同名预设，请换一个名称；如需覆盖，请使用“更新选中预设”。',
      presetInvalidName: '请输入 1–32 个字符的预设名称。',
      presetFull: '已达到 12 个自定义预设的上限。',
      presetSaveFailed: '保存自定义预设失败，可能是本地存储空间不足。',
      presetStorageFailed: '自定义预设存储不可用；可能无法在重启后保留。',
      presetMissing: '找不到所选预设，请重新选择。',
      compareGroup: '实时效果对比',
      compareHelp: '拖动滑块会立即更新 DSH 背景并自动保存，同时记住首次修改前的外观；下方示意图可以并排对比。',
      compareMock: '缩略示意图（不包含私人聊天内容）。最终效果以 DSH 主窗口为准；视频预览不会自动播放。',
      compareBefore: '修改前',
      compareAfter: '当前效果',
      compareShowBefore: '主窗口查看修改前',
      compareShowAfter: '主窗口查看当前',
      compareBegin: '以当前效果重新设为基准',
      compareRestore: '一键恢复修改前',
      compareFinish: '结束对比（保留当前）',
      compareNotStarted: '尚未更改外观；首次调整后会自动建立比较基准，也可手动开始。',
      compareViewingBefore: '主窗口正在临时预览“修改前”；滑块仍显示最新保存值，不会被覆盖。',
      compareViewingCurrent: '主窗口正在展示当前设置。',
      previewMockHeader: '导航',
      previewMockInput: '输入框',
    };
    const EN = {
      title: 'Wallpaper background',
      description: 'Display a local image or video behind DSH. Media is never uploaded to the Host.',
      loading: 'Reading local wallpapers…',
      mode: 'Wallpaper mode',
      off: 'Off',
      image: 'Static image',
      video: 'Looping video',
      noImage: 'No image selected',
      noVideo: 'No video selected',
      chooseImage: 'Choose image',
      replaceImage: 'Replace image',
      removeImage: 'Remove image',
      chooseVideo: 'Choose video',
      replaceVideo: 'Replace video',
      removeVideo: 'Remove video',
      pause: 'Pause',
      play: 'Play',
      dim: 'Darkening',
      blur: 'Wallpaper blur',
      panelBlur: 'Panel frosted-glass blur',
      panelBlurHelp: 'Blurs the wallpaper BEHIND UI panels, not text. Start with 4–6px; transparent panels show the effect best. Large values can be expensive with video.',
      tint: 'UI surface opacity (legacy)',
      regionGroup: 'Panel background opacity by region',
      regionHelp: 'Controls UI surfaces only, not wallpaper opacity. Higher values mean more opaque panels. Top navigation excludes native desktop window controls.',
      regionChat: 'Conversation body',
      regionSidebar: 'Left sidebar',
      regionHeader: 'Top navigation',
      regionComposer: 'Composer input',
      regionReset: 'Reset recommended opacity',
      regionNote: 'Conversation-body opacity also sets the Plugins page reading surface. All overrides disappear when the wallpaper is off.',
      opacity: 'Wallpaper opacity (not transparency)',
      opacityHelp: '100% = fully opaque wallpaper layer (UI panels may still cover it). Lower values are more transparent; old values are preserved.',
      fit: 'Fit',
      cover: 'Cover (crop)',
      contain: 'Contain (letterbox)',
      motion: 'Allow video playback with system Reduce Motion enabled',
      reduced: 'System Reduce Motion pauses video by default; images are unaffected.',
      local: 'Both wallpapers remain in this DSH Desktop / browser storage; they do not sync.',
      memory: 'Storage is unavailable. Imported media lasts only until this page closes.',
      invalidImage: 'Choose a PNG, JPG, or WebP image (animated GIF is not supported).',
      invalidVideo: 'Choose a video file (H.264 MP4 or WebM recommended).',
      emptyFile: 'An empty file cannot be used.',
      saveFailed: 'Could not save; storage may be full. The previous wallpaper remains.',
      removeFailed: 'Could not remove the stored wallpaper. The previous one remains.',
      prefsFailed: 'Preferences could not be saved and might reset on reload.',
      imageFailed: 'Could not decode the image. Choose another image.',
      playbackFailed: 'Video playback failed. Try H.264 MP4 / WebM or click Play.',
      busy: 'Saving…',
      preview: 'Off mode creates no media decoder. Brightness, blur and opacity apply to both modes.',
      fileSize: 'File size',
      selectHint: 'Importing media selects its mode automatically; the other file remains saved.',
      previewLabel: 'File preview (to isolate decode issues)',
      runtimeLabel: 'Background diagnostics',
      runtimeOff: 'Wallpaper mode is off.',
      runtimeMissing: 'No media imported for the active mode.',
      runtimeStarting: 'Loading local media.',
      runtimeNoSlot: 'Global background slot not mounted. Check plugin activation / version, then restart Desktop.',
      runtimeNoFrame: 'Overlay is loaded but the DSH Desktop frame could not be located.',
      runtimeNoStage: 'Frame located, but wallpaper stage is not mounted.',
      runtimeLoading: 'Wallpaper stage is mounted; decoding media.',
      runtimeLoaded: 'Media decoded and stage mounted. If hidden, lower the selected UI region surface opacity.',
      runtimeFailed: 'Media decode failed. Try JPEG/PNG or H.264 MP4.',
      runtimeVersion: 'Plugin version',
      testPattern: 'Show test pattern (check wallpaper layer)',
      testPatternHint: 'The test pattern does not need a media file. Close Settings to inspect it; turn it off afterward.',
      runtimePattern: 'Test pattern mounted. If it remains invisible after closing Settings, share the computed background color.',
      paintStatus: 'Actual chat body background',
      presetGroup: 'Appearance presets',
      presetHelp: 'Apply visual settings only; existing image/video files and playback settings remain unchanged. Existing preferences are not migrated to a preset.',
      presetReading: 'Reading',
      presetReadingDesc: 'Text first · soft, subdued wallpaper',
      presetBalanced: 'Balanced',
      presetBalancedDesc: 'Translucent surfaces · frosted glass',
      presetImmersive: 'Immersive',
      presetImmersiveDesc: 'Crisp wallpaper · check text contrast',
      presetCurrent: 'Current appearance',
      presetManual: 'Custom settings',
      presetModified: ' (modified)',
      presetCustomTitle: 'My saved presets',
      presetName: 'Preset name',
      presetNamePlaceholder: 'e.g. Night reading',
      presetSave: 'Save as new preset',
      presetOverwrite: 'Update selected preset',
      presetDelete: 'Delete',
      presetDeleteConfirm: 'Confirm delete',
      presetCancel: 'Cancel',
      presetNone: 'No custom presets saved',
      presetLimit: 'Up to 12 named presets, saved locally (no cross-device sync).',
      presetDuplicate: 'A preset with this name exists. Choose another name or use Update selected preset.',
      presetInvalidName: 'Enter a preset name (1–32 characters).',
      presetFull: 'The 12-preset limit has been reached.',
      presetSaveFailed: 'Could not save presets to local storage.',
      presetStorageFailed: 'Local preset storage is unavailable. Presets may disappear after a restart.',
      presetMissing: 'The preset no longer exists. Select another.',
      compareGroup: 'Live before/after comparison',
      compareHelp: 'Moving a slider updates and saves the live wallpaper immediately. The first change captures a temporary before snapshot.',
      compareMock: 'Illustrative miniatures (no private conversation content). Check the DSH main window for the final result. Video previews do not autoplay.',
      compareBefore: 'Before',
      compareAfter: 'Current',
      compareShowBefore: 'Show before in main window',
      compareShowAfter: 'Show current in main window',
      compareBegin: 'Set current as new baseline',
      compareRestore: 'Restore before (one click)',
      compareFinish: 'Finish comparison (keep current)',
      compareNotStarted: 'No visual changes yet. The first edit captures a baseline, or start manually.',
      compareViewingBefore: 'Main window is temporarily showing Before. Sliders still show the latest saved settings.',
      compareViewingCurrent: 'Main window is showing the current saved settings.',
      previewMockHeader: 'Header',
      previewMockInput: 'Input',
    };

    function clamp(value, lo, hi, fallback) {
      const n = Number(value);
      return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
    }
    function normalize(raw) {
      const p = raw && typeof raw === 'object' ? raw : {};
      return {
        mode: ['off', 'image', 'video'].includes(p.mode) ? p.mode : DEFAULTS.mode,
        paused: typeof p.paused === 'boolean' ? p.paused : DEFAULTS.paused,
        dim: clamp(p.dim, 0, 0.7, DEFAULTS.dim),
        blur: clamp(p.blur, 0, 20, DEFAULTS.blur),
        panelBlur: clamp(p.panelBlur, 0, 12, DEFAULTS.panelBlur),
        tint: clamp(p.tint, 0.02, 0.96, DEFAULTS.tint),
        // Preserve existing v0.2.x reading opacity; retain originally opaque
        // sidebar and input card until the user adjusts those new controls.
        regionChat: Object.hasOwn(p, 'regionChat')
          ? clamp(p.regionChat, 0, 1, DEFAULTS.regionChat)
          : clamp(p.tint, 0.02, 0.96, DEFAULTS.regionChat),
        regionSidebar: clamp(p.regionSidebar, 0, 1, DEFAULTS.regionSidebar),
        regionHeader: Object.hasOwn(p, 'regionHeader')
          ? clamp(p.regionHeader, 0, 1, DEFAULTS.regionHeader)
          : clamp(p.tint, 0.02, 0.96, DEFAULTS.regionHeader),
        regionComposer: clamp(p.regionComposer, 0, 1, DEFAULTS.regionComposer),
        opacity: clamp(p.opacity, 0.15, 1, DEFAULTS.opacity),
        fit: p.fit === 'contain' ? 'contain' : 'cover',
        allowReducedMotion: p.allowReducedMotion === true,
      };
    }
    function normalizeLegacy(raw) {
      if (!raw || typeof raw !== 'object') return normalize(null);
      return normalize({ ...raw, mode: raw.enabled === false ? 'off' : 'video' });
    }
    // An extension and MIME must agree when MIME is supplied. No GIF or SVG:
    // the image mode should not unexpectedly execute animation or embedded markup.
    const TYPES = Object.freeze({
      png: ['image', ['image/png']],
      jpg: ['image', ['image/jpeg']],
      jpeg: ['image', ['image/jpeg']],
      webp: ['image', ['image/webp']],
      mp4: ['video', ['video/mp4']],
      webm: ['video', ['video/webm']],
      ogv: ['video', ['video/ogg']],
      ogg: ['video', ['video/ogg']],
      mov: ['video', ['video/quicktime']],
      m4v: ['video', ['video/mp4', 'video/x-m4v']],
    });
    function classifyFile(file) {
      if (!file || typeof file.name !== 'string') return null;
      const ext = file.name.toLowerCase().split('.').pop();
      const rule = Object.hasOwn(TYPES, ext) ? TYPES[ext] : null;
      if (!rule) return null;
      if (file.type && !rule[1].includes(file.type.toLowerCase())) return null;
      return rule[0];
    }
    function formatSize(bytes) {
      const mib = bytes / 1048576;
      return `${mib < 10 ? mib.toFixed(1) : mib.toFixed(0)} MiB`;
    }

    function openDb() {
      return new Promise((resolve, reject) => {
        if (!('indexedDB' in window) || !window.indexedDB) {
          reject(new Error('IndexedDB unavailable'));
          return;
        }
        let settled = false;
        const req = window.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE_NAME)) {
            req.result.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => {
          if (settled) { req.result.close(); return; }
          settled = true;
          resolve(req.result);
        };
        req.onerror = () => {
          if (settled) return;
          settled = true;
          reject(req.error || new Error('IndexedDB open failed'));
        };
        req.onblocked = () => {
          if (settled) return;
          settled = true;
          reject(new Error('IndexedDB upgrade blocked'));
        };
      });
    }
    async function runTransaction(mode, operation) {
      const db = await openDb();
      try {
        return await new Promise((resolve, reject) => {
          let tx;
          try { tx = db.transaction(STORE_NAME, mode); }
          catch (error) { reject(error); return; }
          let result;
          let request;
          try { request = operation(tx.objectStore(STORE_NAME)); }
          catch (error) { tx.abort(); reject(error); return; }
          request.onsuccess = () => { result = request.result; };
          // Transaction owns errors, preventing premature success on a failed commit.
          tx.oncomplete = () => { resolve(result); };
          tx.onabort = () => { reject(tx.error || request.error || new Error('Transaction aborted')); };
          tx.onerror = () => { /* onabort settles the promise */ };
        });
      } finally {
        db.close();
      }
    }
    const readRecord = key => runTransaction('readonly', store => store.get(key));
    // For videos, remove the old v0.1 key in the SAME IDB transaction. This
    // prevents a deleted/replaced legacy wallpaper from reappearing on restart.
    const writeRecord = (kind, record) => runTransaction('readwrite', store => {
      const request = store.put(record, KEYS[kind]);
      if (kind === 'video') store.delete(LEGACY_VIDEO_KEY);
      return request;
    });
    const deleteRecord = kind => runTransaction('readwrite', store => {
      const request = store.delete(KEYS[kind]);
      if (kind === 'video') store.delete(LEGACY_VIDEO_KEY);
      return request;
    });
    function validRecord(data, kind) {
      return data && data.blob instanceof Blob && data.blob.size > 0
        ? { blob: data.blob, name: String(data.name || `${kind}-wallpaper`), size: data.blob.size }
        : null;
    }

    function makeController() {
      let prefs = normalize(null);
      let prefsPersisted = true;
      let migratePrefs = false;
      try {
        const saved = window.localStorage.getItem(PREFS_KEY);
        if (saved !== null) prefs = normalize(JSON.parse(saved));
        else {
          const legacy = window.localStorage.getItem(OLD_PREFS_KEY);
          if (legacy !== null) {
            prefs = normalizeLegacy(JSON.parse(legacy));
            migratePrefs = true;
          }
        }
      } catch {
        prefsPersisted = false;
      }
      let customPresets = [];
      let presetsPersisted = true;
      try {
        const json = window.localStorage.getItem(CUSTOM_PRESETS_KEY);
        if (json !== null) customPresets = sanitizeCustomPresets(JSON.parse(json));
      } catch { presetsPersisted = false; }
      let snapshot = {
        ...prefs,
        ready: false,
        busy: false,
        testPattern: false,
        media: { image: null, video: null },
        persistent: true,
        prefsPersisted,
        customPresets,
        presetsPersisted,
        selectedPresetId: null,
        compareBase: null,
        compareView: 'current',
        errorKey: '',
        mediaError: '',
        runtime: { overlay: false, frame: false, stage: false, media: 'idle', mainSurface: '' },
      };
      let alive = true;
      let generation = 0;
      const listeners = new Set();
      const publish = patch => {
        if (!alive) return;
        snapshot = { ...snapshot, ...patch };
        for (const listener of listeners) listener();
      };
      const subscribe = listener => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      };
      const getSnapshot = () => snapshot;
      const savePrefs = next => {
        try {
          const serializable = {};
          for (const key of Object.keys(DEFAULTS)) serializable[key] = next[key];
          window.localStorage.setItem(PREFS_KEY, JSON.stringify(serializable));
          return true;
        } catch { return false; }
      };
      const saveCustomPresets = entries => {
        try {
          window.localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(entries));
          return true;
        } catch { return false; }
      };
      let nextPresetSerial = 0;
      const presetById = id => {
        if (typeof id !== 'string') return null;
        if (id.startsWith('builtin:')) {
          const key = id.slice('builtin:'.length);
          return Object.hasOwn(BUILTIN_PRESETS, key) ? BUILTIN_PRESETS[key] : null;
        }
        if (id.startsWith('custom:')) return snapshot.customPresets.find(
          entry => entry.id === id.slice('custom:'.length))?.values || null;
        return null;
      };
      const setVisual = (values, selectedPresetId) => {
        const before = snapshot.compareBase || visualValues(snapshot);
        const next = normalize({ ...snapshot, ...values, tint: values.regionChat });
        const persisted = savePrefs(next);
        publish({ ...next, compareBase: before, compareView: 'current',
          selectedPresetId, prefsPersisted: persisted, errorKey: '', mediaError: '' });
      };
      const controller = {
        subscribe,
        getSnapshot,
        async start() {
          const token = generation;
          if (migratePrefs) {
            prefsPersisted = savePrefs(prefs);
            migratePrefs = false;
          }
          try {
            const [imageData, videoData] = await Promise.all([
              readRecord(KEYS.image), readRecord(KEYS.video),
            ]);
            let image = validRecord(imageData, 'image');
            let video = validRecord(videoData, 'video');
            if (!video) {
              const legacyData = await readRecord(LEGACY_VIDEO_KEY);
              video = validRecord(legacyData, 'video');
              if (video) {
                // Failure is not fatal: the old record remains available.
                try { await writeRecord('video', legacyData); } catch { /* retry on next boot */ }
              }
            }
            if (!alive || token !== generation) return;
            publish({ ready: true, media: { image, video }, persistent: true, prefsPersisted });
          } catch {
            if (!alive || token !== generation) return;
            publish({ ready: true, persistent: false, prefsPersisted });
          }
        },
        setOption(name, value) {
          if (!Object.hasOwn(DEFAULTS, name)) return;
          // Keep the previous tint field aligned for users who temporarily
          // roll back to v0.2.x, where only the global tint slider exists.
          const next = normalize({ ...snapshot, [name]: value,
            ...(name === 'regionChat' ? { tint: value } : {}) });
          if (Object.is(snapshot[name], next[name])) return;
          const appearanceChange = VISUAL_KEYS.includes(name);
          const baseline = appearanceChange
            ? snapshot.compareBase || visualValues(snapshot) : snapshot.compareBase;
          const persisted = savePrefs(next);
          publish({ ...next, testPattern: name === 'mode' ? false : snapshot.testPattern,
            compareBase: baseline,
            compareView: appearanceChange ? 'current' : snapshot.compareView,
            prefsPersisted: persisted, errorKey: '', mediaError: '' });
        },
        toggleTestPattern() {
          publish({ testPattern: !snapshot.testPattern });
        },
        resetRegions() {
          if (!alive) return;
          const next = normalize({ ...snapshot,
            regionChat: DEFAULTS.regionChat,
            regionSidebar: DEFAULTS.regionSidebar,
            regionHeader: DEFAULTS.regionHeader,
            regionComposer: DEFAULTS.regionComposer,
            tint: DEFAULTS.regionChat,
          });
          publish({ ...next, compareBase: snapshot.compareBase || visualValues(snapshot),
            compareView: 'current', prefsPersisted: savePrefs(next), errorKey: '' });
        },
        applyPreset(id) {
          const values = presetById(id);
          if (!values) { publish({ errorKey: 'presetMissing' }); return; }
          setVisual(values, id);
        },
        saveCustomPreset(rawName) {
          const name = validatePresetName(rawName);
          if (!name) { publish({ errorKey: 'presetInvalidName' }); return null; }
          if (snapshot.customPresets.some(row => row.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
            publish({ errorKey: 'presetDuplicate' }); return null;
          }
          if (snapshot.customPresets.length >= MAX_CUSTOM_PRESETS) {
            publish({ errorKey: 'presetFull' }); return null;
          }
          let id;
          do { id = `vw_${Date.now().toString(36)}_${(++nextPresetSerial).toString(36)}`; }
          while (snapshot.customPresets.some(row => row.id === id));
          const entries = [...snapshot.customPresets, { id, name, values: visualValues(snapshot) }];
          const persisted = saveCustomPresets(entries);
          publish({ customPresets: entries, selectedPresetId: `custom:${id}`,
            presetsPersisted: persisted, errorKey: persisted ? '' : 'presetSaveFailed' });
          return id;
        },
        updateCustomPreset(id) {
          const target = snapshot.customPresets.find(row => row.id === id);
          if (!target) { publish({ errorKey: 'presetMissing' }); return false; }
          const entries = snapshot.customPresets.map(row => row.id === id
            ? { ...row, values: visualValues(snapshot) } : row);
          const persisted = saveCustomPresets(entries);
          publish({ customPresets: entries, selectedPresetId: `custom:${id}`,
            presetsPersisted: persisted, errorKey: persisted ? '' : 'presetSaveFailed' });
          return persisted;
        },
        deleteCustomPreset(id) {
          if (!snapshot.customPresets.some(row => row.id === id)) return;
          const entries = snapshot.customPresets.filter(row => row.id !== id);
          const persisted = saveCustomPresets(entries);
          publish({ customPresets: entries, presetsPersisted: persisted,
            selectedPresetId: snapshot.selectedPresetId === `custom:${id}` ? null : snapshot.selectedPresetId,
            errorKey: persisted ? '' : 'presetSaveFailed' });
        },
        beginComparison() {
          publish({ compareBase: visualValues(snapshot), compareView: 'current' });
        },
        showComparison(mode) {
          if (mode !== 'current' && mode !== 'before') return;
          if (mode === 'before' && !snapshot.compareBase) return;
          publish({ compareView: mode });
        },
        restoreComparison() {
          if (!snapshot.compareBase) return;
          const restored = normalize({ ...snapshot, ...snapshot.compareBase,
            tint: snapshot.compareBase.regionChat });
          publish({ ...restored, compareBase: null, compareView: 'current',
            selectedPresetId: null, prefsPersisted: savePrefs(restored), errorKey: '' });
        },
        finishComparison() {
          publish({ compareBase: null, compareView: 'current' });
        },
        async chooseFile(kind, file) {
          if (!alive || !snapshot.ready || snapshot.busy || !Object.hasOwn(KEYS, kind)) return;
          if (classifyFile(file) !== kind) {
            publish({ errorKey: kind === 'image' ? 'invalidImage' : 'invalidVideo' });
            return;
          }
          if (file.size <= 0) { publish({ errorKey: 'emptyFile' }); return; }
          const token = ++generation;
          publish({ busy: true, errorKey: '' });
          const media = { blob: file, name: file.name, size: file.size };
          const next = normalize({ ...snapshot, mode: kind, ...(kind === 'video' ? { paused: false } : {}) });
          if (!snapshot.persistent) {
            if (alive && generation === token) publish({
              media: { ...snapshot.media, [kind]: media }, busy: false, mediaError: '',
              testPattern: false,
              ...next, prefsPersisted: savePrefs(next),
            });
            return;
          }
          try {
            await writeRecord(kind, { blob: file, name: file.name, type: file.type, savedAt: Date.now() });
            if (!alive || generation !== token) return;
            publish({
              media: { ...snapshot.media, [kind]: media }, busy: false, errorKey: '', mediaError: '',
              testPattern: false,
              ...next, prefsPersisted: savePrefs(next),
            });
          } catch {
            if (alive && generation === token) publish({ busy: false, errorKey: 'saveFailed' });
          }
        },
        async removeFile(kind) {
          if (!alive || !snapshot.ready || snapshot.busy || !Object.hasOwn(KEYS, kind)
            || !snapshot.media[kind]) return;
          const token = ++generation;
          publish({ busy: true, errorKey: '' });
          if (snapshot.persistent) {
            try { await deleteRecord(kind); }
            catch {
              if (alive && token === generation) publish({ busy: false, errorKey: 'removeFailed' });
              return;
            }
          }
          if (alive && generation === token) {
            const next = snapshot.mode === kind
              ? normalize({ ...snapshot, mode: 'off' }) : normalize(snapshot);
            publish({ busy: false, media: { ...snapshot.media, [kind]: null },
              errorKey: '', mediaError: '', ...next, prefsPersisted: savePrefs(next) });
          }
        },
        setRuntime(name, value) {
          if (!alive || !Object.hasOwn(snapshot.runtime, name)) return;
          if (Object.is(snapshot.runtime[name], value)) return;
          publish({ runtime: { ...snapshot.runtime, [name]: value } });
        },
        setMediaError(kind, failed) {
          const value = failed ? kind : '';
          if (snapshot.mode === kind && snapshot.mediaError !== value) publish({ mediaError: value });
        },
        dispose() {
          alive = false;
          generation += 1;
          listeners.clear();
        },
      };
      return controller;
    }

    // Each region paints on its own surface. The conversation root stays
    // transparent: tinting its ancestor would compound with header/body tint
    // and make the four sliders unable to control independent alpha values.
    // Selectors below use DSH's stable data hooks confirmed in v0.2.0-rc.2.
    const SHELL_CSS = `
[data-dsh-vw-stage] {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  contain: layout paint;
  background: var(--dsw-alias-bg-base);
}
[data-dsh-vw-stage] video, [data-dsh-vw-stage] img,
[data-dsh-vw-stage] .dsh-vw-pattern {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}
/* Keep the media plane geometrically fixed at ALL blur strengths.
   A backdrop layer blurs the already-painted image/video in place (edge
   sampling is clamped by Chromium), instead of magnifying media when blur
   flips from 0px to 1px. UI panels are stacked above the entire scene. */
[data-dsh-vw-stage] .dsh-vw-media-blur {
  position: absolute;
  inset: 0;
  pointer-events: none;
  user-select: none;
}
[data-dsh-vw-stage] .dsh-vw-dim {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
[data-dsh-vw-stage] .dsh-vw-pattern {
  background:
    repeating-linear-gradient(125deg, transparent 0px, transparent 140px, rgb(255 255 255 / 0.2) 140px, rgb(255 255 255 / 0.2) 210px),
    linear-gradient(110deg, #5125d6, #25c9b6 55%, #e8a13d);
}
/* Keep AppFrame's interactive children and native overlays above the stage. */
:where(:has(> [data-dsh-vw-stage])) > :where(div:not([data-dsh-vw-stage])) {
  position: relative;
  z-index: 1;
}
:where(:has(> [data-dsh-vw-stage])) > [data-rightbar-col] { z-index: 10; }
:where(:has(> [data-dsh-vw-stage])[data-rightbar-fullscreen]) > [data-rightbar-col] { z-index: 40; }
:where(:has(> [data-dsh-vw-stage])) > :is([class*="centerCol"], [data-rightbar-col]) {
  background: transparent !important;
}
/* The sidebar column paints alpha once; its inner root must not paint it again. */
:where(:has(> [data-dsh-vw-stage])) > [class*="sidebarCol"] {
  background: rgba(249, 250, 251, __DSH_VW_SIDEBAR_ALPHA__) !important;
  background: color-mix(in srgb, var(--dsw-specific-sidebar-fill) __DSH_VW_SIDEBAR_PCT__%, transparent) !important;
}
:root [data-slot="sidebar"] > div {
  background: transparent !important;
}
/* DSH ui-workspace's 24px list-end fade uses the fully opaque sidebar
   fill, even when a wallpaper makes the containing sidebar translucent.
   At the list's bottom it abruptly disappears and produces a bright white
   rectangle/line (confirmed from the user's old-version Desktop screenshot).
   Remove only this decorative fade while the wallpaper scene is mounted.
   The scrolling tree, row hit targets, and native scrollbar remain intact. */
:root [data-slot="sidebar.workspaces"] [class*="treeBody"] > span[class*="fade"] {
  display: none !important;
}
/* The list still scrolls. Tone down its thumb rather than hide accessibility
   affordances or alter the scrollbar gutter and column geometry. */
:root [data-slot="sidebar.workspaces"] [class*="treeBody"] > [class*="list"] {
  --dsh-scrollbar-thumb: color-mix(in srgb, var(--dsw-alias-label-secondary) 28%, transparent);
  --dsh-scrollbar-thumb-hover: color-mix(in srgb, var(--dsw-alias-label-secondary) 45%, transparent);
}
/* An open bottom dock uses the conversation body alpha, not the sidebar alpha. */
:where(:has(> [data-dsh-vw-stage])) > [data-shell-bottom] {
  background: rgba(249, 250, 251, __DSH_VW_CHAT_ALPHA__) !important;
}
/* The real ConversationMainPanel root used to hide the entire wallpaper.
   Do not tint this parent: the header and body are independently painted. */
:root [data-slot="main.conversation"] > [data-phase] {
  background: transparent !important;
}
/* Chat reading plane (not the root, not the inner scrolling text). */
:root [data-slot="main.conversation"] > [data-phase] > [data-conversation-content] {
  background: rgba(255, 255, 255, __DSH_VW_CHAT_ALPHA__) !important;
}
/* Global Plugins page is NOT a main.conversation region. Without a reading
   surface its text sits directly on the wallpaper and presets change mostly
   the media brightness there. Use the content-zone opacity for that page too.
   Background color alone: no backdrop-filter, transform, or position so fixed
   desktop chrome and dialogs keep their native containing block. */
:root [data-plugin-panel] {
  background: rgba(255, 255, 255, __DSH_VW_CHAT_ALPHA__) !important;
}
/* Top navigation: actual <header>, not the display:contents slot wrapper. */
:root [data-slot="main.conversation"] > [data-phase] > [data-slot="conversation.header"] > header {
  background: rgba(255, 255, 255, __DSH_VW_HEADER_ALPHA__) !important;
}
/* The footer scrim follows the body, while the input CARD has its own alpha.
   Preserve the original 36px transcript fade and existing input shadows. */
:root [data-slot="main.conversation"] [data-composer-seat] {
  background: linear-gradient(180deg, transparent 0px, rgba(255, 255, 255, __DSH_VW_CHAT_ALPHA__) 36px) !important;
}
/* InputBar exposes a stable DSH data marker; no CSS-module hash required. */
:root [data-slot="main.conversation"] [data-composer-card] {
  background: rgba(255, 255, 255, __DSH_VW_COMPOSER_ALPHA__) !important;
}
:root [data-slot="main.conversation"] [data-conversation-scroll] {
  background: transparent !important;
}
:is(html[data-ds-dark-theme], html[data-theme="dark"],
    body[data-ds-dark-theme], body[data-theme="dark"])
    [data-slot="main.conversation"] > [data-phase] > [data-conversation-content] {
  background: rgba(19, 21, 26, __DSH_VW_CHAT_ALPHA__) !important;
}
:is(html[data-ds-dark-theme], html[data-theme="dark"],
    body[data-ds-dark-theme], body[data-theme="dark"]) [data-plugin-panel] {
  background: rgba(19, 21, 26, __DSH_VW_CHAT_ALPHA__) !important;
}
:is(html[data-ds-dark-theme], html[data-theme="dark"],
    body[data-ds-dark-theme], body[data-theme="dark"])
    [data-slot="main.conversation"] > [data-phase] > [data-slot="conversation.header"] > header {
  background: rgba(19, 21, 26, __DSH_VW_HEADER_ALPHA__) !important;
}
:is(html[data-ds-dark-theme], html[data-theme="dark"],
    body[data-ds-dark-theme], body[data-theme="dark"])
    [data-slot="main.conversation"] [data-composer-seat] {
  background: linear-gradient(180deg, transparent 0px, rgba(19, 21, 26, __DSH_VW_CHAT_ALPHA__) 36px) !important;
}
:is(html[data-ds-dark-theme], html[data-theme="dark"],
    body[data-ds-dark-theme], body[data-theme="dark"])
    [data-slot="main.conversation"] [data-composer-card] {
  background: rgba(19, 21, 26, __DSH_VW_COMPOSER_ALPHA__) !important;
}
/* The Windows native titlebar stays outside the wallpaper. */
html[data-windows-titlebar] [data-dsh-vw-stage] {
  top: var(--dsh-windows-titlebar-height, 38px);
}
`;
    // Backdrop blur samples the pixels BEHIND the UI panel. It does not blur
    // the panel's child text or icons, unlike `filter` applied to a UI parent.
    // Keep it optional (and nonzero-only): backdrop-filter creates a stacking
    // context and can force an expensive compositing pass for animated video.
    // DSH content contains a nested composer card; that card's own frosted
    // backdrop is intentional and may appear stronger than the main chat area.
    const FROST_CSS = `
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  /* Windows SidebarRoot's toggle is position:fixed relative to the viewport.
     A backdrop-filter on its ancestor sidebarCol makes a NEW fixed-position
     containing block, displacing the toggle into the DeepSeek logo. Put the
     blur on a background-only pseudo-element instead; it cannot contain the
     fixed toggle. The sidebarCol already forms a positioned stacking context
     under the base SHELL_CSS. Its z-index:-1 pseudo paints above its own
     background but below the sidebar's ordinary content and controls. */
  :where(:has(> [data-dsh-vw-stage])) > [class*="sidebarCol"]::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
  }
  :where(:has(> [data-dsh-vw-stage])) > [class*="sidebarCol"]::before,
  /* Conversation content and header are siblings: no extra root blur layer. */
  :root [data-slot="main.conversation"] > [data-phase] > [data-conversation-content],
  :root [data-slot="main.conversation"] > [data-phase] > [data-slot="conversation.header"] > header,
  /* Frost the INPUT CARD, not the editor. Caret and text stay sharp. */
  :root [data-slot="main.conversation"] [data-composer-card] {
    -webkit-backdrop-filter: blur(__DSH_VW_PANEL_BLUR__px);
    backdrop-filter: blur(__DSH_VW_PANEL_BLUR__px);
  }
}
`;
    function shellCssForRegions(state) {
      const chat = state.testPattern ? 0.1 : state.regionChat;
      const header = state.testPattern ? 0.1 : state.regionHeader;
      const values = {
        CHAT: chat,
        SIDEBAR: state.regionSidebar,
        HEADER: header,
        COMPOSER: state.regionComposer,
      };
      let css = SHELL_CSS;
      for (const [name, value] of Object.entries(values)) {
        const alpha = clamp(value, 0, 1, 1);
        css = css.replaceAll(`__DSH_VW_${name}_ALPHA__`, String(alpha));
        if (name === 'SIDEBAR') {
          css = css.replaceAll('__DSH_VW_SIDEBAR_PCT__', String(Math.round(alpha * 100)));
        }
      }
      // Keep zero panel blur as a true opt-out: no extra backdrop-filter,
      // no extra backdrop stacking context, and no extra GPU blur pass.
      const panelBlur = clamp(state.panelBlur, 0, 12, 0);
      if (panelBlur > 0) css += FROST_CSS.replaceAll('__DSH_VW_PANEL_BLUR__', String(panelBlur));
      return css;
    }
    const FORM_CSS = `
.dsh-vw-settings {
  display: grid;
  gap: 12px;
  color: var(--dsw-alias-label-primary);
  padding: 0 0 24px;
  font-size: 13px;
  line-height: 1.55;
}
.dsh-vw-settings .dsh-vw-heading { font-size: 18px; font-weight: 600; }
.dsh-vw-settings .dsh-vw-muted { color: var(--dsw-alias-label-secondary); }
.dsh-vw-settings .dsh-vw-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dsh-vw-settings .dsh-vw-button, .dsh-vw-settings select {
  box-sizing: border-box;
  font: inherit;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}
.dsh-vw-settings .dsh-vw-button:focus-visible, .dsh-vw-settings input:focus-visible,
.dsh-vw-settings select:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dsh-vw-settings :disabled { opacity: .5; cursor: not-allowed; }
.dsh-vw-settings .dsh-vw-choice { display: inline-flex; align-items: center; gap: 8px; }
.dsh-vw-settings input[type="checkbox"] { accent-color: var(--dsw-alias-state-business-primary); }
.dsh-vw-settings .dsh-vw-slider { display: grid; grid-template-columns: minmax(112px, 1fr) minmax(90px, 2fr) 50px; align-items: center; gap: 10px; }
.dsh-vw-settings .dsh-vw-slider input { width: 100%; accent-color: var(--dsw-alias-state-business-primary); }
.dsh-vw-settings .dsh-vw-slider output { text-align: right; font-variant-numeric: tabular-nums; }
.dsh-vw-settings .dsh-vw-warning { color: var(--dsw-alias-state-warning-primary, var(--dsw-alias-label-primary)); }
.dsh-vw-settings .dsh-vw-file { overflow-wrap: anywhere; font-weight: 500; }
.dsh-vw-settings .dsh-vw-group { display: grid; gap: 8px; padding: 10px 0; border-top: 1px solid var(--dsw-alias-border-l3); }
.dsh-vw-settings .dsh-vw-grouphead { font-size: 13px; font-weight: 600; }
.dsh-vw-settings .dsh-vw-regions { display: grid; gap: 10px; padding: 12px; border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.dsh-vw-settings .dsh-vw-regions .dsh-vw-muted { font-size: 12px; }
.dsh-vw-settings .dsh-vw-regions .dsh-vw-actions { justify-content: flex-end; }
.dsh-vw-settings .dsh-vw-mode { display: flex; flex-wrap: wrap; gap: 8px; }
.dsh-vw-settings .dsh-vw-mode label { display: inline-flex; align-items: center; gap: 5px; }
.dsh-vw-settings .dsh-vw-mode input { accent-color: var(--dsw-alias-state-business-primary); }
.dsh-vw-settings input[type="file"] { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
.dsh-vw-settings .dsh-vw-filelabel { display: inline-flex; align-items: center; justify-content: center; }
.dsh-vw-settings .dsh-vw-filelabel[aria-disabled="true"] { opacity: .5; pointer-events: none; }
.dsh-vw-settings .dsh-vw-slider { min-width: 0; }
.dsh-vw-settings .dsh-vw-preview { border: 1px solid var(--dsw-alias-border-l3); border-radius: 10px; overflow: hidden; width: min(100%, 340px); }
.dsh-vw-settings .dsh-vw-preview img, .dsh-vw-settings .dsh-vw-preview video { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: var(--dsw-alias-bg-layer-1); }
.dsh-vw-settings .dsh-vw-status { background: var(--dsw-alias-bg-layer-1); border-radius: 8px; padding: 9px 11px; line-height: 1.5; overflow-wrap: anywhere; }
.dsh-vw-settings .dsh-vw-version { font-variant-numeric: tabular-nums; font-size: 11px; }
.dsh-vw-settings .dsh-vw-presets { display: grid; gap: 10px; padding: 12px; border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.dsh-vw-settings .dsh-vw-presets-head { font-size: 13px; font-weight: 600; }
.dsh-vw-settings .dsh-vw-presets-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
.dsh-vw-settings .dsh-vw-preset-looks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.dsh-vw-settings .dsh-vw-preset-look { min-width: 0; min-height: 76px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; text-align: left; gap: 5px; padding: 10px 9px; }
.dsh-vw-settings .dsh-vw-preset-look small { display: block; font-size: 11px; line-height: 1.4; font-weight: 400; white-space: normal; }
@media (max-width: 510px) { .dsh-vw-settings .dsh-vw-preset-looks { grid-template-columns: minmax(0, 1fr); } }
.dsh-vw-settings .dsh-vw-button[data-selected='true'] { border-color: var(--dsw-alias-state-business-primary); box-shadow: 0 0 0 1px var(--dsw-alias-state-business-primary); }
.dsh-vw-settings .dsh-vw-preset-save { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; }
.dsh-vw-settings .dsh-vw-preset-save input { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l3); border-radius: 8px; padding: 6px 10px; font: inherit; flex: 1 1 145px; min-width: 0; }
.dsh-vw-settings .dsh-vw-compare { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--dsw-alias-border-l3); border-radius: 10px; }
.dsh-vw-settings .dsh-vw-samples { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.dsh-vw-settings .dsh-vw-sample-column { display: grid; gap: 4px; min-width: 0; }
.dsh-vw-settings .dsh-vw-sample-heading { font-size: 12px; font-weight: 600; }
.dsh-vw-settings .dsh-vw-sample { position: relative; width: 100%; aspect-ratio: 16/10; border: 1px solid var(--dsw-alias-border-l3); border-radius: 8px; overflow: hidden; background: linear-gradient(125deg, #6054ab, #7bb9b9 55%, #deae83); isolation: isolate; }
.dsh-vw-settings .dsh-vw-sample-media, .dsh-vw-settings .dsh-vw-sample-darken, .dsh-vw-settings .dsh-vw-sample-blur { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
.dsh-vw-settings .dsh-vw-sample-side, .dsh-vw-settings .dsh-vw-sample-body, .dsh-vw-settings .dsh-vw-sample-header, .dsh-vw-settings .dsh-vw-sample-input { position: absolute; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l4); }
.dsh-vw-settings .dsh-vw-sample-side { inset: 0 auto 0 0; width: 29%; padding: 10px 6px; }
.dsh-vw-settings .dsh-vw-sample-body { inset: 20% 0 0 29%; padding: 9% 6%; }
.dsh-vw-settings .dsh-vw-sample-header { inset: 0 0 auto 29%; height: 20%; padding: 5px 8px; }
.dsh-vw-settings .dsh-vw-sample-input { inset: auto 4% 6% 34%; height: 19%; border-radius: 9px; padding: 5px 8px; }
.dsh-vw-settings .dsh-vw-sample-line { display: block; width: 90%; max-width: 100%; height: 4px; background: currentColor; opacity: 0.45; border-radius: 3px; margin: 5px 0; }
.dsh-vw-settings .dsh-vw-sample-line.short { width: 60%; }
.dsh-vw-settings .dsh-vw-sample-mark { display: block; width: 8px; height: 8px; border-radius: 50%; background: var(--dsw-alias-state-business-primary); opacity: .75; }
.dsh-vw-settings .dsh-vw-sample[aria-current='true'] { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
@media (max-width: 440px) { .dsh-vw-settings .dsh-vw-samples { grid-template-columns: minmax(0, 1fr); } }

@media (max-width: 560px) {
  .dsh-vw-settings .dsh-vw-slider { grid-template-columns: minmax(0, 1fr) minmax(90px, 2fr) 50px; gap: 6px; }
}
`;

    function useSnapshot(controller) {
      return React.useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
    }
    function useReducedMotion() {
      const query = '(prefers-reduced-motion: reduce)';
      const [reduced, setReduced] = React.useState(() =>
        typeof window.matchMedia === 'function' && window.matchMedia(query).matches);
      React.useEffect(() => {
        if (typeof window.matchMedia !== 'function') return undefined;
        const mql = window.matchMedia(query);
        const change = () => { setReduced(mql.matches); };
        mql.addEventListener?.('change', change);
        return () => { mql.removeEventListener?.('change', change); };
      }, []);
      return reduced;
    }
    function switchLine(t, label, value, onChange, disabled) {
      return h('label', { className: 'dsh-vw-choice' },
        h('input', { type: 'checkbox', checked: value, onChange: event => onChange(event.target.checked), disabled }),
        t(label));
    }
    function slider(t, label, value, min, max, step, display, onChange, disabled) {
      return h('label', { className: 'dsh-vw-slider' },
        h('span', null, t(label)),
        h('input', { type: 'range', min, max, step, value, onChange: event => onChange(Number(event.target.value)), disabled,
          'aria-label': t(label) }),
        h('output', null, display));
    }
    function MediaPicker({ kind, controller, state, t }) {
      const media = state.media[kind];
      const selectable = state.ready && !state.busy;
      const id = `dsh-vw-picker-${kind}`;
      const label = kind === 'image' ? 'image' : 'video';
      return h('div', { className: 'dsh-vw-group' },
        h('div', { className: 'dsh-vw-grouphead' }, t(label)),
        h('div', { className: 'dsh-vw-file' }, !state.ready ? t('loading')
          : media ? `${media.name}  ·  ${t('fileSize')}: ${formatSize(media.size)}`
            : t(kind === 'image' ? 'noImage' : 'noVideo')),
        h('div', { className: 'dsh-vw-actions' },
          h('input', {
            id, type: 'file', accept: kind === 'image' ? ACCEPT_IMAGE : ACCEPT_VIDEO,
            disabled: !selectable,
            onChange: event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void controller.chooseFile(kind, file);
            },
          }),
          h('label', { className: 'dsh-vw-button dsh-vw-filelabel', htmlFor: id,
            'aria-disabled': !selectable }, t(kind === 'image'
            ? (media ? 'replaceImage' : 'chooseImage')
            : (media ? 'replaceVideo' : 'chooseVideo'))),
          h('button', { className: 'dsh-vw-button', type: 'button',
            disabled: !selectable || !media,
            onClick: () => { void controller.removeFile(kind); },
          }, t(kind === 'image' ? 'removeImage' : 'removeVideo'))));
    }
    function useObjectSource(media) {
      const [source, setSource] = React.useState(null);
      React.useEffect(() => {
        if (!media) { setSource(null); return undefined; }
        const url = URL.createObjectURL(media.blob);
        setSource({ media, url });
        return () => { URL.revokeObjectURL(url); };
      }, [media]);
      return source?.media === media ? source.url : null;
    }
    function MediaPreview({ media, kind, t }) {
      const src = useObjectSource(media);
      if (!src) return null;
      return h('div', { className: 'dsh-vw-group' },
        h('div', { className: 'dsh-vw-grouphead' }, t('previewLabel')),
        h('div', { className: 'dsh-vw-preview' },
          kind === 'video'
            ? h('video', { src, controls: true, muted: true, playsInline: true,
              preload: 'metadata', 'aria-label': t('previewLabel') })
            : h('img', { src, alt: t('previewLabel'), draggable: false })));
    }
    // A/B thumbnails are intentionally synthetic UI chrome over the user's own
    // local media (if present): no private chat messages are ever duplicated.
    // Videos are NOT autoplayed, avoiding two live decoders on top of the main scene.
    function ComparisonSample({ values, source, kind, title, active }) {
      const tint = (alpha, sidebar) => `color-mix(in srgb, var(${sidebar
        ? '--dsw-specific-sidebar-fill' : '--dsw-alias-bg-base'}) ${Math.round(alpha * 100)}%, transparent)`;
      const frost = values.panelBlur > 0 ? `blur(${values.panelBlur}px)` : undefined;
      const surface = (alpha, sidebar) => ({ background: tint(alpha, sidebar),
        backdropFilter: frost, WebkitBackdropFilter: frost });
      // Match the live scene: the crop and media size never change with blur.
      const mediaStyle = { objectFit: values.fit, opacity: values.opacity };
      const mediaBlur = values.blur > 0 ? `blur(${values.blur}px)` : null;
      return h('div', { className: 'dsh-vw-sample-column' },
        h('div', { className: 'dsh-vw-sample-heading' }, title),
        h('div', { className: 'dsh-vw-sample', 'aria-current': active ? 'true' : 'false' },
          source && kind === 'image'
            ? h('img', { className: 'dsh-vw-sample-media', src: source, alt: '',
              draggable: false, style: mediaStyle })
            : source && kind === 'video'
              ? h('video', { className: 'dsh-vw-sample-media', src: source, muted: true,
                playsInline: true, preload: 'metadata', 'aria-hidden': true, style: mediaStyle })
              : null,
          source && mediaBlur ? h('div', { className: 'dsh-vw-sample-blur',
            'aria-hidden': true,
            style: { backdropFilter: mediaBlur, WebkitBackdropFilter: mediaBlur } }) : null,
          h('div', { className: 'dsh-vw-sample-darken',
            style: { backgroundColor: `rgba(0,0,0,${values.dim})` } }),
          h('div', { className: 'dsh-vw-sample-side', style: surface(values.regionSidebar, true) },
            h('span', { className: 'dsh-vw-sample-mark' }),
            h('span', { className: 'dsh-vw-sample-line' }),
            h('span', { className: 'dsh-vw-sample-line short' })),
          h('div', { className: 'dsh-vw-sample-body', style: surface(values.regionChat, false) },
            h('span', { className: 'dsh-vw-sample-line' }),
            h('span', { className: 'dsh-vw-sample-line short' }),
            h('span', { className: 'dsh-vw-sample-line' })),
          h('div', { className: 'dsh-vw-sample-header', style: surface(values.regionHeader, false) },
            h('span', { className: 'dsh-vw-sample-line short' })),
          h('div', { className: 'dsh-vw-sample-input', style: surface(values.regionComposer, false) },
            h('span', { className: 'dsh-vw-sample-line short' }))));
    }
    function ComparisonSamples({ state, t }) {
      const kind = state.mode === 'off' ? (state.media.image ? 'image' : 'video') : state.mode;
      const media = state.media[kind];
      const source = useObjectSource(media);
      const before = state.compareBase || visualValues(state);
      const current = visualValues(state);
      return h('div', { className: 'dsh-vw-samples', 'data-dsh-vw-compare-samples': '' },
        h(ComparisonSample, { values: before, kind, source,
          title: t('compareBefore'), active: state.compareView === 'before' && !!state.compareBase }),
        h(ComparisonSample, { values: current, kind, source,
          title: t('compareAfter'), active: state.compareView === 'current' }));
    }
    function PresetControls({ state, controller, t }) {
      const [name, setName] = React.useState('');
      const [deleteConfirm, setDeleteConfirm] = React.useState(null);
      const locked = !state.ready || state.busy;
      const active = state.selectedPresetId;
      const match = active?.startsWith('builtin:')
        ? BUILTIN_PRESETS[active.slice('builtin:'.length)]
        : active?.startsWith('custom:')
          ? state.customPresets.find(row => row.id === active.slice('custom:'.length))?.values
          : null;
      const dirty = Boolean(match && !equalVisual(visualValues(state), match));
      const activeName = active?.startsWith('builtin:')
        ? t(`preset${active.slice('builtin:'.length).replace(/^./, c => c.toUpperCase())}`)
        : active?.startsWith('custom:')
          ? state.customPresets.find(row => row.id === active.slice('custom:'.length))?.name
          : null;
      const selectedCustomId = active?.startsWith('custom:') ? active.slice('custom:'.length) : null;
      return h('div', { className: 'dsh-vw-presets', 'data-dsh-vw-presets': '' },
        h('div', { className: 'dsh-vw-presets-head' }, t('presetGroup')),
        h('div', { className: 'dsh-vw-muted' }, t('presetHelp')),
        h('div', { className: 'dsh-vw-preset-looks' },
          ...Object.keys(BUILTIN_PRESETS).map(id => {
            const key = `preset${id.replace(/^./, c => c.toUpperCase())}`;
            return h('button', {
              className: 'dsh-vw-button dsh-vw-preset-look', type: 'button', key: id,
              'data-dsh-vw-preset': id,
              'data-selected': active === `builtin:${id}`,
              disabled: locked, onClick: () => controller.applyPreset(`builtin:${id}`),
            }, h('strong', null, t(key)), h('small', null, t(`${key}Desc`)));
          })),
        h('div', { className: 'dsh-vw-muted', role: 'status' },
          `${t('presetCurrent')}: ${activeName || t('presetManual')}${dirty ? t('presetModified') : ''}`),
        h('div', { className: 'dsh-vw-presets-head' }, t('presetCustomTitle')),
        h('div', { className: 'dsh-vw-presets-buttons' },
          ...state.customPresets.map(row => h('button', {
            className: 'dsh-vw-button', type: 'button', key: row.id,
            'data-selected': active === `custom:${row.id}`,
            disabled: locked, onClick: () => {
              controller.applyPreset(`custom:${row.id}`);
              setDeleteConfirm(null);
            },
          }, row.name))),
        state.customPresets.length ? null
          : h('div', { className: 'dsh-vw-muted' }, t('presetNone')),
        h('div', { className: 'dsh-vw-preset-save' },
          h('input', { type: 'text', value: name, maxLength: 32,
            'aria-label': t('presetName'), placeholder: t('presetNamePlaceholder'),
            disabled: locked, onChange: event => setName(event.target.value) }),
          h('button', { className: 'dsh-vw-button', type: 'button',
            disabled: locked || !name.trim() || state.customPresets.length >= MAX_CUSTOM_PRESETS,
            onClick: () => { if (controller.saveCustomPreset(name)) setName(''); },
          }, t('presetSave'))),
        selectedCustomId ? h('div', { className: 'dsh-vw-actions' },
          h('button', { className: 'dsh-vw-button', type: 'button',
            disabled: locked || !dirty,
            onClick: () => controller.updateCustomPreset(selectedCustomId),
          }, t('presetOverwrite')),
          deleteConfirm === selectedCustomId
            ? h('button', { className: 'dsh-vw-button', type: 'button', disabled: locked,
              onClick: () => { controller.deleteCustomPreset(selectedCustomId); setDeleteConfirm(null); },
            }, t('presetDeleteConfirm'))
            : h('button', { className: 'dsh-vw-button', type: 'button', disabled: locked,
              onClick: () => setDeleteConfirm(selectedCustomId),
            }, t('presetDelete')),
          deleteConfirm === selectedCustomId
            ? h('button', { className: 'dsh-vw-button', type: 'button',
              onClick: () => setDeleteConfirm(null),
            }, t('presetCancel')) : null) : null,
        h('div', { className: 'dsh-vw-muted' }, t('presetLimit')),
        state.errorKey?.startsWith('preset')
          ? h('div', { className: 'dsh-vw-warning', role: 'alert' }, t(state.errorKey)) : null,
        !state.presetsPersisted ? h('div', { className: 'dsh-vw-warning', role: 'alert' },
          t('presetStorageFailed')) : null);
    }
    function CompareControls({ state, controller, t }) {
      const available = Boolean(state.compareBase);
      const changed = available && !equalVisual(state.compareBase, visualValues(state));
      const locked = !state.ready || state.busy;
      return h('div', { className: 'dsh-vw-compare', 'data-dsh-vw-compare': '' },
        h('div', { className: 'dsh-vw-grouphead' }, t('compareGroup')),
        h('div', { className: 'dsh-vw-muted' }, t('compareHelp')),
        h(ComparisonSamples, { state, t }),
        h('div', { className: 'dsh-vw-muted' }, t('compareMock')),
        !available ? h('div', { className: 'dsh-vw-muted' }, t('compareNotStarted')) : null,
        h('div', { className: 'dsh-vw-presets-buttons' },
          h('button', { className: 'dsh-vw-button', type: 'button',
            disabled: locked || !available, 'data-selected': state.compareView === 'before',
            onClick: () => controller.showComparison('before'),
          }, t('compareShowBefore')),
          h('button', { className: 'dsh-vw-button', type: 'button',
            disabled: locked || !available, 'data-selected': state.compareView === 'current',
            onClick: () => controller.showComparison('current'),
          }, t('compareShowAfter'))),
        h('div', { className: 'dsh-vw-muted', role: 'status' },
          !available ? t('compareNotStarted')
            : t(state.compareView === 'before' ? 'compareViewingBefore' : 'compareViewingCurrent')),
        h('div', { className: 'dsh-vw-actions' },
          h('button', { className: 'dsh-vw-button', type: 'button', disabled: locked,
            onClick: () => controller.beginComparison(),
          }, t('compareBegin')),
          h('button', { className: 'dsh-vw-button', type: 'button',
            disabled: locked || !changed, onClick: () => controller.restoreComparison(),
          }, t('compareRestore')),
          h('button', { className: 'dsh-vw-button', type: 'button', disabled: locked || !available,
            onClick: () => controller.finishComparison(),
          }, t('compareFinish'))));
    }
    function describeRuntime(state, t) {
      if (!state.ready) return t('runtimeStarting');
      if (state.testPattern) return state.runtime.stage ? t('runtimePattern') : t('runtimeLoading');
      if (state.mode === 'off') return t('runtimeOff');
      if (!state.media[state.mode]) return t('runtimeMissing');
      if (!state.runtime.overlay) return t('runtimeNoSlot');
      if (!state.runtime.frame) return t('runtimeNoFrame');
      if (!state.runtime.stage) return t('runtimeNoStage');
      if (state.runtime.media === 'error' || state.mediaError) return t('runtimeFailed');
      if (state.runtime.media === 'ready') return t('runtimeLoaded');
      return t('runtimeLoading');
    }
    function SettingsRow({ controller, t }) {
      const state = useSnapshot(controller);
      const reduced = useReducedMotion();
      const canPlay = state.ready && !state.busy && state.media.video && state.mode === 'video';
      const previewKind = state.mode === 'image' || state.mode === 'video'
        ? state.mode : state.media.image ? 'image' : 'video';
      const previewMedia = state.media[previewKind];
      return h('section', { className: 'dsh-vw-settings', 'aria-label': t('title') },
        h('style', null, FORM_CSS),
        h('div', { className: 'dsh-vw-heading' }, t('title')),
        h('div', { className: 'dsh-vw-muted' }, t('description')),
        h('div', { className: 'dsh-vw-grouphead' }, t('mode')),
        h('div', { className: 'dsh-vw-mode', role: 'radiogroup', 'aria-label': t('mode') },
          ...['off', 'image', 'video'].map(mode =>
            h('label', { key: mode },
              h('input', { type: 'radio', name: 'dsh-vw-mode', value: mode,
                checked: state.mode === mode, disabled: !state.ready || state.busy,
                onChange: () => controller.setOption('mode', mode) }), t(mode)))),
        h(MediaPicker, { kind: 'image', controller, state, t }),
        h(MediaPicker, { kind: 'video', controller, state, t }),
        h('div', { className: 'dsh-vw-muted' }, t('selectHint')),
        h('label', { className: 'dsh-vw-choice' },
          h('input', { type: 'checkbox', checked: state.testPattern,
            onChange: () => controller.toggleTestPattern(), disabled: !state.ready }),
          t('testPattern')),
        h('div', { className: 'dsh-vw-muted' }, t('testPatternHint')),
        previewMedia ? h(MediaPreview, { media: previewMedia, kind: previewKind, t }) : null,
        h(PresetControls, { state, controller, t }),
        h('div', { className: 'dsh-vw-status', role: 'status', 'data-dsh-vw-diagnostic': '' },
          h('strong', null, `${t('runtimeLabel')}: `), describeRuntime(state, t)),
        h('div', { className: 'dsh-vw-muted dsh-vw-version', 'data-dsh-vw-paint': '' },
          `${t('paintStatus')}: ${state.runtime.mainSurface || '-'}`),
        h('div', { className: 'dsh-vw-muted dsh-vw-version' }, `${t('runtimeVersion')}: ${PLUGIN_VERSION}`),
        h('div', { className: 'dsh-vw-actions' },
          h('button', { className: 'dsh-vw-button', type: 'button', disabled: !canPlay,
            onClick: () => controller.setOption('paused', !state.paused) },
          state.paused ? t('play') : t('pause'))),
        state.busy ? h('div', { className: 'dsh-vw-muted', role: 'status' }, t('busy')) : null,
        slider(t, 'dim', state.dim, 0, 0.7, 0.01, `${Math.round(state.dim * 100)}%`,
          v => controller.setOption('dim', v), !state.ready || state.busy),
        slider(t, 'blur', state.blur, 0, 20, 1, `${state.blur}px`,
          v => controller.setOption('blur', v), !state.ready || state.busy),
        slider(t, 'panelBlur', state.panelBlur, 0, 12, 1, `${state.panelBlur}px`,
          v => controller.setOption('panelBlur', v), !state.ready || state.busy),
        h('div', { className: 'dsh-vw-muted' }, t('panelBlurHelp')),
        slider(t, 'opacity', state.opacity, 0.15, 1, 0.01, `${Math.round(state.opacity * 100)}%`,
          v => controller.setOption('opacity', v), !state.ready || state.busy),
        h('div', { className: 'dsh-vw-muted' }, t('opacityHelp')),
        h('div', { className: 'dsh-vw-regions', 'data-dsh-vw-regions': '' },
          h('div', { className: 'dsh-vw-grouphead' }, t('regionGroup')),
          h('div', { className: 'dsh-vw-muted' }, t('regionHelp')),
          ...['regionChat', 'regionSidebar', 'regionHeader', 'regionComposer'].map(key =>
            slider(t, key, state[key], 0, 1, 0.01, `${Math.round(state[key] * 100)}%`,
              v => controller.setOption(key, v), !state.ready || state.busy)),
          h('div', { className: 'dsh-vw-actions' },
            h('button', { type: 'button', className: 'dsh-vw-button',
              disabled: !state.ready || state.busy,
              onClick: () => controller.resetRegions(),
            }, t('regionReset'))),
          h('div', { className: 'dsh-vw-muted' }, t('regionNote'))),
        h('label', { className: 'dsh-vw-choice' },
          h('span', null, `${t('fit')}: `),
          h('select', { value: state.fit, disabled: !state.ready || state.busy,
            onChange: event => controller.setOption('fit', event.target.value) },
            h('option', { value: 'cover' }, t('cover')),
            h('option', { value: 'contain' }, t('contain')))),
        h(CompareControls, { state, controller, t }),
        switchLine(t, 'motion', state.allowReducedMotion,
          v => controller.setOption('allowReducedMotion', v), !state.ready || state.busy),
        reduced && !state.allowReducedMotion && state.mode === 'video'
          ? h('div', { className: 'dsh-vw-muted' }, t('reduced')) : null,
        !state.persistent ? h('div', { className: 'dsh-vw-warning', role: 'status' }, t('memory')) : null,
        !state.prefsPersisted ? h('div', { className: 'dsh-vw-warning', role: 'status' }, t('prefsFailed')) : null,
        state.errorKey && !state.errorKey.startsWith('preset')
          ? h('div', { className: 'dsh-vw-warning', role: 'alert' }, t(state.errorKey)) : null,
        state.mediaError ? h('div', { className: 'dsh-vw-warning', role: 'alert' },
          t(state.mediaError === 'image' ? 'imageFailed' : 'playbackFailed')) : null,
        h('div', { className: 'dsh-vw-muted' }, t('preview')),
        h('div', { className: 'dsh-vw-muted' }, t('local')));
    }

    function VideoSurface({ controller, state, src }) {
      const videoRef = React.useRef(null);
      const reduced = useReducedMotion();
      React.useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return undefined;
        let cancelled = false;
        const playOrPause = () => {
          if (state.paused || document.hidden || (reduced && !state.allowReducedMotion)) {
            video.pause();
            return;
          }
          let promise;
          try { promise = video.play(); }
          catch { controller.setMediaError('video', true); return; }
          if (promise && typeof promise.then === 'function') {
            promise.then(() => { if (!cancelled) controller.setMediaError('video', false); })
              .catch(error => {
                if (!cancelled && error?.name !== 'AbortError') controller.setMediaError('video', true);
              });
          }
        };
        playOrPause();
        document.addEventListener('visibilitychange', playOrPause);
        return () => {
          cancelled = true;
          document.removeEventListener('visibilitychange', playOrPause);
          video.pause();
        };
      }, [controller, src, state.paused, state.allowReducedMotion, reduced]);
      return h('video', {
        ref: videoRef,
        src, loop: true, muted: true, playsInline: true, preload: 'auto',
        'aria-hidden': true, onError: () => { controller.setMediaError('video', true); controller.setRuntime('media', 'error'); },
        onCanPlay: () => { controller.setMediaError('video', false); controller.setRuntime('media', 'ready'); },
        style: {
          objectFit: state.fit,
          opacity: state.opacity,
          // No transform or per-media filter: the sibling backdrop blurs in
          // place without zooming or exposing a pale edge halo.
        },
      });
    }
    function ImageSurface({ controller, state, src }) {
      return h('img', {
        src, alt: '', 'aria-hidden': true, draggable: false,
        onError: () => { controller.setMediaError('image', true); controller.setRuntime('media', 'error'); },
        onLoad: () => { controller.setMediaError('image', false); controller.setRuntime('media', 'ready'); },
        style: {
          objectFit: state.fit,
          opacity: state.opacity,
          // No transform or per-media filter: the sibling backdrop blurs in
          // place without zooming or exposing a pale edge halo.
        },
      });
    }
    function WallpaperScene({ controller, state, src, frame }) {
      React.useEffect(() => {
        controller.setRuntime('stage', true);
        return () => { controller.setRuntime('stage', false); };
      }, [controller]);
      React.useEffect(() => {
        // Source-backed structural check: the real root has an opaque
        // background unless our painting-element rule overrides it.
        const root = frame.querySelector('[data-slot="main.conversation"] > [data-phase] > [data-conversation-content]');
        let color = 'main conversation not mounted';
        if (root) {
          try { color = window.getComputedStyle(root).backgroundColor; }
          catch { color = 'computed style unavailable'; }
        }
        controller.setRuntime('mainSurface', color);
      }, [controller, frame, state.regionChat, state.testPattern]);
      return h('div', { 'data-dsh-vw-stage': '' },
        state.testPattern ? h('div', { className: 'dsh-vw-pattern', 'aria-hidden': true })
          : state.mode === 'video'
            ? h(VideoSurface, { controller, state, src })
            : h(ImageSurface, { controller, state, src }),
        !state.testPattern && state.blur > 0 && src
          ? h('div', { className: 'dsh-vw-media-blur', 'aria-hidden': true,
            style: { backdropFilter: `blur(${state.blur}px)`,
              WebkitBackdropFilter: `blur(${state.blur}px)` } }) : null,
        h('div', { className: 'dsh-vw-dim', style: {
          background: `rgba(0, 0, 0, ${state.testPattern ? 0 : state.dim})`,
        } }));
    }
    function WallpaperHost({ controller }) {
      const state = useSnapshot(controller);
      const [frame, setFrame] = React.useState(null);
      const anchor = React.useRef(null);
      React.useEffect(() => {
        const element = anchor.current;
        const layer = element?.closest('[data-shell-overlay]');
        const resolvedFrame = layer?.parentElement || null;
        controller.setRuntime('overlay', true);
        controller.setRuntime('frame', Boolean(resolvedFrame));
        setFrame(resolvedFrame);
        return () => {
          controller.setRuntime('frame', false);
          controller.setRuntime('overlay', false);
        };
      }, [controller]);
      const media = state.mode === 'off' ? null : state.media[state.mode];
      const src = useObjectSource(media);
      // Switch the live painted backdrop, not the saved controls, during A/B.
      // The user's latest saved appearance remains in `state` and slider values.
      const painted = state.compareView === 'before' && state.compareBase
        ? { ...state, ...state.compareBase } : state;
      React.useEffect(() => {
        controller.setRuntime('media', state.testPattern ? 'pattern' : media ? 'loading' : 'idle');
      }, [controller, media, state.testPattern]);
      return h(React.Fragment, null,
        h('span', { ref: anchor, style: { display: 'none', pointerEvents: 'none' }, 'aria-hidden': true }),
        frame && state.ready && (state.testPattern || (media && src))
          ? ReactDOM.createPortal(h(React.Fragment, null,
            h('style', { 'data-dsh-vw-styles': '' },
              shellCssForRegions(painted)),
            h(WallpaperScene, { controller, state: painted, src, frame })), frame)
          : null);
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const controller = makeController();
        ctx.effect(() => {
          void controller.start();
          return () => { controller.dispose(); };
        }, 'local-wallpaper: browser storage');
        ctx.effect(() => ctx.locale.register('local.video-wallpaper', { zh: ZH, en: EN }),
          'local-wallpaper: dictionaries');
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay', id: 'local-video-wallpaper', order: -100,
        }, () => h(WallpaperHost, { controller })));
        // Standalone Settings navigation page, directly after General (order 0).
        // The shell resolves this label thunk on locale changes; the page
        // receives its translation function from the registration's locale.
        const t = ctx.locale.bind('local.video-wallpaper');
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'wallpaper',
          order: 5,
          label: () => t('title'),
          locale: 'local.video-wallpaper',
        }, ({ t: translate }) => h(SettingsRow, { controller, t: translate })));
      },
    };
  },
});
