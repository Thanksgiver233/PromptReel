# 参与贡献

欢迎补平台、改模板、修 bug。这个项目的核心数据只有两个文件，改动成本很低。

## 加一个平台

1. 打开 `src/platforms.js`，照抄一个结构相近的条目改字段：

```js
{
  id: 'my-model',            // 唯一 id，小写连字符
  name: '我的模型',           // 显示名
  short: 'MM',               // 头像里的 1-3 个字符
  color: '#6E9B85',          // 低饱和品牌色，只用于细描边
  color2: '#33564A',         // 预留的深色变体
  org: '厂商',
  tagline: '一句话说明它擅长什么 / 提示词该怎么写',
  caps: ['负向提示词', '5s / 10s'],
  lang: 'zh',                // zh | en
  negative: true,            // 是否有负向提示词输入
  audio: false,              // 是否显示音效/对白输入
  music: false,              // 是否显示配乐输入（目前只有 H3）
  bracket: false,            // 运镜是否用 [Push in] 括号指令
  durations: [5, 10],
  ratios: ['16:9', '9:16'],
  formula: ['主体', '动作', '场景', '镜头'],   // 顶栏展示的字段顺序
  template: '{{subject}}，{{action}}。场景：{{scene}}。镜头：{{shotSize}}，{{camera}}。',
  tips: ['一条只写一个动作', '风格词放句尾']
}
```

2. 重建并校验：

```bash
node scripts/build.mjs        # 注入 index.html + 导出 shared/*.json
node scripts/gen-reference.mjs  # 重新生成平台参考文档
node scripts/parity.mjs       # 校验网页版与 CLI 版输出逐字一致
```

3. 在浏览器里打开 `index.html`，切到新平台确认输出。

> 写模板时不用处理空值——`tidy()` 会清掉空标签和多余标点，固定句式可以放心写。

## 改词库

`src/lexicon.js` 里的 `STYLES` / `LIGHTS` / `CAMERAS` / `SHOT_EN` 是风格、光影、运镜词表，中英成对。加词要同时给 `zh` 和 `en`，海外模型会自动取英文。

## 代码约定

- `src/` 是唯一数据源。`index.html`、`shared/*.json`、`skill/references/platforms.md` 都是产物，**不要直接改**。
- 网页版的组装逻辑在 `index.html` 的 `<script>` 里，CLI/MCP 的同一套逻辑在 `shared/engine.mjs`。两边都要改，然后跑 `parity.mjs` 确认没分叉。
- 样式只改 `src/theme.css`，改完 `node scripts/build.mjs`。新增颜色请用已有的语义变量（`--fg` / `--muted` / `--line` / `--tint-*`），不要写死 `rgba(255,255,255,…)`——那样亮色主题会坏。
- 不要引入运行时依赖。项目刻意保持零依赖，双击 `index.html` 就能跑。

## 提交前自查

```bash
node scripts/build.mjs && node scripts/parity.mjs
```

两条都通过再提交。改了 UI 的话，顺手确认亮色和暗色两套主题都正常。

## 关于平台信息

各平台的版本号、能力（是否支持负向词、音频、时长档位）在持续变化。补平台时如果拿不准，宁可写得笼统一点，也不要把未经验证的规格写死。模板文案里避免对官方能力做绝对断言。
