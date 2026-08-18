# docs/design —— 看板高保真原型（设计稿）

> 角色定位：**设计稿，不是前端代码**（见 `../Iterative-spec/0818-看板工作台/2026-08-18-看板前端技术方案.md` §5）。
> 真前端 = `tools/console/packages/ui/`（Vite + React + antd），像素规格、布局、语义色照本目录抄，代码不搬。

## 当前版（v2 · 2026-08-18，本目录顶层）

Open Design 产出（原始工程：Open Design 项目 `93ffb10d`），对齐「裁决台」升级后的产品形态。入口 `index.html`。

**本期实现范围（2026-08-18 拍板）= 六页**（overview / kanban / detail / backlog / harness / metrics，见 `../Iterative-spec/0818-看板工作台/03-前端执行方案.md`）；`review.html` 与 `harness-task-detail.html` 为**下一期**页面，本期其功能由 P1 待办 → P3 决策区 与 P5 注册表承接。

| 页面 | 说明 |
|---|---|
| `index.html` | 原型总览（导航入口） |
| `overview.html` | P1 总览：晨检 + 警报 + 分级待办 |
| `kanban.html` | P2 生产看板 |
| `detail.html` | P3 内容详情（审核视角，以 EP18 为例） |
| `review.html` | **审核台（v2 新增，下一期）**：队列 + 吸顶决策面板，对应看板审批发布能力 |
| `backlog.html` | P4 选题池 |
| `harness.html` | P5 治理线 |
| `harness-task-detail.html` | **治理任务详情（v2 新增，下一期）**：对应治理结论裁决入库能力（含「编辑配置」——实现前须先过写路径纪律，见执行方案 03 §4-Q1） |
| `metrics.html` | P6 数据复盘 |
| `css/theme.css` `js/app.js` | Neutral Modern 设计系统 token + 原型交互脚本（v2 更新版） |
| `critique.json` | 设计评审面板结果（总分 4.4：clarity 5 / hierarchy 4 / typography 4 / motion 4 / brand 5） |

v2 相对 v1 的变化：新增 review / harness-task-detail 两页（只读看板 → 裁决台）；detail 页改为「成片为主、决策为辅」；theme.css 与 app.js 有更新。
未收录：Open Design 工程内的 `*.artifact.json`（编辑器内部元数据）、两张未被页面引用的过程 PNG、与 `index.html` 内容重复的 `douyin-pipeline-console.html`。

## 历史版（`v1-20260711/`）

2026-07-11 首版六页原型，对应当时的只读看板 PRD（V1+V1.5，零写按钮）。仅存档，不再更新。
