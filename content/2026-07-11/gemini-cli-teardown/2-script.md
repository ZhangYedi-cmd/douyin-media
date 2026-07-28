# 口播稿 · Gemini CLI 源码速读（同一道题，Google 的开源答案抄了什么、改了什么）

> 唯一真相源。深度题（源码/设计拆解，立身支柱）。第一人称、口语化、冷开自成立。
> 目标时长 ~3:05–3:20（原稿 261s 偏长，2026-07-11 整体收紧 ~20% 至此）。全片可溯源，claim 锚 gemini-cli 源码 file:line（clone 自 github.com/google-gemini/gemini-cli，2026-07-11 读）。
> slug: gemini-cli-teardown ｜ backlog: 2026-07-08-007
> 「抄」是修辞钩子（对齐标题），正文用「撞车/同一套骨架/收敛」；实为行业趋同设计（部分模式 Claude Code 先推广），非实证抄袭，见文末合规。

---

## 章节 1 · coldopen（冷开钩子）

**step 0**
一个能钻进你终端、自己读代码、自己改文件、自己跑命令的 AI 编程 agent，Google 把它整份源码开源了。我扒了一遍，越看越眼熟：这不就是把闭源的 Claude Code，照着又做了一遍吗？

**step 1**
这东西叫 Gemini CLI，Apache 协议全开源。之前拆 Claude Code，我们只能对着一坨压缩混淆的打包文件硬猜；这回同一道题，做个住在终端里的编码 agent，Google 直接把答案摊开了。今天就对着源码，看它撞了哪些骨架，又改了哪几处。

---

## 章节 2 · skeleton（同一套骨架：循环 + 工具 + 人设）

**step 0**
先看最核心的循环。一个 agent 的本质就是个循环：模型开口、说要调工具、把结果喂回去、再让它接着说，直到它不再调工具。Gemini 里管这一轮叫 Turn，源码注释就写着：它管的就是这一轮 agent 循环。外面套一层，一直转，封顶一百轮。

**step 1**
再看它发给模型的工具，你会更绷不住：读写改文件、跑命令、按名字找、按内容搜、联网查，跟 Claude Code 几乎一比一。更狠的是，Claude Code 这两年立的招，它一个没落：待办清单、计划模式、技能系统、还有 MCP，源码里全有对应文件。

**step 2**
连人设都撞了。它系统提示第一句是：你是一个专做软件工程任务的命令行 agent，首要目标是安全又高效地帮到用户。这口吻，做过编码 agent 的一听就知道，是同一个模子刻出来的。

---

## 章节 3 · confirm（都最上心的那一关：权限）

**step 0**
两家最上心的是同一关：别让 AI 把你电脑搞坏。Gemini 的做法是，把「这一步要不要先问你一声」，直接钉进每个工具的接口里。也就是说，每个工具生下来就得回答：我这一下，该不该先拦住、等你点头。

**step 1**
真拦住时，递给你一排选项：就放这一次、这条命令以后都放行、永远允许并记下来、我先改改再跑、或者取消。你看这颗粒度，跟你用 Claude Code 时弹的「允许一次、还是一直允许」，是不是一个思路。

---

## 章节 4 · diff（它亲手改了什么）

**step 0**
那它改了什么？第一条也是最大的一条：它是开源的。这给了你一个 Claude Code 给不了的东西——干净的分包。它把引擎和界面彻底分家：一个包是纯引擎，不带任何界面，别的程序直接能用；另一个包才是那层终端画面，用 React 画的。芯是芯，皮是皮。

**step 1**
另外几处它也动了刀。那循环不是没头没尾地空转，封顶一百轮，每转完一圈还多问一句：下一个该谁说话，模型真想接着干才继续，多踩一脚刹车。对沙箱它也更偏执，系统提示里直接跟模型讲：你在系统自带的沙箱里跑，命令失败了先想想是不是被拦下的。

**step 2**
它甚至留了条本地模型的路：源码里有个专连本地小模型的客户端，注释写着，本地这头压根不用密钥。这条路，云端闭源的 Claude Code 暂时给不了你。

---

## 章节 5 · ending（takeaway + 互动）

**step 0**
扒完最大的感受是：终端编码 agent 这套架子，已经收敛成事实标准了——一个循环、一套读写文件加跑命令的工具、一道权限确认、再用 MCP 往外接，谁做都长得差不多。真正的区别只在于：Claude Code 让你隔着混淆猜，而 Gemini 这份，让你真能读、真能改、真能抄回自己项目。

**step 1**
所以想搞懂这类 agent 到底怎么跑起来，别光盯着闭源那份干瞪眼了。去 GitHub 搜 Gemini CLI，从那个纯引擎的 core 包看起，一个下午就能摸出大概。你更想日常用哪个，Claude Code 还是 Gemini CLI？评论区聊聊。

---

## 溯源（事实合规 · D 闸）

全部事实来自 `google-gemini/gemini-cli` 公开仓（Apache-2.0，2026-07-11 shallow clone，nightly 版 0.52.0，逐条锚 file:line 亲验）：

