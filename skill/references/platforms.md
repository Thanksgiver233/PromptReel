# 平台模板参考

> 本文件由 `scripts/gen-reference.mjs` 从 `shared/platforms.json` 自动生成，请勿手改。
> 共 15 个平台。

## 可灵 AI　`kling`

- 厂商：快手
- 定位：3.0 系列原生 4K，五段式描述最稳
- 结构：主体 → 动作 → 场景 → 镜头 → 光影 → 风格
- 语言：中文
- 时长：5 / 10 秒　画幅：16:9 / 9:16 / 1:1 / 4:3
- 负向提示词：支持　音频：不支持

```text
{{subject}}，{{action}}。环境：{{scene}}。镜头：{{shotSize}}，{{camera}}。光影：{{light}}。画面风格：{{style}}。画幅 {{ratio}}，时长 {{duration}}。
```

**使用要点**

- 主体 + 动作 + 场景 + 镜头 + 光影 五段式最稳，别把多个动作塞进一条
- 运动幅度大时降低描述密度，否则画面容易糊
- 先用首帧图锁构图，再用文字描述运动，稳定性最高

## 即梦 Seedance　`seedance`

- 厂商：字节跳动
- 定位：2.0 结构化分镜，多镜头叙事能力强
- 结构：画面主体 → 动作 → 场景 → 镜头语言 → 风格质感
- 语言：中文
- 时长：5 / 10 秒　画幅：16:9 / 9:16 / 4:3 / 1:1 / 21:9
- 负向提示词：支持　音频：不支持

```text
【画面主体】{{subject}}
【动作】{{action}}
【场景】{{scene}}
【镜头语言】{{shotSize}}，{{camera}}
【光影与风格】{{light}}，{{style}}
【参数】画幅 {{ratio}}，时长 {{duration}}
```

**使用要点**

- 分镜模式下每条只描述一个连续动作，跨镜头交给剪辑
- 标签式换行写，比长句更容易被模型完整理解
- 风格词放最后，避免污染主体描述

## 海螺 Hailuo　`hailuo`

- 厂商：MiniMax
- 定位：02 系列运动表现强，括号运镜指令
- 结构：运镜指令 → 主体 → 动作 → 场景 → 光影 → 风格
- 语言：中文
- 时长：6 / 10 秒　画幅：16:9 / 9:16 / 1:1
- 负向提示词：支持　音频：不支持　括号运镜：支持

```text
{{cameraBracket}} {{subject}}，{{action}}。场景：{{scene}}。{{light}}，{{style}}，{{shotSize}}，画幅 {{ratio}}，时长 {{duration}}。
```

**使用要点**

- 运镜指令写在提示词最前面，用 [ ] 包住，模型识别率最高
- 一次只给一个运镜指令，叠加会互相打架
- 写清楚运动方向与速度，比写「有电影感」有用得多

## MiniMax H3　`minimax-h3`

- 厂商：MiniMax
- 定位：全模态参考生成，2K / 最长 15 秒
- 结构：风格声明 → [Shot N] 描述 → 音景 → 配乐
- 语言：英文
- 时长：5 / 10 / 15 秒　画幅：16:9 / 9:16 / 4:3 / 1:1 / 21:9
- 负向提示词：不支持　音频：支持　配乐：支持

```text
This is a live-action, photographic shot, {{style}}.
[Shot {{shotIndex}}] {{shotSize}}, {{camera}}, {{subject}} {{action}}. {{scene}}, {{light}}.
overall_soundscape: {{audio}}
non_diegetic_music: {{music}}
```

**使用要点**

- 官方示例全部用英文撰写，主体与动作建议直接用英文填写
- 分镜用 [Shot 1] 方括号编号，切点可写时间码 At 00:04.500
- 音景与配乐分两行写，H3 会把环境声与非叙事配乐分开处理
- 参考素材用 <Picture 1> <Subject 1> 引用，图 ≤9 / 视频 ≤3 / 音频 ≤3

## Muse　`muse`

- 厂商：美学叙事
- 定位：氛围与色彩情绪优先，适合概念片
- 结构：主题 → 主体 → 动作 → 场景 → 氛围 → 镜头 → 情绪
- 语言：中文
- 时长：5 / 10 秒　画幅：16:9 / 9:16 / 2.39:1
- 负向提示词：支持　音频：不支持

