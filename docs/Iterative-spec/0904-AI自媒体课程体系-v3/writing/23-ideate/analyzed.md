---
topic: 选题池的数据契约怎么补齐，外网情报怎么抓，douyin-ideate skill 怎么按 L2 规格封装
audience: 用 Claude Code/Cursor 跟做这门课的学员，做到第 22 课，没做过自动化流水线，认知停在单轮对话
mode: new
series_context: 全书第 23 课，模块 5 治理线第三课，承接第 22 课（复盘归因反哺大脑）
---

## 核心问题
选题池只入不出会烂，情报只能从外网来不能爬抖音，怎么用一个 L2 规格的 douyin-ideate skill 把这两件事钉成能重复跑的流程。

## 材料清单

- [真实案例] `.claude/skills/douyin-ideate/SKILL.md` 第 96 行：2026-07-08 教训，9 条 idea 躺 24 天全过时。支撑第 1 节「只入不出会烂」的开篇论据。
- [真实案例] `tools/console/packages/core/src/alerts.ts` 第 12-29、56-67 行：过期清扫两条机械规则，R1 urgency=today 超 2 天、R2 scores.timeliness≥4 超 7 天，`DEFAULT_ALERT_CFG` 把阈值定死在代码里。支撑第 1 节字段表和第 4 节清扫规则的具体判据。
- [真实案例] `tools/console/packages/cli/src/commands/backlogAdd.ts` 全文：`media backlog add` 的 schema 校验（title/track/format/scores 六键 1-5 整数/urgency/reason/links/tags 必填）、撞车判定（tags 交集≥2，否则标题子串+链接完全重合退化）、`--force <n>` 单条放行、自动编号规则。支撑第 3 节字段契约和第 4 节去重规则。
- [真实案例] `tools/console/packages/cli/src/commands/backlogSweep.ts` 全文：`media backlog sweep` 缺省 dry-run、`--apply` 才真落盘，清扫结果就地翻 `expired` 并在状态行后追加注释留痕。支撑第 4 节。
- [真实案例] 课程第 21 课成稿第 99-105 行的迁移表：`idea→expired` 经 `backlog sweep`，规则化清扫视同记账；`idea→archived` 经 `backlog apply`，判断性变更要等人审通过的提议报告。支撑第 4 节「去重可自动、撞题判断要人审」的边界论证，与本课结论必须一致。
- [真实案例] 课程第 21 课成稿第 51 行：治理线只有两类例外可以自动，入池和规则化清扫；其余一律需要人审。同上，双重校验第 4 节的边界。
- [反例/真实案例] `.claude/skills/douyin-ideate/SKILL.md` 第 52 行：实测 2026-06，抖音主站反爬重，headless 抓不到内容，computer-use/Claude-in-Chrome 都需人值守，进不了无人流水线。支撑第 2 节「情报只从外网来」的核心论证。
- [真实案例] `CLAUDE.md`（仓库根）「大环」一节：受众平台信号只有复盘这一条来路，选题端不爬抖音。与上一条互相印证，是这门课系列反复强调的边界。
- [权威引用] `.claude/skills/douyin-ideate/references/scoring.md` 第 1-4 行：借鉴 Jonah Berger 的 STEPPS 传播力模型，但权重按抖音技术账号重调，不照搬。可用一句话翻译带过，支撑第 3 节打分设计的来处。
- [真实案例] `references/scoring.md` 第 17-30 行：深度赛道和流量赛道两套加权公式的具体系数，附一条 v1.1 调参记录（深度时效 0.05→0.10、流量实用 0.05→0.10，首次试跑后调）。支撑第 3 节「同一套引擎、两套权重」并给出真实的迭代痕迹，说明这是起步值不是铁律。
- [反例] 课程第 04 课成稿第 5、21-34 行：`positioning.md` 的内容比例是学员自己从三个方案里选出来落成的一个具体数字，"技术深度和流量型六比四"只是该课解释"不许出现判不了的词"时举的例子，不是钉死的配比。这条材料用来纠正任务卡 2.1 大纲里"6:4 配比"的表述，本课不能断言学员的比例就是 6:4。
- [反例] 课程第 21 课成稿第 5 行引用：参考流水线 `backlog.yaml` 头部定了六个打分维度（practical/social/emotion/hook/timeliness/trigger），但学员自己那份到第 21 课为止只定了三件事，没有打分维度，"维度名字未必和参考流水线一样"。用来防止把参考仓库字段当成学员已有字段。
- [真实案例] `content/_backlog/README.md`、`content/_backlog/backlog.yaml` 头部注释：粗粒度三态 idea/picked/published + 异常态 rejected/expired/archived，`next_up` 指针机制（人填 id，daily-run 优先取，promote 后置空）。学员第 03 课已定，本课可直接引用不必重讲。
- [真实案例] 课程第 02 课成稿第 95-131 行：agent-reach 的装机方式、`agent-reach doctor` 自检命令，第 02 课只验证了网页、YouTube、RSS 三条免登录渠道，明确把小红书、Twitter 这类要登录态的渠道留到"真正用到选题调研那一课"，也就是本课。支撑第 2 节的开篇承接和交付物。
- [真实案例] `pipeline/1-ideate.md`（参考流水线版本）与课程第 03 课成稿第 105-109 行：学员自己的 `pipeline/1-ideate.md` 目前只是四件事骨架（输入/输出/状态翻转/闸口），22 行，执行细节留给 skill，不进契约。本课新写的 douyin-ideate skill 不能反过来往这份契约里塞步骤。
- [真实案例] `tools/console/packages/cli/src/commands/backlogApply.ts` 第 1、95 行：`media backlog apply <id> --action <merge|archive> --proposal <path>` 仅作用于 `status=idea` 的条目，是人审通过提议后才用的落地命令，不在本课自动化范围内。用于第 4 节划清"入池/清扫可自动"和"撞题判断要走 apply、要人审"的边界。
- [真实案例] `.claude/skills/douyin-ideate/references/report-template.md` 全文：报告落在 `content/_research/research-{YYYY-MM-DD}.md`，四段式（数据概况/AI 圈的料/为什么火/缺口矩阵/本批选题）。支撑第 3 节交付物设计。

## 材料缺口
无实质缺口，14 条材料均可在仓库或课程成稿里 grep 到具体行号。唯一需要在正文里明确处理的是两处"参考仓库细节 vs 学员自己文件"的边界（backlog.yaml 打分字段、positioning.md 配比），已在反例条目里标注对应的纠偏材料，写作时按「参考流水线里……，起步值」的句式处理，不写成学员文件里已经有。
