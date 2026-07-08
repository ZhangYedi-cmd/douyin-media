# 成稿 · 口播稿（EP08 · 工具不是越多越好——它只把一小半告诉 AI）

> 系列：Claude Code 源码解读 S2E8 ｜ 结构：新奇概念（白名单 + 给 AI 配搜索引擎）｜ 目标时长 约 3min
> 这是口播稿**唯一真相源**；web-video-presentation 里的 script.md / narrations.ts 是它的派生件，以本文件为准。
> 所有技术结论溯源见文末「事实核对」，逐条指到 source_repo 行号。
> ★ 据实校准（plan/标题 vs 源码）：
>   1）plan 与标题写的「60 个工具只告诉 AI 27 个」——源码里【没有】硬编码的 60，也没有 27。
>      真实：核心白名单 CORE_TOOLS 是【28 个】（tools.ts:137-174），注释明说这些「永不延迟、出现在初始 prompt」，
>      其余所有工具——非核心内置 + 【所有 MCP 工具】——都延迟，必须靠 SearchExtraTools/ExecuteExtraTool 发现。
>      总工具数随 feature flag / env / 接入的 MCP 浮动，无定值。所以脚本：① 不把 60 当源码事实念；
>      ② 用「内置几十个 + 可无限接 MCP」据实表述；③ 把「核心 28 个」当那个精确数字讲。
>   2）TF-IDF 字段权重 3.0/2.5/1.0、中文 bigram、给 AI 的搜索引擎本身（SearchExtraTools）——全部核到行号属实。
>   3）结尾承接钩对齐【实际下一集 EP09】（多 provider 适配：同一套代码怎么把 Claude/GPT/Gemini 全接进来）。

---

## 钩子（前 3 秒 · 冷开，不依赖上下文）
你给 AI 的工具越多，它就越聪明吗？恰恰相反。
Claude Code 内置了几十个工具，还能再外挂无数个——但它一开始，只把其中固定的二十来个塞给模型。剩下的全藏起来。

## 真相：藏起来，不是抠门，是治"工具过载"
为什么要藏？两个实打实的代价。
第一，钱。每一个工具，它的名字、参数、说明书，都得原封不动写进 prompt，跟着每一次请求发出去，按 token 计费。工具越多，每句话都更贵。
第二，更要命——工具一多，模型自己会挑花眼，反而更容易选错那个该用的。
所以源码里做了个干脆的决定：把工具分成两等。

## 方案：一份白名单，常驻；其余的，延迟
第一等，叫核心工具。读文件、写文件、跑命令、搜代码这些天天要用的，进一份白名单，常驻 prompt，永远在线。
我数了下源码里这份白名单，正好二十八个。注释写得很直白：这些工具永不延迟，开局就出现在 prompt 里。
第二等，是其余所有工具——包括你接进来的每一个 MCP 工具。它们统统被标成"延迟工具"，开局不进 prompt。
那 AI 要用到它们怎么办？这就是最妙的地方。

## 核心设计：给 AI 配了个搜索引擎
源码给 AI 配了个工具——它本身就是个搜索引擎，专门用来搜别的工具。
AI 需要某个能力，就调用这个搜索工具，描述一下我想干嘛，引擎当场从那些被藏起来的工具里，挑出最匹配的几个，递给它。
换句话说，AI 不是一开始就拿到整本工具说明书，而是像我们用搜索引擎一样，要用什么、现查什么。

## 这搜索引擎是真的搜索引擎：TF-IDF
而且它不是随便关键词匹配——它用的是 TF-IDF，早期搜索引擎排相关性的同款思路，全在本地算，不调任何外部接口。
更讲究的是字段加权。同一个词，出现在工具的名字里，权重三点零；出现在它的搜索提示里，二点五；出现在长长的描述里，只算一点零。
道理很简单：名字命中，比描述里偶然提一嘴，靠谱得多。

