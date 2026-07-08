# EP14 · Prompt 缓存崩了，它能告诉你是哪个工具干的

> 口播稿唯一真相源（2-create 步骤 1）。改 narration 必先改这里，再 `npm run extract-narrations` 重抽、`rm` 改动段 mp3 重合成。
> 16:9 横屏 · 三章 15 段 · 预计 2.5min 左右。
> 源码溯源仓：/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main
> 主文件：src/services/api/promptCacheBreakDetection.ts（726 行）；协同：src/services/compact/cachedMicrocompact.ts

---

## 第一章 · 冷开钩子（coldopen，2 段）

**[1]** 做 AI 应用的都知道，prompt 缓存能帮你省一大笔钱：命中缓存，那部分输入 token 的价钱直接打到一折。但没人告诉你——缓存说崩就崩，崩了你还经常不知道为什么。

**[2]** Claude Code 干脆给缓存装了个黑匣子：崩了之后，它能精确告诉你是哪一项、甚至是哪个工具，把缓存搞崩的。今天就拆这套黑匣子。

## 第二章 · 黑匣子怎么做（blackbox，11 段）

**[3]** 先说缓存为什么这么娇贵。命中规则很死：这次请求的前缀，得跟上次一字节都不差。系统提示、工具定义、模型、连一个开关，只要变一点，缓存全废，钱打回原形。

**[4]** 可一个真实请求里，藏着几十个工具、十几个 beta 开关、一大段系统提示、模型、推理强度、缓存策略……崩了之后想人肉排查是哪一项干的，跟大海捞针一样。

**[5]** 黑匣子的思路特别朴素：每次发请求之前，先把所有可能搞崩缓存的因素，逐项拍一张哈希快照。

**[6]** 系统提示算一个哈希、模型一个、beta 开关列表一个、推理强度一个、缓存策略一个……连缓存控制本身都单独存一个哈希，专门抓那种文字没变、但缓存范围或者有效期偷偷翻转的情况。

**[7]** 最关键的是工具。它不是把几十个工具揉成一个哈希，而是每个工具的 schema 单独算一个、单独存。

**[8]** 下次请求回来，它逐项比对新旧哈希：哪一项变了，哪一项就是嫌疑人。然后拼成一句人话，比如「工具变了，多两个少零个」，或者「系统提示长了三百字」。

**[9]** 为什么工具非要拆到逐个哈希？因为最阴的一种崩法是：工具一个没多、一个没少，但其中某个工具的描述或参数悄悄改了。

**[10]** 源码注释里写得很直白：这种「工具集没变、schema 变了」的情况，占了工具类缓存崩的百分之七十七。没有逐工具哈希，你只知道工具那块崩了；有了它，它直接点名是几十个工具里的哪一个。

**[11]** 而且它不是一掉就报警。有个阈值：缓存命中的 token 得比上次掉超过百分之五、而且绝对值至少掉两千个，才算真崩。小波动直接忽略，免得天天误报。

**[12]** 确认崩了，它还动真格：用 diff 把崩之前和崩之后的完整 prompt 状态，做成一份补丁文件写到磁盘，路径打进日志。开 debug 你就能翻出来，逐字看到底哪几个字变了。一份缓存的验尸报告。

**[13]** 最让我服的是它的诚实。要是逐项查完，客户端啥都没变、时间也没超过缓存有效期，源码注释说这种大概九成是服务端自己的路由或者驱逐。这时候它不甩锅给你，直接标注「大概率服务端」或者「缓存到期」。

## 第三章 · 升华 + 结尾钩（ending，2 段）

**[14]** 所以你看，这套黑匣子不只抓你写的 bug，也能洗清你的代码。做 AI 应用的朋友，这思路特别值得抄：把缓存命中率做成你系统的监控指标，崩了能定位，比闷头烧钱强太多。

**[15]** 源码咱们就拆到这。这个系列拆了十四集，最后一集不拆别人的了——下集自己动手，两百行代码，手写一个迷你版 Claude Code。评论区也留个题：你做 AI 应用，监控缓存命中率吗？

