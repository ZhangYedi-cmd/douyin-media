# 成稿 · 口播稿（EP06 · 10 个工具同时跑，为什么不会把你的文件写坏）

> 系列：Claude Code 源码解读 S2E6 ｜ 结构：悬念/机制（并发为什么不出事）｜ 目标时长 约 3min
> 这是口播稿**唯一真相源**；web-video-presentation 里的 script.md / narrations.ts 是它的派生件，以本文件为准。
> 所有技术结论溯源见文末「事实核对」，逐条指到 source_repo 行号。
> ★ 据实校准：
>   1）「读的随便抢、写的排队来」是对源码 `isConcurrencySafe(input)` 机制的口语化归纳——工具按输入自己声明、且**默认不安全**（保守失败闭合）；不夸大成简单的读写二分。
>   2）失败隔离**只有 Bash 失败才取消兄弟**（读类工具各自独立、不连坐），脚本据实收窄，不写成「任一工具崩了就全发合成错误」。
>   3）结尾承接钩对齐**实际下一集 EP07（上下文压缩/失忆）**。

---

## 钩子（前 3 秒 · 冷开，不依赖上下文）
AI 同时读五个文件、跑三条命令、还在改一个文件。按理说，早该数据打架了。
可它就是不会把你的文件写坏。Claude Code 用一条特别简单的规则，避开了所有事故。

## 场景代入 · 并发为什么会出事
先说为什么会出事。并发是性能的朋友，也是事故的源头：两个操作同时写同一个文件，结果就是数据损坏。
所以真正的难点，不是让一堆工具一起跑，而是分清楚——哪些能一起跑，哪些必须排队。
源码里的解法，简单到一句话能讲明白。我拆给你看。

## 核心机制：读写分离（读的随便抢，写的排队来）
六个字：读的随便抢，写的排队来。
每个工具自己声明一件事——我并不并发安全。读文件这种操作，安全，可以随便和别人一起跑。
改文件、跑命令这种，不安全，必须自己独占一条道。源码里连 Bash 切换一下工作目录，都会被老老实实判成不安全。
调度器拿到一串工具调用，就干一件事：把连续的安全工具打包成一批，一起并行；中间夹着的不安全工具，单独拎出来，串行。
还有个我特别喜欢的细节——默认值是保守的。一个工具要是没明确声明自己安全，就一律当成不安全。宁可慢一点，也不冒险。
所以你看到的所有并行，都是源码确认过、抢了也不会出事的操作。

## 并发上限 + 公平调度 + 流式 + 失败隔离
光分好组还不够，能并行也得有个上限。默认同时最多十个，嫌不够可以自己调。
实现用的是 Promise.race，你就当成抢车位：十个车位占满，谁先干完，等待区第一个立刻补进来。
好处是慢任务不会卡住快任务——一个工具跑得久，不耽误已经算完的那几个先把结果吐出来。
再加一个细节：模型吐工具调用，是一个字一个字流式吐的。第一个工具的参数刚传完，它就开跑了，不等后面的工具生成完。
边接收边执行，体感就快一截，而不是等模型把话说完了再动手。
那万一并行里头，有个工具崩了呢？不会全体连坐。
读类的工具各自独立，一个失败不连累别人。只有 Bash 这种命令——前一条 mkdir 挂了、后面基本就没意义了——它失败才会去取消还在排队的兄弟。而且不是粗暴掐断，是给它们发一条合成的错误消息，让它们有序收尾。

## 升华 + 结尾钩 + 互动
所以回到开头那个问题：十个工具同时跑，为什么不写坏你的文件？因为读和写，早就分好了道。
读的并行抢、写的独占排、并行有上限、失败还隔离——四条规则，把并发的快和安全，同时拿下了。
并发解决的是「快」的问题。可聊得越久，AI 越容易「失忆」。下一集，咱们拆它到底怎么决定：忘掉什么、记住什么。
互动留个问题：你遇过最惨的并发 bug 是什么？程序员朋友评论区交作业，非程序员也说说——你觉得 AI 同时干十件事，到底靠不靠谱？

---

