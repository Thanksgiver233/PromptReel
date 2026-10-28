/**
 * 构建：把 src/ 下的源文件注入 index.html，并导出供 CLI / MCP 使用的 JSON。
 *
 *   src/theme.css     → index.html 的 <style>
 *   src/lexicon.js    → LEXICON:START / END 之间
 *   src/platforms.js  → PLATFORMS:START / END 之间
 *   src/*.js          → shared/platforms.json, shared/lexicon.json
 *
 * index.html 始终是可独立打开的单文件产物。
 * 用法： node scripts/build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const htmlPath = path.join(root, 'index.html');

let html = read('index.html');
const before = html.length;

/* ---------- 1. 样式 ---------- */
const css = read('src/theme.css');
if (!/<style>[\s\S]*?<\/style>/.test(html)) fail('index.html 中未找到 <style> 块');
html = html.replace(/<style>[\s\S]*?<\/style>/, () => `<style>\n${css}\n</style>`);

/* ---------- 2. 注入标记区间 ---------- */
function inject(html, name, source, label) {
  const START = `/* ${name}:START`;
  const END = `/* ${name}:END */`;
  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s < 0 || e < 0 || e < s) fail(`index.html 中未找到 ${name} 标记区间`);
  const head = `/* ${name}:START —— 由 src/${label} 注入，改内容请改源文件后运行 node scripts/build.mjs */\n`;
  return html.slice(0, s) + head + source.trim() + '\n\n' + html.slice(e);
}

const lexicon = read('src/lexicon.js');
const platforms = read('src/platforms.js');
html = inject(html, 'LEXICON', lexicon, 'lexicon.js');
html = inject(html, 'PLATFORMS', platforms, 'platforms.js');

fs.writeFileSync(htmlPath, html, 'utf8');

/* ---------- 3. 导出 JSON（给 CLI / MCP 用） ---------- */
const load = (src, expr) => new Function(`${src}\nreturn ${expr};`)();
const sharedDir = path.join(root, 'shared');
fs.mkdirSync(sharedDir, { recursive: true });

const lexData = load(lexicon, '{ STYLES, LIGHTS, CAMERAS, SHOT_EN }');
fs.writeFileSync(path.join(sharedDir, 'lexicon.json'), JSON.stringify(lexData, null, 2) + '\n', 'utf8');

const platData = load(platforms, 'PLATFORMS');
fs.writeFileSync(path.join(sharedDir, 'platforms.json'), JSON.stringify(platData, null, 2) + '\n', 'utf8');

/* ---------- 报告 ---------- */
const kb = n => (n / 1024).toFixed(1) + 'KB';
console.log(`✓ theme.css      ${kb(css.length)}`);
console.log(`✓ lexicon.js     ${kb(lexicon.length)}  → shared/lexicon.json`);
console.log(`✓ platforms.js   ${kb(platforms.length)}  → shared/platforms.json (${platData.length} 个平台)`);
console.log(`✓ index.html     ${kb(before)} → ${kb(html.length)}`);

function fail(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}
