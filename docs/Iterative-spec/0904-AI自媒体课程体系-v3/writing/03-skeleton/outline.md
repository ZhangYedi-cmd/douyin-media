---
plan: fixed-from-card
length: standard
figures: none
sections: 5
---

本课大纲不走 Step 2/3 的方案生成与用户选定，直接展开任务卡 `plan/cards/03.md` §2.1 的大纲块。节的数目（5）与顺序照任务卡原样，未做局部调整——任务卡给出的记忆锚点、开篇契约、每节核心判断/交付物/交接点已经完整，没有需要改写或合并的地方。唯一的落笔选择是：第 5 节的验收 Prompt 按任务卡要求"复用第 01 课那条 Prompt 的变体"，具体变体内容以 `courses/01-一条内容的端到端走查.md` 第 94-107 行那条真实 Prompt 为底改写（只读 `CLAUDE.md` + `pipeline/` 五份 + `content/_template/`，输出改成流程表+停顿点清单），不虚构一条第 01 课没有的原文。

记忆锚点：骨架仓不是把文件堆起来，是把"谁能看懂谁"这件事从人脑挪到契约文件上——AI 只读契约就能复述流程，才算骨架立住了。

开篇契约（承接按 `plan/handoff-ledger.md` 第 03 行，因第 02 课 `final.md` 尚未落盘）：上一课交付了 `docs/00-toolchain.md` 和全绿自检输出，工具都装好了；本课输入是学员口述的目录切法和已装好的工具清单；本课产出一个能 `git init` 的骨架仓，含四件：目录树、`CLAUDE.md`、`pipeline/` 五份契约骨架、`content/` 模板与 `backlog.yaml` 头部。

## 1. 目录树设计：六个目录各管什么
核心判断: `pipeline/`、`content/`、`brain/`、`harness/`、`tools/`、`docs/` 六个目录各自只装一类东西，装混了后面每一课都要返工去分。
支撑材料: 仓库根目录树（git ls-files 形状）；`docs/` 只读历史存档这条约束见 CLAUDE.md「文档架构约定」
交付物: 六目录职责对照表（目录 / 装什么 / 谁来写 / 谁来读）
二级标题: none
收尾交接: 目录骨架定了，下一节把最外层的规则文件 CLAUDE.md 填出骨架。

## 2. CLAUDE.md：规格表而不是成品
核心判断: CLAUDE.md 的五节（系统一句话、干活前必读、内容红线、流程纪律、文档架构约定）要学员自己填空对着表回答，不是照抄一份现成范例，抄来的东西 AI 读不出你账号的判断。
支撑材料: CLAUDE.md 全文五节现成结构；反例来自"项目介绍式"空话不改变任何一次执行的判据
交付物: 规格表（五节各一行：这节回答什么问题 / 判据是什么，不给示例内容）+ 一条填表 Prompt
二级标题: none
收尾交接: 全局规则填完了，下一节把流程细节拆到 pipeline/ 五份契约里。

## 3. pipeline 五份阶段契约：骨架与审查点
核心判断: 每份契约只写输入 / 输出 / 状态翻转 / 闸口四项，操作细节住 skill 不住契约，同一条规则只许出现一次。
支撑材料: `pipeline/1-ideate.md`（22 行，开头写死不复述步骤）、`pipeline/2-create.md`（85 行，出审前终检闸 G 的 4-publish.md 时机教训）、`pipeline/3-review.md`（26 行）、`pipeline/4-publish.md`（28 行）、`pipeline/daily-run.md`（44 行，编排文件不算阶段契约）
交付物: 五份契约骨架各一份（骨架 = 固定小节标题 + 每节该填什么的审查点，不给全文内容）+ 一条生成 Prompt
二级标题: 分。3.1 选题与取题：1-ideate.md；3.2 创作：2-create.md（含出审前终检闸）；3.3 出审：3-review.md；3.4 发布：4-publish.md；3.5 编排入口：daily-run.md
收尾交接: 五份契约骨架立好了，下一节把 content/ 目录的模板和选题池头部也搭起来。

## 4. content 模板与 backlog.yaml 头部：骨架与审查点
核心判断: content/_template/ 的模板文件和 backlog.yaml 头部要按 pipeline/ 契约里定的产物名对齐字段，不能各写各的。
支撑材料: content/_template/ 全部 8 个文件（含 README.md 的谁产/何时产/必产对照表）；content/_backlog/backlog.yaml 头部注释与 README.md（单一真相源规则、next_up 指针）
交付物: content/_template/ 六份文件骨架清单（含 meta.yaml）+ backlog.yaml 头部骨架（审查点：字段名是否在 pipeline 契约里出现过）
二级标题: none
收尾交接: 骨架仓的四件东西都搭完了，最后验证 AI 能不能只读它们复述出你的流程。

## 5. 验证：让 AI 只读契约复述流程
核心判断: 复述结果和你的意图对不上，说明契约本身没写清楚，不是 AI 理解错了；这条 Prompt 就是骨架搭没搭对的验收动作。
支撑材料: 00-ADR.md §4 七阶段出口条件表（阶段 1 骨架的出口条件）；`courses/01-一条内容的端到端走查.md` 第 94-107 行的真实 Prompt 当变体底本
交付物: Prompt 块（复用第 01 课那条 Prompt 的变体：只读 CLAUDE.md + pipeline/ 五份 + content/_template/，复述五个动作和人出现点，不许读别的文件）
二级标题: none
收尾交接（本课做到了什么、还看不到什么、下一课补什么）: 骨架有了，AI 能读契约复述流程；但它不知道账号该做什么内容、用什么口气说话，这些判断依据还没地方写；下一课把账号大脑写下来。
结尾抛出的问题: 骨架有了，AI 能读你的契约复述流程。可它不知道你的账号该做什么内容、用什么口气说话。这些判断依据写在哪？
