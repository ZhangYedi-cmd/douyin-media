---
topic: 前端六页整站与联调（L3 六步的第 6 步：验证）
audience: 用 Claude Code / Cursor 的读者，没做过自动化流水线，读者手上没有参考仓库，只有前 27 课自己产出的东西
mode: new
series_context: 模块 7 控制台第三课（26 定契约 → 27 后端读写两条路径 → 28 本课：前端六页整站与联调），也是模块 7 的出口课
---

## 核心问题
六个页面怎么在同一套数据层骨架上落地，并且证明读写两条路径（快写 4 条、慢作业 3 条）都能在真实界面上走一遍。

## 材料清单

- [承接/上一课] 第 27 课成稿此刻不存在（与本课并发写），按 `plan/handoff-ledger.md` 第 27、28 行承接：第 27 课交付「读 API 全通（六个快照+file/asset/health+SSE）+ 写 API 全通（飞书回调也改走它了）」，本课开篇逐字接第 27 行结尾问题「读写两条 API 都通了。开始做界面，骨架和头两页怎么落设计稿？」，可支撑开篇段
- [任务卡] `plan/cards/28.md` 全文，含固定大纲「2.1」块，七节的核心判断、交付物、学员此时手上有什么、交接语，是本课骨架的第一真相源
- [inventory] `plan/inventory.md` 第 27 课结束时行：读者此刻手上有六个页面快照读接口、file/asset/health 接口、SSE 推送、快写 4 条、慢作业 3 条、`docs/design/` 九页原型 + theme.css（课程附带材料，本课按写作背景包指示改称课程附录路径）
- [参考课] `courses/16-验证与收敛.md`：施工记录五字段表写法（里程碑/出口条件/实际结果/卡在哪/怎么绕过去），本课收尾照此格式
- [参考课] `courses/25-无头作业-进程流归一与终局裁决.md`：cc-stream 里程碑事件与进度展示思路，本课第 6 节验证慢作业进度时引用其"落盘的文件状态才是真相源"判据
- [附录/课程材料] `appendix/design/` 六页原型（`overview.html` `detail.html` `backlog.html` `harness.html` `kanban.html` `metrics.html`）+ `css/theme.css`（606 行，token 契约）+ `README.md`（六页范围说明：本期实现六页，`review.html`/`harness-task-detail.html` 是下一期页面）——正文引用路径唯一出处
- [附录] `appendix/26-界面用语对照表.md`：状态词/表格列头/治理线触发方式/页面副标题/空态/动作按钮六张对照表，是界面文案唯一出处
- [card 27 接口清单] 六个快照接口（`GET /api/overview` `/api/contents` `/api/content/:slug` `/api/backlog` `/api/harness` `/api/metrics`）、`file`/`asset`/`health`、SSE；快写 4 条（`POST /api/actions/review|backlog-apply|promote|next-up`）；慢作业 3 条（`publish`/`rework`/`apply-proposal`，202+jobId）
- [参考仓库/实现，只作真实性校验，不当学员已有文件] `tools/console/packages/ui/src/lib/store.tsx`（`ConsoleProvider` + `usePageData<T>(url)` 页级快照 hook + `useRevision`/SSE 状态）、`lib/sse.ts`（`connectSse`，EventSource + revision 门卫）、`lib/theme.ts`（theme.css → antd `ThemeConfig` 映射表）、`app/AppShell.tsx`（5 项导航 + 健康灯 + SSE 状态 + 刷新按钮）、`pages/detail/decisionButtons.ts`（`computeDecisionButtons`，按 `allowedTransitions` 动态渲染按钮）、`pages/detail/DecisionPanel.tsx`（`buildPublishSummary` 确认发布摘要，不可撤销警示）
- [参考仓库/实现] `tools/console/packages/server/src/routes/read.ts`（六个快照+health）、`routes/files.ts`（file/asset）、`routes/actions.ts`（快写4条）、`routes/jobs.ts`（202+jobId，慢作业5条，本课只讲3条）、`sse.ts`+`store.ts`（revision 自增+broadcast）、`index.ts`（`serveStatic` 托管 `packages/ui/dist`，单端口出整站的真实实现）
- [参考仓库/core] `tools/console/packages/core/src/state.ts`：`META_TRANSITIONS`、`BACKLOG_TRANSITIONS`、`legalNext()`，供决策按钮"按 allowedTransitions 动态渲染"这条判断的真实出处，也用于状态值核对（本课要出现的状态词必须在这张表里）
- [反例] `appendix/26-界面用语对照表.md` 开头的起因说明：2026-08-19 真机走查判「文案与语义」3/10，根因是界面文案的作者是契约文档不是使用者，可支撑第 4 节"界面说人话不说系统话"

## 材料缺口
无。九条材料均可直接支撑正文论证，四件套（数据/权威/案例/反例）齐全：数字有 theme.css 606 行、5 项导航、202+jobId 格式；权威出处是任务卡与写作背景包铁律；案例是参考流水线真实文件路径；反例是界面用语对照表的走查记录。
