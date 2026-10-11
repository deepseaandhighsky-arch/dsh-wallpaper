/* Optional Chromium computed-style integration smoke (no DSH runtime required).
 * Models the documented v0.2.0-rc.2 AppFrame + slot data-marker DOM.
 * It cannot replace testing against the actual Electron Desktop window.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const src = await readFile(join(root, 'client.js'), 'utf8');
const match = src.match(/const SHELL_CSS = `([\s\S]*?)`;/);
const frost = src.match(/const FROST_CSS = `([\s\S]*?)`;/);
assert.ok(match && frost, 'Missing regional or frosted-glass CSS templates');
const cssFor = (settings, panelBlur=0) => {
  let css = match[1];
  for (const [name, alpha] of Object.entries(settings)) {
    css = css.replaceAll(`__DSH_VW_${name}_ALPHA__`, String(alpha));
    if (name === 'SIDEBAR') css = css.replaceAll('__DSH_VW_SIDEBAR_PCT__', String(Math.round(alpha*100)));
  }
  if (panelBlur > 0) css += frost[1].replaceAll('__DSH_VW_PANEL_BLUR__', String(Math.min(panelBlur, 12)));
  assert.doesNotMatch(css, /__DSH_VW_/);
  return css;
};
const base = { CHAT: 0.25, HEADER:0.65, SIDEBAR:0.85, COMPOSER:0.91 };
const firstCss = cssFor(base,0);
const secondCss = cssFor({ ...base, CHAT: .51, HEADER: .18, SIDEBAR: .35, COMPOSER: .44 },6);
const html = `<!doctype html><html data-windows-titlebar><head><meta charset="utf-8"><style>
:root{--dsw-alias-bg-base:#f9fafb;--dsw-specific-sidebar-fill:rgb(245,246,248);--dsh-windows-titlebar-height:38px}
body{margin:0}
.frame{position:relative;display:grid;grid-template-columns:200px 1fr;grid-template-rows:minmax(0,1fr);box-sizing:border-box;padding-top:38px;width:960px;height:600px;background:rgb(249,250,251)}
._sidebarCol{background:rgb(245,246,248);grid-row:1}
._sidebarRoot{height:100%;background:rgb(245,246,248)}
._toggle{position:fixed;top:5px;left:12px;width:28px;height:28px;z-index:30;background:#00dd88}
._centerCol{min-width:0;background:rgb(249,250,251)}
[data-slot]{display:contents}
[data-phase]{height:100%;display:flex;flex-direction:column;background:rgb(255,255,255)}
[data-slot="conversation.header"]>header{height:80px;display:block}
[data-conversation-content]{flex:1;display:block}
[data-composer-card]{height:95px;background:rgb(255,255,255)}
[data-composer-seat]{position:absolute;bottom:0;right:40px;left:250px;}
</style><style id="wallpaper">${firstCss}</style></head><body>
<div class="frame" id="frame">
  <div class="_sidebarCol" id="sideCol"><div data-slot="sidebar"><div id="sideRoot" class="_sidebarRoot">Sidebar<button class="_toggle" id="toggle">+</button></div></div></div>
  <div class="_centerCol" id="center"><div data-slot="main"><div data-slot="main.conversation">
    <div data-phase="active" id="conversation"><div data-slot="conversation.header"><header id="header">Header tabs</header></div>
      <div data-conversation-content id="chat"><div data-conversation-scroll>Body text</div>
        <div data-composer-seat id="floor"><div data-slot="conversation.composer.bar"><div><div id="composer" data-composer-card><div data-composer-input>Type</div></div></div></div></div>
      </div>
    </div>
  </div></div></div>
  <section id="pluginsPage" data-plugin-panel style="height:1px;overflow:hidden" aria-hidden="true">Plugins page text</section>
  <div data-shell-overlay></div>
  <div data-dsh-vw-stage style="background:linear-gradient(to right,#7143df,#25c9b6)"></div>
</div>
<pre id="result"></pre><script>
const styles=()=>{
 const ids=['conversation','chat','header','sideCol','sideRoot','composer','floor','center','pluginsPage'];
 const regions=Object.fromEntries(ids.map(x=>[x,{
   bg:getComputedStyle(document.getElementById(x)).backgroundColor,
   frost:getComputedStyle(document.getElementById(x)).backdropFilter
 }]));
 const sidebar=document.getElementById('sideCol');
 return {...regions,
   sidebarPseudoFrost:getComputedStyle(sidebar,'::before').backdropFilter,
   sidebarPseudoHit:getComputedStyle(sidebar,'::before').pointerEvents,
   toggleTop:document.getElementById('toggle').getBoundingClientRect().top
 };
};
const first=styles();
document.getElementById('wallpaper').textContent=${JSON.stringify(secondCss)};
const second=styles();
document.documentElement.setAttribute('data-fullscreen','');
const fullscreen=styles();
document.documentElement.removeAttribute('data-fullscreen');
document.getElementById('sideRoot').classList.add('collapsed');
const collapsed=styles();
document.getElementById('sideRoot').classList.remove('collapsed');
document.documentElement.setAttribute('data-ds-dark-theme','');
const dark=styles();
document.getElementById('wallpaper').remove();
const disabled=styles();
document.getElementById('result').textContent=JSON.stringify({first,second,fullscreen,collapsed,dark,disabled});
</script></body></html>`;
const dir=await mkdtemp(join(tmpdir(),'dsh-vw-css-'));
try{
  const file=join(dir,'test.html');
  await writeFile(file,html);
  const bin=process.env.CHROME_BIN ?? 'chromium';
  const args=['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--virtual-time-budget=500','--dump-dom',`--user-data-dir=${join(dir,'chromium')}`,`file://${file}`];
  const child=spawnSync(bin,args,{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  if(child.error) throw child.error;
  if(child.status !== 0) throw new Error(`Chromium exit ${child.status}: ${child.stderr.slice(-600)}`);
  const out=child.stdout.match(/<pre id="result">([^<]*)<\/pre>/);
  if(!out) throw new Error(`No browser result: ${child.stdout.slice(-500)}`);
  const data=JSON.parse(out[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
  const near=(input,target,tolerance=.015)=>{
    const m=/rgba?\([^,]+,[^,]+,[^,]+,?\s*([^,)]*)/.exec(input);
    assert.ok(m,`Not an RGB color: ${input}`);
    const alpha= input.startsWith('rgb(') ? 1 : Number(m[1]);
    assert.ok(Math.abs(alpha-target)<tolerance,`Expected ${target} from ${input}, got ${alpha}`);
  };
  for(const [field,n] of Object.entries({chat:.25,header:.65,sideCol:.85,composer:.91})){near(data.first[field].bg,n)}
  for(const [field,n] of Object.entries({chat:.51,header:.18,sideCol:.35,composer:.44})){near(data.second[field].bg,n)}
  assert.equal(data.first.conversation.bg,'rgba(0, 0, 0, 0)');
  assert.equal(data.first.sideRoot.bg,'rgba(0, 0, 0, 0)');
  assert.equal(data.second.sideRoot.bg,'rgba(0, 0, 0, 0)');
  near(data.dark.chat.bg,.51);
  near(data.dark.header.bg,.18);
  near(data.dark.composer.bg,.44);
  assert.equal(data.disabled.conversation.bg,'rgb(255, 255, 255)');
  assert.equal(data.disabled.composer.bg,'rgb(255, 255, 255)');
  near(data.first.pluginsPage.bg,.25);
  near(data.second.pluginsPage.bg,.51);
  near(data.dark.pluginsPage.bg,.51);
  assert.equal(data.disabled.pluginsPage.bg,'rgba(0, 0, 0, 0)');
  assert.equal(data.second.pluginsPage.frost,'none','the Plugins page must not become a fixed-position backdrop container');
  for (const key of ['chat','header','composer']) {
    assert.equal(data.first[key].frost, 'none', key+' should not blur by default');
    assert.match(data.second[key].frost, /blur\(6px\)/, key+' should use frosted material blur');
    assert.equal(data.disabled[key].frost, 'none', key+' should restore when style removed');
  }
  assert.equal(data.first.sideCol.frost,'none','side column must not become a fixed-position containing block');
  assert.equal(data.second.sideCol.frost,'none','sidebar parent should never have backdrop-filter');
  assert.match(data.second.sidebarPseudoFrost,/blur\(6px\)/,'sidebar-only pseudo-element should be frosted');
  assert.equal(data.second.sidebarPseudoHit,'none','sidebar frost must never intercept clicks');
  assert.equal(data.disabled.sidebarPseudoFrost,'none','disabled wallpaper restores original sidebar');
  for(const state of [data.first,data.second,data.fullscreen,data.collapsed,data.dark,data.disabled]){
    assert.equal(state.toggleTop,5,'fixed sidebar toggle moved from viewport top when changing frosted material');
  }
  for (const key of ['conversation','sideRoot']) assert.equal(data.second[key].frost,'none');
  console.log('Chromium opacity + frosted material smoke passed:',JSON.stringify(data));
}finally{await rm(dir,{recursive:true,force:true});}
