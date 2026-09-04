---
topic: 治理总调度 harness-dispatcher 与自审元层 account-audit：任务注册表怎么解耦调度和执行，反哺大环第三段怎么点破
audience: 会用 Claude Code/Cursor、没做过自动化流水线、跟着本课程走到第 23 课的学员
mode: new
series_context: 全书第 24 课，模块 5 治理线最后一课；上接第 23 课（选题池与外网情报），下启第 25 课（无头作业）
---

## 核心问题
四个治理任务（retro、ideate、backlog-gardener、benchmark-refresher）已经各自能跑，但都要学员手动敲命令触发；这一课要解决谁来决定今天该跑哪几个、以及治理线自己的调度参数要不要也被运行数据校准这两件事。

## 材料清单

- [案例] `.claude/skills/harness-dispatcher/SKILL.md` 全文。三种触发类型的准确叫法与判据：`post-publish-window`（事件窗口，24h/72h/7d ± 容差）、`periodic:<N>d`（周期，读 index.jsonl 算距上次成功运行天数）、`weighted-pool`（加权池，预留，暂无任务启用）。dispatcher 只读注册表派活、不碰 brain/、不改线上，调度与执行解耦（改任务只改 tasks.md）。可支撑第 1 节核心判断与二级标题 1.1。
- [案例] `harness/tasks.md` 全文。yaml 注册表真实结构（`tasks:` 列表，字段 `task`/`skill`/`enabled`/`trigger`/`windows`/`weight`）；5 个已启用任务（retro/benchmark-refresher/ideate/backlog-gardener/check）+ 5 个 TODO（disabled）+ account-audit 元层任务；每个任务下方的五要素任务卡（为什么/目标怎么选/干什么/产物与记账/人审关注点）。account-audit 任务卡里的调参限幅表：benchmark-refresher 间隔 30d、可自调 14~60d，步长 ×1.5 或 ÷1.5；backlog-gardener 间隔 7d、可自调 7~30d；ideate 间隔 2d 锁定；retro 窗口 24h/72h/7d 锁定；weighted-pool weight 1~12，步长 ≤±3。可支撑第 1 节交付物、第 2 节三个 skill 的判据来源、第 3 节调参限幅表（数值全部标注"参考流水线的"，读者自己的表数值由 Prompt 让 AI 生成，不代填）。
- [数据/案例] `harness/logs/index.jsonl` 真实记录（45 行）。2026-09-02 那行 account-audit 记账：`{"task":"account-audit","window":"periodic:30d","result":"report","findings":2,"applied":false,"note":"dispatcher 周期触发(距 07-08 56天超30d)。41条历史账本全量分析：benchmark-refresher与backlog-gardener有效样本均<5触碰熄火线，保持原配置不调参；ideate与retro参数锁定。⚠️报警：复盘逾期积压达17条(>3报警线)……"}`。同日 backlog-gardener 记录：`{"task":"backlog-gardener","window":"periodic:7d","result":"report","findings":2,...}`，报告文本给出两组存疑撞题的判据（tags 交集/同分 tie-break 失效）。可支撑第 4 节反哺大环第三段的真实证据（逾期积压 17 条这个数字有出处）、第 2 节记账格式示例。
- [案例] `.claude/skills/backlog-gardener/SKILL.md` 全文。职责边界（只管池内互撞和与已发布重复，不做过期清扫）、判同题规则（tags 交集≥2 或标题指向同一事件；与已发布 ≤30 天重复算撞）、铁律"只产提议报告，不翻任何状态"、落地命令 `media backlog apply <id> --action merge|archive [--into <id2>] --proposal <path>`。可支撑第 2 节 backlog-gardener 的 L1 Prompt。
- [案例] `.claude/skills/benchmark-refresher/SKILL.md` 全文。能力边界诚实声明（agent-reach 能验 X/Reddit/HN/GitHub/YouTube/Bilibili/XHS，纯抖音对标标"需人工核"）、逐条判定四态（✅成立/⚠存疑/❌失效/➕建议新增，每条须带证据链接+日期）、铁律"绝不自动改 brain/benchmarks.md"。可支撑第 2 节 benchmark-refresher 的 L1 Prompt。
- [案例] `.claude/skills/account-audit/SKILL.md` 全文。红线"只动 harness/tasks.md 的 yaml 数值字段，且必须在任务卡边界表范围内；任务卡文字、其它文件一概不碰"；流程五步（解析账本→熄火检查→产调整→写报告→到此停）；熄火线"有效记录 <5 条只进报告标样本不足，跳过调参"。可支撑第 3 节调参限幅表的读写边界、第 4 节 account-audit 的读写边界。
- [案例] `harness/README.md` + `harness/report-template.md`。治理线宪法（只养存量资产、只产报告不自动改）；统一报告六段格式（任务/触发/目标、现状、发现、变更提议、盲区、落地记录）。可支撑全文承接第 21 课骨架、第 2 节交付物格式统一。
- [出处] 课程内部前两课成稿：`courses/21-双线闭环与资产读写表.md` 第 5 节反哺大环三课地图表（21/22/24 逐字口径）、`courses/22-复盘归因反哺大脑.md` 第 4 节末尾对反哺大环第三段的预告（"治理线自己的参数要不要跟着复盘结果调，同样要过人审，那是自审那一层的事"）。逐字复用地图表是任务卡硬性要求。
- [出处] `plan/handoff-ledger.md` 主表第 23、24 行。第 23 行结尾抛出的问题（"选题池能自己养起来了。四个治理任务各跑各的，谁来决定今天该跑哪几个？"）是本课开篇必须逐字承接的句子；第 24 行的开头接的点与结尾抛出的问题是本课收尾对齐的基准。
- [反例] 旧稿 `plan/old-courses/v1-15-治理总调度harness-dispatcher.md`。只当口径参考不能照搬结论：它让学员看 Python 实现代码、写课后练习去手动构造账本行，这条路径违反本课程"学员不写一行实现代码"的铁律，也违反"参考仓库的文件不等于学员自己的文件"的背景包第 2 条——它把参考仓库的具体数值和代码路径直接当成学员该抄的东西。可支撑写作时避免把这份旧稿的表述方式带进本课（反例支撑）。

## 材料缺口
无实质缺口。account-audit「采纳率口径」细节（只算落盘 ≥7 天的报告）在任务卡里已有出处，第 3、4 节按需引用；具体命令与路径都已在仓库核实存在。唯一要注意的风险点：写作时必须把参考流水线里的具体数值（30d、7d、14~60d 等）和真实报告内容（逾期 17 条）标成"参考流水线的"，不能写成读者自己仓库里已经产生的数据——读者的 `harness/tasks.md` 到本课开头还是第 21 课交的空壳（`tasks: []`），本课的 Prompt 只能让 AI 照形状生成结构，不能替读者钦定数值。
