# 模板变量

`src/platforms.js` 里每个平台的 `template` 是一段带 `{{变量}}` 的字符串。生成时按平台语言与当前表单替换。

## 画面类

| 变量 | 含义 | 说明 |
|---|---|---|
| `{{topic}}` | 一句话创意 | 原始 brief，不做加工 |
| `{{subject}}` | 画面主体 | 留空时回退到 `{{topic}}` |
| `{{action}}` | 动作与情节 | 分镜模式下会替换成该镜的动作节拍 |
| `{{scene}}` | 场景环境 | 留空时整段会被清理掉 |
| `{{mood}}` | 情绪基调 | 影响调色倾向 |

## 镜头类

| 变量 | 含义 | 示例 |
|---|---|---|
| `{{shotSize}}` | 景别 | 中文 `中景` / 英文 `medium shot` |
| `{{camera}}` | 运镜 | 中文 `缓慢推近` / 英文 `slow push in` |
| `{{cameraBracket}}` | 括号运镜指令 | `[Push in]`，仅 `bracket:true` 的平台有值 |
| `{{shotIndex}}` | 当前镜号 | 1、2、3…（整体提示词恒为 1） |
| `{{totalShots}}` | 分镜总数 | |

## 风格类

| 变量 | 含义 | 说明 |
|---|---|---|
| `{{style}}` | 视觉风格 | 多选用 `、`（中）或 `, `（英）连接，空则给默认值 |
| `{{light}}` | 光影氛围 | 同上 |

## 参数与音频

| 变量 | 含义 | 说明 |
|---|---|---|
| `{{ratio}}` | 画幅 | 如 `16:9` |
| `{{duration}}` | 时长 | 中文 `5 秒` / 英文 `5s` |
| `{{negative}}` | 负向提示词 | 仅 `negative:true` 的平台有意义 |
| `{{audio}}` | 音效 / 对白 | 仅 `audio:true` 的平台有意义 |
| `{{music}}` | 配乐 | 仅 `music:true`（MiniMax H3）有意义 |

## 空值行为

变量为空时不会留下 `标签：。` 这样的残渣——`tidy()` 会清理空标签、重复标点、悬空破折号。所以模板可以放心写成固定句式，不必为每个字段写条件分支。

## 自定义模板示例

```js
{
  id: 'my-model',
  name: '内部模型 V2',
  short: 'V2',
  color: '#8B7BE8',
  org: '自建',
  tagline: '一句话说明它擅长什么',
  caps: ['负向提示词', '5s / 10s'],
  lang: 'zh',          // zh | en
  negative: true,      // 是否显示负向提示词输入
  audio: false,
  music: false,
  bracket: false,      // true 时启用 {{cameraBracket}}
  durations: [5, 10],
  ratios: ['16:9', '9:16'],
  formula: ['主体', '动作', '场景', '镜头'],
  template: '{{subject}}，{{action}}。场景：{{scene}}。镜头：{{shotSize}}，{{camera}}。画幅 {{ratio}}，时长 {{duration}}。',
  tips: ['一条只写一个动作', '风格词放句尾']
}
```