- 开源与定位：`README.md:11`「Gemini CLI is an open-source AI agent that brings the power of Gemini directly into your terminal」；`README.md:27`「Open source: Apache 2.0 licensed」；`LICENSE` = Apache License 2.0；每个源文件头 `SPDX-License-Identifier: Apache-2.0`。对照 Claude Code = 闭源、只发压缩混淆打包 JS（本账号 claude-code-source-series 15 集扒的就是那坨）。
- agent 循环 = 一个循环：`packages/core/src/core/turn.ts:240` 注释「A turn manages the agentic loop turn within the server context」+ `class Turn`（240–523）；`Turn.run` 是 async generator，`for await (streamEvent)` 流式处理模型输出、`handlePendingFunctionCall` 把模型的 function call 转成 `ToolCallRequest` 事件（turn.ts:257/281/368）。外层循环 = `packages/core/src/core/client.ts:79 const MAX_TURNS = 100`；`sendMessageStream(...turns = MAX_TURNS)` 递归自身（client.ts:910/960/1026），每轮后 `checkNextSpeaker`，`next_speaker === 'model'` 才继续转（client.ts:880–896）。★口播「封顶一百轮」= MAX_TURNS=100；「一直转」措辞为通俗化，实为带上限的递归，非裸 while。
- 工具集一比一：`packages/core/src/tools/` 下 `read-file.ts`/`write-file.ts`/`edit.ts`/`shell.ts`/`glob.ts`/`grep.ts`(+`ripGrep.ts`)/`ls.ts`/`web-fetch.ts`/`web-search.ts`；Claude Code 近两年特性对应文件：`write-todos.ts`(WriteTodosTool，对 TodoWrite)、`enter-plan-mode.ts`/`exit-plan-mode.ts`(计划模式)、`activate-skill.ts`+`core/src/skills/`(Skills)、`mcp-client.ts`/`core/src/mcp/`(MCP)。系统提示节还含 Sub-Agents/Hooks/Task-Tracker（snippets.ts 渲染节）。★这些是两家都有的通用/趋同能力，非「gemini 独有」也非「实证抄 Claude Code」；措辞「一个没落」指能力对齐，Skills/plan-mode 等确为 Claude Code 较早推广。
- persona 撞脸：`packages/core/src/prompts/snippets.ts:192`「You are Gemini CLI, an interactive CLI agent specializing in software engineering tasks.」+ `:195`「Your primary goal is to help users safely and effectively」；旧版 `snippets.legacy.ts:171` 更贴近「an interactive CLI agent specializing in software engineering tasks. Your primary goal is to help users safely and efficiently」。★口播只引 gemini 自己这句 + 讲「同一模子的通用人设」，不臆造 Claude Code 逐字原文（其为闭源、无法在此引原文对比）。
- 权限确认钉进工具接口：`packages/core/src/tools/tools.ts` `ServerTool` 接口带 `shouldConfirmExecute()`（turn.ts:41–53 亦复述该接口）；确认结果枚举 `tools.ts:1094 enum ToolConfirmationOutcome` = ProceedOnce / ProceedAlways / ProceedAlwaysAndSave / ProceedAlwaysServer / ProceedAlwaysTool / ModifyWithEditor / Cancel（1095–1101）；shell 工具 `shell.ts:272 override shouldConfirmExecute` + ProceedAlways 加命令白名单（shell.ts:257–258）。★口播「一排选项」= 该枚举；「允许一次/一直允许」对照 Claude Code 权限弹窗（公开可见的通用交互，非引其源码）。
- 干净分包（引擎/界面分家）：`packages/core/package.json` name `@google/gemini-cli-core`、desc「Gemini CLI Core」（纯引擎、无终端 UI）；`packages/cli` 才是终端界面，`packages/cli/src/interactiveCli.tsx:8 import { render } from 'ink'`、UI 全在 `cli/src/ui/`（React + Ink）。
- 循环有刹车：MAX_TURNS=100（client.ts:79）+ 每轮 `checkNextSpeaker`（client.ts:880–896），非裸 `while(true)`。
- 沙箱偏执：`packages/core/src/prompts/snippets.ts:438+`（及 legacy:325–333）系统提示直接告知模型「You are running under macos seatbelt / in a sandbox container … If a command fails … explain why it could be due to sandboxing」；`core/src/sandbox/` 存在。★口播弱化为「系统自带的沙箱」，不念 seatbelt 英文专名（进画面）。
- 本地模型路：`packages/core/src/core/localLiteRtLmClient.ts` = 连本地 LiteRT-LM 跑 Gemma 的客户端，构造里 `apiKey: 'no-api-key-needed'` 注释「Local endpoints don't need auth」；配 `core/src/routing/` + `modelMappingContentGenerator.ts` 做模型路由/回退。★口播弱化为「本地小模型…不用密钥」，不念 LiteRT/Gemma 专名（进画面）。Claude Code「云端闭源、暂无本地模型路」为公开事实。

> 合规：无绝对化用词；无口播导流外链（「去 GitHub 搜」为合规话术）；无臆造 benchmark/跑分数字（全片不报任何性能分）；「抄」为修辞、正文已用趋同/收敛表述并在本节澄清；对 Claude Code 的描述均为公开可核实事实（闭源打包、具备 TodoWrite/计划模式/Skills/MCP/权限弹窗、云端无本地模型），非引用其源码。
