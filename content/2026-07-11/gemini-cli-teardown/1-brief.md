# 1-brief · gemini-cli 源码速读（Google 版 Claude Code 抄了什么、改了什么）

> 据 backlog 2026-07-08-007 条目生成，喂 2-create。深度题 / 口播 / 立身支柱（源码解读）。

## 一句话选题
拆完 Claude Code 15 集后，把 Google 全开源的 gemini-cli 源码扒一遍——同一道题「做个住终端里的 AI 编码 agent」，Apache-2.0 摊开的这份答案，抄了同一套什么骨架、又改了几个关键地方。

## 为什么现在做（backlog reason）
GitHub trending 在榜；接续「源码解读」心智（立身加成）。距 Claude Code 系列 06-29 收官 12 天，已过审美疲劳窗。

## 核心信息（全部锚 gemini-cli 源码，clone 自 github.com/google-gemini/gemini-cli，2026-07-11 读）
- 开源 vs 闭源：gemini-cli 是 Apache-2.0 全开源（LICENSE / README:27），对照 Claude Code 只发混淆打包 JS（本账号扒了 15 集的那坨）。
- 同一套骨架（抄了什么）：
  - agent 循环：`core/src/core/turn.ts:240` 注释「A turn manages the agentic loop turn」；外层 `client.ts:79 MAX_TURNS=100` 递归 `sendMessageStream`，`checkNextSpeaker` 判下一个该谁说。
  - 工具集一比一：tools/ 下 read/write/edit/shell/glob/grep/ls/web-fetch/web-search + `write-todos.ts`(TodoWrite)/`enter-plan-mode.ts`(计划模式)/`activate-skill.ts`+skills(Skills)/`mcp-client.ts`(MCP)。
  - persona 撞脸：`prompts/snippets.ts:192`「You are Gemini CLI, an interactive CLI agent specializing in software engineering tasks.」
  - 权限确认：`tools.ts:41 ServerTool.shouldConfirmExecute`；`tools.ts:1094 ToolConfirmationOutcome`（ProceedOnce/Always/AlwaysAndSave/ModifyWithEditor/Cancel…）。
- 改了什么（差异）：
  - 干净分包：`@google/gemini-cli-core`(纯引擎无UI，可复用) vs `packages/cli`(React/Ink 终端界面，`interactiveCli.tsx:8 import {render} from 'ink'`)。
  - 循环有刹车：MAX_TURNS=100 + nextSpeaker 检查，非裸 while(true)。
  - 沙箱偏执：系统提示直接教模型「你在 macOS seatbelt / 沙箱容器里跑」（snippets.ts:438+）。
  - 本地模型路：`localLiteRtLmClient.ts` 连本地 LiteRT 跑 Gemma，「本地端点不用 API key」+ routing/fallback。

## 钩子（冷开自成立，L11）
一个能钻进你终端、自己读代码改文件跑命令的 AI，Google 把整份源码开源了——扒完发现跟闭源的 Claude Code 像得吓人。

## takeaway / 互动
终端编码 agent 架构已收敛成事实标准（循环+文件/shell 工具+权限确认+MCP 扩展）；Claude Code 让你猜、gemini-cli 让你真能读能改。互动：你更想用哪个？去 GitHub 搜 gemini-cli 从 core 包看起。

## 合规红线
「抄」是修辞（对齐标题钩子），实为行业趋同设计（部分模式 Claude Code 先推广）；gemini-cli 全 Apache 原创代码。无导流外链口播、无绝对化、无臆造 benchmark。
