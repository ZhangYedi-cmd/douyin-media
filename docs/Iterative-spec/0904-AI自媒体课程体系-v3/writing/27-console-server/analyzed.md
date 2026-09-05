---
topic: 第 27 课《后端：读写两条路径》——控制台读 API 与写 API 全通，飞书回调改走写路径
audience: 用 Claude Code/Cursor 的读者，没做过自动化流水线，跟到第 26 课，手上有五包一仓的骨架和 API 契约，但控制台 server 包还是空的
mode: new
series_context: 模块 7 控制台，第 2 课（26 定契约 → 27 读写两条路径 → 28 前端整站）；L3 教法第 5 步（执行）
---

## 核心问题
控制台的 server 包怎么把第 26 课定好的 API 契约变成能跑的读接口和写接口，读接口怎么复用 core 包已有的 parsers，写接口怎么不重新发明状态变更逻辑而是转成一条 media 命令，慢作业怎么复用第 25 课的 cc-stream 和裁决函数，飞书回调怎么从自己起子进程改成调这条写路径。

## 材料清单
- [产物承接] 第 26 课交付 `docs/spec/console/` 三份（调研/ADR/执行方案），五包一仓边界和 API 清单定死；本课承接第 26 课结尾「先把读路径打通」——handoff-ledger.md 第 26、27 行，用于承接的第一真相源（第 26 课成稿此刻多半还不存在，按台账降级）。可支撑开篇。
- [任务卡固定大纲] `plan/cards/27.md` 「2.1 大纲」块：七节固定结构（六快照/三基础设施/SSE/快写四条/慢作业三条/飞书回道/收尾），记忆锚点「读 API 不是又一套解析逻辑……写 API 也不是重新发明状态变更逻辑」。是全文的骨架，不可改动节序。
- [真实代码：读路径] `tools/console/packages/server/src/routes/read.ts` 六个快照端点 + `/api/health`；`routes/projections.ts` 纯投影函数从 Store 的 Snapshot 算响应；`packages/core/src/snapshot.ts` 的 `buildSnapshot()` 是唯一 IO 聚合点，内部调用 `parsers/meta.ts`、`parsers/backlog.ts`、`parsers/harness.ts`、`parsers/metrics.ts`。可支撑第 1 节「读接口复用 parsers」的真实实现形状，但要写成「参考流水线把这一层单独做成了 snapshot 模块，你的版本由 Prompt 让 AI 照这个思路加」，不能说学员已经有 snapshot.ts（背景包第 2 节铁律，04/07 课因此被退回过）。
- [真实代码：file/asset/health] `routes/files.ts`：`/api/file` 白名单目录 `content/harness/pipeline/brain`+扩展名+1MB 截断；`/api/asset` 白名单 `content/` 下媒体扩展名，支持 Range 分片；`routes/read.ts` 里 `/api/health` 返回 `lights` 数组（snapshot/watcher/jobs/tick 四盏灯）带 revision。可支撑第 2 节交付物与验收清单。
- [真实代码：SSE 三件] `sse.ts`（SseHub，broadcast 只推 `{revision, reason}`，不带业务数据）、`watcher.ts`（chokidar 监听 `content/harness/logs/harness/tasks.md/pipeline/logs/dashboard.md`，扩展名白名单，`DEBOUNCE_MS=500` 用 setTimeout 合并多次文件事件成一次 rebuild）、`store.ts`（`revision` 唯一产地，每次 `rebuild()` 自增并广播）。可支撑第 3 节时序清单和两条排障句（debounce 窗口/watcher 漏目录）。
- [真实代码：快写四条] `routes/actions.ts` 四个 POST 端点、`actions/whitelist.ts`（唯一允许拼 media 参数的地方，`reviewArgs`/`backlogApplyArgs`/`promoteArgs`/`nextUpArgs`）、`actions/execMedia.ts`（`execFile` 不经 shell；退出码/JSON 错误信封映射 409 MEDIA_REJECTED 并透传 CLI 的 `message`/`rule`，不重新编文案）。可支撑第 4 节映射表与错误透传 Prompt。
- [真实代码：慢作业三条] `routes/jobs.ts`（五个 POST 端点，卡片只讲 publish/rework/apply-proposal 前三条）、`jobs/defs.ts`（超时表 publish 20min/rework 45min/apply-proposal 10min，`REWORK_LIMIT=2` 与飞书共享同一 `3-review.md` 计数口径）、`jobs/runner.ts`（`submitRework` 的 before-step 先 `execMedia(['flip', slug, 'drafting', ...])` 再派活；`execCcJob` 直接调用 `@console/cc-stream` 的 `runHeadlessCC`/`createMilestoneEngine`；结果落盘 `logs/jobs/<id>.result.json`，对应第 25 课收尾里「控制台后端给每次任务收尾额外落一份终态快照」的预告）、`jobs/verdict.ts`（`verdictPublish`/`verdictRework` 现场读 `meta.yaml` 的 `status` 字段，不读子进程自然语言；`verdictApplyProposal` 读 `git diff -- brain/`）。可支撑第 5 节作业清单、复用 cc-stream 的 Prompt、排障句「is_error==false 当成成功」。
- [已定稿：第 15 课] `courses/15-执行M2-全量命令与存量迁移.md` 第 189 行：参考流水线飞书回调早年直接用正则改状态字段，后来换成调用 `media flip` 并带身份参数区分触发方——这是唯一写入口第一次被仓库外程序遵守的例子，本课复用同一措辞讲控制台。
- [已定稿：第 19 课] `courses/19-飞书实现与按钮回流.md` 第 89-93 行：状态写入唯一入口那一段；第 93 行「参考流水线现在默认把重做和发布这两类重活委托给一个独立的控制台后端去代跑，代码里靠一个配置开关切换两条路径，默认值就是委托给控制台……这一课的实现要锁定另一条路：服务自己起线程、自己起子进程」。本课要把这句话里锁定的那条路径翻回默认值，即翻这个配置开关。可直接支撑第 6 节，措辞要对得上。
- [真实代码：飞书那侧的开关原文] `docs/Iterative-spec/0818-看板工作台/02-后端执行方案.md` §1 S8：`config.yaml` 新增 `console_api: true/false` 开关；改造点只有 `_async_publish`/`_async_rework` 两个函数体，把 `subprocess.run(["claude","-p",...])` 换成 `POST http://127.0.0.1:5170/api/actions/{publish|rework}` + 轮询 `GET /api/jobs/:id`；判成败逻辑从 python 移进 job runner；`_async_approve`/`_async_todo`（审核卡通过/挂待办）不改，继续走 M2 已经改好的 subprocess 调 `media flip`，不绕 server；`console_api:false` 时保留旧路径可回滚。可支撑第 6 节的精确范围（只切重活两条，不切快写两条）。
- [已定稿：第 25 课] `courses/25-无头作业-进程流归一与终局裁决.md`：`cc-stream` 六个文件（`types/transport/normalize/milestones/spawn/index`）、三层解析、七种归一事件、只认文件的裁决函数、先礼后兵收尾、锁复用 core 已有实现、结尾预告「控制台后端给每次任务收尾都额外落一份终态快照」。可支撑第 5 节「不重新造」的 Prompt。
- [已定稿：第 14 课] `courses/14-执行M1-core与首批命令.md`：读者 core 包实际只有 `parsers`、`state`、`writer` 三件（含往返测试），没有 snapshot.ts/dashboard.ts。用来核对「学员手上有什么」，防止把参考仓库文件当成学员自己的文件。
- [inventory 校验] `plan/inventory.md`「第 26 课结束时」行：读者手上有 core 三件、`content/`/`brain/`/`harness/` 真实文件、`docs/design/` 九页原型、`docs/spec/console/` 三份。「第 27 课结束时」行已预写产出条目（六个快照读接口/file/asset/health/SSE、快写 4 条、慢作业 3 条），本课交付要对得上这一行。
- [状态值真相源] `tools/console/packages/core/src/state.ts`：`META_TRANSITIONS` 八个 meta 状态（ideated/drafting/review/approved/scheduled/published/rejected/retro_done）、`BACKLOG_TRANSITIONS` 六个 backlog 状态（idea/picked/published/expired/rejected/archived）。写文中任何状态值前必须对照此表。
- [承接台账] `plan/handoff-ledger.md` 第 26、27 行：第 27 行「结尾抛出的问题」＝「读写两条 API 都通了。开始做界面，骨架和头两页怎么落设计稿？」，本课结尾须逐字落在这句上。

## 材料缺口
无实质缺口。第 26 课成稿本身大概率还不存在（写作背景包第 6 节允许的情况），开篇复述改用 handoff-ledger 第 26 行代替，材料已在上面列明来源，不算缺口。
