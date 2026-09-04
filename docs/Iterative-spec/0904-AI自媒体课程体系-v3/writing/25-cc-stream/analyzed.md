---
topic: cc-stream 包（三层解析、七种归一事件、里程碑引擎、claude -p 无头跑）+ 只认文件的裁决函数 + 先礼后兵的收尾策略
audience: 用 Claude Code 或 Cursor 的读者，做到第 24 课，没做过自动化流水线，认知起点是单轮对话；不写实现代码，只写需求判据、SPEC、验收结论
mode: new
series_context: 第 25 课，模块 6「无人值守」唯一一课；上承第 24 课（治理总调度与自审元层），下接模块 7 控制台（26-28 课）
---

## 核心问题

无头跑一个 `claude -p` 子进程，怎么把它吐出来的一串 JSON 行变成能看懂「跑到哪一步」的信号，又怎么在它说完「我做完了」之后，不听它的、只看文件，判定它是不是真的做完了；跑飞了或者卡住了，怎么收尾不留手尾。

## 材料清单

- [案例] `tools/console/packages/cc-stream/src/` 六个文件全文（`types.ts`/`normalize.ts`/`milestones.ts`/`spawn.ts`/`transport.ts`/`index.ts`），参考流水线的 cc-stream 实现，可支撑第 1、2、3、4、6 节：七种归一事件的类型定义与去重逻辑、里程碑引擎的声明式匹配、`runHeadlessCC` 的 env 剔除与 SIGTERM→10s 宽限→SIGKILL。
- [案例] `tools/console/packages/server/src/jobs/verdict.ts` 全文，参考流水线的终局裁决实现，可支撑第 5 节：`readMetaStatus` 现场读 `meta.yaml`、`verdictPublish`/`verdictRework`/`verdictCreate`/`verdictHarnessRun` 四种裁决口径，`verdictPublish` 的 `note` 字段固定模板「子进程{声称成功但/报告失败且}meta.status=X」不读取 AI 的自然语言输出。
- [案例] `tools/console/packages/server/src/jobs/milestones.ts` 里的 `HARNESS_RUN_MILESTONES`（读任务卡→执行技能→产报告→记账四步），可支撑第 3 节的示例里程碑表；`defs.ts` 的 `REWORK_LIMIT = 2`、`JOB_TIMEOUT_MS`；`prompts.ts` 的 `ALLOWED_TOOLS = ['Bash', 'Read', 'Write', 'Edit', 'Skill']` 和 `harnessRunPrompt`，可支撑第 4 节一次真跑用的最小 Prompt 与工具白名单示例。
- [案例] `tools/console/packages/core/src/lock.ts` 全文，参考流水线的咨询锁实现，可支撑第 5.2 节：`STALE_MS = 30_000`、陈旧判据必须同时满足「超过 30 秒」和 `isPidAlive` 判进程已死两个条件才抢占，抢占留一行 `stderr` 痕迹；`atomic.ts` 的 temp-then-rename 原子写。
- [案例] `tools/console/packages/core/src/state.ts` 的 `META_TRANSITIONS`，合法 `MetaStatus` 值（`ideated`/`drafting`/`review`/`approved`/`scheduled`/`published`/`rejected`/`retro_done`），学员自己第 12-16 课造的 `media flip`/`media st` 已经认识这些值，可支撑第 5.1 节裁决函数的「期望状态集合」怎么定。
- [真实案例] `tools/console/logs/jobs/create-20260826125707-bc32.result.json`：一次真实的 create 任务，子进程在中途撞上会话限额（narration 里出现「You've hit your session limit」），`result.is_error=true`，但真正定案的是 `verdict`：`readMetaStatus` 读到 `meta.status=drafting`，不等于期望的 `review`，判定 `note: '创作未完成，停在 drafting'`。可支撑第 5 节「只认文件的裁决」的真实反例。
- [真实案例] `tools/console/logs/jobs/publish-20260819101820-bd51.result.json`：一次真实的 publish 任务，AI 在 narration 里明确说了「发布未执行——在 Step 0/Step 1 就卡死了」，但 `verdict.note` 打出来的仍是固定模板「子进程声称成功但 meta.status=approved」——裁决函数根本没有读这句自白，模板文案不随 AI 实际说了什么而改变。可支撑第 5 节「不信 AI 自述」不是一句原则口号，是裁决函数压根不读这个字段。
- [出处] `docs/Iterative-spec/0818-看板工作台/2026-08-18-看板后端与CC进程调度技术方案.md` §6「spawn claude -p 的四个防坑点」（认证剔除 `ANTHROPIC_API_KEY`、`--allowedTools` 白名单、授权语义写死在 prompt 里、成败判定读状态不读文字）与 §7.3「包边界：引擎进包，知识留外」表格、§7.4「信任分级」三条，可支撑第 1、2、4、5 节的设计纪律出处。
- [出处] `docs/Iterative-spec/0818-看板工作台/02-后端执行方案.md` §2.6-2.7，job runner 状态机与 cc-stream 文件布局，作为 ADR 层面的补充出处（注意这份文档写的是「6 种归一事件」，比源码早一天，源码 2026-08-19 已经扩到 7 种含 `thinking`，写作以源码为准）。
- [已定稿约束] 第 09 课「裁判与选手分离」：`dubbing-reviewer.md` 子代理的工具白名单物理拿掉 `Edit`/`Write`，判的人不能改；本课第 5 节「只认文件的裁决」要回指这条，说清是同一类约束的第二次出现——上一次是把改的能力焊死在工具列表里，这一次是把判的依据焊死在文件字段上。
- [已定稿约束] 第 19 课「飞书实现与按钮回流」明确锁定：本课实现不接第 26-28 课才会有的控制台后端，服务自己起线程、自己起子进程调用重做命令，全程不依赖任何独立后端。本课的 `cc-stream` 是新造的标准件包，还没有任何调用方把它接进 daily-run 或飞书服务，写作时不能说 19 课的服务已经在用它。
- [素材，仅看口径] 旧稿 `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/old-courses/v1-17-无头CC作业与进程流归一.md`：同步阻塞长跑任务会崩溃的三个具体卡点（网关超时、页面刷新留孤儿进程、界面假死看不出进度）可以借用来做动机场景，但它的结构把 cc-stream 和控制台/SSE/前端糅在一起讲，本课不能照抄这个结构，也不建控制台。
- [读者现状] `plan/inventory.md`「第 24 课结束时」一行：读者手上有 `media` 全量命令、`douyin-publish`/`douyin-retro`/`douyin-ideate` 等 skill、任务注册表、四个治理 skill、core 包三件（含 `parsers`/`state`/`writer`）、`pipeline/daily-run.md`。本课任何 Prompt 的输入必须落在这张表里。
- [出处] `pipeline/daily-run.md` 全文：目前无人值守编排的入口，是「定时 agent 读这个文件直接执行」，还没有走 `spawn claude -p` 这条路；本课造的 `cc-stream` 是给将来某个常驻进程用的标准件，不改这份文件。
- [承接] `plan/handoff-ledger.md` 第 24、25 行：第 24 课交付「任务注册表 + 四个治理 skill + 一轮巡检记账」，结尾抛出的问题是「治理线能自己巡检记账了。可这些都要你敲一次命令才动。怎么让它在你睡觉的时候自己跑？」——本课开篇要逐字接这句。

## 材料缺口

无。材料清单 15 条，四件套（数据/出处/案例/反例）齐全，两份真实失败日志可以直接当反例用。
