# 成稿 · 口播稿（EP07 · Claude 是怎么"假装"记得你三小时前说的话的）

> 系列：Claude Code 源码解读 S2E7 ｜ 结构：拟人/好奇（"记得"其实是遗忘工程）｜ 目标时长 约 3.5min
> 这是口播稿**唯一真相源**；web-video-presentation 里的 script.md / narrations.ts 是它的派生件，以本文件为准。
> 所有技术结论溯源见文末「事实核对」，逐条指到 source_repo 行号。
> ★ 据实校准（plan 大纲 vs 源码）：
>   1）snip（剪辑式）**不是**「保留章节边界、剪内部细节、像电影预告片」——那是 plan 的误framing。源码真实机制是**模型驱动的按 UUID 点名删除**：对话够长(默认 30 条消息)就 nudge 模型用 snip/force-snip 把不要的旧消息自己点名(removedUuids)，系统扫到 snip_boundary 标记把这些 UUID 过滤掉、留边界标记记录删了啥、其余原样保留。脚本据实改写成「让 AI 自己当剪辑师，点名删旧消息」。
>   2）四层的触发与定位：auto=预测式(API 调用前主动)、reactive=急救式(API 报 prompt_too_long/413 或图过大后被动兜底)、micro=显微(缓存 cache_edits 删旧工具结果)、snip=剪辑(模型自删)。单 turn 内顺序 snip→micro→collapse→auto；reactive 是报错后的下一轮兜底。脚本把"预测式"讲成主力、"急救式"讲成安全网，据实。
>   3）所有数字均核到源码：自适应缓冲 13k/30k/50k、断路器 3 次、micro 阈值 10/保留 5、增长估算 +15k、摘要输出上限 20k。
>   4）摘要由 fork 分身 agent 生成且复用主会话缓存前缀（省钱），据实。
>   5）结尾承接钩对齐**实际下一集 EP08（lazy tool discovery / 60 个工具只告诉 27 个）**，不是 plan 随手写的「AI 给 AI 打工/下下集」（那对应 EP10 子 agent）。

---

## 钩子（前 3 秒 · 冷开，不依赖上下文）
跟 AI 聊了三个小时，你回头问它两小时前提的那个需求，它答得头头是道。
但真相是：你说过的话，它早就偷偷删掉了一大半——还删得让你发现不了。

## 真相：上限装不下，所谓"记得"是遗忘工程
为什么要删？因为模型的上下文窗口有上限，一段几小时的长对话，根本塞不下。
所以"记得"是假象。它真正干的，是一套精密的遗忘工程：在你撞到上限之前，悄悄把旧内容压缩、删掉。
我把它管理记忆的源码扒开了——它到底怎么决定，忘掉什么、留下什么。
源码里，它准备了整整四套遗忘的手法。我一层层拆给你看。

## 第一层：预测式压缩（主力，提前划重点）
第一套叫预测式压缩，也是最主力的一套。每次把请求发给模型之前，它先算一笔账。
算什么？现在用了多少 token，这一轮大概还要再涨多少。
怎么估增长？源码里写了个保守值：模型这一轮最多能输出的量，再加一万五千 token——这是专门给工具结果留的，读文件、跑命令吐回来的东西。
现在用的，加上预估要涨的，要是快撞到红线了，它就提前触发压缩。不等爆，提前划重点，把前面聊的浓缩成一份摘要。

## 第二层：急救式压缩（兜底安全网）
可万一预测失手了呢？第二套兜底，叫急救式压缩。
只有当 A P I 真的报错、说这段提示词太长了，它才被动触发一次紧急压缩，再重发一遍。
一个提前预防，一个出事抢救。主力永远是预防，急救只是最后的安全网。

## 第三层：显微压缩（缓存里清废料）
第三套最精细，叫显微压缩。它根本不动你的对话，专门清工具产生的废料——就是你让它读过的那些旧文件内容。
规则很简单：工具结果攒过十个，就把最老的几个删掉，只留最近的五个。
而且是在缓存里做微创手术，源码里这个动作直接就叫 delete tool result，精准删掉，不波及别的部分。

