# 04-一致性Review（三份执行方案交叉评审）

> 日期：2026-08-18｜评审对象：01-CLI执行方案 / 02-后端执行方案 / 03-前端执行方案
> 基准：00-执行版总览（共享契约）+ 三份拍板方案（上游真相源）+ docs/design v2 原型（9 页）+ CLAUDE.md 项目铁律
> 核对清单：C1 API 契约三方一致 / C2 类型与包边界 / C3 写路径纪律 / C4 状态机一致 / C5 页面对照原型 / C6 里程碑依赖 / C7 项目铁律 / C8 防漂移 / C9 跨文档接口拼写 / C10 待定项汇总

## 结论先行

**架构骨架三方一致、铁律零违背、写路径纪律干净；但 02 与 03 的 API 契约层是各写各的——读接口响应形状、SSE job 事件、token 机制、Alert 类型四处系统性对不上，属实现前必须收敛的高危冲突；另有 rework 动线与 metrics 数据链路两处流程缺口。** 冲突全部可修，无一动摇拍板决策；修法建议见冲突表，其中 3 题需用户拍板（见末节）。

---

## 冲突表（severity 降序）

| # | severity | 位置（两侧） | 冲突描述 | 建议解法 | 需用户拍板 | 处置（2026-08-18） |
|---|---|---|---|---|---|---|
| 1 | **high** | 02 §2.1 各读接口出参 ↔ 03 §2.3–§2.8「数据源」段 + §3.3 C1–C7 | 六个读接口 + /api/health 的响应字段两套定义系统性对不上：02 overview 无 todos/heartbeat/backlogWater/logTail（02 叫 pipelineRun.stage，03 叫 dailyRun.phase）；02 detail 无 timeline/checks/auditTrail/publishInfo（02 legalNext 状态数组 vs 03 allowedTransitions 对象数组）；02 backlog 无 collisions/nextPick/nextUpId（02 叫 nextUp/next/topics，03 叫 nextUpId/nextPick/ideas+picked+published 分列）；02 harness 提议不分 structured/prose、无 retroMatrix（03 C5 明确要求区分）；02 metrics 用 `missing` vs 03 用 `available`（语义相反）、02 series vs 03 snapshots/trend/funnelQuotes；02 health 给进程原始态 vs 03 C7 要 server 预算好的 lights 数组 | 拍板 §10 只定 URL 与方法、不定形状——以 03 §3.3 逐条需求清单为契约终稿修订 02 §2.1 出参（消费方需求驱动投影），修订后由本评审复核销账。工作量在 server 投影层，不动架构 | 否 | ✅ 用户确认（末节问题 4），02 §2.1 六读接口 + health 已按 03 §3.3 重写并复核 |
| 2 | **high** | 02 §2.1 /api/events（事件名 `job:<id>`、data=Job JSON 全量）↔ 03 §2.10 lib/sse.ts + §3.3-C9（事件名 `job`、data=`{id, event: JobEvent}` 增量流） | SSE job 事件的名字和载荷两头设计不同；前端拍板 §3 明写「消费 SSE 的 `job:<id>` 事件流」，03 偏离了自己的拍板 | 判 03 违拍板：改回 `job:<id>` + Job 全量快照（全量幂等、抗丢事件，与 revision「丢了重拉」哲学一致）；03 删 JobEvent 增量类型，useJob 直接吃 Job 全量 | 否 | ✅ 已修订：03 §2.10/C9 改回 `job:<id>` + Job 全量，JobEvent 类型删除 |
| 3 | **high** | 02 §2.0（`Authorization: Bearer`）+ §2.8/§3.2（URL `#token=` 首发）↔ 03 §2.10 getToken（读 `location.search` 的 `?token=`）+ §3.3-C12（头名统一 `X-Console-Token`） | 鉴权头名与 token 首发通道两头各一套，按各自实现联调必失败 | 统一按 02：`Authorization: Bearer` + `#token=` 首发（hash 不进 server 访问日志）；03 改 api.ts / getToken 两行即可。C12 措辞相应更正 | 否 | ✅ 已修订：03 getToken 改读 hash、请求头改 Bearer，C12 更正 |
| 4 | **medium** | 01 §2.14 types.ts `Alert{rule,level:error\|warn\|info,subject,message,since?}` ↔ 02 §2.1 `Alert{key,rule,severity:high\|mid\|low,title,target,deadline?}` ↔ 03 §2.9 AlertCard 期望 `{id,severity:danger\|warn,title,why,evidencePath?,count?,action?}` | Alert 类型三方三套（字段名、分级枚举、附加字段全不同）；ui 对 core 是 type-only import，02 store 去抖还依赖 core 不存在的 `a.key`——不统一则编译期即断 | 统一到 core（01）：Alert 扩为超集（加 key、count、evidencePath、action；分级保留 error/warn/info 三级，UI 色档由 level 映射），02/03 删自定义形状改引 core 类型 | 否 | ✅ 已修订：01 §2.14 扩超集，02 overview / 03 AlertCard 改引 core 定义 |
| 5 | **medium** | 02 §2.3 #2 rework precheck（`meta.status ≠ review → 409 PRECONDITION`）↔ 03 §2.5 动作矩阵（「派发重做任务」按钮挂在 rejected / drafting(被打回) 行） | 两默认组合下看板的重做按钮永远被 409 拒绝：人先在 review 打回（记账翻 drafting）后再想派活，状态已非 review | 建议放宽 02 precheck 为 status ∈ {review, drafting, rejected}（drafting 时跳过 before-flip；rejected 先 flip drafting——均为 01 迁移表合法边），与 02 自己 #1 备注「打回只记账、派活另走 rework job」的动线自洽；或反向把 03 按钮收回 review 行 | **是** | ✅ 拍板选 A：02 precheck 放宽三态并按状态分流 before-step，03 按钮行同步 |
| 6 | **medium** | 03 §2.5（publish body `{slug, mode, scheduledAt?}`，Modal 选立即/定时）↔ 02 §2.3 #1（body 只有 `{slug}`，publishPrompt 无定时语义） | 看板定时发布：03 做了入口，02 没接线；CLI（01 §2.7 `--scheduled`）能力在，但 job prompt 与 body 都不认识它 | 若定时进首版：02 body 增 mode/scheduledAt 并透传进 publishPrompt；若不进：03 首版 Modal 砍掉定时选项只做立即发 | **是** | ✅ 拍板选 B：定时不进首版；03 Modal 砍定时选项、02 body 维持 `{slug}` |
| 7 | **medium** | 01 §1 第 10 步（douyin-retro 切点只改 `media flip retro_done`）↔ CLI 拍板 §11.4（「douyin-retro 每窗拉数后调用 media metrics record」）+ 03 §2.8（P6 唯一数据源 = metrics.jsonl） | metrics 数据链路断头：命令在第 7 步造好了，但没有任何步骤把 douyin-retro SKILL.md 接到 `media metrics record` 上——不补则 metrics.jsonl 永远空、P6 永远空态 | 01 第 10 步 douyin-retro 改造项补一句：每窗拉数段加 `media metrics record` 调用，建议键表落其 SKILL.md（与 01-Q9 预设一致） | 否 | ✅ 已修订：01 第 10 步已接线，Q9 拍板键表归 SKILL.md |
| 8 | **low** | 02 §2.2 快写入参（review 用 `decision: approved\|rework\|rejected`；`proposal`；rework job 用 `reason`）↔ 03 §2.5/§2.7（review 用 `to: approved\|drafting\|rejected`；`proposalPath`/`reportPath`；rework 用 `note`） | 四个动作的 body 字段名两头拼写不同（decision/to、proposal/proposalPath、report/reportPath、reason/note） | 以 02 为准统一；03 改动收敛在 lib/api.ts 一处（03-R2 已预见此类差异） | 否 | ✅ 已修订：03 改用 decision / proposal / report / reason |
| 9 | **low** | 02 §2.2 #2（merge 时 `--into` 必填）↔ 03 §2.7（ProposalItem.structured 与 backlog-apply body 均无 `into` 字段） | 结构化 merge 提议从 03 的数据结构发不出合法请求 | 03 ProposalItem.structured 增 `into`，由 server 从 gardener 报告解析下发 | 否 | ✅ 已修订：03 structured 增 into，02 harness 出参下发 |
| 10 | **low** | 01 §2.0/§3.1（server 须注入 `MEDIA_ACTOR=console-job:<id>`，audit actor 依赖它）↔ 02 §2.2/§2.6（execFile 选项仅 `{cwd, timeout}`，全篇未提 MEDIA_ACTOR） | 02 漏了 01 明文要求的 env 注入，audit.jsonl 会把看板动作记成本机用户名，M2 出口「写路径可证」的归因失真 | 02 execMedia.ts 与 job runner before-step 补 env 注入（含 PIPELINE_REPO_ROOT） | 否 | ✅ 已修订：02 §2.2 execFile env 已补 MEDIA_ACTOR + PIPELINE_REPO_ROOT |
| 11 | **low** | 01 §2.14（`MetaStatus` / `BacklogTopic`）↔ 03 §2.10/§3.2（type-only import `ContentStatus` / `BacklogItem`） | ui 引用的 core 类型名在 core 里不存在，编译期红 | 03 改用 01 命名，或 01 加别名导出；顺手把 03 §3.2 清单与 01 types.ts 逐名对齐 | 否 | ✅ 已修订：03 全文改 MetaStatus / BacklogTopic，§3.2 清单对齐 |
| 12 | **low** | 03 §2.9 StatusTag 色映射（含 `publishing`）↔ 01 §2.14 MetaStatus 枚举（无 `publishing`） | 幽灵状态，原型残留；TS 下会编译红，但属拼写级 | 删除 publishing 映射项 | 否 | ✅ 已修订：03 StatusTag 已删 |
| 13 | **low** | 03 §2.11（theme.ts 以 JS 常量复制 theme.css 全部 token 值）↔ 总览契约 8（同一规则只写一处） | 双份可独立漂移的视觉真相（antd ConfigProvider 吃不了 CSS 变量是技术成因）；03-R1 已带对策但仍是两处定义 | 接受为技术限制（注释回指 + 两处同改约定），中期可加构建期脚本从 theme.css 生成 theme.ts 消灭手写第二份 | 否 | ✅ 维持接受：03-R1 对策照旧，中期脚本生成待办 |
| 14 | **low** | 01 §3.2（「server 包内 lint 禁 `@console/core/writer` import，规则落在 02」）↔ 02 全文（无任何 lint 配置登记） | 01 指名交给 02 的防线在 02 落空；core exports 字段的物理隔离仍在，属双保险缺一半 | 02 §2.4 依赖清单旁补一行 eslint no-restricted-imports（或明确以 exports 物理隔离为唯一防线、01 删该句） | 否 | ✅ 已修订：02 §2.4 已补 eslint 规则一行 |
| 15 | **low** | 02 §4-待定1（GET /api/jobs 默认「预留路由不实现」）↔ 03 §4-Q5（默认「按 a 预留 useJobs 初始化拉取位」） | 同一悬案两头默认姿势相反：组合执行则 ui 挂载即打一个不存在的接口 | 两条是同一题，合并拍板（见末节问题 3） | **是** | ✅ 拍板选 a：02 已增补 `GET /api/jobs` 设计并回记拍板 §10；03 初拉位保留 |
| 16 | **low** | 02 §2.6 publishPrompt（「跳过 dry-run 确认闸」）↔ CLAUDE.md（douyin-publish dry-run 铁律）+ 02 §2.6 PUBLISH_MILESTONES（首个里程碑 = 「物料拼装 / dry-run」，预期 dry-run 照跑） | prompt 措辞有让 CC 连 dry-run 本身都跳过的歧义，一旦被字面理解，里程碑第一格永远不亮且违铁律 | prompt 改为「dry-run 照常执行并核对输出，免去的是人工确认等待（人已在界面确认）」 | 否 | ✅ 已修订：02 publishPrompt 措辞已改 |
| 17 | **low** | 01 §2.0 退出码表（2=用法错、4=E_PARSE）↔ 02 §2.2（非零一律 409 MEDIA_REJECTED） | 用法错误与真相源损坏被映射成「规则拒绝」，前端提示与告警级别失真 | 02 execMedia 退出码映射细化：2→500 INTERNAL（server 侧拼参 bug）、4→500 并触发告警、1/3→409 | 否 | ✅ 已修订：02 §2.2 共用流程已细化 |

