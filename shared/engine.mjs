/**
 * engine.mjs — 提示词组装引擎（CLI 与 MCP 共用）
 * 与 index.html 中的浏览器版逻辑保持一致；数据来自 shared/*.json。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const readJSON = f => JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'));

export const PLATFORMS = readJSON('platforms.json');
const LEX = readJSON('lexicon.json');
export const STYLES = LEX.STYLES;
export const LIGHTS = LEX.LIGHTS;
export const CAMERAS = LEX.CAMERAS;
export const SHOT_EN = LEX.SHOT_EN;

export const DEFAULT_NEG = '画面模糊，人物变形，多余手指，肢体扭曲，文字水印，logo，低分辨率，噪点，闪烁，跳帧，比例失调';

export const findPlatform = id => PLATFORMS.find(p => p.id === id) || PLATFORMS.find(p => p.name === id);

/* ---------- 文本清理 ---------- */
export function tidy(s) {
  return String(s)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/([\u4e00-\u9fa5])[,]([\u4e00-\u9fa5])/g, '$1，$2')
    .replace(/【([^】]{0,12})】\s*[:：]?\s*(?=[\n【]|$)/g, '')
    .replace(/[^\s，。；;、:：]{1,12}[:：]\s*(?=[。；;.\n]|$)/g, '')
    .replace(/(?:—[ \t]*)+/g, '— ')
    .replace(/—[ \t]*(?=[.,;:，。；])/g, '')
    .replace(/([.,;:])[ \t]*—/g, '$1')
    .replace(/[ \t]+([.,;:，。；])/g, '$1')
    .replace(/([.。])[ \t]*([.。])/g, '$1')
    .replace(/([.。])[ \t]*[,，、][ \t]*/g, '$1 ')
    .replace(/([，、；])[ \t]*[，、；]/g, '$1')
    .replace(/[，、][ \t]*。/g, '。')
    .replace(/。[ \t]*。/g, '。')
    .replace(/,[ \t]*,/g, ',')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/^[\s，、。；;,\n—]+/, '')
    .replace(/[\s，、；;,\n—]+$/, '')
    .trim();
}

export function render(tpl, vals) {
  return String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vals[k] == null ? '' : vals[k]));
}

function pickLang(list, zhArr, lang) {
  const arr = zhArr.map(zh => {
    const o = list.find(x => x.zh === zh);
    return lang === 'en' ? (o ? o.en : zh) : zh;
  }).filter(Boolean);
  return arr.join(lang === 'en' ? ', ' : '、');
}

/* ---------- 输入归一化 ---------- */
function asArray(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string') return v.split(/[,，、/|]+/).map(s => s.trim()).filter(Boolean);
  return [];
}
/** 允许用户写中文或英文，统一成词库里的中文键 */
function canonical(list, v) {
  return asArray(v).map(x => {
    const hit = list.find(o => o.zh === x || o.en.toLowerCase() === String(x).toLowerCase());
    return hit ? hit.zh : x;
  });
}

export function normalizeForm(input = {}) {
  const app = findPlatform(input.platform || input.app || 'kling') || PLATFORMS[0];
  const duration = Number(input.duration) || (app.durations ? app.durations[0] : 5);
  const shots = Math.max(1, Math.min(8, Number(input.shots) || 1));
  return {
    brief: str(input.brief || input.topic || input.idea),
    subject: str(input.subject),
    action: str(input.action),
    scene: str(input.scene),
    mood: str(input.mood),
    audio: str(input.audio || input.soundscape),
    music: str(input.music || input.bgm),
    negative: input.negative != null ? str(input.negative) : (app.negative ? DEFAULT_NEG : ''),
    styles: canonical(STYLES, input.styles || input.style).slice(0, 3),
    lights: canonical(LIGHTS, input.lights || input.light).slice(0, 2),
    cameras: canonical(CAMERAS, input.cameras || input.camera).slice(0, 2),
    ratio: str(input.ratio) || (app.ratios ? app.ratios[0] : '16:9'),
    duration,
    shots
  };
}
const str = v => (v == null ? '' : String(v).trim());

/* ---------- 变量 ---------- */
export function valuesFor(app, f, shot) {
  const lang = app.lang === 'en' ? 'en' : 'zh';
  const camZh = shot ? shot.cam : ((f.cameras && f.cameras[0]) || '缓慢推近');
  const camObj = CAMERAS.find(c => c.zh === camZh) || CAMERAS[1];
  const sizeZh = shot ? shot.size : '中景';
  const subject = (f.subject || '').trim() || (f.brief || '').trim() || '画面主体';
  return {
    topic: (f.brief || '').trim(),
    subject,
    action: (f.action || '').trim(),
    scene: (f.scene || '').trim(),
    mood: (f.mood || '').trim(),
    style: pickLang(STYLES, f.styles || [], lang) || (lang === 'en' ? 'cinematic' : '电影质感'),
    light: pickLang(LIGHTS, f.lights || [], lang) || (lang === 'en' ? 'natural light' : '自然光'),
    camera: lang === 'en' ? camObj.en : camZh,
    cameraBracket: app.bracket ? camObj.bracket : '',
    shotSize: lang === 'en' ? (SHOT_EN[sizeZh] || sizeZh) : sizeZh,
    ratio: f.ratio || '16:9',
    duration: lang === 'en' ? `${f.duration}s` : `${f.duration} 秒`,
    negative: (f.negative || '').trim(),
    audio: (f.audio || '').trim(),
    music: (f.music || '').trim(),
    shotIndex: shot ? shot.i : 1,
    totalShots: f.shots || 1
  };
}