## 第四层：剪辑式压缩（AI 自己当剪辑师）
第四套最有意思，叫剪辑式——它让 AI 自己当剪辑师。
对话长到一定程度，系统就提醒模型：你可以把不要的旧消息，自己点名删掉。
模型挑出该删的，系统就照着这份名单，把它们从历史里过滤掉，只留一个边界标记，记着这里删过东西，其余原样保留。
删什么、留什么，是 AI 自己定的。

## 魔鬼细节一：阈值是自适应的
讲两个我特别服的细节。第一个：那条触发压缩的红线，不是写死的，是自适应的。
窗口越大，留的缓冲越多。有效窗口超过八十万 token，留五万的余量；超过四十万，留三万；再小，就留一万三。
为什么？因为窗口越大，单轮能吐的也越多，得多留点安全垫。

## 魔鬼细节二：断路器（省钱工程不能变烧钱黑洞）
第二个：压缩本身也可能失败。要是连续失败三次，它就直接放弃，这个会话里不再尝试——一个断路器。
为什么要这个？源码注释里留了真实数据：有一天，一千两百多个会话连续失败超过五十次，最狠的一个会话失败了三千多次，全球一天白白烧掉大约二十五万次 A P I 调用。
省钱的工程，自己绝不能变成烧钱的黑洞。

## 彩蛋：摘要由分身写，还复用缓存
最后一个彩蛋。那份摘要，不是主模型停下来自己写的。
它专门 fork 一个分身去写，还复用主对话已经缓存好的前缀——连写个摘要，都要省着花。

## 升华 + 结尾钩 + 互动
所以回到开头：AI 不是真记得你三小时前说的话。它是用这四套遗忘术，一边删、一边瞒着你。
预测、急救、显微、剪辑——四套手法，把"记得住"和"装得下"，同时做到了。
压缩，是把已经进来的东西省下来。下一集更狠：它干脆一开始就不把所有工具都告诉 AI——六十个工具，只先告诉它二十七个，剩下的让它自己去搜。
互动留个问题：你有没有被 AI"失忆"坑过——聊到一半，它忘了你前面定的要求？说说最离谱的一次。

---

## 分镜 / 高亮速记（给 web-video-presentation 对齐）
| 段落 | 关键画面 | 高亮数字/词 |
|---|---|---|
| 钩子 | 三小时聊天记录，旧消息正被悄悄"擦掉"变灰 | **早删掉一大半 / 删得发现不了** |
| 真相 | 一本越写越厚的笔记本撞到"窗口上限"红墙 | **上限装不下 / "记得"是遗忘工程** |
| 第一层 auto | 发请求前算账：当前 token + 预估增长 vs 红线 → 提前压 | **预测式·主力 / +1.5 万估增长 / 提前划重点** |
| 第二层 reactive | API 报"prompt 太长"红叉 → 紧急压缩重发 | **急救式·安全网 / 报错才触发** |
| 第三层 micro | 工具结果卡片排成队，>10 个时最老的几张被"微创"抽走，留最近 5 | **显微·缓存微创 / 攒过 10 删到留 5 / delete tool result** |
| 第四层 snip | AI 当剪辑师，对旧消息打勾点名，按名单过滤，留边界标记 | **剪辑式·模型自删 / 按 UUID 点名 / 留边界标记** |
| 细节一 | 三档缓冲随窗口变大：13k→30k→50k 阶梯 | **自适应阈值 / 80万留5万·40万留3万·否则1.3万** |
| 细节二 | 断路器跳闸：失败×3 → STOP；旁边贴真实事故数据 | **连续失败 3 次放弃 / 一天白烧 25 万次调用** |
| 彩蛋 | 主 agent 旁边 fork 一个小分身写摘要，共享缓存前缀 | **fork 分身写摘要 / 复用主会话缓存** |
| 结尾 | 四套手法叠成一张图 + EP08 预告 | **记得住 & 装得下 / EP08：60 工具只告诉 27 个** |

## 事实核对（交审用，逐条可溯源）
> source_repo: `/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main`，目录 `src/services/compact/`
- **预测式（auto）阈值与增长估算** ←
  `autoCompact.ts:62` `AUTOCOMPACT_BUFFER_TOKENS = 13_000`；
  `autoCompact.ts:77-82` `getAutocompactBufferTokens`：effectiveWindow ≥ 800_000 → 50_000；≥ 400_000 → 30_000；否则 13_000；
  `autoCompact.ts:33-49` `getEffectiveContextWindowSize` = 模型上下文窗口 − max(模型最大输出, 20_000)；
  `autoCompact.ts:70` `TOOL_RESULT_GROWTH_ESTIMATE = 15_000`（注释:68-69「典型工具结果 5-10K，偶发大读 20K+」）；
  `autoCompact.ts:88-94` `estimateMaxTurnGrowth` = min(模型最大输出, 20_000) + 15_000；
  `autoCompact.ts:101-105` 阈值 = 有效窗口 − 自适应缓冲。**预测式是 API 调用前主动触发**（query.ts:637-651 autoCompactIfNeeded）。
