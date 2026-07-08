# 成稿 · 口播稿（EP03 · 你每月给 Claude 充的钱，一半花在它"记性太好"上）

> 系列：Claude Code 源码解读 S1E3 ｜ 结构：金钱叙事（账单破案）｜ 目标时长 2.5–3min
> 这是口播稿**唯一真相源**；web-video-presentation 里的 script.md 是它的派生件。
> 所有硬数字溯源见文末「事实核对」，逐条指到 source_repo 行号。

---

## 钩子（前 3 秒 · 冷开，不依赖上下文）
你跟 AI 聊得越久，它就越贵——而且不是贵一点。
你说的每一句话，它下一次回复时，都要从头到尾**再读一遍**。
你说一百句，它就读一百遍历史记录。每读一遍，都在花你的钱。

## 痛点科普（账单怎么来的）
为什么？因为大模型其实**没有记忆**。
每一次请求，都是把你们之前的全部对话，重新打包塞进去，重新算一次钱。
所以聊得越长，**单次**就越贵——这是所有 AI 编程工具，藏在你账单里的隐形成本。
> 视觉：对话气泡越堆越高，右上角账单数字跟着往上滚。
那 Claude Code 是怎么跟这笔钱死磕的？源码里我数出来，至少三招，外加一个彩蛋。

## 省钱招式一：Prompt Cache（缓存打骨折）
第一招：把每次都一样的部分缓存住。
系统提示、工具定义这些，每次请求都原封不动——那就缓存在服务端，
下次命中缓存的部分，价格大概只要原价的**十分之一**。
> 视觉：一长条 prompt，固定段变成绿色"已缓存"，只剩你的新话按原价。
Claude Code 还做了一件偏执的事：缓存一旦失效，它能**查出是谁干的**。
它给每个工具的描述都存了哈希，一比对就知道是哪个工具改了字——
源码里写得很直白：**77% 的工具缓存失效，都是某段描述被人动了一个字**。

## 省钱招式二：少带工具（工具描述也是钱）
第二招更反直觉：**工具的说明书，本身也是按 token 收费的**。
工具越多，每次请求白白多带的字就越多。
所以 Claude Code 只把**核心那三十来个工具**常驻在 prompt 里，
剩下的全塞进一个搜索引擎，让 AI 自己按需去查。
> 视觉：一大堆工具图标，只有核心几个留在上方，其余被收进一个搜索框。
这引擎用的是经典的 TF-IDF，还给字段加了权重：
工具名最值钱算三分，搜索提示两分半，详细描述只算一分。
该带的才带，能省一个字是一个字。

## 省钱招式三：自动压缩（套娃式省钱）
第三招：上下文快塞满了，它会自动喊一个小模型，把老对话**浓缩成一段摘要**。
什么时候触发？它会按你的上下文窗口大小自适应留缓冲——
普通窗口留一万三千 token，大窗口留三万，超大窗口留五万。
最骚的是：**压缩这件事本身，还复用了主会话的缓存来省钱**。
省钱的操作也要省钱，套娃。
源码里 Anthropic 自己做过实验，不复用缓存那条路，**九成八都是缓存没命中**，白烧钱。
它还配了个保险丝：连着压缩失败三次，就直接熔断、不再硬试，免得你的钱打水漂。

## 彩蛋：穷鬼模式
最后一个彩蛋，源码里真有个命令，叫 `/poor`，**穷鬼模式**。
开了它，Claude Code 就把一切非必要的 AI 调用全关掉：
不再后台帮你提取记忆、不再生成下一步建议、连那个独立验证的 agent 都给你省了。
文件名就叫 `poorMode`——Anthropic 工程师是真懂你月底的痛。

## 结尾钩 + 互动
所以你看，AI 省钱不是玄学，是缓存、裁剪、压缩，一层层抠出来的。
下一集，咱们把镜头怼到一个 **0.1 秒**的瞬间——
你按下 Esc 想喊停的那一下，Claude Code 内部到底发生了什么。
互动留个问题：**你每月在 AI 工具上花多少钱？评论区报个数，看看谁是大冤种。**

---

## 分镜 / 高亮速记（给 web-video-presentation 对齐）
| 段落 | 关键画面 | 高亮数字/词 |
|---|---|---|
| 钩子 | 对话气泡堆高，账单数字滚动 | **每句都重读一遍 / 都在花钱** |
| 痛点 | 全量历史重新打包计费 | **大模型没有记忆** |
| 招式一 | 固定段变绿"已缓存"，缓存失效诊断 | **十分之一 / 77%** |
| 招式二 | 核心工具留下，其余进搜索框；TF-IDF 权重 | **30 来个 / 3·2.5·1** |
| 招式三 | 老对话→摘要；缓冲阈值；熔断 | **13k/30k/50k / 失败3次熔断 / 98%缓存miss** |
| 彩蛋 | 终端敲 `/poor`，源码 `poorMode` | **穷鬼模式** |
| 结尾 | 引擎层示意 + EP04 预告（Esc 的 0.1 秒） | **EP04 预告** |

## 事实核对（交审用，逐条可溯源）
> source_repo: `/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main`
- Prompt Cache 命中读价 ≈ 原价 1/10 ← Anthropic 公开定价（cache read = 0.1× base input），常识级，不臆造数字。
- 缓存失效按工具 schema 哈希诊断、**77% 的工具缓存失效是描述变更** ← `src/services/api/promptCacheBreakDetection.ts:35–37`（"77% of tool breaks per …" 注释）。
- 工具描述按 token 计费 → 核心工具白名单常驻、其余走搜索发现 ← `src/constants/tools.ts:137`（`CORE_TOOLS`，约 30 项）+ `SEARCH_EXTRA_TOOLS`/`EXECUTE` 常驻。
- TF-IDF 字段权重 **name 3.0 / searchHint 2.5 / description 1.0** ← `src/services/searchExtraTools/toolIndex.ts:34–36`。
- 自动压缩缓冲阈值 **13k/30k/50k 自适应** ← `src/services/compact/autoCompact.ts:62,79–81`（`AUTOCOMPACT_BUFFER_TOKENS=13_000`；≥800k→50k，≥400k→30k）。
- 压缩**复用主会话缓存** + 实验「不复用 ≈ 98% 缓存 miss」 ← `src/services/compact/compact.ts:455–457`（`tengu_compact_cache_prefix`，注释 "false path is 98% cache miss"）。
- 连续失败 **3 次熔断断路器** ← `src/services/compact/autoCompact.ts:99`（`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3`）。
- 穷鬼模式 `/poor` 跳过 extract_memories / prompt_suggestion / verification_agent ← `src/commands/poor/poorMode.ts:1–5`（头注释）+ `src/constants/prompts.ts:371–372`（"Poor mode: skip verification agent to save tokens"）+ `src/utils/attachments.ts:2431–2433`。
- 结尾钩改指 **EP04（Esc/abort）**：daily 日更按 episode 升序，下一集是 EP04 而非 plan 里写的权限(EP05)，故承接钩对齐实际下一集。