## 一个让我服气的细节：它照顾中文
还有个细节我特别服。这个给 AI 用的搜索引擎，专门照顾了中文。
英文按单词切，中文没有空格，它就用 bigram——两个字两个字地切，再去匹配。
而且为了防止一个字瞎撞上、误判相关，源码要求中文至少命中两段才算数。一个内部工具的搜索，都把中文用户认真当回事。

## 升华：给 AI 的信息，不是越多越好，是越准越好
退一步看，这件事的意义远不止 Claude Code。
我们总下意识觉得，给 AI 的上下文越全、工具越多、资料越丰富，它就表现越好。但源码用真金白银告诉你：不是。
信息不是越多越好，是越准越好。多了，又烧钱，又干扰判断。
你写提示词、做 RAG、设计工具，全是同一个道理：先给最该给的那一小批，剩下的让它按需去取。克制，本身就是一种工程能力。

## 结尾钩 + 互动
工具的事说到这。把工具收拾干净了，下一集换个更刁的角度：
同一套代码，怎么能同时把 Claude、GPT、Gemini 全接进来，谁来了都能跑？源码里那层适配设计，挺见功夫。
互动留个问题：如果只让你给 AI 配五个工具，剩下的全砍掉——你会留哪五个？评论区聊聊。

---

## 分镜 / 高亮速记（给 web-video-presentation 对齐）
| 段落 | 关键画面 | 高亮数字/词 |
|---|---|---|
| 钩子 | 一堆工具图标涌向 AI，AI 反而卡住；只有少数几个被放行 | **工具越多越聪明？相反 / 只塞二十来个** |
| 真相 | 左：每个工具说明书贴上"按 token 计费"价签；右：工具太多 AI 挑花眼选错 | **两个代价：烧钱 + 挑花眼** |
| 方案 | 工具分两等：核心进"白名单"常驻；其余锁进仓库标"延迟" | **核心 28 个常驻 / 其余含所有 MCP 延迟** |
| 搜索引擎 | AI 拿着搜索框走向仓库，输入需求，引擎递回最匹配的几个工具 | **给 AI 配搜索引擎 / 要用什么现查什么** |
| TF-IDF | 天平动画：name 3.0 > searchHint 2.5 > description 1.0 | **TF-IDF·本地算 / 名字3.0·提示2.5·描述1.0** |
| 中文细节 | 中文句子被两字两字切开做匹配，"至少命中两段"印章 | **bigram 两字一切 / 中文至少命中 2 段** |
| 升华 | "越多" 与 "越准" 两个砝码，"越准"压下去 | **信息越准越好，不是越多越好 / 提示词·RAG·工具同理** |
| 结尾 | 工具归位 + EP09 预告：Claude/GPT/Gemini 三个 logo 接进同一套代码 | **EP09：同一套代码接 Claude/GPT/Gemini** |

## 事实核对（交审用，逐条可溯源）
> source_repo: `/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main`
- **核心工具白名单（28 个 · 常驻 prompt）** ←
  `src/constants/tools.ts:137-174` `CORE_TOOLS = new Set([...])`；注释 `:131-135` 原文「Core tools that are
  always loaded with full schema at initialization. These tools are never deferred — they appear in the
  initial prompt. All other tools (non-core built-in + all MCP tools) are deferred and must be discovered
  via SearchExtraToolsTool / ExecuteExtraTool.」
  数量 = 28：26 个显式常量(`:140-173`，Read/Edit/Write/Glob/Grep/NotebookEdit/Agent/AskUserQuestion/
  TaskOutput/TaskStop/TaskCreate/TaskGet/TaskList/TaskUpdate/TodoWrite/EnterPlanMode/ExitPlanMode/
  VerifyPlanExecution/WebFetch/WebSearch/LSP/Skill/Sleep/SearchExtraTools/ExecuteExtraTool/SyntheticOutput)
  + `SHELL_TOOL_NAMES` 展开 2 个(`:139` 注释 'Bash','Shell')。
  ★ **据实弃用 plan/标题的「60 / 27」**：源码无硬编码 60，核心实际 28；脚本用「几十个内置 + 二十来(28)个核心」。
