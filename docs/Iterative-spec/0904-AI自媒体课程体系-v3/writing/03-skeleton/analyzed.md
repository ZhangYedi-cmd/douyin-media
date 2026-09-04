---
topic: 第 03 课 · 立骨架：仓库、目录、契约
audience: 会用 Claude Code、没做过自动化流水线、手上没有参考仓库，只有第 01、02 课自己做出来的东西
mode: new
series_context: 全书 29 课，模块 0 起步第 3 课，L2 教法档，紧接第 02 课（装备）、承接第 04 课（账号大脑）
---

## 核心问题

一条自动化内容流水线该怎么切目录、写总纲、写阶段契约，才能让 AI 只读文件就复述出正确的流程，而不用学员每次口头补前提。

## 材料清单

- [文档] `pipeline/1-ideate.md` 全文（22 行）：选题阶段契约实例，开头就写死"执行细节全在 skill，本文件只钉阶段契约，不复述步骤，两处各写一份必漂移"。可支撑第 3 节"契约只写四项、操作细节住 skill"。
- [文档] `pipeline/2-create.md` 全文（85 行）：创作阶段契约实例，全仓最长的一份，含分支 A/B、出审前终检闸 A-G、用到的 skill 清单。可支撑第 3 节"契约体量参考"与终检闸 G（`4-publish.md` 字段时机）这条真实教训。
- [文档] `pipeline/3-review.md`（26 行）、`pipeline/4-publish.md`（28 行）、`pipeline/daily-run.md`（44 行）：其余三份契约与编排文件，可支撑第 3 节"五份契约"逐份展开、以及"daily-run 不是阶段契约，不套四件事那把尺子"。
- [文档] `CLAUDE.md` 全文：五节现成结构（系统一句话、干活前必读、内容红线、流程纪律、文档架构约定），可支撑第 2 节的规格表设计，每一节都能提炼出"回答什么问题、判据是什么"。
- [文档] `content/_backlog/backlog.yaml` 头部注释 + `content/_backlog/README.md`：单一真相源规则、状态分两层、`next_up` 指针字段说明，可支撑第 4 节的选题池头部骨架。
- [文档] `content/_template/` 全部 8 个文件（`1-brief.md`、`2-script.md`、`3-review.md`、`4-publish.md`、`5-retro.md`、`meta.yaml`、`README.md`、`assets/`）：六份内容文件模板 + `README.md` 的"谁产/何时产/必产吗"对照表，可直接支撑第 4 节的模板骨架清单。
- [文档] 仓库根目录树（`git ls-files` 形状）：`pipeline/`、`content/`、`brain/`、`harness/`、`tools/`、`docs/`、`CLAUDE.md` 六目录一文件的实际布局，可支撑第 1 节的目录职责表。
- [文档] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/00-ADR.md` §4 课程大纲：模块 0 第 03 课行、七阶段出口条件表（阶段 1 骨架的出口条件正是"让 AI 只读契约复述流程，复述结果和意图对得上"），可支撑第 5 节的验收动作定位。
- [文档] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/old-courses/mini-v3-03.md`：另一台机器写过的同课成稿，含完整 final.md 与 polish-report.md，只当口径参考（体量、Prompt 收束方式、五节结构），不抄原句原例。
- [代码] `tools/console/packages/core/src/state.ts`：合法状态值唯一定义（meta 八态：`ideated/drafting/review/approved/scheduled/published/rejected/retro_done`；backlog 六态：`idea/picked/published/expired/rejected/archived`）。可支撑正文引用"见 `media flip --help`"时不编造状态名。
- [文档] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/inventory.md` 第 02、03 课两节：第 02 课结束学员手上只有 `docs/00-toolchain.md`；第 03 课结束学员手上多出目录骨架、`CLAUDE.md`、五份契约、`content/_template`、`backlog.yaml` 头部。用来核每条 Prompt 的输入是否在学员手上已有的范围内。

材料共 11 条，超过 5 条阈值，进入下一步。

## 材料缺口与处理

- 第 02 课成稿 `courses/02-装备-开源件与自检基线.md` 尚未落盘（`writing/02-toolchain/` 下只有 `analyzed.md`/`outline.md`/`draft.md`，无 `final.md`）。承接第一真相源缺失，按写作背景包 §6 与任务卡 §5 的规则：以 `plan/handoff-ledger.md` 第 03 行的"上一课产出 / 本课开头要接的点 / 结尾抛出的问题"三行为准写开篇与结尾，回复里标注"承接按台账"。
- `media`、`media flip`、`media promote` 等命令此刻在仓库里还不存在（第 12-16 课才造）。正文引用时必须就地注明"这条命令现在还不存在，在那之前状态靠手改 `meta.yaml`"，不能让学员以为现在就能跑。
- `docs/00-walkthrough.md`（第 01 课产物）不在本课材料清单内，任务卡也没有要求本课引用它的具体内容，只在"验证"一节提"验收动作直接复用第 01 课那个 Prompt"。核过 `courses/01-一条内容的端到端走查.md`（已存在）确认第 01 课那条 Prompt 的实际问法，避免像 mini-v3-03.md 诊断出的那处事实错误（误说某 Prompt 在第 01 课出现过原文）。
