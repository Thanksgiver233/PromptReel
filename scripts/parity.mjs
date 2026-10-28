/**
 * 一致性校验：浏览器版（index.html）与 CLI 版（shared/engine.mjs）必须产出完全相同的提示词。
 * 两者共用 src/ 数据，但组装逻辑各有一份，这个脚本防止它们悄悄分叉。
 *
 *   node scripts/parity.mjs
 *
 * 依赖本机 Chrome / Edge；找不到浏览器时只做 CLI 侧自检。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PLATFORMS, compose } from '../shared/engine.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
];

const CASE = {
  brief: '雨夜霓虹街头，一位女黑客穿过人群，抬头看见全息鲸鱼游过楼宇之间',
  subject: '一位穿黑色长风衣的年轻女黑客，短发被雨水打湿',
  action: '她从人群中快步穿过,忽然停下脚步抬头仰望,雨水顺着脸颊滑落,瞳孔里映出蓝紫色光斑',
  scene: '午夜赛博都市街道，两侧霓虹招牌，地面积水倒映灯光',
  mood: '孤独而震撼',
  styles: ['赛博朋克', '电影级写实'],
  lights: ['霓虹侧光', '雨夜反光'],
  cameras: ['缓慢推近', '环绕主体'],
  ratio: '16:9',
  shots: 3,
  audio: '雨声、远处车流',
  music: '低频合成器 Pad',
  negative: '画面模糊，人物变形，多余手指'
};

const browser = BROWSERS.find(p => fs.existsSync(p));
if (!browser) {
  console.log('· 未找到 Chrome/Edge，跳过浏览器侧比对，仅做 CLI 自检');
  let bad = 0;
  for (const p of PLATFORMS) {
    const r = compose({ ...CASE, platform: p.id, duration: p.durations[0] });
    if (!r.overall || r.overall.includes('undefined') || r.shots.length !== CASE.shots) bad++;
  }
  console.log(bad ? `✗ ${bad} 个平台输出异常` : `✓ CLI 侧 ${PLATFORMS.length} 个平台输出正常`);
  process.exit(bad ? 1 : 0);
}

/* 1. 浏览器侧：把每个平台的输出打到 <pre> 里 */
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const inject = `<script>
(function(){
  var out = [];
  state.form = Object.assign({}, state.form, ${JSON.stringify(CASE)});
  state.apps.forEach(function(a){
    state.currentId = a.id;
    state.form.duration = a.durations[0];
    generate();
    out.push({id:a.id, overall:state.result.overall, neg:state.result.negative, audio:state.result.audio, music:state.result.music,
              shots:state.result.shots.map(function(s){return s.prompt;})});
  });
  var pre = document.createElement('pre');
  pre.id = 'parity';
  pre.textContent = 'PARITY_START' + JSON.stringify(out) + 'PARITY_END';
  document.body.appendChild(pre);
})();
<\/script></body>`;

const tmp = path.join(root, '_parity.html');
fs.writeFileSync(tmp, html.replace('</body>', inject));

let dom;
try {
  dom = execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--virtual-time-budget=4000',
    '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')
  ], { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
} finally {
  fs.unlinkSync(tmp);
}

const i = dom.lastIndexOf('PARITY_START');
const j = dom.lastIndexOf('PARITY_END');
if (i < 0 || j < 0 || j < i) { console.error('✗ 浏览器侧未产出结果'); process.exit(1); }
const browserOut = JSON.parse(dom.slice(i + 'PARITY_START'.length, j));

/* 2. 逐平台比对 */
let fail = 0;
for (const b of browserOut) {
  const p = PLATFORMS.find(x => x.id === b.id);
  const cli = compose({ ...CASE, platform: b.id, duration: p.durations[0] });
  const pairs = [
    ['overall', b.overall, cli.overall],
    ['negative', b.neg, cli.negative],
    ['audio', b.audio, cli.audio],
    ['music', b.music, cli.music],
    ...b.shots.map((s, i) => [`shot${i + 1}`, s, cli.shots[i] && cli.shots[i].prompt])
  ];
  for (const [k, a, c] of pairs) {
    if ((a || '') !== (c || '')) {
      fail++;
      console.log(`✗ ${b.id}.${k}`);
      console.log(`   browser: ${String(a).slice(0, 120)}`);
      console.log(`   cli    : ${String(c).slice(0, 120)}`);
    }
  }
}

if (fail) {
  console.log(`\n✗ ${fail} 处不一致，请同步 index.html 与 shared/engine.mjs`);
  process.exit(1);
}
console.log(`✓ ${browserOut.length} 个平台 · 浏览器版与 CLI 版输出完全一致`);