---

## 通过项清单（C1-C10 逐项）

- **C1（部分通过）**：API 的 URL 路径与方法三方完全一致——02 实现的 9 读接口 + 4 快写 + 3 慢作业 + `GET /api/jobs/:id` 与后端拍板 §10 逐条对得上，无私加无遗漏；03 调用的 URL 全部落在该集合内，白名单外动作（sweep、补 url）正确降级为 CommandChip copy 而非私开 endpoint。**未通过部分 = 响应形状与入参字段（冲突 #1/#2/#3/#8/#9）。**
- **C2 通过**：ui 对 core type-only import 落实（tsconfig `verbatimModuleSyntax` + `@console/core` 仅进 devDependencies + build 先跑 tsc）；server 依赖清单（hono/@hono/node-server/chokidar/core/cc-stream）无 writer，且 01 用 core `exports` 字段把 writer 隔在 `./writer` 深路径物理防线；cc-stream 声明零依赖只用 node 内建，spawn/transport/normalize/milestones 无一认识领域概念；core 仅依赖 `yaml`。（lint 双保险缺一半见冲突 #14，不动摇边界本身。）
- **C3 通过**：写路径纪律干净。三份方案中一切状态写入均经 `media` CLI（含 feishu 快写 subprocess、rework job 的 before-flip、CC 子进程 prompt 内的 flip/publish-done）或 spawn `claude -p`（发布/重做/提议入库）；server 只写自己的 logs/.runtime（非状态文件，且刻意不入 chokidar 白名单）；dashboard.md 首次插标记是一次性人工手术并有 git 存档 + E_NO_MARKERS 防护；03 全站组件禁裸 fetch、写动作只走 useAction/useJobAction 两入口。02-待定2 的候选 b（CC 直改 index.jsonl）会破纪律，但已正确标为待拍板而非默认。
- **C4（部分通过）**：01 §2.14 迁移表忠实转写拍板 §5.1 零增边（含 approved→published 直达、review 三向、rejected→drafting）；flip 拒绝 published/scheduled 强制走 publish-done 三翻齐；`published→retro_done` 三方一致标注为唯一治理线迁移；02 快写 flip 三向映射与 rework 链（flip drafting → CC 改稿 → flip review）全部落在合法集合内；03 明确 ui 不内嵌状态机、按钮可用性以 server 下发 allowedTransitions 为准。**未通过部分 = rework 按钮状态与 02 precheck 互斥（冲突 #5）、幽灵状态 publishing（冲突 #12）。**
- **C5 通过**：03 六路由页 + 全局壳覆盖 v2 原型 9 页中的 7 页（index.html 由壳的导航承接）；未覆盖的 `review.html`（审核台）与 `harness-task-detail.html`（治理任务详情）没有被遗漏——已在 03 §4-Q1 作为待定项上报且各给三选项与利弊；metrics.html 被砍的「审核与发布作业」表也回指 Q1；砍掉清单（⌘K/已读/播放器/拖拽）与拍板一致且不留桩。
- **C6（部分通过）**：M1→M5 拼装无循环依赖：01 步 1-5=M1、6-10=M2、11 正确后置到 M5；02 S1/S2 与 M2 并行、S4 依赖 M2（media 全量）、S8 依赖 S5+S7 跑稳；03 S1 只依赖 M1 骨架、S2 起依赖 M3 对应接口，各页依赖的 API 在 02 侧均更早出现；乙类轨迹（02 S6）先于 03 S4 的 P1 消费。**未通过部分 = metrics 页的数据链路断头（冲突 #7：页面、接口、命令都有，唯独没人调命令）。**
- **C7 通过**：项目铁律零违背。发布必须人审：publish job precheck 只发 approved + prompt 授权语义 = 人已在界面（含 dry-run 预览）确认，飞书路径切换后同闸；治理线只产报告人审后应用：backlog-apply 须 proposal 报告溯源、apply-proposal 须人逐条审过且 CC 只许改 brain/ + git diff 嵌任务卡供人回看；`published→retro_done` 唯一治理迁移未被任何设计绕过；03 主动识别 harness-task-detail 的「配置编辑 = 新写路径」风险并默认拒绝（Q1 选项 A 的弊列明）。（prompt 措辞歧义见冲突 #16，属表述非设计。）
- **C8（部分通过）**：三份执行方案均以「上游拍板 + 章节号」开篇，决策理由一律回指不复述；状态机规则没有在 02/03 出现第二份定义（03 图例文案引 `media flip --help`）；01 迁移表标注「忠实转写、实现时逐格对照」且 M5 文档降级后唯一真相收敛 core/state.ts；02 白名单参数声明「以 01 定稿为准，本表跟随」。**未通过部分 = theme 双份值（冲突 #13）与 API 形状两套（冲突 #1 的防漂移面）。**
- **C9（部分通过）**：端口 5170、audit.jsonl 路径与行 schema、metrics.jsonl 路径与行 schema、job id 形态（`${type}-${ts}-${4hex}` 与 01 的 `console-job:<id>` actor 约定咬合）、logs/jobs 落盘路径、`.media.lock` 位置（且被 chokidar 点文件 ignore 天然排除，无自触发）、`--dry-run`/`--json` 双约定、`media backlog apply` CLI 参数（01↔02 逐 flag 一致）——均三方一致。**未通过部分 = SSE job 事件（#2）、token 机制（#3）、MEDIA_ACTOR 注入（#10）、退出码映射粒度（#17）。**
- **C10 通过**：三份共 20 条待定项无实质矛盾。重复但立场一致的两对：02-待定3 ↔ 03-R5（Job 类型宿主，双方都默认 server/ui 本地放、等 04 对齐）、02-待定1 ↔ 03-Q5（GET /api/jobs，双方都倾向增补——唯默认姿势相反，见冲突 #15）；02-待定6（读接口全量 token）与 03 的全量 token 假设一致；01-Q9（metrics 键表归属 douyin-retro SKILL.md）与 02/03 对 metrics 的只读消费无冲突；03-Q1/Q2 正确把原型多出的能力上报而非自行拍板。

