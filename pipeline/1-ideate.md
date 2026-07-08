# 阶段 1 · 选题

## 目标
产出排序选题报告，把候选**全部**写进选题池（`backlog.yaml`，`status: idea`）。是否自动 promote 成 brief 取决于 ideate 模式（见下）。

> 本文件是阶段说明；**实际执行与口径以 `douyin-ideate` skill 为准**（打分、产物、状态名都在 skill 里钉死，本文件不另立一套）。

## 输入
- `brain/positioning.md`（支柱与比例）
- `brain/sources.md`（信息源）
- `brain/benchmarks.md`（有效打法）

## 步骤
1. 扫热点：按 `sources.md` 抓取流量热点源（新模型/新闻/热议）。
2. 找深度：从 GitHub Trending / 论文 / 待拆清单里挑可沉淀选题。
3. 打分排序：按 skill 的双赛道 6 维（见下）。
4. **候选全部**追加进 `content/_backlog/backlog.yaml`（`status: idea`，带 `tags` 去重）。
5. 写报告 `content/_research/research-<日期>.md`，更新 `dashboard.md` 选题池小节。
6. promote 分两种模式：
   - **manual（默认）**：到此停，人读报告挑题。被挑中的才 promote。
   - **auto（后期翻开关）**：自动挑 Top-N promote。
   promote 动作 = backlog 该条 `status: idea→picked` + 回填 `content_path` + 从 `content/_template/` 建 `content/<发布日>/<slug>/` + 写 `1-brief.md`（`meta.yaml` status=`ideated`）→ 移交创作。

## 打分维度
**不在本文件另立维度**。统一用 `douyin-ideate/references/scoring.md` 的**双赛道 6 维**：
`practical 实用 / social 社交 / emotion 惊奇 / hook 完播 / timeliness 时效 / trigger 触发`（各 1–5），depth/traffic 两套权重，≥4.0=S。形式（口播/图文）也由 scoring.md 的规则判。

## 产出格式
- 选题池条目：`backlog.yaml`，`status: idea`（唯一必产物）。
- promote 后才有：`content/<日期>/<slug>/1-brief.md`（见 `content/_template/`），其 `meta.yaml` status=`ideated`。

## 用到的 skill
**`douyin-ideate`**（`.claude/skills/douyin-ideate/`）——本阶段的执行技能。
- 抓素材：`agent-reach`（唯一情报源；抖音平台反爬重、无法无人爬，平台侧信号由 `douyin-retro` 复盘反向补）
- 打分：`references/scoring.md`（双赛道 6 维）
- 产物：`content/_research/报告` + `content/_backlog/backlog.yaml`
- 模式：manual（出报告人挑）/ auto（自己挑 Top-N 推进），开关后期翻