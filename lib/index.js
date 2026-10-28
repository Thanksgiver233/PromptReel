// PromptReel for DeepSeek Harness (DSH) — Cordis bundle plugin.
//
// Registers two things, both backed by the same engine the CLI and the MCP
// server use (shared/engine.mjs), so DSH, CLI, MCP and the web app cannot
// drift apart:
//
//  1. The `promptreel` agent skill, from the repo's skill/SKILL.md, via
//     ctx.skills.registerProvider. The skill body is the original SKILL.md
//     body, preceded by a short DSH header that maps the skill's CLI/MCP
//     instructions onto the native tools below. The header exists because
//     the original skill tells the agent to run `node shared/cli.mjs` from
//     the repo root, which is not where a DSH agent's workspace is.
//  2. Five native tools, via defineTool + ctx.tools.register, mirroring
//     the five MCP tools one-for-one (same names minus the server, same
//     parameters, same engine calls). No subprocess, no network, no
//     credentials: the engine is pure and reads only the bundled JSON data.
//
// Tested against DeepSeek Harness 0.2.1-rc.2 (cordis ~4.0.5). DSH is in
// developer preview and breaks compatibility; the peerDependencies in
// package.json pin exactly the versions this file was verified against.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineTool } from '@deepseek-ai/dsh-tools';

import {
  PLATFORMS,
  STYLES,
  LIGHTS,
  CAMERAS,
  DEFAULT_NEG,
  compose,
  composeAll,
  listPlatforms,
  toMarkdown,
  findPlatform,
} from '../shared/engine.mjs';

export const name = 'promptreel-dsh';

// Wait for both services before apply(): the loader starts plugin entries
// in parallel, so without `inject` apply() can run before the skills/tools
// service fibers are active.
export const inject = ['skills', 'tools'];

const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_FILE = join(PACKAGE_DIR, '..', 'skill', 'SKILL.md');
const SKILL_DIR = dirname(SKILL_FILE);
const PROVIDER_NAME = 'promptreel-dsh';
const RANK = 600; // BUNDLED_SKILL_RANK in @deepseek-ai/dsh-skill

const DSH_SKILL_HEADER = [
  '## 在 DeepSeek Harness (DSH) 里用 PromptReel',
  '',
  '在 DSH 里不要跑 `node shared/cli.mjs`，也不要另起 MCP 服务：直接调本插件',
  '注册的原生工具 `promptreel_list_platforms` / `promptreel_generate_prompt` /',
  '`promptreel_generate_all` / `promptreel_get_platform_template` /',
  '`promptreel_list_lexicon`。它们和 CLI、MCP 共用同一个组装引擎，输出一致。',
  '下面的方法论、平台速查、写作流程和注意事项原文照用；其中提到的 CLI、MCP',
  '命令只在仓库检出里直接用，在 DSH 里用上面五个工具代替。',
  '',
  '---',
  '',
].join('\n');

// --- minimal frontmatter parsing (same scalar keys the DSH filesystem
// provider understands: name, description, whenToUse, metadata,
// disable-model-invocation, user-invocable) -------------------------------

function parseBool(value) {
  const v = String(value).trim().toLowerCase();
  if (['true', 'yes', 'on', '1'].includes(v)) return true;
  if (['false', 'no', 'off', '0'].includes(v)) return false;
  return undefined;
}

function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { frontmatter: {}, body: text };
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    frontmatter[key] = value === '' ? null : value.replace(/^['"]|['"]$/g, '');
  }
  return { frontmatter, body: text.slice(match[0].length) };
}

async function loadSkill() {
  const text = await readFile(SKILL_FILE, 'utf8');
  const { frontmatter, body } = parseFrontmatter(text);
  return { frontmatter, body };
}

function candidateFrom(frontmatter) {
  const disableModel = parseBool(frontmatter['disable-model-invocation']);
  const userInvocable = parseBool(frontmatter['user-invocable']);
  return {
    name: frontmatter.name || 'promptreel',
    description: frontmatter.description || 'promptreel',
    whenToUse: frontmatter.whenToUse || undefined,
    invocation: {
      modelInvocable: disableModel === true ? false : true,
      userInvocable: userInvocable === false ? false : true,
    },
    source: 'bundled',
    provider: PROVIDER_NAME,
    rank: RANK,
    locator: SKILL_FILE,
    path: SKILL_FILE,
    metadata: frontmatter.metadata ? { value: frontmatter.metadata } : undefined,
  };
}

