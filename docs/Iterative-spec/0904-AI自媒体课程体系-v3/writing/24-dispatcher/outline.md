---
plan: fixed-from-card
length: standard-to-long（心法节第 4 节可展开，全文硬上限 1 万汉字）
figures: none
sections: 5
---

大纲照任务卡「2.1 大纲」块原样展开，节的数目、顺序、每节的核心判断和交付物均未改动。以下只是把任务卡里的条目摊成写作用的结构化字段，不构成局部调整。

记忆锚点：自审是反哺作用在治理线自己身上——大环合上之后，连怎么治理这件事本身也进了回路。

开篇契约：逐字承接 `plan/handoff-ledger.md` 第 23 行结尾抛出的问题「选题池能自己养起来了。四个治理任务各跑各的，谁来决定今天该跑哪几个？」；本课输入是学员的 `harness/tasks.md`（第 21 课交的空壳，`tasks: []`）、`brain/benchmarks.md`、`content/_backlog/backlog.yaml`；本课产出一份任务注册表 + 四个治理 skill + 一轮巡检记账。

## 1. harness-dispatcher：读注册表，到点才跑
核心判断: 调度和执行要解耦，加一个治理任务只改 `tasks.md` 的 yaml，不碰 dispatcher 本身；三种触发类型（`post-publish-window` 事件触发、`periodic:<N>d` 周期触发、`weighted-pool` 加权池）各自的到点判据不一样，不能用同一套逻辑判断。
支撑材料: `.claude/skills/harness-dispatcher/SKILL.md`（三种触发类型准确叫法与判据）、`harness/tasks.md` yaml 结构与已启用五任务
交付物: 一条 Prompt 生成 `harness-dispatcher` skill；一条 Prompt 生成 `harness/tasks.md` 的 yaml 注册表骨架（含 retro/ideate 两个已实现任务的 trigger 定义）
二级标题: 1.1 三种触发类型怎么判到点 / 1.2 派活与记账（收报告，`applied:false` 待人审应用）
收尾交接: 调度器会喊人干活了，但真正干活的还差两个任务

## 2. 三个治理 skill 起步：backlog-gardener / benchmark-refresher / account-audit
核心判断: 三个技能各管一类没人催但放着会烂的资产，量不大、路线不互斥，一条 L1 Prompt 各自钉死判据加验收就够，不需要走 SPEC 六步。
支撑材料: `.claude/skills/backlog-gardener/SKILL.md`、`.claude/skills/benchmark-refresher/SKILL.md`、`.claude/skills/account-audit/SKILL.md`
交付物: 三条 L1 Prompt（各自：目标怎么选 / 干什么 / 产物与记账）——backlog-gardener 只产提议不翻状态、benchmark-refresher 逐条判成立/存疑/失效、account-audit 定熄火线（单任务有效记录 <5 条只出心跳报告）
二级标题: none
收尾交接: 三个技能都能跑了，但谁能碰治理线自己的配置，得先划边界

## 3. 调参限幅表：自审能自动调什么
核心判断: 可逆的数值（间隔、权重）划进自动档，启停和锁定参数一律走提议人审，这条边界防的是自审自己把自己的配置改跑偏，改错了却没人拦住。
支撑材料: `harness/tasks.md` account-audit 任务卡边界表（参考流水线数值：benchmark-refresher 14~60d、backlog-gardener 7~30d、ideate 锁定、retro 窗口锁定、weighted-pool 1~12）
交付物: 一条 Prompt 让 AI 照参考流水线的表结构生成读者自己的调参限幅表（参数/当前值/可自调范围/单次步长/调整规则），数值由读者自己定
二级标题: none
收尾交接: 边界画完，得点破这一层到底是什么

## 4. 反哺大环第三段：自审作用在治理线自己身上
核心判断: 大环不是只喂给生产内容用的，account-audit 不审内容、不审 brain，只审治理线自己跑得好不好；第 21 课回答治理线为什么只提议，第 22 课回答一条内容怎么单次归因，这一课回答连治理线的调度参数本身也要拿运行数据反过来校准。
支撑材料: `courses/21-双线闭环与资产读写表.md` 第 5 节三课地图表（逐字复用）、`harness/logs/index.jsonl` 2026-09-02 account-audit 真实记账（复盘逾期积压 17 条）
交付物: 反哺大环三段完整地图（课号/回答什么问题/交付什么，与 21 课表逐字一致）+ account-audit 的读写边界（只动 `harness/tasks.md` 的 yaml 数值字段）
二级标题: none
收尾交接: 一轮真的巡检该跑起来了

## 5. 治理线能自己巡检了（收尾）
本课做到了什么: 一份能被 dispatcher 读到的任务注册表，四个治理 skill（retro、ideate、backlog-gardener、benchmark-refresher）加自审元层 account-audit，一轮巡检记账
还看不到什么: backlog-gardener 和 benchmark-refresher 这一课才第一次跑通；不管哪条线，现在都得学员自己敲一次命令才会动
下一课补什么: 怎么让它在学员睡觉的时候自己跑
结尾抛出的问题（逐字，对齐 handoff-ledger 第 24 行）: 治理线能自己巡检记账了。可这些都要你敲一次命令才动。怎么让它在你睡觉的时候自己跑？