## 分镜 / 高亮速记（给 web-video-presentation 对齐）
| 段落 | 关键画面 | 高亮数字/词 |
|---|---|---|
| 钩子 | 多个工具并行图标（读×5/命令×3/写×1）撞向一个文件 | **按理早该数据打架 / 就是不写坏** |
| 场景 | 两个「写」箭头同时插进一个文件 → 损坏裂纹 | **并发是性能也是事故源 / 难点=分清谁能并谁排队** |
| 核心-1 | 高速路：读=多车道并行，写=单车道并道排队 | **读的随便抢 / 写的排队来** |
| 核心-2 | 工具卡片各挂 safe/unsafe 标签（读 safe / 写·命令 unsafe / cd→unsafe） | **自声明 isConcurrencySafe / Bash 的 cd 也算不安全** |
| 核心-3 | 一串调用被分批：连续 safe 打包并行 / unsafe 单独串行 | **连续安全打一批 / 不安全单独串行** |
| 核心-4 | 没声明的工具盖「按不安全处理」红章 | **默认 false / 宁慢不错** |
| 上限 | 十个车位停车场，谁开走第一个等待区立刻补位 | **默认上限 10 / Promise.race 抢车位** |
| 流式 | 模型流式吐字，第一个工具参数满即开跑 | **流式即执行 / 不等说完就动手** |
| 失败 | Bash 崩 → 给排队兄弟发「合成错误消息」有序收尾；读类互不连坐 | **只有 Bash 取消兄弟 / 合成错误非掐断** |
| 结尾 | 四条规则叠成一张图 + EP07 失忆预告 | **快与安全同时拿下 / EP07 预告：AI 怎么失忆** |

## 事实核对（交审用，逐条可溯源）
> source_repo: `/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main`
- **工具自声明并发安全** ← `src/Tool.ts:423` `isConcurrencySafe(input: z.infer<Input>): boolean`；
  **默认保守 = false** ← `src/Tool.ts:780` `isConcurrencySafe: (_input?: unknown) => false`。
  BashTool: `isConcurrencySafe(input) { return this.isReadOnly?.(input) ?? false }`（`packages/builtin-tools/src/tools/BashTool/BashTool.tsx:570`），cd 改变工作目录 → 非只读 → 判不安全；WebFetch `isConcurrencySafe()=true`（只读）。
- **读写分组（贪心分批）** ← `src/services/tools/toolOrchestration.ts:106-131` `partitionToolCalls`：连续 `isConcurrencySafe` 工具合并进同一批（并行），不安全工具单独成批（串行）。注释 :48 `Run read-only batch concurrently` / :78 `serially` / :101-105 分组策略文档。
- **并发上限默认 10、env 可调** ← `toolOrchestration.ts:9-13` `getMaxToolUseConcurrency`：`parseInt(process.env.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY||'',10) || 10`；`runToolsConcurrently`(:169-196) 调 `all(..., getMaxToolUseConcurrency())`。
- **Promise.race 公平调度** ← `src/utils/generators.ts:34-74` `all()`：`Set<Promise>` 占满 `concurrencyCap`，`await Promise.race(promises)`，某生成器 done 后从 `waiting` 取下一个补入（谁先完成谁让位/补位）。
- **流式即执行** ← `src/services/tools/StreamingToolExecutor.ts:36-42` 类注释（边流入边执行：concurrent-safe 可并行、非 concurrent 独占、结果按到达顺序缓冲）；`addTool`(:88-151)→`processQueue`；`canExecuteTool`(:156-162)；`src/query.ts:1086` 模型流式吐 tool_use 即 `addTool`。
- **失败隔离（只有 Bash 取消兄弟）** ← `StreamingToolExecutor.ts:381-391`：`if (tool.block.name === BASH_TOOL_NAME) { this.hasErrored = true; this.siblingAbortController.abort('sibling_error') }`；注释明写 Bash 命令常有隐式依赖链（mkdir 失败 → 后续无意义），Read/WebFetch 等相互独立、单个失败不应连坐全体。被取消工具收到 `createSyntheticErrorMessage`(:180-232)「Cancelled: parallel tool call … errored」=结构化 `tool_result`（`is_error:true`），让模型有序收尾而非画面无故消失。
- **据实收窄**：plan 大纲写「读文件安全/写文件不安全」「一个工具崩了给其他发合成错误」均偏泛——脚本改成「工具自声明 + 默认不安全」「只有 Bash 失败才取消兄弟」。
- **结尾钩对齐 EP07**：日更按 episode 升序，下一集 = EP07「Claude 是怎么'假装'记得你三小时前说的话的」（上下文压缩/失忆）。承接钩据实指 EP07。
- **合规**：无臆造数据；「十个工具」「四条规则」是对源码默认上限（10）与多机制的口语化归纳（非源码里有名为该值的单一常量之外的虚构）；无违禁词/绝对化营销话术/口播导流。
