# EP10 口播稿 · Claude Code 里的子 Agent，就是 AI 给 AI 打工

> 唯一真相源（字幕 / 配音 / 画面三方以此为准）。
> 系列：claude-code-source-series s2e10 ｜ backlog: 2026-06-10-010
> 源码仓：/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main
> 每句技术结论的出处见文末「逐条溯源」。结尾钩对齐 EP11（claude --version 0 毫秒）。

---

## 章节与分段（与 build/src/chapters 一一对应）

### coldopen · 一个 AI 当老板

1. 一个 AI 当老板，给手下几个 AI 员工分头派活，干完各自汇报，老板把结果一汇总——这不是科幻，是 Claude Code 里每天在发生的事。

2. 为什么要这么搞？因为主对话的上下文，是最稀缺的资源。你让它一个脑子去翻几百个源码文件，上下文立马撑爆，还容易被一堆无关细节带偏。

3. Claude Code 的解法就一句话：脏活累活派给子 Agent 去干，主对话这边，只接一份结论。

### layers · 招个临时工

1. 这套机制，核心就一个工具，叫 Agent 工具。主 Agent 调用它，就当场生出一个子 Agent，相当于招了个临时工，专门干一摊活。

2. 更狠的是，它能一口气派出好几个。源码里写得明明白白：想让它们并行，就在同一条消息里塞进多个调用，一起开工，谁也不等谁。

3. 而且每个子 Agent 都是独立的：独立的对话记录、独立的中断开关、独立的文件视图，互相不串台。一个翻车了，不带累别人。

### details · 三个关键设计

1. 第一个设计，工具是裁过的。最典型的——Agent 工具本身，就不下放给手下。不然子 Agent 再去招子 Agent，无限套娃，源码里直接一道关卡拦死：分叉出来的员工，不准再分叉。

2. 不光防套娃。用户的私人记忆、密钥这种敏感工具，也只留在主线、不交给临时工。再叠一层：每种员工按角色配工具，派去只读调研的那个，根本不给它写文件的家伙事。

3. 第二个设计，回传。子 Agent 干完，把最后那段总结，作为工具结果交回主 Agent。中间翻了多少文件、走了多少弯路，全留在它自己的小本本里，不回灌主对话——主 Agent 的上下文，永远是干净的。

4. 第三个设计更直接，叫协调者模式。这个模式下，主 Agent 的系统提示词第一句就写着：你是个协调者，负责指挥多个工人。而且不是派完就完，它能持续跟每个员工往返沟通，盯着进度。

### ending · AI 给 AI 打工

1. 你回头看，这套东西，本质就是人类公司那套管理学——分工、授权、汇报。一个聪明的脑子负责拆活和拍板，一群手脚扎进细节。AI 给 AI 打工，就是这么回事。

2. 不过团队再能干，工具启动慢也白搭。下期聊个极致细节：claude --version 这条命令，凭什么能做到几乎零毫秒出结果。评论区也聊聊——要是给你几个 AI 员工，你会派它们干什么？

---

## 逐条溯源（fact check，全核于 source_repo）

- **Agent 工具 / 子 Agent 生成**：`packages/builtin-tools/src/tools/AgentTool/runAgent.ts:257` `export async function* runAgent(...)` —— 子 agent 由 async generator 驱动生命周期。AgentTool 调 runAgent 生成子 agent。
- **能并行派多个**：`packages/builtin-tools/src/tools/AgentTool/prompt.ts:162` “Launch multiple agents concurrently whenever possible … use a single message with multiple tool uses”；`:184` “run agents 'in parallel' … MUST send a single message with multiple Agent tool use content blocks”。★「几个 / 好几个」是事实（机制支持并发），**不写死“4 个”**（源码无此常量，plan 的“四个员工”是举例）。
- **独立隔离**：`runAgent.ts:533-537` 注释 “Async agents get a new unlinked controller (runs independently)”，`isAsync ? new AbortController() : toolUseContext.abortController` —— 异步子 agent 独立 AbortController（独立中断开关）。`runAgent.ts:707-708` “Async agents are fully isolated (but with explicit unlinked abortController)”；`createSubagentContext` 给独立 `messages`（独立对话记录）、独立 `readFileState`（独立文件视图）。身份隔离另有 AsyncLocalStorage（`runWithAgentContext`，`runAgent.ts:933`；`src/utils/teammate.ts:8-32`）。
- **裁剪-防递归套娃**：`src/utils/agentToolFilter.ts` `filterParentToolsForFork = parentTools.filter(t => !ALL_AGENT_DISALLOWED_TOOLS.has(t.name))`；黑名单 `src/constants/tools.ts:44` `ALL_AGENT_DISALLOWED_TOOLS` 含 `AGENT_TOOL_NAME`（非 ant 用户时排除 Agent 工具自身）；`AgentTool.tsx:419-429` “Recursive fork guard” + `throw 'Fork is not available inside a forked worker.'`。★ 口径“分叉出来的员工不准再分叉”属实。
- **裁剪-敏感工具不下放**：同黑名单 `src/constants/tools.ts:44-62` 含 `LOCAL_MEMORY_RECALL_TOOL_NAME`（跨会话用户笔记“keep on the main thread only”）、`VAULT_HTTP_FETCH_TOOL_NAME`（用户密钥，“keep main thread only”）。★“私人记忆/密钥只留主线”属实。
- **裁剪-按角色给工具（只读不给写）**：★ 校正——“只读调研不给写权限”**不是** filterParentToolsForFork 做的（黑名单不含 FileWrite/Edit）。它由 **agent 定义自带的工具集**决定（每个 subagent_type 声明各自 tools，调研型只配读/搜工具，如 Explore 不含 Edit/Write）。脚本表述为“每种员工按角色配工具”，对应 `runAgent` 的 `availableTools`/`allowedTools` 参数（`runAgent.ts:270-272`）+ agentDefinition，未夸大成黑名单功能。
- **回传机制**：`AgentTool.tsx:1133` `extractTextContent(agentResult.content, '\n')` —— 子 agent 最终内容抽成文本当工具结果回交。`prompt.ts:171` “When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user.” 中间过程进 sidechain transcript（`runAgent.ts` `recordSidechainTranscript`），不回灌主对话。
- **协调者模式**：`src/coordinator/coordinatorMode.ts:111` `getCoordinatorSystemPrompt`，`:116` “You are Claude Code, an AI assistant that orchestrates software engineering tasks across multiple workers.” `:120` “You are a **coordinator**. Your job is to … Direct workers to research, implement and verify code changes”。持续往返：`:131` SendMessage “Continue an existing worker (send a follow-up to its `to` agent ID)”；结果以 `<task-notification>` user 消息回来含 `<result>`（agent's final text）。★“第一句就写你是协调者、能持续往返”属实。
- **结尾钩对齐 EP11**：日更按 episode 升序，下一集 EP11「claude --version 为什么 0 毫秒」（`codebase-map.md`：`src/entrypoints/cli.tsx` 30+ 条快速路径分发、--version 零模块加载）。
- **合规**：源码仓为社区反编译/重建版（措辞已注意，未声称官方原始仓）；无臆造数据；“AI 给 AI 打工/管理学类比”是工程点评非营销承诺；无违禁词、无绝对化、无口播导流。
- **自指开场**：用“扒源码我自己爱开几个子 Agent 分头啃”的工程师视角自指（站得住）；**不**声称“本系列就是用 4 个子 agent 完成的”（无法核实，按红线不编造）。
