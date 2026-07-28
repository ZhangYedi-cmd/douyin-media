# 治理执行记录 · account-audit · 2026-07-08

## 任务 / 触发 / 目标
- 任务：account-audit（治理线自审元层）
- 触发：harness-dispatcher 调度（periodic:30d，index.jsonl 无历史记录，首次执行）
- 目标对象：`harness/logs/index.jsonl` 全量（12 条，均为 2026-07-08 当天批量补跑，历史跨度 0 天）+ 本轮相关报告抽样

## 现状（查了什么、用什么查）
- 账本按 task 分组统计：`benchmark-refresher` 1 条、`retro` 10 条（覆盖 6 部内容 8 个窗口检查点）、`backlog-gardener` 1 条、`ideate` 0 条（账本不记，判据是 `content/_research/` 报告日期）、`account-audit` 0 条（本次是首条）。
- 额外核验：扫 `content/*/*/meta.yaml`，`status: published` 且 `retro_done` 为空的条目数（= retro 逾期积压）。

## 发现（逐条，每条带证据）

| 任务 | 有效记录数 | 判定 | 证据 |
|---|---|---|---|
| benchmark-refresher | 1 | ⚠样本不足（熄火线 <5），只出心跳，不调参 | index.jsonl 仅 1 条（2026-06-28），间隔参数（30d）本轮不评估 |
| backlog-gardener | 1 | ⚠样本不足（熄火线 <5），只出心跳，不调参 | index.jsonl 仅 1 条（今日首跑，findings=0）；虽是"零发现"但调整规则要求**连续2轮**才够格放宽间隔，本轮只有1轮，不触发 |
| ideate | 0（账本不记该任务） | — 不适用 | 判据是 `content/_research/` 报告日期，非 index.jsonl；且间隔参数(2d)本身**锁定**，账本样本量与本任务无关 |
| retro | 10（窗口检查点） | ⚠窗口参数**锁定**，无可调数值；但**触发独立报警项** | 见下方"retro 逾期积压"单独一行 |
| retro 逾期积压 | — | 🔴**报警：6 条 > 阈值 3 条** | `status: published` 且 `retro_done` 为空：ep02(20.6d)/ep03(18.7d)/ep05(17.6d)/ep07(15.6d)/ep08(14.6d)/ep09(13.6d)，全部超「严重逾期>7天」线，按 retro 任务卡规则该任务明确不处理这些，**结构性不会自愈**——依据任务卡「retro 逾期积压 >3 条→报警并建议接 retro-debt-collector」 |
| account-audit 自身 | 0（本次是首条） | ⚠样本不足，本轮不评估自身调参 | 首次运行 |

## 变更提议（给人审勾选；不自动改）
- [ ] 🔴**优先接入 `retro-debt-collector`**（当前 disabled）——依据：retro 逾期积压 6 条已超任务卡阈值(3条)，且结构性存在（enabled 的 retro 任务规则上明确排除>7天严重逾期项，这 6 条不会随时间自动补上）——可逆：是（新增执行 skill + 翻 enabled，任务卡已是现成接入规格）
- [ ] 无 benchmark-refresher / backlog-gardener 间隔调整提议（样本不足，等下次积累到 ≥5 条有效记录再评估）

## 本轮自动档改动
- **无**。所有任务均未达到可调参的样本门槛（benchmark-refresher/backlog-gardener 各仅1条 <5；ideate/retro 窗口本身锁定不可调）。`harness/tasks.md` 未做任何数值改动，本报告为心跳性质。

## 盲区 / 未决（机器查不了，需人工）
- 采纳率口径（落盘≥7天的报告）本轮唯一满足"≥7天"的是 2026-06-28 的 benchmark-refresher/retro 报告，但样本仍 <5，不足以判断"是否人采纳"的整体趋势，只能观察到 `brain/benchmarks.md`「自己的有效打法」表当前仍是占位符（待积累），即06-28的提议目前尚未被人应用——不构成"采纳率低"的结论（样本不足，不能定性）。
- retro-debt-collector 一旦接入，会让 retro 的执行量陡增（6条历史债一次性追平），建议人审时一并考虑是否要分批补做而非一次性全跑（避免创作者中心 API/cookie 压力，及报告可读性）。

## 落地记录（人审后回填）
- 批准：<勾选了哪些提议> · 审核人：<> · 时间：<> · 已应用到：<文件>