- **工具总数浮动（无定值）** ←
  `src/tools.ts:217-280` `getAllBaseTools()`：约 24 个无条件工具 + 一批条件加载（`hasEmbeddedSearchTools()`
  才省 Glob/Grep；`USER_TYPE==='ant'` 才加 Config/Tungsten/REPL；`isTodoV2Enabled()` 才加 Task* 四件；
  `ENABLE_LSP_TOOL`/`isWorktreeModeEnabled()` 等）+ `cronTools`(3) + `ListMcpResources/ReadMcpResource`
  + `isSearchExtraToolsEnabledOptimistic()` 才加 `SearchExtraToolsTool`(`:276`) + `ExecuteTool` 永远在
  (`:279` 注释「first-class tool — always available, not deferred」)。总数随 flag/env/接入 MCP 浮动 → 脚本说「几十个」。
- **给 AI 的搜索引擎 = TF-IDF·本地算** ←
  `src/services/searchExtraTools/toolIndex.ts:3-8` 从 `skillSearch/localSearch` 导入
  `tokenizeAndStem/computeWeightedTf/computeIdf/cosineSimilarity`（纯本地，无外部 API）；
  `:81` 只索引 `deferredTools = tools.filter(t => isDeferredTool(t))`；`:137-143` `computeIdf` 后 `tf*idf`；
  `:180` `cosineSimilarity` 打分；`:146` 日志原文「indexed ${entries.length} deferred tools from
  ${tools.length} total tools」——坐实核心/延迟二分。
- **字段加权 3.0 / 2.5 / 1.0** ←
  `toolIndex.ts:33-37` `TOOL_FIELD_WEIGHT = { name: 3.0, searchHint: 2.5, description: 1.0 }`；
  `:113-117` `computeWeightedTf([{nameTokens,3.0},{hintTokens,2.5},{descTokens,1.0}])`。**plan 写的权重逐行对上**。
- **中文 bigram + 至少命中 2 段** ←
  `localSearch.ts` `tokenize()`(`:158-165`)：遇 CJK 连续段，`for j … tokens.push(cjkRun.slice(j, j+2))` 两字一切；
  `toolIndex.ts:43` `CJK_MIN_BIGRAM_MATCHES = 2`、`:45` `CJK_RANGE`、`:182-188`：中文 token 命中 < 2 且无 ascii
  命中则 `score = 0`（防单字误撞）。细节 `:190-191` 查询串完整包含工具规范名 → `score = max(score, 0.75)`。
- **「工具搜索」工具本身 + 执行工具** ←
  名 `'SearchExtraTools'`（`packages/builtin-tools/src/tools/SearchExtraToolsTool/constants.ts`
  `SEARCH_EXTRA_TOOLS_TOOL_NAME`）；它自己列在 `CORE_TOOLS`(`tools.ts:171`)常驻 prompt——AI 靠它搜被延迟的工具。
  另有 `ExecuteExtraTool`(`ExecuteTool`，`tools.ts:172`/CORE) 一等公民，用来真正调用搜到的延迟工具。
- **主动预取（双通道）** ←
  `src/services/searchExtraTools/prefetch.ts`：用户输入/助手回复时从消息历史提取查询、构索引、搜 top3、
  去重（本会话未发现过的），产 `tool_discovery` attachment 提示 UI（按需调用 + 后台预取并行）。
- **结尾钩对齐 EP09**：日更按 episode 升序，下一集 = EP09「同一套代码怎么同时支持 Claude、GPT、Gemini」（多 provider 适配）。
- **合规**：无臆造数据；所有数字（28、3.0/2.5/1.0、bigram=2、0.75、top3）均溯源上述行号；据实弃用 plan 的 60/27；
  「越准越好/克制是工程能力」是对 token 成本 + 工具过载设计取舍的口语化，非营销承诺；无违禁词/绝对化/口播导流。
