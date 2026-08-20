# 口播稿 · Opus 4.8 的 effort + fast mode：两个开关、三个省钱坑

> 唯一真相源。16:9 横屏，深度题（工程提效实战），目标 2 分半到 3 分。每个节拍 = 一个网页 step，都有口播（无静音步）。
> narration 为配音/字幕文本；「画面」为该 step 视觉要点，精确数字与英文术语由画面/字幕承载。
> 冷开铁律：第一句自成立，不依赖任何前情（非系列）。英文术语（effort / fast mode / xhigh / prompt cache / usage credits / token）留字幕原文，配音念法走 build 内 tts.config normalize。
> 留存设计（brain：完播率是账号系统短板）：[2] 预告「三个坑、最后一个最容易白花钱」做全片挂钩；坑按贵→隐蔽递进，组合心法与 takeaway 收尾。

---

## 钩子（冷开）

**[1]** narration：同一个模型，干同一件事，账单能差出好几倍。差别不在你提示词写得多好，在两个你可能从来没动过的开关。
画面：中央两枚大号拨杆开关（EFFORT / FAST），左右两张账单对比，一张明显厚一叠；标题字「差的不是模型，是开关」。

**[2]** narration：Opus 4.8 刚更新，价格没涨，还是 5 美元进、25 美元出。但真正管你账单的，是跟它一起上线的 effort 控制和 fast mode。这一集讲清这两个开关，外加三个藏在官方文档里的坑——最后一个，最容易白花钱。
画面：顶部「Opus 4.8 · $5 / $25 per MTok 不变」；下方两条线索卡「开关 ①effort ②fast mode」+ 三个坑位占位（第三个打亮问号）；小字标注「来源：Anthropic 官方发布页」。

## 开关一 · effort：整条回复的 token 油门

**[3]** narration：先说 effort。很多人以为它是调"思考深度"的，官方文档写得很清楚：它管的是这条回复里的所有 token——正文、思考，连工具调用都算。你把 effort 调低，模型会少调工具、合并操作、直奔主题。
画面：一条回复被解剖成三段条形「文本 / 思考 / 工具调用」，effort 滑杆左移时三段同步缩短；标签「effort 控制的是全部 token，不只是思考」。

**[4]** narration：它一共五档，从 low 到 max，API 默认就是 high。翻译一下：你从来没动过它，就等于一直踩着中高油门在烧钱。这次连 claude.ai 网页版都加上了 effort 选择器，所有套餐都能用。
画面：五档竖排 low / medium / high / xhigh / max，high 上挂「默认」牌；旁边一个油门踏板半踩状态；角标「claude.ai 全套餐可用」。

**[5]** narration：官方的选法很直白：写代码、跑 agent，xhigh 起步；想省钱，降到 medium，官方原话叫"日常工作流的直接替换"；subagent 和简单任务，直接 low，token 省得最狠。
画面：三行场景对照表「编码/agent → xhigh」「日常降本 → medium」「subagent/简单任务 → low」；小字「来源：platform.claude.com effort 文档」。

**[6]** narration：第一个坑来了：effort 千万别在会话中间换挡。命中缓存的输入 token，只按一折计价；而 effort 一换，整条前缀缓存直接作废，下一条请求回到全价。官方明说：一个会话开头定好一档，就别再动。
画面：坑① 卡片；一条长长的缓存条（标「cache 命中 = 0.1×」）被"换挡"动作拦腰打碎，价格从 0.1× 弹回 1×；金句「换一次挡，缓存全作废」。

## 开关二 · fast mode：加钱换速度

**[7]** narration：第二个开关 fast mode。Claude Code 里斜杠 fast 一按就开。注意，它不是换了个小模型——同一个 Opus，能力一点不降，速度最高 2.5 倍。代价是单价翻倍：10 美元进、50 美元出。好消息是，这个价比上一代 fast mode 直接便宜了 3 倍。
画面：`/fast` 命令行回车，出现「Fast mode ON ↯」；速度表拉到 2.5×；价签对比「标准 $5/$25 → fast $10/$50」+ 划掉的旧价「上一代 3× 贵」。

**[8]** narration：第二个坑就藏在这：fast mode 要是会话聊到一半才开，你得为前面积累的整个上下文，重新付一次全价输入费。聊得越深，这一下越贵。所以官方建议就一句话：要用 fast mode，开局就开。
画面：坑② 卡片；一条越滚越长的对话上下文，中途按下 /fast 时整条被标上「重付全价 uncached」；对比另一条开局即开的时间线一路平价；金句「要开就开局开」。

