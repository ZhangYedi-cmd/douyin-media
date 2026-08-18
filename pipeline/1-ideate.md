# 阶段 1 · 选题（契约）

> **执行细节全在 `douyin-ideate` skill**（抓取、双赛道 6 维打分、去重、过期清扫、报告格式），本文件只钉阶段契约，不复述步骤——两处各写一份必漂移。

## 输入
- `brain/`：positioning（支柱与 6:4 配比）、sources（信息源与关键词）、benchmarks（有效打法）
- `content/_backlog/backlog.yaml`（现存池，去重与清扫对象）

## 输出（唯一必产物 + 两个副产物）
- `backlog.yaml`：候选**全部**入池，`status: idea`，带 `tags`；过期清扫结果就地翻 `expired`
- `content/_research/research-<日期>.md`：调研报告（人读快照）
- `dashboard.md` 选题池小节：计数 + 最近报告链接

## 状态翻转
- 合法状态值与迁移规则见 `media flip --help`（唯一定义 = `core/state.ts`）；入池/清扫经 `media backlog add` / `media backlog sweep`。
- promote（manual 模式人挑 / auto 模式自动 Top-N）：`media promote` 回填 `content_path` + 建 `content/<日期>/<slug>/` 写 `1-brief.md` → 移交阶段 2
- 取题优先级由 `daily-run.md` 定义（`next_up` 指针 → 按 score）

## 节奏与归属（2026-07-08 起）
- **调研+入池+清扫归治理线**：`harness/tasks.md` 的 ideate 任务驱动，periodic:2d（到点判据 = `_research/` 最新报告日期）。过渡期 daily-run 保留兜底（见 `daily-run.md` 当前模式节）。
- **promote 取题归生产线**：daily-run 执行（`next_up` 指针 → 按 score）。
- manual 为当前默认模式（人挑题即人闸）。
