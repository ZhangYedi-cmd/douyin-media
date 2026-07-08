# 治理任务注册表（harness-dispatcher 读）

> dispatcher 读下面的 yaml，对每个 `enabled` 任务评估其 `trigger`，到点的才跑。
> **触发感知**，不是无脑加权随机——见文档第四节为什么。
> 改任务只动这里，不改 dispatcher 代码（调度/执行解耦）。

## trigger 类型
- `post-publish-window`：对 `status=published` 且到点(发布后 24h/72h/7d)还没做该检查点的内容跑。事件触发。
- `periodic:<N>d`：距上次成功运行 ≥N 天就跑（读 `logs/index.jsonl` 算）。周期触发。
- `weighted-pool`（**预留，暂无任务用**）：一堆同质 per-item 维护债，按 `weight` 加权随机挑目标摊开跑。等 link-rot/stale-fact/cover 这类接入再启用。

```yaml
tasks:
  - task: retro
    skill: douyin-retro
    enabled: true
    trigger: post-publish-window
    windows: [24h, 72h, 7d]
    note: 对 published 且到点未复盘的内容跑

  - task: benchmark-refresher
    skill: benchmark-refresher
    enabled: true
    trigger: periodic:30d
    note: 复核 brain/benchmarks.md 对标/打法时效

  # ── 以下 TODO（默认 disabled）。接入时多为 weighted-pool ──
  - task: link-rot-checker
    enabled: false
    trigger: weighted-pool
    weight: 10
  - task: sop-doc-sync
    enabled: false
    trigger: weighted-pool
    weight: 10
  - task: backlog-gardener
    enabled: false
    trigger: weighted-pool
    weight: 8
  - task: retro-debt-collector
    enabled: false
    trigger: periodic:7d
  - task: stale-fact-auditor
    enabled: false
    trigger: weighted-pool
    weight: 4
  - task: cover-style-normalizer
    enabled: false
    trigger: weighted-pool
    weight: 4

  # 元层(框架),自己也是 periodic 任务。TODO:等 index.jsonl 攒够(每任务≥5~10条)再建。
  # 设计要点(2026-06-14 议定):
  #  · 触发感知调参——pool 调 weight、periodic 调间隔、事件任务只盯逾期积压(窗口不可调)
  #  · 指标:错误率/命中率/人采纳率/逾期积压;提议多但采纳低=任务跑偏,报告别瞎churn
  #  · 自调边界【待定】:可逆数值(weight/间隔在 min~max)可自动应用+记账;启停/大跳变只提议人审
  - task: account-audit
    enabled: false
    trigger: periodic:30d
    note: 读 logs/index.jsonl 统计→调治理线自身配置(见上注释);现无数据,缓建
```
