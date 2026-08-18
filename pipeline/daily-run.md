# 工作日全自动编排（入口 Prompt）

> 定时 agent 读这个文件执行。串起 取题→创作→出审，**停在人审**。

## 当前模式 ★ 双赛道选题驱动（2026-07-08 起，人已授权切换）
- **每天产出 1 条**，深度:流量 ≈ 6:4（滚动配比，不必每日精确；见 `brain/positioning.md`）。
- **取题优先级**：backlog 顶部 `next_up` 指针（人钦点）→ 无则 `status: idea` 中按 score 取最高（同分先 depth）。
- **池子保鲜已归治理线**（2026-07-08 起：`harness/tasks.md` 的 ideate 任务，periodic:2d，治理线养池子、生产线消费池子）。**过渡期兜底**：治理线定时验稳前，取题时若 `content/_research/` 最新报告距今 ≥2 天，仍先跑一轮 `douyin-ideate`（manual）再取题——判断幂等（谁先跑谁更新报告日期，另一边自动跳过），治理线跑稳后由人摘除本兜底。
- 历史：2026-06-15~06-29 为「清系列日更」模式，EP02→EP15 已全部发布收官（过程见 `logs/`）。

## 执行步骤
1. 读 `brain/` 全部 + `CLAUDE.md`。
2. **取题**：
   ```
   media next --json
   ```
   绝对路径兜底（无全局 PATH 时）：`node /Users/yedizhang/yedi-study/douyin-media/tools/console/packages/cli/dist/index.js next --json`
   - `decision` 非 `empty` → 拿到 `id`（取题优先级——next_up 指针优先、否则 score 最高同分先 depth——已内置在命令里，不重复手判）。
   - `decision=empty`（池中无 idea）→ **停产 + 按「阻塞即上报」推飞书**，不硬造题。
   记账（backlog `idea→picked` + 回填 `content_path` + `next_up` 清空 + 建目录 + 写 meta 五处一次改齐）：
   ```
   media promote <id> --slug <slug> [--date <YYYY-MM-DD>]
   ```
   （或 `media promote --auto --slug <slug>` 一步做完取题+记账，同一套取题规则）；slug 命名是判断活，agent 定（kebab-case）。promote 完成后据 backlog 条目内容写 `1-brief.md` 喂下一步（系列条目则用其 `plan_file` 当 brief）。
3. **创作**：按 `pipeline/2-create.md` 从 `plan_file`（脚本+源码导读）出口播成品；含 `dubbing-reviewer` 配音质检循环，过创作自检。
4. **出审**：`media flip <slug> review`（一条命令完成记账，dashboard 机器区自动刷新；`media` 不可见时兜底 `node tools/console/packages/cli/dist/index.js flip <slug> review`），经 **`feishu-notify`** 推审核卡（见 `pipeline/3-review.md`）。前提：`pipeline/2-create.md` 成片终检闸 A–G 全过（G = ★出审前必产 `4-publish.md`，规则细节以那里为准，教训 L5/L6）。
5. **不发布**：到此停。等人在飞书点过/打回。

## 阻塞即上报（铁律）
凡导致**当日无产出或流程挂起**的事件——取题空、TTS 余额 1008、录制失败超重试、审批通道故障等——
一律经 `feishu-notify` 能力三推文本通知给人（写清：事件 / 根因 / 需要人做什么），同时写运行日志。
**只写本地日志不算上报**（教训：2026-06-30~07-05 连续 6 天空跑，日志喊人 6 天没人看见）。

## 产出
- 当日 1 个内容目录（status=review）；或停产时一条飞书阻塞通知 + 日志
- 更新后的 `dashboard.md`
- 运行日志写入 `pipeline/logs/<日期>.md`

## 参数
- 模式：**双赛道选题驱动**（每日 1 条，深度:流量 ≈ 6:4 滚动配比）
- 取题：`next_up` 指针优先，无则按 score；池子保鲜归治理线（过渡期兜底见「当前模式」节）
- 触发：工作日定时 agent（prompt 在 `~/.claude/scheduled-tasks/douyin-ai/SKILL.md`，读本文件执行）；休息日不触发，人工按需
- 用到的 skill：见各 `pipeline/*.md`（创作四件套 + dubbing-reviewer 质检）
- 治理线（复盘/巡检/选题池保鲜与理池）**不在本表**：时间驱动、独立调度，见 `harness/`
