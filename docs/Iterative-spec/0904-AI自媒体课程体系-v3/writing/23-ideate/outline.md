---
plan: fixed-from-card
length: standard-long
figures: none
sections: 5
---

大纲来源：任务卡 `plan/cards/23.md` 第「2.1 大纲」块，节数与顺序不动，直接展开。局部调整两处，写明原因：

1. 第 1 节字段表不能写成"学员的 `backlog.yaml` 已经有这些字段"。第 21 课成稿明说学员那份到第 21 课为止只定了文件管什么、两层状态、取题指针三件事，没有打分维度、scores/tags/metrics 字段，"维度名字未必和参考流水线一样"。第 1 节的字段表改写成"参考流水线的字段长这样，本课按这个形状把你的 backlog.yaml 补齐"，用 Prompt 让 AI 对齐，不断言学员文件里已经有。
2. 第 2、3 节涉及的"6:4 配比"改写成"positioning.md 里那个具体的排产比例数字"，不钉死写成 6:4。第 04 课成稿原文：AI 给三个内容支柱方案供学员选，比例是学员自己选定的一个数字，"六比四"只是该课解释"不许出现判不了的词"时举的反例，不是钉死配比。三层词表（Layer A/B/C）按第 04 课成稿原样引用，这条任务卡假设是准的。

## 1. 选题池的数据契约：为什么只入不出会烂
核心判断: `backlog.yaml` 需要粗粒度三态加过期规则才不会腐化，只入不出的池子会烂，躺久的候选和当下的热点脱节。
支撑材料: SKILL.md 第 96 行 2026-07-08 教训（9 条躺 24 天全过时）；`alerts.ts` 过期两条机械规则；第 21 课成稿关于学员 backlog.yaml 现状的原话；`backlogAdd.ts` 的字段 schema。
交付物: backlog 字段表（对照参考流水线的形状，本课要补的字段：score/tier/scores/urgency/reason/tags/metrics）+ `next_up` 指针说明（复述学员已有机制，不重新发明）+ 一条 Prompt 让 AI 按这个形状补齐学员自己的 backlog.yaml 头部注释。
二级标题: 不分
学员此时手上有: 第 22 课结束时的 `content/_backlog/backlog.yaml`（头部只有三件事）、`douyin-retro` skill。
交接: 数据契约定了，得有东西真正往里灌。

## 2. agent-reach 情报采集：只从外网来，不爬抖音
核心判断: 抖音主站反爬重，无人值守的流水线爬不动，情报只能从外网来，平台侧的真实信号靠复盘反向补——这不是图省事，是能不能无人值守跑下去的硬约束。
支撑材料: SKILL.md 第 52 行实测结论（2026-06，抖音主站反爬重，headless 抓不到内容）；`CLAUDE.md` 大环一节；第 02 课成稿关于 agent-reach doctor 只验证了免登录三渠道、登录态渠道留到本课的原话；第 04 课成稿的 Layer A/B/C 三层词表。
交付物: 三层词表复用说明（直接引用第 04 课已写好的 `brain/sources.md`）+ `agent-reach doctor` 自检命令，本课把 X/Reddit 这类登录态渠道配起来。
二级标题: 不分
学员此时手上有: `brain/sources.md`（第 04 课填好的三层词表）、已装好但只验证过免登录渠道的 agent-reach。
交接: 情报抓来了，怎么变成一份排好序的选题清单。

## 3. douyin-ideate skill 封装：双赛道打分与入池
核心判断: 深度题和流量题各走一套 6 维打分，但共用同一套抓取引擎，只是权重不同，这样才能既保住深度这条立身之本，又不丢流量破圈的机会。
支撑材料: `scoring.md` 的 STEPPS 出处与两套加权公式、v1.1 调参记录；`backlogAdd.ts` 的 schema 校验；`report-template.md` 的报告结构；positioning.md 里学员自己的排产比例（不写死 6:4）。
交付物: 规格表（L2，维度/问什么/深度权重/流量权重，参考流水线的起步值供参照）+ prompt 封装 SKILL.md、references/scoring.md、references/report.md + `media backlog add` 入池命令说明。
二级标题: 不分
学员此时手上有: 第 2 节的情报清单、`brain/positioning.md` 的排产比例、第 1 节补齐的 backlog 字段契约。
交接: 候选入池了，重复题和过期题怎么防。

## 4. 去重与清扫：撞题不进池，过期就退池
核心判断: 30 天主题去重和规则化过期清扫属于记账动作，可以自动做；真正的撞题判断（哪条该留、哪条该并）留给后面的治理任务，那是判断性变更，要人审。
支撑材料: `backlogAdd.ts` 撞车判定规则（tags 交集≥2，否则标题子串+链接完全重合）；`backlogSweep.ts` 缺省 dry-run、`--apply` 才落盘；`alerts.ts` 的 R1/R2 阈值；第 21 课成稿的迁移表（idea→expired 经 sweep 视同记账，idea→archived 经 apply 需人审）；`backlogApply.ts` 只作用于 status=idea。
交付物: `media backlog sweep --apply` 命令说明 + tags 归一化去重规则说明 + 一张边界表（哪些能自动、哪些要停下来等人）。
二级标题: 不分
学员此时手上有: 第 3 节的入池结果。
交接: 治理线现在有几个任务分头跑。

## 5. 选题池养起来之后
本节做总结，不设二级标题。
本课做到了什么: 一个能抓料、打分、入池、清扫的 douyin-ideate skill，一批真实入池的候选。
还看不到什么: 治理任务现在只有复盘和选题两个真正跑通过，还没有人统一排班决定谁先跑。
下一课补什么: 谁来决定今天该跑哪几个治理任务。
交付物: 无新增操作块，收束句。
收尾交接（逐字落台账 `handoff-ledger.md` 第 23 行「结尾抛出的问题」列）: 选题池能自己养起来了。四个治理任务各跑各的，谁来决定今天该跑哪几个？