- **急救式（reactive）触发条件** ←
  `reactiveCompact.ts` `isWithheldPromptTooLong`/`isWithheldMediaSizeError`（仅 assistant 的 `isApiErrorMessage` 且 `isPromptTooLongMessage` / `isMediaSizeErrorMessage`）；
  `tryReactiveCompact` 调 `compactConversation` 做兜底，`hasAttempted` 守卫只试一次。query.ts:1343-1405 在 API 返回 413 prompt_too_long / media-size 错误后触发。**被动兜底，非预测**。
- **显微压缩（micro）cache_edits** ←
  `cachedMicrocompact.ts:19-20` `TRIGGER_THRESHOLD = 10` / `KEEP_RECENT = 5`；
  `getToolResultsToDelete`：active 工具结果 > 10 时删最老的 (active−5) 个、保留最近 5；
  `createCacheEditsBlock`：生成 `{type:'cache_edits', edits:[{type:'delete_tool_result', tool_use_id}]}`。在 API 缓存层删旧工具结果，不改本地消息主体。`microCompact.ts:265-274` time-based 优先短路，否则走 cached 路径。
- **剪辑式（snip）模型自删** ←
  `snipCompact.ts:14` `SNIP_NUDGE_THRESHOLD = 30`、`SNIP_NUDGE_TEXT`（提示模型用 /force-snip 或 snip 工具压旧消息）；
  `snipCompactIfNeeded`(:83-147)：找最后一个 `subtype==='snip_boundary'` 系统消息，按其 `snipMetadata.removedUuids` 过滤——removedUuids 里的消息删掉、**边界消息本身保留（记录删了啥）、其余（含边界后消息）保留**。**据实**：不是「保留章节边界剪内部细节」，而是**模型挑出 UUID 点名删除**（哪些删由模型/用户决定）。
- **细节一 自适应阈值**：同上 `getAutocompactBufferTokens`，注释:73-76「窗口越大需更多 headroom，单轮可产出成比例更多 token」。
- **细节二 断路器** ←
  `autoCompact.ts:99` `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3`；
  `autoCompact.ts:96-98` 注释原文「BQ 2026-03-10: 1,279 sessions had 50+ consecutive failures (up to 3,272) in a single session, wasting ~250K API calls/day globally.」；
  作用域：单会话 `autoCompactTracking.consecutiveFailures`，成功归 0（:361）、失败 +1（:370-378），达 3 跳闸不再试（:286-294）。脚本「一千两百多个会话/失败超五十次/最狠三千多次/一天约二十五万次调用」即对此注释口语化，未夸大。
- **摘要由 fork 分身生成且复用缓存** ←
  `compact.ts:1185-1234` `streamCompactSummary`：`promptCacheSharingEnabled = getFeatureValue_CACHED…('tengu_compact_cache_prefix', true)`（注释「用 forked agent 复用主会话已缓存前缀：system prompt/工具/上下文」），调 `runForkedAgent({querySource:'compact', forkLabel:'compact', maxTurns:1, skipCacheWrite:true})`；`MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20_000`（autoCompact.ts:30，注释 p99.99 摘要输出 17,387 token）。
- **结尾钩对齐 EP08**：日更按 episode 升序，下一集 = EP08「60 个工具只告诉 AI 27 个，剩下的让它自己搜」（lazy tool discovery）。承接钩据实指 EP08，不指 plan 写的「AI 给 AI 打工/下下集」（那是 EP10 子 agent）。
- **合规**：无臆造数据；所有数字（13k/30k/50k、3 次、10/5、+1.5 万、80万/40万、25 万次调用）均直接溯源到上述行号；无违禁词/绝对化营销话术/口播导流。"账单/省钱"是对源码省 token 设计的口语化，非营销承诺。
