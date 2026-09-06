---
name: account-audit
description: 治理线的自审元层——读 harness/logs/index.jsonl 运行账本，统计每任务执行数/成功率/人采纳率/逾期积压，按 tasks.md 任务卡钉死的自调边界回调治理线自身配置（可逆数值自动、启停与大跳变提议人审）；单任务记录不足 5 条只出「样本不足」心跳报告。触发：治理线自审、调权、audit、账本分析，或 harness-dispatcher 周期派活（periodic:30d）。
---

# account-audit · 治理线自审（元层）

> 审的是**治理线自己**，不碰 brain/、不碰内容、不碰生产线。
> 自调边界、限幅表、调整规则的**唯一出处 = `harness/tasks.md` 本任务的任务卡**，本文件不复述数值。

## 开工前必读
1. `harness/tasks.md` 本任务的任务卡（边界表 + 调整规则 + 采纳率口径）。
2. `harness/logs/index.jsonl`（输入账本）；抽样读对应报告核对 findings 与 applied。

## 流程
1. **解析账本**：index.jsonl 按 task 分组，统计执行数、成功率、findings 总数、采纳率（口径见任务卡：只算落盘 ≥7 天的报告）、retro 逾期积压（扫 meta.yaml published>7d 非 retro_done 计数）。
2. **熄火检查**：有效记录 <5 条的任务只进报告标「样本不足」，跳过调参。
3. **产调整**，逐条对照任务卡的边界表与调整规则：
   - **自动档**（范围内的可逆数值）：直接改 `harness/tasks.md` yaml 对应字段，报告里记 旧值→新值+依据（哪几行账本）；改动留在 git 工作区供人 diff 复核。
   - **提议档**（启停 / 锁定参数 / 超步长 / 修任务卡措辞）：只写进报告等人审，不动文件。
4. **写报告** `harness/logs/<今天>-account-audit.md`（report-template 格式）：各任务指标表、样本状态、自动档改动清单、提议档清单、盲区。全任务样本不足时这就是心跳报告，照写。
5. 到此停。由 dispatcher 记账 index.jsonl（本任务自己的执行也是一行账）。

## 红线
- 只动 `harness/tasks.md` 的 yaml 数值字段，且必须在任务卡边界表范围内；任务卡文字、其它文件一概不碰。
- 不因"样本不足"空转出建议——没数据就说没数据。
