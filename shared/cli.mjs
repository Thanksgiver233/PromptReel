#!/usr/bin/env node
/**
 * PromptReel CLI — 在终端里为任意视频模型生成适配的提示词 / 分镜
 *
 *   node shared/cli.mjs --list
 *   node shared/cli.mjs --platform kling --brief "雨夜霓虹街头，女黑客抬头看见全息鲸鱼" --shots 4
 *   node shared/cli.mjs --platform all --brief "..." --format json
 *   node shared/cli.mjs --platform hailuo --subject "..." --action "推门,回头,落泪" --shots 3 --format md
 *
 * 参数：
 *   --platform, -p   平台 id 或名称（kling / seedance / hailuo / minimax-h3 / muse /
 *                    wan / hunyuan / qingying / vidu / pixverse / runway / luma /
 *                    pika / sora / veo），或 all
 *   --brief, -b      一句话创意
 *   --subject        画面主体
 *   --action         动作与情节（逗号分隔会被拆成多个分镜）
 *   --scene          场景环境
 *   --mood           情绪基调
 *   --style          视觉风格，逗号分隔，最多 3 个
 *   --light          光影氛围，逗号分隔，最多 2 个
 *   --camera         运镜偏好，逗号分隔，最多 2 个
 *   --ratio          画幅，如 16:9
 *   --duration, -d   单条时长（秒）
 *   --shots, -n      分镜数量 1-8
 *   --audio          音效 / 对白
 *   --music          配乐
 *   --negative       负向提示词（传 "" 可清空）
 *   --format, -f     md | json | text（默认 text）
 *   --out, -o        写入文件
 */
import fs from 'node:fs';
import { compose, composeAll, listPlatforms, toMarkdown, PLATFORMS } from './engine.mjs';

const argv = process.argv.slice(2);
const alias = {
  p: 'platform', b: 'brief', d: 'duration', n: 'shots', f: 'format', o: 'out',
  s: 'subject', a: 'action'
};
const opts = {};
for (let i = 0; i < argv.length; i++) {
  const k = argv[i];
  if (!k.startsWith('-')) continue;
  const key = k.replace(/^--?/, '');
  const name = alias[key] || key;
  const next = argv[i + 1];
  if (next === undefined || next.startsWith('--')) { opts[name] = true; }
  else { opts[name] = next; i++; }
}

if (opts.help || opts.h || argv.length === 0) {
  console.log(usage());
  process.exit(0);
}

if (opts.list) {
  const rows = listPlatforms();
  console.log('\n可用平台（' + rows.length + '）\n');
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - width(s)));
  for (const r of rows) {
    console.log(`  ${pad(r.id, 12)} ${pad(r.name, 20)} ${r.tagline}`);
    console.log(`  ${pad('', 12)} 时长 ${r.durations.join('/')}s · 负向${r.negativePrompt ? '✓' : '×'} · 音频${r.audio ? '✓' : '×'} · ${r.language}`);
  }
  console.log('\n示例： node shared/cli.mjs -p hailuo -b "雨夜街头，女黑客抬头看见全息鲸鱼" -n 3\n');
  process.exit(0);
}

const input = {
  platform: opts.platform || 'kling',
  brief: opts.brief,
  subject: opts.subject,
  action: opts.action,
  scene: opts.scene,
  mood: opts.mood,
  style: opts.style,
  light: opts.light,
  camera: opts.camera,
  ratio: opts.ratio,
  duration: opts.duration,
  shots: opts.shots,
  audio: opts.audio,
  music: opts.music,
  negative: opts.negative
};

let result;
if (input.platform === 'all') {
  const all = composeAll(input);
  result = opts.format === 'json' ? all : all.map(toMarkdown).join('\n---\n\n');
} else {
  if (!PLATFORMS.some(p => p.id === input.platform || p.name === input.platform)) {
    console.error(`未知平台：${input.platform}\n运行 node shared/cli.mjs --list 查看可用平台`);
    process.exit(1);
  }
  const r = compose(input);
  result = opts.format === 'json' ? r : opts.format === 'md' ? toMarkdown(r) : toText(r);
}

if (opts.out) {
  fs.writeFileSync(opts.out, typeof result === 'string' ? result : JSON.stringify(result, null, 2), 'utf8');
  console.log(`已写入 ${opts.out}`);
} else {
  console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
}

/* ---------- helpers ---------- */
function toText(r) {
  const lines = [];
  lines.push(`【${r.platform}】${r.params.ratio} · ${r.params.duration}s · ${r.shots.length} 镜`);
  lines.push('');
  lines.push('— 整体提示词 —');
  lines.push(r.overall);
  if (r.negative) { lines.push(''); lines.push('— 负向提示词 —'); lines.push(r.negative); }
  if (r.audio) { lines.push(''); lines.push('— 音频 / 对白 —'); lines.push(r.audio); }
  if (r.music) { lines.push(''); lines.push('— 配乐 —'); lines.push(r.music); }
  lines.push('');
  lines.push(`— 分镜脚本（${r.shots.length} 镜，单条 ${r.params.duration}s）—`);
  r.shots.forEach(s => {
    lines.push('');
    lines.push(`镜头 ${s.i}｜${s.size}｜${s.cam}`);
    lines.push(s.prompt);
  });
  if (r.tips && r.tips.length) {
    lines.push('');
    lines.push('— 使用要点 —');
    r.tips.forEach(t => lines.push('· ' + t));
  }
  return lines.join('\n');
}

function width(s) {
  let n = 0;
  for (const ch of String(s)) n += /[\u4e00-\u9fa5\uff00-\uffef]/.test(ch) ? 2 : 1;
  return n;
}

function usage() {
  return `PromptReel CLI — 视频提示词生成

  node shared/cli.mjs --list
  node shared/cli.mjs -p <平台> -b "<创意>" [选项]

平台      ${PLATFORMS.map(p => p.id).join(' / ')} / all
选项
  -b --brief      一句话创意
     --subject    画面主体
     --action     动作与情节（逗号分隔 → 自动拆成分镜）
     --scene      场景环境
     --mood       情绪基调
     --style      视觉风格（逗号分隔，≤3）
     --light      光影氛围（逗号分隔，≤2）
     --camera     运镜偏好（逗号分隔，≤2）
     --ratio      画幅，如 16:9
  -d --duration   单条时长（秒）
  -n --shots      分镜数量 1-8
     --audio      音效 / 对白
     --music      配乐
     --negative   负向提示词
  -f --format     md | json | text（默认 text）
  -o --out        写入文件`;
}
