---
topic: 第 21 课：双线分工——生产线消费资产，治理线保养资产（治理只提议不改）
audience: 会用 Claude Code 或 Cursor、没做过自动化流水线、认知停在单轮对话的学员；第 20 课结束，生产线整条通了，学员手上只有自己写的 CLAUDE.md、pipeline/ 五份契约、backlog.yaml 头部、brain/ 五份文件、tools/console/packages/core/src/state.ts（含全量 media 命令）
mode: new
series_context: 全书 29 课模块 5「治理线」第一课（21-24），L2 心法课；上一课 20 交付发布 skill 与 dry-run；下一课 22 讲复盘归因
---

## 核心问题
生产线只会把选题池和账号大脑当存量吃，从不往里补；谁来保养这些资产，凭什么它只能提议不能自己动手改，这件事怎么落成一张能查的表。

## 材料清单（逐条注明来源、可支撑的节、真实性核验）

1. [真实项目案例] `harness/README.md` 全文（本仓库路径：`/Users/yedizhang/yedi-study/douyin-media/harness/README.md`）——铁律原文「只产报告,不自动改」「改 brain/ 账号大脑、改已发布线上资产,一律人审通过后才应用」；选题池入池/规则化清扫视同记账的例外条款。可支撑第 1、2、3、4 节（双线边界定义、铁律为什么、harness 骨架内容）。
2. [真实项目案例] `harness/tasks.md` 全文——五个启用任务（retro / benchmark-refresher / ideate / backlog-gardener / account-audit）+ 五个 TODO 任务，每个任务卡都有「产物与记账」「人审关注点」两栏，backlog-gardener 任务卡明确写「不翻状态——合并/剔除是判断性变更，人审后才应用」。可支撑第 3 节（harness/tasks.md 空壳的最终形态是什么样）、第 4 节（读写表怎么落表）。
3. [真实项目案例] `harness/report-template.md` 全文——治理执行记录报告的固定五段（任务/触发/目标、现状、发现、变更提议待勾选、盲区、落地记录待回填）。可支撑第 3 节 report-template 该长什么样。
4. [真实项目案例] `tools/console/packages/core/src/state.ts` 第 6-60 行——`TransitionSpec` 接口里 `line: 'production' | 'harness'` 字段，逐条迁移表标注每条状态迁移归哪条线；`published → retro_done` 唯一由治理线触发；`idea → expired`（规则化清扫）和 `idea → archived`（撞题剔除）都标 `line: 'harness'` 但记账方式不同（前者视同记账、后者需人审）。可支撑第 3 节「line 字段是唯一能让机器判定这笔账归哪条线的地方」这句判断的证据。
5. [真实项目案例] `harness/logs/2026-07-08-backlog-gardener.md` 真实报告——14 条选题两两核对撞题，两条存疑项标「建议人审复核」不自动合并，结论「全池 14 条 idea 干净，无需合并/剔除任何一条」。可支撑第 2 节反例段之后的正例：报告长什么样、盲区怎么写。
6. [真实项目案例] `harness/logs/index.jsonl` 最新四行真实记账——`account-audit` 2026-09-02 那条报「复盘逾期积压达 17 条」，`backlog-gardener` 同日报两组存疑撞题「待人裁」。可支撑第 5 节反哺大环地图（治理线的报告怎么攒起来、为什么第 22 课要专门讲复盘）。
7. [出处] `CLAUDE.md`「系统一句话（双线闭环）」与「流程纪律」两节（本仓库根目录）——「大环：发布→复盘拉数据→变更提议→人审→改 brain/→下轮选题打分」「受众平台信号只有复盘这一条来路（选题端不爬抖音）」「复盘只产变更提议，人审通过后才回写 brain/benchmarks.md（治理线铁律：只产报告，不自动改）」。可支撑第 2 节铁律的既有权威表述、第 5 节大环地图的三段划分依据。
8. [反例] 撰稿人自拟的传导链反例：如果治理线复盘任务自动改 `brain/benchmarks.md`，把某条打法标「失效」，下一轮选题打分会怎么把同赛道的题全部打低分，而这个误判的源头（单条视频播放量低可能是发布时间不巧）永远没人回头查。用真实存在的字段（`brain/benchmarks.md`、下一轮 `douyin-ideate` 打分维度 `practical/social/emotion/hook/timeliness/trigger`，见 `content/_backlog/backlog.yaml` 头部）搭这条链，不编数字。可支撑第 2 节核心论证。
9. [出处] 任务卡「2.1 大纲」块（本课材料清单第一项，路径 `V3/plan/cards/21.md`）——六节固定大纲、每节核心判断、交付物、学员此时手上有什么、交接点，逐字照抄进 outline.md。可支撑全篇结构骨架。
10. [出处] `V3/plan/handoff-ledger.md` 主表第 20、21 行——开篇必须逐字接的句子「生产线从取题到发布整条通了，可它只会消费资产：选题池会空，大脑不会自己长。谁来保养这些资产，按什么纪律改？」，结尾必须落在的句子「治理线的骨架和读写边界画好了，第一个治理任务是复盘。数据怎么拉、怎么归因、提议怎么写？」。可支撑开篇钩子与全篇收尾。
11. [出处] `V3/plan/inventory.md`「第 20 课结束时」一节——本课每条 Prompt 的输入必须卡在这张清单里：学员手上此刻有 `CLAUDE.md`、`pipeline/` 五份契约（含 `daily-run.md`）、`brain/` 四份填满 + `benchmarks.md` 留空、`content/_backlog/backlog.yaml` 头部、全量 `media` 命令（含 `media flip`/`media check`）、`douyin-publish` skill 一次 dry-run 到底的执行记录。没有 `harness/` 任何文件、没有对标复核或复盘的任何概念。可支撑每节「学员此时手上有」栏的核对，也是 Prompt 措辞的硬约束来源。

## 材料缺口
- benchmark-refresher、account-audit 两个任务卡的细节本课不深讲（属于第 22、24 课范围），只在第 3 节 harness/README.md 引用时点名任务清单出处，不展开任务卡内容，避免抢第 22、24 课的活。
- 反哺大环三段地图（第 5 节）里第 22、24 课具体讲什么，按任务卡「2.1 大纲」第 5 节原文的措辞复述，不额外发挥，避免和后续课程实际成稿对不上。
- v1-12 旧稿里的具体统计数字（6915 次播放、0.38 上升到 0.52 等）不使用，那是旧稿虚构口径，任务卡第 4 块材料清单明确标注「只当素材看口径，不能照搬其结论」，且违反零编造铁律。