```text
{{topic}}
主体：{{subject}}
动作：{{action}}
场景：{{scene}}
氛围：{{light}}，{{style}}
镜头：{{shotSize}}，{{camera}}
情绪基调：{{mood}}
画幅 {{ratio}}，时长 {{duration}}
```

**使用要点**

- 先写情绪与色彩关系，再写具体动作，画面更有统一调性
- 用「像什么」的比喻描述质感，比堆形容词有效
- 情绪基调词会显著影响调色倾向，别和风格词冲突

## 通义万相 Wan　`wan`

- 厂商：阿里云
- 定位：2.2 中文语义与细节还原好
- 结构：主体 → 动作 → 场景 → 光影 → 风格 → 画质
- 语言：中文
- 时长：5 秒　画幅：16:9 / 9:16 / 1:1 / 4:3
- 负向提示词：支持　音频：不支持

```text
{{subject}}，{{action}}，{{scene}}，{{light}}，{{style}}，{{shotSize}}，{{camera}}，高清细节，画面稳定，画幅 {{ratio}}，时长 {{duration}}。
```

**使用要点**

- 画质词（高清细节、画面稳定）放句尾，能明显减少崩坏
- 主体数量控制在 2 个以内，多了容易粘连
- 中文自然语句即可，不需要翻译成英文

## 混元视频　`hunyuan`

- 厂商：腾讯
- 定位：物理运动真实，适合产品与实拍质感
- 结构：主体 → 动作 → 场景 → 镜头 → 画质
- 语言：中文
- 时长：5 / 10 秒　画幅：16:9 / 9:16 / 1:1
- 负向提示词：支持　音频：不支持

```text
{{subject}}，{{action}}。{{scene}}，{{shotSize}}，{{camera}}，{{light}}，{{style}}，画面清晰稳定，无变形，画幅 {{ratio}}，时长 {{duration}}。
```

**使用要点**

- 强调「物理真实、无变形」能减少手指与物体穿模
- 产品类镜头写清材质与反光，比写「高级感」有用
- 避免快速甩镜，模型对高速运动仍不稳定

## 智谱清影　`qingying`

- 厂商：智谱 AI
- 定位：CogVideoX 底座，4K 60 帧 + AI 音效
- 结构：主体 → 动作 → 场景 → 镜头 → 光影 → 音效
- 语言：中文
- 时长：6 / 10 秒　画幅：16:9 / 9:16 / 1:1
- 负向提示词：支持　音频：支持

```text
{{subject}}，{{action}}。场景：{{scene}}。镜头：{{shotSize}}，{{camera}}。光影：{{light}}，{{style}}。音效：{{audio}}。画幅 {{ratio}}，时长 {{duration}}。
```

**使用要点**

- 默认 6 秒一条，长叙事建议拆成分镜逐条生成
- 4K 60 帧适合产品与运动镜头，生成耗时更长
- 音效描述单独成句，和画面描述分开写识别更准

## Vidu　`vidu`

- 厂商：生数科技
- 定位：参考图一致性强，动漫与角色向友好
- 结构：主体 → 动作 → 场景 → 镜头 → 质感
- 语言：中文
- 时长：4 / 8 秒　画幅：16:9 / 9:16 / 1:1
- 负向提示词：支持　音频：不支持

```text
{{subject}}，{{action}}。场景：{{scene}}。镜头：{{shotSize}}，{{camera}}。{{light}}，{{style}}，电影质感。画幅 {{ratio}}，时长 {{duration}}。
```

**使用要点**

- 角色类先上传参考图，提示词只写「变化的部分」
- 镜头语言越简单，角色一致性越好
- 动漫风格记得同步写画风词，否则会往写实偏

## PixVerse　`pixverse`

- 厂商：爱诗科技
- 定位：模板化玩法多，特效镜头出片快
- 结构：主体 → 动作 → 场景 → 镜头 → 特效
- 语言：中文
- 时长：5 / 8 秒　画幅：16:9 / 9:16 / 1:1
- 负向提示词：支持　音频：不支持