**[9]** narration：第三个坑，订阅党专属：Pro 和 Max 套餐里，fast mode 不走你套餐额度，走 usage credits，单独扣钱。反过来说这也是个隐藏福利——它不占你的 rate limit。但你要是挂着 fast mode 跑一整晚长任务，那就是真金白银在滴血。
画面：坑③ 卡片；两个钱包分栏「套餐额度（不动）」「usage credits（哗哗扣）」；一个通宵进度条 + 心跳式扣款数字；角标「福利：不占 rate limit / 代价：单独计费」。

## 组合心法

**[10]** narration：最后把两个开关拼起来：effort 管你这次花多少 token，fast mode 管每个 token 多贵、多快，俩是独立的。交互调试要手感，开 fast；无人值守跑批量，standard 速度配合适的 effort。官方甚至给了个组合：简单任务 fast 加 low 双开，速度拉满。
画面：二维坐标轴，横轴「effort：花多少 token」、纵轴「fast：单价与速度」，四象限落四个场景点，「fast + low = 简单任务最速」高亮。

## takeaway + 互动

**[11]** narration：收个尾，省钱三句话：effort 按任务开局定一档，中途不换挡；fast mode 要开就开局开；订阅党盯紧 usage credits。想要这两页官方文档的中文速查表，评论区扣"省钱"，我贴在置顶评论。你跑 AI 一个月烧多少 token？也评论区聊聊。
画面：结尾卡三行大字「①effort 定一档不换 ②fast 开局开 ③盯紧 usage credits」；底部互动引导「评论区扣：省钱」+「你一个月烧多少 token？」；小字标注「数字均来自 Anthropic 官方发布页与文档 · 2026-08」。

---

## 信息来源（可溯源，全部官方一手，2026-08-19 Jina Reader 抓取）

1. **定价与发布** = Anthropic 官方发布页 `anthropic.com/news/claude-opus-4-8`：Opus 4.8 定价与 4.7 不变（$5/M input、$25/M output）；fast mode 2.5× 速度、$10/$50、"three times cheaper than it was for previous models"；effort 控制上线 claude.ai/Cowork 全套餐；默认 high effort。
2. **effort 机制与档位** = 官方 API 文档 `platform.claude.com/docs/en/build-with-claude/effort`：effort 影响响应中**全部 token**（文本/工具调用/思考）；低 effort → 更少工具调用、合并操作；五档 low/medium/high/xhigh/max，API 默认 high；Opus 4.8 建议 = 编码/agent 从 xhigh 起步、medium 为 "drop-in for the average workflow where you want good results while reducing costs"（[5] 的「日常工作流的直接替换」为此句意译）、low 适合 subagents/简单任务；**"Changing effort mid-conversation … does not preserve cached prefixes"**，best practice "Hold effort constant within cached conversations"（坑①）。
3. **缓存一折计价** = Anthropic 官方定价：prompt cache 读取 = 0.1× 基础 input 价（Opus $5 → $0.50/MTok），坑①的「一折」由此。
4. **fast mode 用法与坑** = Claude Code 官方文档 `code.claude.com/docs/en/fast-mode`："Fast mode is not a different model … identical quality and capabilities"；up to 2.5× faster；$10/$50（Opus 5 与 4.8 同价）；`/fast` 切换；**"The first time you enable fast mode in a conversation, you pay the full fast mode uncached input token price for the entire conversation context … enabling fast mode from the start is cheaper"**（坑②）；订阅计划（Pro/Max/Team/Enterprise）fast mode "available via usage credits only and not included in the subscription rate limits"（坑③）；"use fast mode with a lower effort level for maximum speed on straightforward tasks"（[10] 组合）。

## 合规自检
- 冷开 [1] 独立成立、不依赖前情；「账单差出好几倍」为机制推论的定性表述（effort 档位 token 差 + fast 单价 2× + 缓存 0.1× vs 1×，叠加可到数倍），非实测宣称。
- **角度修正**：backlog 工作标题「怎么让我账单降一半」为实测口吻，无人流水线不做实测、不臆造账单数字 → 全片不出现「我的账单降了 X%」类宣称，改讲官方机制+官方数字；「便宜 3 倍」「2.5 倍速」「$10/$50」「一折」均为官方口径并在画面标注来源。
- 无绝对化用词（「速度最高 2.5 倍」用官方 "up to" 口径；「省得最狠」是档位间相对比较，对应官方 "Significant token savings … 最 efficient" 表述，字幕可加"（五档中）"限定）；不念外链（[11] 只说「官方文档」，速查表走置顶评论由人发布时兑现）；第一人称口语，无论文腔；无违禁词、无夸大承诺、无站外导流。
- 强 CTA（扣"省钱"换速查表）依 brain 打法（软 CTA 实测无效）；**兑现项**：置顶评论速查表需人在发布时贴出，物料我会附在 4-publish.md 备注，人审时确认。
