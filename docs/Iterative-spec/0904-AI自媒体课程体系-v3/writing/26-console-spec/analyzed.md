---
topic: 第 26 课《读设计稿，定契约》——用 SPEC 六步的前四步给控制台定边界
audience: 用 Claude Code/Cursor 跟 AI 协作、没做过自动化流水线的学员；第 25 课结束，手上有 media CLI（core+cli 两包）、cc-stream 包、裁决函数、收尾策略，但没有任何可视化界面
mode: new
series_context: 全书 29 课第 26 课，模块 7（控制台）第一课；L3 教法，SPEC 六步只做 1-4 步（调研/讨论选型/决策/写 SPEC），第 27 课接执行、第 28 课接前端整站
---

## 核心问题
拿到九页高保真原型和 theme.css 之后，怎么用 SPEC 六步的前四步把「照着原型抄哪些、控制台边界在哪里、读写两条路径怎么切」定成三份能直接施工的文档，而不是把原型当代码抄。

## 材料清单

- [事实] 第 25 课成稿开篇与结尾原句，用于开篇承接。开篇：「第 24 课交付了一份任务注册表、四个治理 skill……」；结尾：「整条流水线能无人值守跑完了，可你只能靠翻文件和日志知道它跑到哪。第三件重活：给它做个能看的控制台。」来源 `courses/25-无头作业-进程流归一与终局裁决.md` 第 5 段与末段。支撑本课开篇的记忆锚点承接。
- [材料] 附录设计稿 `V3/appendix/design/`：九个 HTML（index / overview / kanban / detail / backlog / harness / metrics / review / harness-task-detail）+ `css/theme.css`（606 行，Neutral Modern 设计系统，token 如 `--bg`、`--surface`、`--fg`、`--accent`、`--success`/`--warn`/`--danger`、`--space-N`、`--text-N`）+ `js/app.js`（141 行）+ `README.md`（写明本期实现范围六页：overview/kanban/detail/backlog/harness/metrics；review 与 harness-task-detail 是下一期）。支撑第 1 节「六页范围」判断与第 3 节 ADR-4 前端 token 映射。
- [材料] `V3/appendix/26-界面用语对照表.md`：状态词唯一出处、表格列头、动作按钮的中文文案对照表。支撑「原型是给人看的，规格是给 AI 施工的」这条记忆锚点——原型上的字面文案不能直接照抄进 API 字段名。
- [事实] `inventory.md`「第 25 课结束时」一行：学员手上有 core 包三件（parsers/state/writer）、`media` 全部读命令+`publish-done`+`promote`+全量写命令、`cc-stream` 包（六个文件）、裁决函数+收尾策略实现、六步模板四件套、`docs/spec/media/`、`docs/spec/feishu-gate/` 六份文档。支撑「本课每条 Prompt 输入必须是学员已有的东西」这条硬约束的核对。
- [参考] `docs/Iterative-spec/0818-看板工作台/00-执行版总览.md`：五包一仓边界（`core`/`cli`/`cc-stream`/`server`/`ui`）、写路径纪律（`media` 是唯一写入口，server 禁止 import writer.ts）、API 契约（读六个快照+file/asset/health+SSE，写快写四条+慢作业三条 202+jobId）、执行方案四节模板。这是参考流水线自己的拍板，不是学员的文件，只能转述为「参考流水线当时这么拍」。支撑第 3、4 节 ADR 与执行方案的具体决策内容。
- [参考+反例] `docs/Iterative-spec/0818-看板工作台/02-后端执行方案.md`：单端口 5170 合并部署（serveStatic 托管 ui/dist，非 /api/* 路径回退 index.html）；SSE 断线恢复靠 revision 比对重拉，明确「不做事件补发队列」；store 全量重建 <100ms，10 分钟 tick 直接复用同一条 rebuild 路径，不做「只重算 alerts」的特殊分支（即选了全量重建，否了增量重建）。支撑第 1 节调研对比表四行里的部署形态、数据同步方式、SSE 断线恢复三行。
- [参考+反例] `docs/Iterative-spec/0818-看板工作台/2026-08-18-看板前端技术方案.md` F1/F3/F4：推翻早前「不上组件库」的建议，选 antd，理由是原型手写最重的地方（表格排序筛选行展开、job 里程碑步骤条、dry-run 确认弹窗）正是组件库的用武之地；视觉冲突解法是 token 映射进 antd ConfigProvider，不是原型迁就 antd 默认蓝，也不是维护两套视觉系统。支撑第 1 节调研对比表第四行前端技术栈，以及第 3 节 ADR-4。
- [出处] `V3/plan/spec-lesson-standard.md`：六步节名固定、调研节对比表固定列（方案/适用前提/代价/已知失败模式）、讨论选型节辩护式 Prompt 固定形状、决策节 ADR 固定四项（决策/理由/被否方案/反悔成本）、写 SPEC 节执行方案固定四节模板、出口条件写法。第 11 课钉死，本课只引用。支撑全文格式骨架。
- [案例] `courses/13-media写SPEC.md`、`courses/18-飞书通道SPEC.md`：两次已定稿的 L3 前四步实战，分别是命令粒度和决策点粒度的写法范例。支撑本课行文节奏和 Prompt 措辞的口径对齐（如「四件套」「一句能跑的验证动作」等表述习惯）。
- [事实] `V3/plan/cards/27.md`「2.1 大纲」第 4、5 节：快写四条端点与背后命令的精确映射（`POST /api/actions/review`→`media flip`、`backlog-apply`→`media backlog apply`、`promote`→`media promote`、`next-up`→`media next-up set`）；慢作业三类（`publish`、`rework`、`apply-proposal`，另有 `harness-run`、`create` 不在本轮范围）。支撑本课第 3 节 ADR-2、第 4 节执行方案里两条写路径的表述必须和下一课保持同一口径。
- [事实] `V3/plan/handoff-ledger.md` 第 26 行：结尾要抛出的问题预期是「契约定完，五包一仓边界和 API 清单有了。先把读路径打通，页面才有东西可显示。」支撑收尾落地时逐字核对。
- [反例/边界] 仓库真实结构 `tools/console/packages/{core,server,ui}/src` 文件列表：`core` 已有 `snapshot.ts`、`dashboard.ts`、`state.ts` 等；`server`、`ui` 是这门课要新画边界、但学员还没写代码的两个包。支撑第 3 节 ADR-1 里「哪些是已有的、哪些是新的」这条要求。

## 材料缺口
无实质缺口，八条材料均可直接支撑四步正文；`00818` 系列方案全部标记为「参考流水线」转述，不作为学员输入出现在任何 Prompt 里。