---

## 溯源（全核于 source_repo，行号会漂移以锚点为准）

- **[1] 缓存省钱「打到一折」**：Anthropic prompt cache 命中读取计费约为基础输入价 1/10（cache read ≈ 0.1×），故「打到一折」属实、非臆造跑分；口播框定为「省一大笔钱」更稳。
- **[3] 前缀逐字节一致才命中**：`promptCacheBreakDetection.ts` 整体逻辑即对「会改变服务端缓存键」的客户端因素逐项快照；`stripCacheControl`/`computeHash`/`buildDiffableContent`（system+tools+model 拼成可 diff 文本）。
- **[5][6] 逐项哈希快照（两阶段）**：`recordPromptState`（请求前 phase 1）记录 `PreviousState`：`systemHash`/`toolsHash`/`cacheControlHash`(注释「Catches scope/TTL flips global↔org,1h↔5m that stripCacheControl erases」line 31-33)/`model`/`fastMode`/`globalCacheStrategy`/`betas`/`effortValue`/`extraBodyHash`/`perToolHashes` 等十余项（type PreviousState line 28-69）。
- **[7][9] 每个工具单独哈希**：`perToolHashes: Record<string, number>`（line 38）、`computePerToolHashes` 逐工具 `computeHash`（line 187-199）。
- **[8] 逐项对比 + 人话**：`checkResponseForCacheBreak`（phase 2）按 `pendingChanges` 拼 `parts`，如 `tools changed (+N/-M tools)` / `(tool prompt/schema changed, same tool set)` / `system prompt changed (+N chars)`（line 511-516、501-509）。
- **[10] 77%**：line 35-37 注释「Diffed to name which tool's description changed when toolSchemasChanged but added=removed=0 (77% of tool breaks per BQ 2026-03-22)」。属源码注释真实数据。
- **[11] 阈值 5% + 2000 token**：`MIN_CACHE_MISS_TOKENS = 2_000`（line 120）；触发判定 `cacheReadTokens >= prevCacheRead*0.95 || tokenDrop < MIN_CACHE_MISS_TOKENS` 则不报（line 485-491）→ 即掉 >5% 且绝对掉 ≥2000 才报。
- **[12] diff 验尸报告**：`writeCacheBreakDiff` 用 `createPatch`（diff 库）把 prevDiffableContent→buildDiffableContent 写成 `.diff` 文件到 `getClaudeTempDir()`，路径进 summary 日志供 `--debug`（line 648-660、707-726）。
- **[13] 约九成服务端**：line 572-575 注释「when all client-side flags are false and the gap is under TTL, ~90% of breaks are server-side routing/eviction…」；无客户端变更时 reason 标 `likely server-side (prompt unchanged, <5min gap)` / `possible 5min/1h TTL expiry`（line 583-589）；TTL 常量 `CACHE_TTL_5MIN_MS`/`CACHE_TTL_1HOUR_MS`（line 125-126）。
- **[15] 结尾钩**对齐 EP15「两百行代码手写迷你 Claude Code（完结篇）」（backlog 2026-06-10-015）；不剧透、不依赖本集上文。
- **冷开自成立**：[1] 首句「做 AI 应用的都知道 prompt 缓存能省一大笔钱」自带语境，3 秒站得住，不依赖上一集。
- **合规**：数字（一折/77%/5%/2000/九成）均出自源码常量·注释或 Anthropic 计费规则，无臆造；「最关键/最阴/最服」为口语态度词；无违禁/绝对化承诺/口播导流。
- **附加可溯**（未必入口播）：`MAX_TRACKED_SOURCES=10`(line 107) 防内存涨；`sanitizeToolName` 把 MCP 工具名收敛成 'mcp' 防泄露路径（line 183-185）；haiku 模型排除检测（line 129-131）；`cacheDeletionsPending`/`notifyCacheDeletion` 与 cached microcompact 的 `cache_edits` 删除协同，缓存合理下降不算崩（line 472-483、cachedMicrocompact.ts:106）。
