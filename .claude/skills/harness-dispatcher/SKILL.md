---
name: harness-dispatcher
description: 熵增治理线的调度器(框架层)。定时或手动触发时,读 harness/tasks.md 注册表,对每个启用任务评估触发条件(事件窗口/周期/加权池),把到点的任务派给对应执行 skill(douyin-retro / benchmark-refresher / …),收回「执行记录报告」,把摘要 append 进 logs/index.jsonl。调度与执行解耦:加治理任务只改 tasks.md,不动本 skill。触发:跑治理、巡检一轮、harness、治理调度、dispatcher、该做哪些治理了。
---

# harness-dispatcher · 治理线调度器

> 治理线五层里的「调度层」。一句话:**查 `tasks.md` 谁到点了,派给它的执行 skill 跑,记一笔账。**
> 它本身**不干治理活、不碰 brain/线上**——只决定"跑谁",活和铁律(只产报告、人审后应用)在各执行 skill 里。

## 干活前必读
1. `harness/README.md`(治理线宪法 + 铁律)。
2. `harness/tasks.md`(任务注册表 + trigger 类型说明)。
3. `harness/logs/index.jsonl`(历史运行,算"周期到没到""窗口做没做"靠它)。

## 流程
1. **读注册表**:解析 `tasks.md` 的 yaml,取 `enabled: true` 的任务。
2. **逐任务评估 trigger**(到点才跑):
   - `post-publish-window`：扫 `content/*/meta.yaml`,挑 `status: published` 且 `timestamps.published` 落在某窗口(24h/72h/7d ± 容差)、而该窗口尚未在 index.jsonl 留过该任务记录的内容 → 这些是目标。
   - `periodic:<N>d`：从 index.jsonl 找该任务上次成功运行时间,距今 ≥N 天(或从没跑过)→ 到点。
   - `weighted-pool`：(暂无启用任务)按 `weight` 加权随机从候选目标里挑 1~K 个,摊开跑。
3. **派活**:对到点的任务,用 Skill 工具调它的执行 skill(`skill` 字段),把目标(哪条内容 / benchmarks)作为参数传进去。一次调度可跑多个任务/多个目标。
4. **收报告**:执行 skill 产出「执行记录报告」(`report-template.md` 格式)落 `logs/<date>-<task>.md`。
5. **记账**:每个 (任务,目标) append 一行到 `logs/index.jsonl`:
   ```json
   {"ts":"<ISO>","task":"retro","target":"2026-06-20/cc-source","window":"72h","result":"report","report":"logs/2026-06-20-retro.md","findings":<n>,"applied":false}
   ```
   `applied:false` = 仅出报告待人审(治理铁律);人审应用后由人/审计把它翻 true。
6. **汇报**:跟用户说这轮跑了哪些任务、产了哪些报告待审、哪些没到点跳过。**不替人审、不应用变更**。

## 红线 / 边界
- **只调度,不治理**:不直接改 `brain/`、不改线上、不替执行 skill 干活。
- **到点才跑**:没到触发条件的任务跳过并说明(别为跑而跑,违治理线"可延迟"本性)。
- **解耦**:新增/改任务 = 改 `tasks.md`;新增任务类型 = 在执行 skill 侧实现 + tasks.md 注册。dispatcher 逻辑稳定。
- **加权随机不滥用**:只有 `weighted-pool` 任务才随机;事件/周期任务严格按条件,不随机延迟(否则错过复盘窗口)。

## 触发方式
定时(人在 Claude Code 客户端配)或手动 `/harness-dispatcher`,细则以 `harness/README.md` 触发节为准。

## 配套(框架层,后续)
- `account-audit`(元层,待建):读 `logs/index.jsonl` 统计成功率 → 回调 `tasks.md` 的 `weight`/启停。dispatcher 跑出的 index.jsonl 就是它的输入。

## 依赖
| 依赖 | 用途 | 必须 |
|---|---|---|
| tasks.md / logs/index.jsonl | 注册表 + 运行历史 | 是 |
| 各执行 skill（douyin-retro / benchmark-refresher / …） | 真正干治理活 | 是 |
| content/*/meta.yaml | 评估 post-publish-window 触发 | 事件任务需要 |