---

## 需要与用户讨论的问题

### 问题 1：重做（rework）任务允许从哪些状态发起？（冲突 #5）

02 的 precheck 只放行 `review`，03 把按钮放在 `rejected / drafting(被打回)`——两默认组合下按钮永远 409。

| 选项 | 做法 | 代价 |
|---|---|---|
| A（建议） | 02 precheck 放宽为 `{review, drafting, rejected}`：review 时先 flip drafting 再派活；drafting 时跳过 before-flip 直接派活；rejected 时先 flip drafting（01 迁移表合法边）再派活 | 02 改 precheck 与 before 逻辑几行；语义上「打回记账」与「派活」解耦，与 02 #1 备注的动线一致 |
| B | 03 按钮收回 review 行：打回与派活必须一次完成 | 人打回后想「先放一放、明天再派」就没有入口了，只能靠终端 |

**建议 A**：打回是记账、派活是判断，两者本就该可分离；A 同时天然覆盖「rejected 后人反悔重做」这条已有合法迁移。

**裁决（2026-08-18）：选 A。** 02 §2.3 #2 precheck 已放宽为 {review, drafting, rejected} 并按状态分流 before-step；03 §2.5 按钮行保留三态。

### 问题 2：定时发布是否进看板发布 job 首版？（冲突 #6）

