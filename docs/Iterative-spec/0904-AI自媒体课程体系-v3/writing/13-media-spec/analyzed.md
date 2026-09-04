---
topic: 第 13 课：media 写 SPEC——把决策展开成 AI 能照着施工的执行方案（四节模板：实施步骤 / 命令×功能×详细设计 / 对外契约 / 风险与待定项）
audience: 会用 Claude Code 或 Cursor，没做过自动化流水线，认知停在单轮对话；手上没有参考仓库，只有前 12 课自己做出来的东西（骨架仓、brain、SPEC 六步方法、media 的调研与 ADR）
mode: new
series_context: 模块 3「SPEC 与状态中枢」第 2 课（12 调研与选型讨论 → 13 写 SPEC → 14 执行 M1 → 15 执行 M2 → 16 验证与收敛）；本课是 SPEC 六步法的第 4 步「写 SPEC」
---

## 核心问题

决策已经拍板（上一课的 ADR），但 AI 拿着 ADR 施工不了——ADR 只回答「选哪条路」，不回答「每条命令读什么、写哪个字段、失败了报什么」。这一课要解决：怎么把决策展开成一份 AI 能直接照着写代码的规格文档，四节模板照第 11 课钉死的格式抄，不许自己发明。

## 材料清单

- [规范] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/spec-lesson-standard.md`：第 11 课钉死的六步节名、写 SPEC 节的四节模板原文（`## 1. 实施步骤` / `## 2. <命令|接口|页面> × 功能 × 详细设计` / `## 3. 对外契约` / `## 4. 风险与待定项`）、里程碑出口条件写法的正反例。本课四节模板不许改写，直接引用这份规范。
- [任务卡] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/cards/13.md` 的「2.1 大纲」块：五节骨架、每节核心判断与交付物、承接三行原文，本课大纲的唯一来源，Step 2/3 不重新设计，直接展开。
- [参考流水线实例] `docs/Iterative-spec/0818-看板工作台/01-CLI执行方案.md`：四节模板的真实实例，51KB，含 §1 十一步实施步骤表（对齐 M1/M2 里程碑、每步四列：里程碑/做什么/产出物/验收标准）、§2 十四条命令逐条详设（含 2.0 通用约定：全局参数、JSON 信封、退出码表、错误码表、写命令事务序）、§2.14 core 模块拆分与函数签名、§2.14 状态迁移表（meta 8×8 / backlog 6×6）、§3 对外契约（分消费方列出提供什么）、§4 风险与待定项（R1-R5 风险、Q1-Q9 待定项均已拍板销账）。本课的形状范本，引用其中一两处原文时标注「参考流水线」，不当作学员自己的文件。
- [上游拍板] `docs/Iterative-spec/0818-看板工作台/2026-08-18-流水线CLI技术方案.md`：v0.2 全文，D1-D5 决策记录（CLI 首要目标/查询语义/dashboard 命运/技术栈/CLI 名称）、§4 硬约束（YAML 注释必须原样保留，Document API 定点修改）、§5.1 状态机原始表述、§9 迁移顺序（防双写路径）、§11 增补（文件锁/审计账本/原子落盘/两条新命令）。用于核对 01-CLI执行方案.md 的决策出处，本课不直接引用，只作为交叉核实。
- [真实代码] `tools/console/packages/core/src/state.ts`：合法状态值与迁移表的唯一真相源。meta 8 态（ideated/drafting/review/approved/scheduled/published/rejected/retro_done）、backlog 6 态（idea/picked/published/expired/rejected/archived）；`assertMetaTransition`/`assertBacklogTransition`/`legalNext`/`renderTransitionTable`/`pickNext` 函数签名与实现细节（含 `approved→drafting` 反悔边、`published→retro_done` 治理线专属边）。本课状态迁移表 Prompt 的判据来源。
- [真实代码] `tools/console/packages/core/src/{lock.ts,atomic.ts,audit.ts,writer.ts,doctor.ts,errors.ts}`：锁（`.media.lock`，30 秒陈旧阈值，pid+ts 结构，EEXIST 冲突即报错不排队）、原子落盘（temp-then-rename）、审计账本（`tools/console/logs/audit.jsonl`，append 前读全量重写保证原子性）、事务引擎（拿锁→快照→建写计划→dry-run 分支→落盘→重建 dashboard→append audit→放锁）、doctor 与 check 的分工（doctor 验产物格式、check 验账本一致性，互不重叠）、`MediaError` 统一错误形状与退出码表。本课「失败怎么报」这一列的事实依据。
- [真实代码] `tools/console/packages/cli/src/commands/*.ts` 十四个命令文件：`st.ts`、`next.ts`、`backlogLs.ts`、`check.ts`、`doctor.ts`、`promote.ts`、`flip.ts`、`publishDone.ts`、`backlogAdd.ts`、`backlogSweep.ts`、`backlogApply.ts`、`nextUp.ts`（set/clear 两个子命令算一条）、`dashboardRebuild.ts`、`metricsRecord.ts`。已用 `grep -n "command(\|\.option(\|\.description("` 逐个核对参数与说明文案，确认 14 条命令的真实参数表，比 01-CLI执行方案.md 的计划文本多一条 `doctor`（后补，计划文本 §2 只到 2.13，无 doctor）。
- [旧稿，仅看口径] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/old-courses/v1-11-状态真相源与media-CLI.md`：v1 版第 11 课全文，含双层真相源架构图、状态转移矩阵讲法、三翻齐事务讲法、doctor 的 DOC-01~04 规则、驱动 AI 用 CLI 的提示词范式、自愈决策树。只借讲法角度和 mermaid 图的画法，不照搬其命令族清单（v1 只列 6 条命令，含未采纳的 `media doctor` 独立小节写法）和字数配比（v1 是 15 课体系下的合并课，本课只做写 SPEC 一步）。
- [ADR 交叉核对] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/00-ADR.md` D8：media CLI 全量 1:1，`check` 进必做，分五课（12-16），反悔成本高。确认本课范围边界：14 条命令逐条穷举 + check 八条规则，是 D8 拍板的具体化。
- [承接台账] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/handoff-ledger.md` 第 12、13 行：第 12 课成稿此刻不存在（`writing/12-media-research/` 只有空的 analyzed.md），承接按台账三行走，回复里标注「承接按台账」。

## 材料缺口

- 学员自己第 12 课的 `00-调研.md` 和 `01-ADR.md` 不存在（课程尚未编写到那一步，且这两份文件本身是「学员未来会产出的东西」，不是仓库里的既有文件）。处理方式：按写作背景包第 2 节的规则，本课正文只抽象引用这两份文件「已经拍板了什么类别的决策」（入口形态、YAML 写法、并发保护、派生视图——四组互斥路线的类别名来自 `plan/inventory.md` 第 12 课小节，是规划口径而非学员文件内容），具体决策文字留给 AI 在本课 Prompt 里去读学员自己的 `01-ADR.md` 生成，课文不替学员编造决策内容。
- check 规则从「七条」到「八条」的偏差：任务书交代要讲清楚是八条（CHK-01 到 CHK-08），已用 `01-CLI执行方案.md` §2.4 原文核实，八条规则真实存在（双层不同步/picked 断链/scheduled 超时/review 积压/链接待补/指针断裂/临近过期/疑似空跑）。不是缺口，记录在此防止漏改。
