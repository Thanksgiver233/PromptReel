---
name: promptreel
description: 为 15 个主流视频生成模型生成适配的提示词与分镜脚本。当用户要写视频提示词、文生视频 prompt、分镜脚本，或提到可灵/Kling、即梦/Seedance、海螺/Hailuo、MiniMax H3、通义万相、混元视频、智谱清影、Vidu、PixVerse、Runway、Luma、Pika、Sora、Veo、Muse 等视频模型时使用。同一个创意会自动重排成各平台偏好的结构（五段式 / 标签块 / 括号运镜 / [Shot N] + soundscape / 英文关键词）。
---

# PromptReel · 视频提示词中枢

把一句创意转成**某个具体视频模型真正吃得下的提示词**——不是通用模板填空，而是按每个平台的字段结构、语言、运镜写法和音频规则重排。

## 何时用

- 用户要写文生视频 / 图生视频的提示词、分镜脚本、镜头描述
- 用户指定了某个平台（可灵、即梦、海螺、H3、Veo、Sora…），需要"这个平台该怎么写"
- 同一条创意要在多个平台各出一版（一稿多投 / 横向对比）
- 用户抱怨"同样的词在 A 平台好用，在 B 平台就崩"

## 怎么用

命令行（在本 skill 目录的上级项目根目录执行）：

```bash
# 看有哪些平台
node shared/cli.mjs --list

# 单平台生成
node shared/cli.mjs -p kling -b "雨夜霓虹街头，女黑客抬头看见全息鲸鱼" \
  --subject "穿黑风衣的年轻女黑客" \
  --action "穿过人群,停下抬头,雨水滑落" \
  --scene "午夜赛博都市街道，霓虹招牌，积水倒影" \
  --style "赛博朋克,电影级写实" --light "霓虹侧光,雨夜反光" \
  --camera "缓慢推近" --ratio 16:9 -d 5 -n 4 --format md

# 全平台各出一版
node shared/cli.mjs -p all -b "..." -n 3 --format md

# 机器可读
node shared/cli.mjs -p sora -b "..." --format json
```

也可用 MCP 工具：`list_platforms` / `generate_prompt` / `generate_all` / `get_platform_template` / `list_lexicon`（见 `mcp/README.md`）。

## 平台速查

| id | 平台 | 语言 | 结构特点 |
|---|---|---|---|
| `kling` | 可灵 AI | 中 | 主体→动作→场景→镜头→光影→风格 五段式，负向词独立 |
| `seedance` | 即梦 Seedance | 中 | 【画面主体】【动作】【镜头语言】标签换行 |
| `hailuo` | 海螺 Hailuo | 中 | 运镜用 `[Push in]` 括号指令写在句首 |
| `minimax-h3` | MiniMax H3 | 英 | `[Shot N]` 分镜 + `overall_soundscape` + `non_diegetic_music` |
| `muse` | Muse | 中 | 主题/主体/动作/氛围/镜头/情绪 分行，情绪优先 |
| `wan` | 通义万相 | 中 | 自然语句 + 句尾画质词 |
| `hunyuan` | 混元视频 | 中 | 强调物理真实、无变形 |
| `qingying` | 智谱清影 | 中 | 四段式 + 独立音效句 |
| `vidu` | Vidu | 中 | 简洁镜头语言，保角色一致性 |
| `pixverse` | PixVerse | 中 | 特效模板向，动作要写"发生那一刻" |
| `runway` | Runway Gen-4.5 | 英 | 自然语言 + 35mm/lens 术语 |
| `luma` | Luma | 英 | 短句 + smooth motion |
| `pika` | Pika | 英 | 破折号分隔画面与风格 |
| `sora` | Sora 2 | 英 | 写起点与终点，显式 `Audio:` |
| `veo` | Veo 3.1 | 英 | 音效写具体拟音，台词加引号 |

完整的模板原文与逐平台要点见 `references/platforms.md`。

## 写作流程

1. **先定平台**，再定写法。同一句话在可灵是五段式，在海螺要先给括号运镜，在 H3 要拆成 `[Shot N]`。
2. **主体要具体到可拍摄**：外形 + 服装 + 材质，别写"一个美女"。
3. **一条只做一件事**：多个动作交给分镜拆解（`--action` 里用逗号分隔，工具会自动拆）。
4. **镜头语言写运动，不写形容词**。"镜头缓慢推近至面部" 优于 "很有电影感"。
5. **风格词放句尾**（标签式平台放最后一段），避免污染主体描述。
6. **分镜给景别递进**：远景→全景→中景→近景→特写，别五个镜头都是中景。
7. **有音频的平台**：环境声、拟音、对白、配乐分开写，别糊成一句。
8. **交付时说明平台约束**：时长档位、画幅、是否支持负向词，避免用户拿去跑失败。

## 词表

`style` / `light` / `camera` 的合法取值用 `node shared/cli.mjs --list` 之外的 `list_lexicon` 查看，或直接读 `shared/lexicon.json`。中英文会自动按平台语言切换。

## 扩展新平台

改 `src/platforms.js`（加一个对象，字段照抄现有条目），然后：

```bash
node scripts/build.mjs      # 重新注入网页 + 导出 shared/platforms.json
node scripts/parity.mjs     # 校验网页版与 CLI 版输出一致
```

字段含义：`template` 里的 `{{token}}` 会被替换，可用变量见 `references/tokens.md`。

## 注意

- 各平台的能力与版本在持续变化，模板里的版本号（3.0 / 2.0 / 02 / 3.1）是撰写时的参考，不要当成硬性事实对用户断言。
- 海外模型对英文更敏感，中文自由文本混进英文模板会读起来别扭——提醒用户主体与动作用英文填。
- 负向提示词只对支持的平台生效，不要在 Sora / Veo / H3 上硬塞。