CLI 已有 `--scheduled` 能力，03 画了「立即/定时」Modal，02 的 body 与 prompt 都只有立即发。

| 选项 | 做法 | 代价 |
|---|---|---|
| A | 进首版：02 body 增 `mode/scheduledAt` 并透传进 publishPrompt，CC 按定时语义走 `media publish-done --scheduled` | 02 加字段 + prompt 分支；scheduled 到点回填仍靠 CHK-03 盯守（现状机制，不新增） |
| B（建议） | 不进首版：03 Modal 砍掉定时选项，只做立即发；定时发布留在飞书/终端现行通道 | 03 删一个表单项；看板能力少一格 |

**建议 B**：现行流水线定时发布频率低（open-weight-5 一例），首版求稳先收敛立即发；等看板跑稳一个里程碑再按 A 增补，届时 prompt 语义可拿真实案例校准。

**裁决（2026-08-18）：选 B。** 03 §2.5 发布 Modal 已砍定时选项，02 §2.3 #1 body 维持 `{slug}` 仅立即发。

### 问题 3：是否增补 `GET /api/jobs`（活动任务发现接口）？（冲突 #15，合并 02-待定1 与 03-Q5）

拍板 §10 只有 `GET /api/jobs/:id`；刷新页面后 JobPanel 拿不到进行中任务的 id。