// --- native tools (mirror mcp/server.mjs one-for-one) ----------------------

const str = (description, required = false) => ({
  type: 'string',
  description,
  ...(required ? { required: true } : {}),
});

const renderText = (_args, value) => [{ type: 'text', text: value }];

function unknownPlatform(id) {
  return new Error(`未知平台「${id}」。可用：${PLATFORMS.map((p) => p.id).join(', ')}`);
}

const TOOLS = [
  defineTool({
    name: 'promptreel_list_platforms',
    description:
      '列出所有已支持的视频生成模型（可灵、即梦、海螺、MiniMax H3、通义万相、混元、智谱清影、Vidu、PixVerse、Runway、Luma、Pika、Sora、Veo、Muse），含各平台的语言、时长档位、是否支持负向提示词/音频。写视频提示词前先用它选平台。',
    parameters: {},
    output: { schema: { type: 'string', description: '平台列表（Markdown 文本）' }, render: renderText },
    async execute() {
      const rows = listPlatforms();
      const lines = rows.map(
        (r) =>
          `- ${r.id}｜${r.name}（${r.org}）— ${r.tagline}\n  ` +
          `语言 ${r.language}｜时长 ${r.durations.join('/')}s｜负向 ${r.negativePrompt ? '✓' : '×'}｜音频 ${r.audio ? '✓' : '×'}${r.bracketCamera ? '｜括号运镜' : ''}\n  ` +
          `结构：${r.formula.join(' → ')}`,
      );
      return `共 ${rows.length} 个平台\n\n${lines.join('\n')}`;
    },
  }),

  defineTool({
    name: 'promptreel_generate_prompt',
    description:
      '为指定视频模型生成适配的提示词与分镜脚本。同一个创意在不同平台会被重排成该平台偏好的结构（如可灵的五段式、即梦的标签块、海螺的 [Push in] 括号运镜、H3 的 [Shot N] + soundscape、海外模型的英文关键词）。',
    parameters: {
      platform: str('平台 id，如 kling / seedance / hailuo / minimax-h3 / wan / qingying / runway / sora / veo。先用 promptreel_list_platforms 查看全部。', true),
      brief: str('一句话创意 / 主题'),
      subject: str('画面主体：人物、产品、生物的外形、服装、材质'),
      action: str('动作与情节。用逗号分隔多个动作节点，会被自动拆成分镜。'),
      scene: str('场景环境：地点、时间、天气、背景元素'),
      mood: str('情绪基调，如「孤独而震撼」'),
      style: str('视觉风格，逗号分隔，最多 3 个。可选值见 promptreel_list_lexicon。'),
      light: str('光影氛围，逗号分隔，最多 2 个'),
      camera: str('运镜偏好，逗号分隔，最多 2 个'),
      ratio: str('画幅，如 16:9 / 9:16 / 1:1'),
      duration: { type: 'number', description: '单条时长（秒），需在该平台档位内' },
      shots: { type: 'number', description: '分镜数量 1-8' },
      audio: str('音效 / 环境声 / 对白（仅支持音频的平台生效）'),
      music: str('配乐描述（仅 MiniMax H3 生效）'),
      negative: str('负向提示词。留空则用默认值；传空字符串可清空。'),
      format: { type: 'string', enum: ['markdown', 'json'], description: '返回格式，默认 markdown' },
    },
    output: { schema: { type: 'string', description: '整体提示词 + 分镜脚本（Markdown 或 JSON 文本）' }, render: renderText },
    async execute(args) {
      const p = findPlatform(args.platform);
      if (!p) throw unknownPlatform(args.platform);
      const r = compose(args);
      if (args.format === 'json') return JSON.stringify(r, null, 2);
      return toMarkdown(r);
    },
  }),

  defineTool({
    name: 'promptreel_generate_all',
    description: '同一个创意，一次性生成全部平台（或指定几个平台）的适配版本，用于横向对比或一稿多投。',
    parameters: {
      platforms: { type: 'array', items: { type: 'string', description: '平台 id' }, description: '平台 id 列表；留空表示全部' },
      brief: str('一句话创意 / 主题'),
      subject: str('画面主体'),
      action: str('动作与情节。用逗号分隔多个动作节点，会被自动拆成分镜。'),
      scene: str('场景环境'),
      mood: str('情绪基调'),
      style: str('视觉风格，逗号分隔，最多 3 个'),
      light: str('光影氛围，逗号分隔，最多 2 个'),
      camera: str('运镜偏好，逗号分隔，最多 2 个'),
      ratio: str('画幅，如 16:9 / 9:16 / 1:1'),
      duration: { type: 'number', description: '单条时长（秒）' },
      shots: { type: 'number', description: '分镜数量 1-8' },
      audio: str('音效 / 环境声 / 对白'),
      music: str('配乐描述'),
      negative: str('负向提示词'),
    },
    output: { schema: { type: 'string', description: '各平台版本（Markdown 文本，以 --- 分隔）' }, render: renderText },
    async execute(args) {
      const ids = Array.isArray(args.platforms) && args.platforms.length ? args.platforms : PLATFORMS.map((p) => p.id);
      const unknown = ids.filter((id) => !findPlatform(id));
      if (unknown.length) throw new Error(`未知平台：${unknown.join(', ')}`);
      const parts = ids.map((id) => toMarkdown(compose({ ...args, platform: id })));
      return parts.join('\n\n---\n\n');
    },
  }),

  defineTool({
    name: 'promptreel_get_platform_template',
    description: '查看某个平台的提示词模板原文、字段公式和使用要点。用于理解某个模型该怎么写，或据此改造出自己的模板。',
    parameters: {
      platform: str('平台 id', true),
    },
    output: { schema: { type: 'string', description: '平台模板原文与使用要点（Markdown 文本）' }, render: renderText },
    async execute(args) {
      const p = findPlatform(args.platform);
      if (!p) throw unknownPlatform(args.platform);
      return [
        `# ${p.name}（${p.org}）`,
        p.tagline,
        '',
        `字段结构：${p.formula.join(' → ')}`,
        `语言：${p.lang === 'en' ? '英文' : '中文'}｜时长：${p.durations.join(' / ')}s｜画幅：${p.ratios.join(' / ')}`,
        `负向提示词：${p.negative ? '支持' : '不支持'}｜音频：${p.audio ? '支持' : '不支持'}${p.music ? '｜配乐：支持' : ''}${p.bracket ? '｜括号运镜：支持' : ''}`,
        '',
        '## 模板原文',
        '```',
        p.template,
        '```',
        '',
        '## 使用要点',
        ...(p.tips || []).map((t) => '- ' + t),
      ].join('\n');
    },
  }),

  defineTool({
    name: 'promptreel_list_lexicon',
    description: '列出可选的中英文风格 / 光影 / 运镜词表，以及默认负向提示词。用于挑选 style / light / camera 的合法取值。',
    parameters: {},
    output: { schema: { type: 'string', description: '风格 / 光影 / 运镜词表（Markdown 文本）' }, render: renderText },
    async execute() {
      return [
        '# 风格 style',
        STYLES.map((s) => `- ${s.zh}（${s.en}）`).join('\n'),
        '',
        '# 光影 light',
        LIGHTS.map((s) => `- ${s.zh}（${s.en}）`).join('\n'),
        '',
        '# 运镜 camera',
        CAMERAS.map((s) => `- ${s.zh}（${s.en}）${s.bracket ? ' ' + s.bracket : ''}`).join('\n'),
        '',
        '# 默认负向提示词',
        DEFAULT_NEG,
      ].join('\n');
    },
  }),
];

