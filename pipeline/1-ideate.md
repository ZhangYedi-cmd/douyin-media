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
- 入池：`(新条目) → idea`；清扫：`idea → expired`
- promote（manual 模式人挑 / auto 模式自动 Top-N）：`idea → picked` + 回填 `content_path` + 建 `content/<日期>/<slug>/` 写 `1-brief.md`（meta status=`ideated`）→ 移交阶段 2
- 取题优先级由 `daily-run.md` 定义（`next_up` 指针 → 按 score）

## 节奏
每 2 天一轮（daily-run 依 `_research/` 最新报告日期判断是否先跑）；manual 为当前默认模式。