| 选项 | 做法 | 代价 |
|---|---|---|
| A（建议） | 增补 `GET /api/jobs`（活动 + 近期列表，内存表投影 + result.json 兜底），ui 挂载时拉一次 | 02 加一个纯读路由（约 20 行）；超出拍板 §10 字面，需在拍板文档补记一行 |
| B | 接受降级：刷新丢面板上下文，真相靠文件与 `media check` | 「确认发布后顺手刷新页面」这个高概率动作会让人在任务进行中失明 10-20 分钟，体验硬伤 |

**建议 A**：纯读接口不碰零写铁律，成本极低；发布任务动辄 15 分钟，面板失明的代价远大于一条路由。拍板方补记后 02/03 的两条待定项同时销账。

**裁决（2026-08-18）：选 A。** 02 §2.3 已成 `GET /api/jobs` 设计、后端拍板 §10 已补记；03 useJobs 初拉位保留，两条待定项已销账。

### 问题 4（确认题）：API 响应形状以 03 §3.3 需求清单为契约终稿修订 02，是否同意？（冲突 #1 的处置授权）

拍板 §10 只定了 URL 与方法，形状是执行层空白，两份执行方案各自填了一版。本评审建议按「消费方需求驱动」原则以 03 的逐条清单为准修订 02 §2.1（含 health lights 预算、harness 提议 structured/prose 分型、metrics available 语义），修订完成后由评审复核销账。若你希望反向（03 迁就 02 的最小投影、缺的字段前端自算），请指出——代价是把派生逻辑（todos 分级、心跳超期、retroMatrix）散进 ui，与「server 从 core 算好下发」的既有取向相悖。

