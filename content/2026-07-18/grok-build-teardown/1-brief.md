# 1-brief · grok-build-teardown（xAI 开源旗舰 coding agent 源码解读）

> 喂给 pipeline/2-create.md 的创作简报。深度题（源码解读，立身支柱）。
> backlog: 2026-07-17-002 ｜ slug: grok-build-teardown ｜ track: depth ｜ format: kouban（16:9 横屏）

## 一句话选题
xAI 把自家旗舰 coding agent 的**全部源码**开到了 GitHub（纯 Rust，Apache-2.0）。我读了核心几个 crate——最意外的是：那个让很多人觉得高深的 **agent loop，核心就是一个 while 循环**。真正拉开差距的、也真正值得偷的，是循环**外面**那圈。

## 为什么现在做（时效 + 比较优势）
- 仓库 2026-07-14 建、官方 07-15 公告，还在旗舰热度窗内。
- 账号立身支柱=源码解读，这是大厂旗舰官方开源、非第三方玩具，正中比较优势。
- ★可诚实自动做完：全程读公开源码 + 官方公告 + 文档，**无一手实测、无臆造数字**。
- 承接账号「agent = while 循环」母题（EP01），但**冷开不依赖上一集**，承接只在结尾暗合。

## 核心事实（全部有源码/官方出处，2026-07-18 由 agent-reach + 真读仓库源码核对）
> 仓库 = github.com/xai-org/grok-build（main 分支）｜公告 = x.ai/news/grok-build-open-source｜文档 = docs.x.ai/build/overview
> 源码副本核对留存：scratchpad/src/（路径 `/`→`_`）

1. **基本盘**：纯 Rust，Cargo workspace；二进制 `xai-grok-pager`，装出来叫 `grok`；许可 Apache-2.0（第三方 vendored 保留原许可）；仓库创建 2026-07-14，公告 2026-07-15；**不收外部贡献**（issues 关）。[README.md；gh api]
2. **agent loop = while 循环**（钩子的地基）：核心循环 `SessionActor::process_conversation_turn`，就在 `turn.rs:1799` 起的 `loop {` 里。运转：`build_request` 拼请求 → `run_turn_via_sampler` 调模型 → `response.tool_calls()` 解析 → **没 tool call 就 `TurnOutcome::Completed` 回合结束**；有就 `execute_tool_calls` 执行、结果回灌 chat_state、`continue`。[turn.rs:1693/1799/1853/1915/2054/2112/2260]
   - 兜底：模型不发 tool call 才结束，但 todo 还有 pending 会 nudge 继续（TodoGate，有上限）。[turn.rs:2112-2162]
