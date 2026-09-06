---
name: backlog-gardener
description: 治理线任务——理选题池的「撞题」维度：扫 content/_backlog/backlog.yaml 里 status:idea 条目的池内互撞与「与已发布重复」，产合并/剔除提议报告，人审后才应用，绝不直接翻状态。过期清扫不归它（那在 douyin-ideate Step 2.0）。触发：理池、撞题排查、选题池去重、backlog-gardener，或 harness-dispatcher 周期派活（periodic:7d）。
---

# backlog-gardener · 理池（撞题与重复）

> 属治理线（`harness/`），任务卡见 `harness/tasks.md`。硬约束：**只产提议报告，不翻任何状态**——
> 合并/剔除是判断性变更，人审通过后经 `media backlog apply` 落地（提议报告路径随之写进条目注释可溯源）。

## 职责边界
- 只管两类撞：`status: idea` 条目**池内互撞**、idea 条目**与已发布内容重复**。
- 不做过期清扫（douyin-ideate Step 2.0 的事）、不 promote、不打分、不补新题。

## 流程
1. 读 `content/_backlog/backlog.yaml` 全池，取 `status: idea` 条目为待查集；`published` 条目为比对集（expired 条目也参与比对，防复活重复题）。
2. **判同题**：按每条 `tags` 归一化比对（大小写/中英同义归一，如 GPT-5.6 与 gpt5.6）：
   - tags 交集 ≥2 个，或标题指向同一事件/同一仓库 → 疑似撞题。
   - 与已发布重复：命中发布 ≤30 天的已发布主题 = 撞；>30 天的注明"可做新角度，需差异化"不算硬撞。
   - 无 tags 的条目退化为标题+链接比对。
3. **产提议**，每组疑似撞题一条：
   - 池内互撞 → 建议留分高者（同分先 depth），被并条目建议 `idea → archived` 并把 tags 并入保留条目。
   - 与已发布撞 → 建议 `idea → rejected`，注明撞了哪条已发布。
   - 拿不准的标「存疑」，写清两种理解让人裁。
4. 写报告落 `harness/logs/<今天>-backlog-gardener.md`（格式按 `harness/report-template.md`：现状/发现/变更提议/盲区）；无撞题也要写（记"全池干净"，这是有效结论）。
5. 到此停。**不改 backlog.yaml**。人审通过后的应用动作走：
   ```
   media backlog apply <id> --action merge|archive [--into <id2>] --proposal <本报告路径>
   ```
   （`--into` merge 必填；绝对路径兜底：`node /Users/yedizhang/yedi-study/douyin-media/tools/console/packages/cli/dist/index.js backlog apply ...`）——提议报告路径由命令写进被处置条目注释，逐条可溯源。

## 产物
- `harness/logs/<date>-backlog-gardener.md` 提议报告（唯一产物）。
- 由 dispatcher 调用时，dispatcher 负责 append `logs/index.jsonl` 记账（`applied:false`）。