**裁决（2026-08-18）：同意。** 02 §2.1 六读接口 + `/api/health` 已按 03 §3.3 清单重写（overview 补 dailyRun/todos/heartbeat/backlogWater、detail 补 timeline/checks/auditTrail/publishInfo 且 legalNext→allowedTransitions、backlog 补 collisions/nextPick/nextUpId、harness 提议分型 + retroMatrix、metrics 改 available 语义、health 预算 lights），本评审复核销账。

---

## 2026-08-18 裁决与销账记录

当日用户裁决：细节设计问题授权按评审/作者建议执行，重大功能变动单独拍板。全部冲突与三份执行方案的待定项已落实修订：

- **末节四题**：问题 1 = A（rework precheck 放宽三态）；问题 2 = B（定时发布不进首版）；问题 3 = A（增补 `GET /api/jobs`）；问题 4 = 同意（02 §2.1 按 03 §3.3 重写）。
- **冲突 #1-#17**：处置结果见冲突表末列——#5/#6/#15 经用户拍板，其余按本评审建议修订，无一遗留。
- **拍板文档回记两处**：CLI 拍板 §5.1 增 `approved→drafting` 边；后端拍板 §10 增 `GET /api/jobs`。
- **01 待定项 Q1-Q9**：Q1 开 `approved→drafting`；Q2 不开（人工）；Q3/Q4/Q6/Q7 按预设；Q5 允许 merge 吸收 links/alt_titles；Q8 留 M1 实施时人审（全方案包唯一未清项）；Q9 键表归 douyin-retro SKILL.md。
- **02 待定 1-6**：1 = a（`GET /api/jobs`）；2 = b（apply-proposal 的 CC 子进程收尾翻 applied，allowedTools 加 `Edit(harness/logs/index.jsonl)`）；3 = b（Job 宿主 server，ui type-only import）；4 = 维持 a（CC prompt 留痕）；5 = 共享计数上限 2；6 = 读接口全量 token。
- **03 Q1-Q5**：Q1 两页（审核台 / 治理任务详情）下一期（当日早前已裁）；Q2 维持无页内播放器；Q3 维持 CommandChip copy；Q4 不引 markdown 库；Q5 = a。
- **修订后跨文档一致性复核**：SSE = `job:<id>` + Job 全量快照（02 §2.1 ↔ 03 §2.10/C9 一致）；token = `Authorization: Bearer` + `#token=` 首发（02 §2.0/§2.8 ↔ 03 §2.10/C12 一致）；Alert = core 超集唯一定义 `{key, rule, level, subject, message, since?, count?, evidencePath?, action?}`（01 §2.14 ↔ 02 §2.1 ↔ 03 §2.9 一致）。
