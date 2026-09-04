---
plan: fixed-from-card
length: standard-long（心法课，往厚里写，但不为凑字硬拉）
figures: none
sections: 5
---

大纲照任务卡「2.1 大纲」块原样展开，节的数目、顺序、每节的核心判断与交付物不改。唯一的局部调整：card 原文里第 1 节没有单独的标题字样（只给了核心判断），落成 outline 时按 structure.md 的标题法则把每节的标题定成内容的整体描述，不引入新论点。

记忆锚点：复盘只回答一件事——这条内容漏在哪一环，不是给账号打总分。

开篇契约：上一课交付了 `harness/` 骨架和资产读写表，治理线的边界画好了；本课输入是学员的 `content/_backlog/backlog.yaml`、`brain/benchmarks.md`（留空待写）、第 21 课定的资产读写表；本课产出一个 `douyin-retro` skill + 一份真实的复盘报告。

开篇逐字接第 21 行「结尾抛出的问题」（handoff-ledger.md，因第 21 课成稿并发写作暂不存在）：「治理线的骨架和读写边界画好了，第一个治理任务是复盘。数据怎么拉、怎么归因、提议怎么写？」

## 1. 传播漏斗：一条内容漏在哪一环
核心判断: 曝光、点击、完播、互动、关注五环各自对应不同的病因，第一个跌破基线的环才是真正要修的地方，不是从头到尾都查一遍。
支撑材料: `funnel-attribution.md` 的传播漏斗与症状病因动作表；`data-channel.md` 的 16 列字段
交付物: 漏斗五环对照表（环 / 量什么 / 对应哪类打法问题）
二级标题: none
收尾交接: 漏斗定位法有了，得先把数据接进来才有东西可定位

## 2. douyin-retro skill：拉数据、记账、出报告
核心判断: 拉到数据要立刻记账，分析和记账解耦——分析被打断，数据也已经留痕，不用重拉。
支撑材料: `metricsRecord.ts` 真实行为（jsonl 每窗口都写、7d 才回填 backlog.metrics）；`SKILL.md` 采集/记账/产出三段结构；第 20 课交付的 `douyin-publish` skill 作登录复用参照
交付物: 规格表（L2）+ 两三条 Prompt 封装 douyin-retro skill（采集/记账/产出三个环节）；记账动作写入 `content/_backlog/backlog.yaml` 每条目的 `metrics` 字段，不是 `harness/logs/metrics.jsonl`
二级标题: none
收尾交接: skill 造好了，拿数据跑一遍完整归因

## 3. 归因练习：脱敏样例数据怎么用
核心判断: 没有播放数据不代表学不了归因——课程材料附录的脱敏样例数据走的是同一套漏斗定位法，方法论和真实账号跑起来没有区别。
支撑材料: 本课自造的附录脱敏样例数据（`appendix/22-复盘脱敏样例数据.md`）；`content/_template/5-retro.md`；参考流水线 `content/2026-07-08/spec-driven-development/5-retro.md` 的两段式写法（24h 归因、7d 收口修正）示范
交付物: 一份复盘报告（用 `content/_template/5-retro.md` 模板产出：数据快照 + 归因 + 沉淀动作）
二级标题: none
收尾交接: 报告写完了，里面的结论要不要真的改大脑，谁来点头

## 4. 变更提议与反哺大环第二段
核心判断: 复盘的结论只能写成提议，不能直接改 `brain/benchmarks.md`——这是第 21 课「只提议不落笔」铁律第一次真正落地检验；这一课回答的是单次归因，不是整个大环，账号级别的调整要等第 24 课自审那一层才合上。
支撑材料: `harness/report-template.md` 变更提议清单格式；`brain/benchmarks.md` 文件头部的铁律原句；`state.ts` 的 `published → retro_done` 迁移（line: harness）
交付物: 变更提议清单（改什么 / 依据哪条数据 / 可逆性），对照 `harness/report-template.md`
二级标题: none
收尾交接: 单条内容的复盘做完了

## 5. 复盘做完之后
本课做到了什么: 一个能拉数据、记账、出报告的 douyin-retro skill，一份真实（或脱敏样例）的复盘报告
还看不到什么: 复盘只管发过的内容，选题池还是空的，没有新内容可发
下一课补什么: 选题池怎么自己养起来
结尾抛出的问题（逐字对齐 handoff-ledger.md 第 22 行）: 复盘能把一条内容的成败归因，提议能改大脑。可选题池空了，拿什么内容去发？
