# PromptReel MCP Server

把 15 个视频模型的提示词结构暴露成 MCP 工具，让 Claude / Cursor / WorkBuddy 等直接调用。

零依赖：只用 Node 内置模块，不需要 `npm install`。要求 Node ≥ 18。

## 启动

```bash
node mcp/server.mjs
```

stdio 传输，由客户端拉起，不需要手动常驻。

## 配置

### WorkBuddy

写进 `~/.workbuddy-ai/mcp.json`（注意不是 `.mcp.json`）：

```json
{
  "mcpServers": {
    "promptreel": {
      "command": "node",
      "args": ["/absolute/path/to/PromptReel/mcp/server.mjs"]
    }
  }
}
```

保存后到连接器管理页右上角的「自定义连接器」里点「信任」才会生效。

### Claude Desktop

`claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "promptreel": {
      "command": "node",
      "args": ["/absolute/path/to/video-prompt-hub/mcp/server.mjs"]
    }
  }
}
```

### Cursor

`.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "promptreel": {
      "command": "node",
      "args": ["/absolute/path/to/video-prompt-hub/mcp/server.mjs"]
    }
  }
}
```

## 工具

| 工具 | 作用 |
|---|---|
| `list_platforms` | 列出 15 个平台，含语言、时长档位、是否支持负向/音频、字段结构 |
| `generate_prompt` | 单平台生成整体提示词 + 分镜脚本（`format: markdown \| json`） |
| `generate_all` | 同一创意一次生成多平台版本，用于一稿多投 / 横向对比 |
| `get_platform_template` | 查看某平台模板原文、字段结构、使用要点 |
| `list_lexicon` | 可选的风格 / 光影 / 运镜词表与默认负向词 |

### generate_prompt 参数

```jsonc
{
  "platform": "hailuo",          // 必填，平台 id
  "brief": "雨夜霓虹街头，女黑客抬头看见全息鲸鱼",
  "subject": "穿黑风衣的年轻女黑客",
  "action": "穿过人群,停下抬头,雨水滑落",   // 逗号分隔 → 自动拆成分镜
  "scene": "午夜赛博都市街道，霓虹招牌，积水倒影",
  "mood": "孤独而震撼",
  "style": "赛博朋克,电影级写实",  // ≤3 个
  "light": "霓虹侧光,雨夜反光",    // ≤2 个
  "camera": "缓慢推近,环绕主体",   // ≤2 个
  "ratio": "16:9",
  "duration": 6,
  "shots": 4,
  "audio": "雨声、远处车流",
  "music": "低频合成器 Pad",       // 仅 MiniMax H3 生效
  "negative": "画面模糊，人物变形",
  "format": "markdown"
}
```

`style` / `light` / `camera` 中英文都认，会自动按平台语言切换输出。

## 自测

```bash
printf '%s\n' \
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}' \
'{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"generate_prompt","arguments":{"platform":"kling","brief":"雨夜街头","shots":2}}}' \
| node mcp/server.mjs
```

## 数据来源

`shared/platforms.json` 与 `shared/lexicon.json` 由 `node scripts/build.mjs` 从 `src/` 生成。改平台请改 `src/platforms.js` 后重新 build，不要直接改 JSON。