3. **反常识 1 · 系统提示词 XOR 加密藏源码**：`prompt_encrypted.rs` 注释「XOR-encrypted prompt templates」，运行时按需解密、用完清零、不落明文；生成脚本 `scripts/encrypt_templates.py`。别家（Claude Code/Codex）都是明文 prompt。[prompt_encrypted.rs:1-3；context.rs:16-18]
4. **反常识 2 · 主动读竞品配置**：skill 搜索路径含 `.grok/skills/`、**`.claude/skills/`**、**`.cursor/skills/`**；hooks 读 `~/.claude/settings.json`；plugins 认 `.claude-plugin/plugin.json`；有 `claude_import.rs`/`claude_alias.rs`，还内置一份 `CLAUDE_DEFAULT_SKILLS`（pdf/docx/xlsx/pptx/skill-creator）去重名单避免把竞品自带 skill 重复拉进来。→ 装上它，你在 Claude Code/Cursor 攒的家当直接能接着用。[skills/discovery.rs:22-26,54-63,299；hooks/discovery.rs；plugins/manifest.rs:5-6]
5. **反常识 3 · in-tree 移植竞品工具**：仓库里 `implementations/codex/`（移植 openai/codex 的 apply_patch）、`implementations/opencode/`（移植 sst/opencode 工具集），THIRD-PARTY-NOTICES 标了第三方许可。大厂旗舰明着抄、抄得坦荡。[implementations/ 目录；README License 段]
6. **可偷的工程细节 · 细粒度 tool 并发锁**：`execute_tool_calls` 先逐个过权限门 `prepare_tool_call`，通过的并发执行；并发安全用**按文件路径的 Mutex**——只有写操作命中同一路径才串行，不同文件/只读全并发。[tool_calls.rs:284-402；tool_dispatch.rs:40-56]
7. **context 装配（背景，视时长取舍）**：system prompt 由 `PromptContext` 经 `ToolBridge::render_prompt()` 渲染（Jinja 风 Markdown 模板）；组成含 `AGENTS.md`(repo→cwd 覆盖)、persona、memory、`<user_info>`；历史管理 `CompactionPolicy` **默认 85% 触发 auto-compact**。[context.rs:84-138；compaction.rs:34-45]
8. **扩展系统全景（背景）**：skills(SKILL.md+YAML frontmatter，自带 6 个内置)/plugins(plugin.json，可打包 skill+agent+command+hook+mcp+lsp)/hooks(独立 crate，PreToolUse 等事件，command+http runner)/MCP(独立 crate，HTTP+SSE+OAuth+探活重启)/subagents(`SubagentCoordinator`，子会话共享父 FS/终端，New/Forked/Resumed 三种上下文)。[各 crate]

## ⚠️ 数字/口径纪律（本条特别注意）
- **star/fork 数是移动快照**（本次拉 17,721 stars，会变）→ **口播不报具体 star 数**，只说「刚开源没几天」。
- 「XOR 加密」口播里念「加密」即可，不必念字母缩写 XOR（也避免 TTS 读法问题）。
- 「主动读竞品配置」表述已收敛到源码坐实的搜索路径 + import 文件，不夸张成「窃取数据」。
- 「明着抄」有 THIRD-PARTY-NOTICES 坐实是合规 vendored，不是抄袭指控，口播说「移植/搬进来、标了许可」。
- 「SpaceXAI」品牌名歧义、默认模型 id → 存疑，不写进稿。
- agent loop 与 Claude Code 的能力对比是「从源码看」的归纳，非源码原话，讲对比时点明。

## 口播骨架（钩子 → 分点 → takeaway，目标 ≤2min 防完播短板）
- 冷开钩子（自成立、不依赖上文）：xAI 把旗舰 coding agent 全部源码开到 GitHub 了，纯 Rust。我读完最意外的一件事——它的核心居然就是个 while 循环，朴素到你可能会失望。
- 点1 while 循环心脏：turn 文件里一个 loop，拼请求→调模型→看有没有 tool call，没有就结束、有就执行再循环。旗舰 agent 的心脏没黑魔法。
- 点2 循环外三个反常识：① 系统提示词加密藏源码（别家明文）；② 主动读你机器上 Claude Code/Cursor 的配置，家当直接复用；③ 把 Codex/opencode 的工具原样搬进仓库、标了第三方许可，明着抄得坦荡。
- 点3（可选，视时长）可偷的工程细节：同文件写串行、跨文件并发的按路径锁。
- takeaway + CTA：别把 coding agent 当黑盒——循环公开朴素，差距在循环外那圈（上下文压缩/扩展加载/工具调度）。想自己读，我把源码地图（哪个 crate 管什么、loop 在哪行、加密提示词藏哪）整理好了，评论区扣「源码」发你。

## 红线自检
- 全片技术结论逐条对应上面事实清单的源码位置，可溯源；存疑项（star 数/品牌名/模型 id）不写。
- 不唱衰不吹捧：「明着抄」如实说成合规移植；「读竞品配置」如实说成兼容复用，不渲染成负面爆料。
- 无口播导流外链；「评论区扣源码」= 强 CTA（benchmarks 打法：软 CTA 实测无效）。
- 冷开不依赖 EP01/上一集；第一人称口语化，无绝对化用词。