```text
{{subject}}，{{action}}。场景：{{scene}}。{{shotSize}}，{{camera}}，{{light}}，{{style}}，视觉冲击力强。画幅 {{ratio}}，时长 {{duration}}。
```

**使用要点**

- 特效类模板要把「效果发生的那一刻」写清楚
- 主体 + 一个明确动作，出片率远高于复杂剧情
- 同一提示词换模板多跑几次，比改词更快找到感觉

## Runway Gen-4.5　`runway`

- 厂商：Runway
- 定位：英文自然语言，电影镜头语言最细
- 结构：Subject → Action → Scene → Shot → Light → Style
- 语言：英文
- 时长：5 / 10 秒　画幅：16:9 / 9:16 / 1:1 / 21:9
- 负向提示词：不支持　音频：不支持

```text
{{subject}} — {{action}} — {{scene}}. {{shotSize}}, {{camera}}, {{light}}, {{style}}. Shot on 35mm, natural motion, {{ratio}}.
```

**使用要点**

- 海外模型对英文更敏感，主体与动作建议直接用英文填写
- 一句话一个镜头，不要写多段剧情
- Camera 与 lens 术语（dolly、crane、35mm）识别度高

## Luma Dream Machine　`luma`

- 厂商：Luma
- 定位：自然流畅运动，一句话出片
- 结构：Subject → Action → Scene → Camera → Style
- 语言：英文
- 时长：5 / 9 秒　画幅：16:9 / 9:16 / 1:1 / 21:9
- 负向提示词：不支持　音频：不支持

```text
{{subject}} — {{action}}, {{scene}}. {{shotSize}}, {{camera}}, {{light}}, {{style}}, cinematic, smooth motion, {{ratio}}.
```

**使用要点**

- 短句 + 具体动词效果最好，长句会被截断理解
- 加 smooth motion / fluid movement 能减少抖动
- 人物特写建议写清面部表情与视线方向

## Pika　`pika`

- 厂商：Pika Labs
- 定位：轻量创意向，特效与变形玩法多
- 结构：Subject → Action → Scene → Camera → Style
- 语言：英文
- 时长：5 / 10 秒　画幅：16:9 / 9:16 / 1:1
- 负向提示词：支持　音频：不支持

```text
{{subject}} — {{action}} — {{scene}}, {{shotSize}}, {{camera}}, {{light}}, {{style}}, {{ratio}}.
```

**使用要点**

- 用破折号分隔「画面」和「风格」，可读性更好
- 特效词（morph、explode、freeze）放动作后面
- 负向提示词里加上 blurry、distorted 能提升成片率

## Sora 2　`sora`

- 厂商：OpenAI
- 定位：长镜头 + 原生音频，适合叙事短片
- 结构：Subject → Action → Scene → Camera → Light → Style → Audio
- 语言：英文
- 时长：4 / 8 / 12 秒　画幅：16:9 / 9:16 / 1:1
- 负向提示词：不支持　音频：支持

```text
{{subject}} — {{action}} — {{scene}}. {{shotSize}}, {{camera}}, {{light}}, {{style}}. Audio: {{audio}}. {{duration}}, {{ratio}}.
```

**使用要点**

- Sora 会自己补剧情，提示词写「起点和终点」比写过程更准
- 需要声音时务必显式写 Audio，否则可能静音
- 一条提示词只保留一个时间连续的场景

## Veo 3.1　`veo`

- 厂商：Google
- 定位：音画同步生成，物理与材质表现优秀
- 结构：Subject → Action → Scene → Shot → Light → Style → Audio
- 语言：英文
- 时长：8 秒　画幅：16:9 / 9:16
- 负向提示词：不支持　音频：支持

```text
{{subject}} — {{action}}, {{scene}}. {{shotSize}}, {{camera}}, {{light}}, {{style}}. Audio: {{audio}}. {{ratio}}, {{duration}}.
```

**使用要点**

- 音效写具体（footsteps on wet concrete）比写 ambient sound 好
- 有对白时用引号包住台词，并注明说话人
- 避免在同一镜头内切场景，Veo 会强行衔接导致变形