/* ---------- 分镜 ---------- */
export function splitBeats(text, n) {
  const raw = String(text || '').split(/[。；;！!？?\n]+/).map(s => s.trim()).filter(Boolean);
  let parts = [];
  raw.forEach(seg => {
    const sub = seg.split(/[，,]/).map(s => s.trim()).filter(Boolean);
    if (sub.length > 1) parts.push(...sub);
    else if (seg) parts.push(seg);
  });
  parts = parts.filter(s => s.length > 1);
  const fillers = [
    '建立环境，交代空间与时间关系',
    '主体进入画面，动作起始',
    '动作展开，情绪逐步推进',
    '细节特写，强调材质与质感',
    '主体反应，情绪落点',
    '收尾定格，画面留白'
  ];
  while (parts.length < n) parts.push(fillers[parts.length % fillers.length]);
  if (parts.length > n) {
    const head = parts.slice(0, n - 1);
    const tail = parts.slice(n - 1).join('，');
    parts = [...head, tail];
  }
  return parts;
}

export function shotSizes(n) {
  const base = ['远景', '全景', '中景', '近景', '特写'];
  if (n <= 1) return ['中景'];
  const res = [];
  for (let i = 0; i < n; i++) res.push(base[Math.round(i * (base.length - 1) / (n - 1))]);
  return res;
}

export function cameraSeq(n, prefs) {
  const pool = (prefs || []).slice();
  const extra = ['固定机位', '缓慢推近', '横移', '环绕主体', '跟拍', '拉远', '升降', '手持晃动'];
  const seq = [];
  pool.slice(0, Math.min(2, n)).forEach(c => seq.push(c));
  let idx = 0, guard = 0;
  while (seq.length < n && guard < 200) {
    const c = extra[idx % extra.length];
    if (!seq.includes(c) && c !== seq[seq.length - 1]) seq.push(c);
    idx++; guard++;
    if (guard >= extra.length * 3) {
      const c2 = extra[seq.length % extra.length];
      if (c2 !== seq[seq.length - 1]) seq.push(c2);
      guard = 0;
    }
  }
  return seq.slice(0, n);
}

export function buildShots(app, f) {
  const n = Math.max(1, Math.min(8, f.shots || 1));
  const beats = splitBeats(f.action, n);
  const sizes = shotSizes(n);
  const cams = cameraSeq(n, f.cameras);
  const tpl = app.shotTemplate || app.template;
  return beats.map((b, i) => {
    const shot = { i: i + 1, size: sizes[i], cam: cams[i], desc: b };
    const vals = valuesFor(app, f, shot);
    vals.action = b;
    return { ...shot, prompt: tidy(render(tpl, vals)) };
  });
}

/* ---------- 主入口 ---------- */
export function compose(input = {}) {
  const f = normalizeForm(input);
  const app = findPlatform(input.platform || input.app || 'kling') || PLATFORMS[0];
  const overall = tidy(render(app.template, valuesFor(app, f, null)));
  const shots = buildShots(app, f);
  return {
    platform: app.name,
    platformId: app.id,
    org: app.org,
    params: {
      ratio: f.ratio,
      duration: f.duration,
      shots: f.shots,
      style: f.styles,
      light: f.lights,
      camera: f.cameras,
      mood: f.mood
    },
    overall,
    negative: app.negative ? f.negative : '',
    audio: app.audio ? f.audio : '',
    music: app.music ? f.music : '',
    shots,
    tips: app.tips || []
  };
}

/** 一次给所有平台各生成一版 */
export function composeAll(input = {}) {
  return PLATFORMS.map(p => compose({ ...input, platform: p.id }));
}

/** 平台清单（给 agent 选型用） */
export function listPlatforms() {
  return PLATFORMS.map(p => ({
    id: p.id,
    name: p.name,
    org: p.org,
    tagline: p.tagline,
    language: p.lang === 'en' ? 'en' : 'zh',
    negativePrompt: !!p.negative,
    audio: !!p.audio,
    music: !!p.music,
    bracketCamera: !!p.bracket,
    durations: p.durations,
    ratios: p.ratios,
    formula: p.formula
  }));
}

export function toMarkdown(r) {
  let out = `# ${r.platform} 提示词\n\n## 整体提示词\n${r.overall}\n`;
  if (r.negative) out += `\n## 负向提示词\n${r.negative}\n`;
  if (r.audio) out += `\n## 音频 / 对白\n${r.audio}\n`;
  if (r.music) out += `\n## 配乐\n${r.music}\n`;
  out += `\n## 分镜脚本（${r.shots.length} 镜，单条 ${r.params.duration}s）\n`;
  r.shots.forEach(s => { out += `\n### 镜头 ${s.i} · ${s.size} · ${s.cam}\n${s.prompt}\n`; });
  if (r.tips && r.tips.length) out += `\n## 使用要点\n${r.tips.map(t => '- ' + t).join('\n')}\n`;
  return out;
}