// --- plugin entry point ------------------------------------------------------

export function apply(ctx) {
  const disposers = [];

  disposers.push(
    ctx.skills.registerProvider(() => ({
      name: PROVIDER_NAME,
      list: async () => {
        const { frontmatter } = await loadSkill();
        const candidate = candidateFrom(frontmatter);
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(candidate.name)) {
          console.warn(`[promptreel-dsh] skip invalid skill name: ${candidate.name}`);
          return [];
        }
        return [candidate];
      },
      get: async (candidate) => {
        const { frontmatter, body } = await loadSkill();
        if (frontmatter.name && frontmatter.name !== candidate.name) return undefined;
        return {
          name: candidate.name,
          description: candidate.description,
          whenToUse: candidate.whenToUse,
          invocation: candidate.invocation,
          source: 'bundled',
          provider: PROVIDER_NAME,
          resourceBase: { kind: 'directory', path: SKILL_DIR },
          path: SKILL_FILE,
          metadata: candidate.metadata,
          content: DSH_SKILL_HEADER + body.trim() + '\n',
        };
      },
    })),
  );

  for (const tool of TOOLS) {
    disposers.push(ctx.tools.register(tool));
  }

  // One combined disposer so unloading the plugin undoes every registration.
  return () => {
    for (const dispose of disposers.reverse()) dispose();
  };
}
