# PromptReel for DeepSeek Harness (DSH)

在 DeepSeek Harness 里用 PromptReel：同一个创意，按 15 个视频模型的各自写法重排，不用另起 MCP 服务、不用跑 CLI。

## 安装

```bash
# 装进默认 web profile（需先装 DSH 与 pnpm，见 DSH 官方说明）
dsh plugin --profile web add github:Thanksgiver233/PromptReel
dsh web
```

固定到某次实测提交（推荐生产/复现用）：

```bash
dsh plugin --profile web add github:Thanksgiver233/PromptReel#<commit>
```

仓库打上 `dsh-plugin` topic 后，社区插件市场会收录。**本仓库尚未发布 npm 包**，不要用 npm 包名安装；上面的 GitHub 安装方式是唯一已验证的路径。

## 装完得到什么

- **1 个 Skill：`promptreel`**。方法论与平台速查来自仓库 `skill/SKILL.md`，在 DSH 里加载时前面会加一段 DSH 说明：用原生工具代替 CLI/MCP 命令。
- **5 个原生工具**（与 MCP 的 5 个工具一一对应，共用 `shared/engine.mjs`，输出与 CLI 一致）：
  - `promptreel_list_platforms`：列 15 个平台与能力位
  - `promptreel_generate_prompt`：单平台整体提示词 + 分镜脚本
  - `promptreel_generate_all`：同一创意多平台各出一版
  - `promptreel_get_platform_template`：某平台模板原文与要点
  - `promptreel_list_lexicon`：风格 / 光影 / 运镜词表与默认负向词

工具是纯本地计算：不联网、不读模型密钥、不写文件、不改工作区。生成的是提示词文本，视频本身仍需你拿到对应平台去跑。

## 它不是什么

- 不是 MCP 桥接：没有 `dsh-mcp-client` 行，没有 stdio 子进程。原生工具直接调引擎，避免了安装包内 MCP 服务路径解析问题，也避免了同一功能出现 `promptreel_*` 与 `mcp__promptreel__*` 两套名字。
- 不是 Web UI 插件：没有设置页、没有侧栏。网页版仍是双击 `index.html`。

## 版本与兼容

- 插件版本：`promptreel-dsh 0.1.0`（`package.json`）。
- 已实测：DeepSeek Harness **0.2.1-rc.2**（cordis ~4.0.5）。DSH 处在开发者预览，会有破坏性变更；`package.json` 的 peerDependencies 精确钉住该版本，换 DSH 大版本前请先重测。
- 打包文件：`package.json`（`dsh.bundle.patch`）+ `cordis.patch.yml`（只插自己一个 `promptreel` 行）+ `lib/index.js`（已提交的构建产物，安装时不跑构建脚本）。

## 本地验证（不推送）

```bash
node scripts/dsh-smoke.mjs   # 模拟 ctx，测 skill 加载与 5 个工具，含与 CLI 输出一致性
```

## 说明

平台能力与版本在持续变化，模板里的版本号是撰写时的参考，不是对官方规格的承诺。所有模板都可以在网页里克隆后自行修改。
