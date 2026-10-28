#!/usr/bin/env node
/**
 * PromptReel MCP Server
 * 零依赖的 Model Context Protocol 服务（stdio + JSON-RPC 2.0），
 * 把 15 个视频模型的提示词结构暴露成工具，供 Claude / Cursor / WorkBuddy 等调用。
 *
 * 启动：node mcp/server.mjs
 * 配置见 mcp/README.md
 */
import { createInterface } from 'node:readline';
import {
  PLATFORMS, STYLES, LIGHTS, CAMERAS, DEFAULT_NEG,
  compose, composeAll, listPlatforms, toMarkdown, findPlatform
} from '../shared/engine.mjs';

const SERVER_INFO = { name: 'promptreel', version: '1.0.0' };
const PROTOCOL = '2024-11-05';

/* ============ 工具定义 ============ */
const TOOLS = [
  {
    name: 'list_platforms',
    description: '列出所有已支持的视频生成模型（可灵、即梦、海螺、MiniMax H3、通义万相、混元、智谱清影、Vidu、PixVerse、Runway、Luma、Pika、Sora、Veo、Muse），含各平台的语言、时长档位、是否支持负向提示词/音频。写视频提示词前先用它选平台。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'generate_prompt',
    description: '为指定视频模型生成适配的提示词与分镜脚本。同一个创意在不同平台会被重排成该平台偏好的结构（如可灵的五段式、即梦的标签块、海螺的 [Push in] 括号运镜、H3 的 [Shot N] + soundscape、海外模型的英文关键词）。',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: '平台 id，如 kling / seedance / hailuo / minimax-h3 / wan / qingying / runway / sora / veo。先用 list_platforms 查看全部。' },
        brief: { type: 'string', description: '一句话创意 / 主题' },
        subject: { type: 'string', description: '画面主体：人物、产品、生物的外形、服装、材质' },
        action: { type: 'string', description: '动作与情节。用逗号分隔多个动作节点，会被自动拆成分镜。' },
        scene: { type: 'string', description: '场景环境：地点、时间、天气、背景元素' },
        mood: { type: 'string', description: '情绪基调，如「孤独而震撼」' },
        style: { type: 'string', description: '视觉风格，逗号分隔，最多 3 个。可选值见 list_lexicon。' },
        light: { type: 'string', description: '光影氛围，逗号分隔，最多 2 个' },
        camera: { type: 'string', description: '运镜偏好，逗号分隔，最多 2 个' },
        ratio: { type: 'string', description: '画幅，如 16:9 / 9:16 / 1:1' },
        duration: { type: 'number', description: '单条时长（秒），需在该平台档位内' },
        shots: { type: 'number', description: '分镜数量 1-8' },
        audio: { type: 'string', description: '音效 / 环境声 / 对白（仅支持音频的平台生效）' },
        music: { type: 'string', description: '配乐描述（仅 MiniMax H3 生效）' },
        negative: { type: 'string', description: '负向提示词。留空则用默认值；传空字符串可清空。' },
        format: { type: 'string', enum: ['markdown', 'json'], description: '返回格式，默认 markdown' }
      },
      required: ['platform'],
      additionalProperties: false
    }
  },
  {
    name: 'generate_all',
    description: '同一个创意，一次性生成全部平台（或指定几个平台）的适配版本，用于横向对比或一稿多投。',
    inputSchema: {
      type: 'object',
      properties: {
        platforms: { type: 'array', items: { type: 'string' }, description: '平台 id 列表；留空表示全部' },
        brief: { type: 'string' },
        subject: { type: 'string' },
        action: { type: 'string' },
        scene: { type: 'string' },
        mood: { type: 'string' },
        style: { type: 'string' },
        light: { type: 'string' },
        camera: { type: 'string' },
        ratio: { type: 'string' },
        duration: { type: 'number' },
        shots: { type: 'number' },
        audio: { type: 'string' },
        music: { type: 'string' },
        negative: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_platform_template',
    description: '查看某个平台的提示词模板原文、字段公式和使用要点。用于理解某个模型该怎么写，或据此改造出自己的模板。',
    inputSchema: {
      type: 'object',
      properties: { platform: { type: 'string', description: '平台 id' } },
      required: ['platform'],
      additionalProperties: false
    }
  },
  {
    name: 'list_lexicon',
    description: '列出可选的中英文风格 / 光影 / 运镜词表，以及默认负向提示词。用于挑选 style / light / camera 的合法取值。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  }
];

/* ============ 工具实现 ============ */
const text = t => ({ content: [{ type: 'text', text: t }] });

function callTool(name, a = {}) {
  switch (name) {
    case 'list_platforms': {
      const rows = listPlatforms();
      const lines = rows.map(r =>
        `- ${r.id}｜${r.name}（${r.org}）— ${r.tagline}\n  ` +
        `语言 ${r.language}｜时长 ${r.durations.join('/')}s｜负向 ${r.negativePrompt ? '✓' : '×'}｜音频 ${r.audio ? '✓' : '×'}${r.bracketCamera ? '｜括号运镜' : ''}\n  ` +
        `结构：${r.formula.join(' → ')}`
      );
      return text(`共 ${rows.length} 个平台\n\n${lines.join('\n')}`);
    }

    case 'generate_prompt': {
      const p = findPlatform(a.platform);
      if (!p) return err(`未知平台「${a.platform}」。可用：${PLATFORMS.map(x => x.id).join(', ')}`);
      const r = compose(a);
      if (a.format === 'json') return text(JSON.stringify(r, null, 2));
      return text(toMarkdown(r));
    }

    case 'generate_all': {
      const ids = Array.isArray(a.platforms) && a.platforms.length ? a.platforms : PLATFORMS.map(p => p.id);
      const unknown = ids.filter(id => !findPlatform(id));
      if (unknown.length) return err(`未知平台：${unknown.join(', ')}`);
      const parts = ids.map(id => toMarkdown(compose({ ...a, platform: id })));
      return text(parts.join('\n\n---\n\n'));
    }

    case 'get_platform_template': {
      const p = findPlatform(a.platform);
      if (!p) return err(`未知平台「${a.platform}」。可用：${PLATFORMS.map(x => x.id).join(', ')}`);
      const out = [
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
        ...(p.tips || []).map(t => '- ' + t)
      ].join('\n');
      return text(out);
    }

    case 'list_lexicon': {
      const out = [
        '# 风格 style',
        STYLES.map(s => `- ${s.zh}（${s.en}）`).join('\n'),
        '',
        '# 光影 light',
        LIGHTS.map(s => `- ${s.zh}（${s.en}）`).join('\n'),
        '',
        '# 运镜 camera',
        CAMERAS.map(s => `- ${s.zh}（${s.en}）${s.bracket ? ' ' + s.bracket : ''}`).join('\n'),
        '',
        '# 默认负向提示词',
        DEFAULT_NEG
      ];
      return text(out.join('\n'));
    }

    default:
      return err(`未知工具：${name}`);
  }
}
const err = msg => ({ content: [{ type: 'text', text: msg }], isError: true });

/* ============ JSON-RPC ============ */
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', line => {
  const raw = line.trim();
  if (!raw) return;
  let msg;
  try { msg = JSON.parse(raw); } catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  handle(msg);
});

function handle(msg) {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  try {
    switch (method) {
      case 'initialize': {
        send({
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: params?.protocolVersion || PROTOCOL,
            capabilities: { tools: { listChanged: false } },
            serverInfo: SERVER_INFO
          }
        });
        return;
      }
      case 'notifications/initialized':
      case 'notifications/cancelled':
        return;
      case 'ping':
        send({ jsonrpc: '2.0', id, result: {} });
        return;
      case 'tools/list':
        send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
        return;
      case 'tools/call': {
        const { name, arguments: args } = params || {};
        if (!TOOLS.some(t => t.name === name)) {
          send({ jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${name}` } });
          return;
        }
        const result = callTool(name, args || {});
        send({ jsonrpc: '2.0', id, result });
        return;
      }
      case 'resources/list':
        send({ jsonrpc: '2.0', id, result: { resources: [] } });
        return;
      case 'prompts/list':
        send({ jsonrpc: '2.0', id, result: { prompts: [] } });
        return;
      default:
        if (!isNotification) {
          send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
        }
    }
  } catch (e) {
    if (!isNotification) {
      send({ jsonrpc: '2.0', id, error: { code: -32603, message: String(e && e.message || e) } });
    }
  }
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

process.stdin.on('end', () => process.exit(0));
