# 2-script · grok-build-teardown

> 口播稿**唯一真相源**（narrations.ts / audio-segments.json 均以此为准）。
> 深度题 · 源码解读 · 16:9 横屏 · 目标 ≤2min（防完播率短板，benchmarks 9 轮同向）。
> 章节 = build/src/chapters 目录，与 registry 顺序一一对应。

---

## 章节 1 · coldopen（冷开钩子）
> 冷开铁律：第一句自成立，不依赖「上一集/前面说过」。

**step 0**
xAI 把自家旗舰的 coding agent，全部源码开到 GitHub 上了，纯 Rust 写的，Apache 协议。我挑核心那几个模块读完，最意外的是这么一件事。

**step 1**
它的核心，居然就是一个 while 循环。很多人觉得 coding agent 高深莫测，其实那颗心脏，朴素到你可能会有点失望。

---

## 章节 2 · theloop（while 循环心脏）

**step 0**
就在一个叫 turn 的源文件里，一个 loop 大括号：拼好请求、调模型，然后看模型回复里，有没有工具调用。

**step 1**
没有工具调用，这一回合就结束；有，就把工具执行掉、结果塞回对话、继续下一圈。一个旗舰 agent 的心脏，就这么朴素，没什么黑魔法。

---

## 章节 3 · gems（循环外的三个反常识）
> 全片的肉，节奏最密的一段。

**step 0**
真正值钱的，是循环外面那圈。给你讲三个我读到时愣了一下的设计。第一，它的系统提示词，是加密藏在源码里的，运行时才解密、用完立刻清零。别家都是明文，它把提示词当机密在保护。

**step 1**
第二个更有意思：它会主动去读你电脑上，Claude Code 和 Cursor 的配置。点 claude 目录里的技能、设置，它全认，还内置了一份去重名单，免得把竞品自带的技能重复拉进来。等于说，你在 Claude Code 攒下的那套家当，装上它直接能接着用。

**step 2**
第三，它干脆把 OpenAI Codex 和 opencode 的工具代码，原样搬进了自己仓库，规规矩矩标了第三方许可。一个大厂旗舰产品，明着抄竞品，还抄得挺坦荡。

---

## 章节 4 · ending（takeaway + CTA）

**step 0**
所以别再把 coding agent 当黑盒了。循环本身是公开的、朴素的；真正拉开差距的，是循环外那圈——上下文怎么压缩、扩展怎么加载、工具怎么调度。

**step 1**
我把这份源码地图整理好了：哪个模块管什么、agent loop 具体在哪一行、加密的提示词藏在哪。想自己顺着读的，评论区扣「源码」，我发你。

---

## 溯源对照表（红线）
> 每条口播断言 → 源码/官方出处。全部 2026-07-18 由 agent-reach + 真读 xai-org/grok-build 源码核对。

| 口播断言 | 出处 |
|---|---|
| 全部源码开源、纯 Rust、Apache 协议 | README.md；gh api license=Apache-2.0；公告 x.ai/news/grok-build-open-source |
| 核心是一个 loop：拼请求→调模型→看有无 tool call→无则结束/有则执行再循环 | `crates/codegen/xai-grok-shell/src/session/acp_session_impl/turn.rs`：loop@1799、build_request@1853、run_turn_via_sampler@1915、tool_calls()@2054、Completed@2112、execute_tool_calls@2260 |
| 系统提示词 XOR 加密藏源码、运行时解密用完清零 | `xai-grok-agent/src/prompt/prompt_encrypted.rs:1-3`「XOR-encrypted prompt templates」；context.rs:16-18；scripts/encrypt_templates.py |
| 主动读 Claude Code / Cursor 配置、去重名单 | `xai-grok-tools/.../skills/discovery.rs:22-26,54-63`（.claude/skills、.cursor/skills 搜索路径 + CLAUDE_DEFAULT_SKILLS 去重）；hooks 读 ~/.claude/settings.json；claude_import.rs / claude_alias.rs |
| 把 Codex / opencode 工具原样搬进仓库、标第三方许可 | `xai-grok-tools/src/implementations/codex/`、`.../opencode/`；THIRD-PARTY-NOTICES；README License 段 |

## 弃用 / 不念（口径纪律）
- star/fork 具体数字（移动快照，会变）——只说「刚开源没几天」。
- 「XOR」字母缩写——念「加密」。
- 「SpaceXAI」品牌名歧义、默认模型 id——存疑不提。
- 「明着抄」= 合规 vendored（有 THIRD-PARTY-NOTICES），不是抄袭指控。

## 时长预估
- 总字数 ≈ 500 字，speed 1.1，预估 ~1:50–2:00。9 步（1×2 + 2×2 + 3×3 + 4×2）。
