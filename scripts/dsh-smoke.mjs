#!/usr/bin/env node
/**
 * DSH smoke test — runs lib/index.js against mock ctx.skills / ctx.tools.
 *
 * Does NOT need a running DSH host or a model. It DOES need the DSH peer
 * packages resolvable from lib/index.js (the same peers a DSH profile
 * provides): @deepseek-ai/dsh-tools. In a DSH profile checkout that is
 * node_modules; for a local check, point the repo's node_modules at a
 * directory that has them (e.g. a scratch `npm install @deepseek-ai/dsh`
 * tree) and remove the link afterwards — nothing is committed.
 *
 * Usage: node scripts/dsh-smoke.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { apply, name, inject } from '../lib/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

let passed = 0;
const ok = (label, cond) => {
  assert.ok(cond, label);
  passed += 1;
  console.log(`ok - ${label}`);
};

// --- mock Cordis context ----------------------------------------------------
const providers = [];
const tools = new Map();
const ctx = {
  skills: {
    registerProvider(create) {
      const provider = create({ signal: new AbortController().signal, invalidate: () => {} });
      providers.push(provider);
      return () => {
        const i = providers.indexOf(provider);
        if (i !== -1) providers.splice(i, 1);
      };
    },
  },
  tools: {
    register(def) {
      tools.set(def.name, def);
      return () => tools.delete(def.name);
    },
  },
};

ok('plugin name is promptreel-dsh', name === 'promptreel-dsh');
ok('inject waits for skills and tools', JSON.stringify(inject) === JSON.stringify(['skills', 'tools']));

const dispose = apply(ctx);
ok('apply registers one skill provider', providers.length === 1);
ok(
  'apply registers five tools',
  ['promptreel_list_platforms', 'promptreel_generate_prompt', 'promptreel_generate_all', 'promptreel_get_platform_template', 'promptreel_list_lexicon'].every((n) => tools.has(n)),
);

// --- skill ------------------------------------------------------------------
const [candidate] = await providers[0].list({});
ok('skill candidate is promptreel', candidate.name === 'promptreel');
ok('skill rank is BUNDLED_SKILL_RANK (600)', candidate.rank === 600);
ok('skill source is bundled', candidate.source === 'bundled');
ok('skill description mentions 15 platforms', /15/.test(candidate.description));
const skill = await providers[0].get(candidate, {});
ok('skill loads', !!skill);
ok('skill content starts with the DSH header', skill.content.startsWith('## 在 DeepSeek Harness (DSH) 里用 PromptReel'));
ok('skill content keeps the original methodology', skill.content.includes('五段式') && skill.content.includes('可灵'));
ok('skill resourceBase is the skill directory', skill.resourceBase.kind === 'directory' && skill.resourceBase.path.endsWith('skill'));
ok('skill path is SKILL.md', skill.path.endsWith('skill/SKILL.md'));

// --- tools ------------------------------------------------------------------
const list = await tools.get('promptreel_list_platforms').execute({}, {});
ok('list_platforms reports 15 platforms', list.startsWith('共 15 个平台'));
ok('list_platforms includes kling and sora', list.includes('kling') && list.includes('sora'));

const brief = '雨夜霓虹街头，女黑客抬头看见全息鲸鱼';
const hailuoArgs = {
  platform: 'hailuo',
  brief,
  subject: '穿黑风衣的年轻女黑客',
  action: '穿过人群,停下抬头',
  scene: '午夜赛博都市街道',
  shots: 2,
};
const hailuo = await tools.get('promptreel_generate_prompt').execute(hailuoArgs, {});
ok('hailuo prompt leads with [Push in]', hailuo.includes('[Push in]'));
ok('hailuo prompt has 2 storyboard shots', hailuo.includes('镜头 1') && hailuo.includes('镜头 2'));

// Parity with the CLI for the same input: DSH, CLI and MCP must not drift.
const cli = execFileSync(
  'node',
  [join(root, 'shared/cli.mjs'), '-p', 'hailuo', '-b', brief, '--subject', hailuoArgs.subject, '--action', hailuoArgs.action, '--scene', hailuoArgs.scene, '-n', '2', '--format', 'md'],
  { encoding: 'utf8' },
);
ok('DSH hailuo output equals CLI output for the same input', hailuo.trim() === cli.trim());

const sora = await tools.get('promptreel_generate_prompt').execute({ platform: 'sora', brief, shots: 1, audio: '雨声，远处雷声', format: 'json' }, {});
const soraObj = JSON.parse(sora);
ok('sora json output parses and names the platform', soraObj.platformId === 'sora' && typeof soraObj.overall === 'string');
ok('sora prompt declares audio when audio is supplied', /Audio:/i.test(soraObj.overall) && soraObj.overall.includes('雨声'));

const all = await tools.get('promptreel_generate_all').execute({ platforms: ['kling', 'hailuo'], brief, shots: 1 }, {});
ok('generate_all covers both requested platforms', all.includes('可灵 AI') && all.includes('海螺 Hailuo'));

const template = await tools.get('promptreel_get_platform_template').execute({ platform: 'kling' }, {});
ok('get_platform_template returns the kling template', template.includes('五段式') || template.includes('主体'));

const lexicon = await tools.get('promptreel_list_lexicon').execute({}, {});
ok('list_lexicon includes the default negative prompt', lexicon.includes('画面模糊'));

await assert.rejects(
  tools.get('promptreel_generate_prompt').execute({ platform: 'nope' }, {}),
  /未知平台/,
  'unknown platform throws with the available list',
);
passed += 1;
console.log('ok - unknown platform throws with the available list');

await assert.rejects(
  tools.get('promptreel_generate_prompt').execute({ platform: 'kling', duration: 'five' }, {}),
  /duration/,
  'defineTool validates argument types before execute',
);
passed += 1;
console.log('ok - defineTool validates argument types before execute');

// --- teardown ----------------------------------------------------------------
dispose();
ok('dispose unregisters the skill provider and all tools', providers.length === 0 && tools.size === 0);

console.log(`\nDSH smoke: ${passed} checks passed`);
