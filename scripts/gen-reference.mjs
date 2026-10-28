/**
 * 从 shared/platforms.json 生成 skill/references/platforms.md
 * 平台参考文档永远与数据同步，不手写。
 *   node scripts/gen-reference.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const platforms = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'platforms.json'), 'utf8'));

const lines = [
  '# 平台模板参考',
  '',
  '> 本文件由 `scripts/gen-reference.mjs` 从 `shared/platforms.json` 自动生成，请勿手改。',
  `> 共 ${platforms.length} 个平台。`,
  ''
];

for (const p of platforms) {
  lines.push(`## ${p.name}　\`${p.id}\``);
  lines.push('');
  lines.push(`- 厂商：${p.org}`);
  lines.push(`- 定位：${p.tagline}`);
  lines.push(`- 结构：${p.formula.join(' → ')}`);
  lines.push(`- 语言：${p.lang === 'en' ? '英文' : '中文'}`);
  lines.push(`- 时长：${p.durations.join(' / ')} 秒　画幅：${p.ratios.join(' / ')}`);
  lines.push(`- 负向提示词：${p.negative ? '支持' : '不支持'}　音频：${p.audio ? '支持' : '不支持'}${p.music ? '　配乐：支持' : ''}${p.bracket ? '　括号运镜：支持' : ''}`);
  lines.push('');
  lines.push('```text');
  lines.push(p.template);
  lines.push('```');
  lines.push('');
  lines.push('**使用要点**');
  lines.push('');
  for (const t of p.tips || []) lines.push(`- ${t}`);
  lines.push('');
}

const out = path.join(root, 'skill', 'references', 'platforms.md');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`✓ skill/references/platforms.md（${platforms.length} 个平台，${(lines.join('\n').length / 1024).toFixed(1)}KB）`);
