# 工作日全自动编排（入口 Prompt）

> 定时 agent 读这个文件执行。串起 取题→创作→出审，**停在人审**。

## 当前模式 ★ 双赛道选题驱动（2026-07-08 起，人已授权切换）
- **每天产出 1 条**，深度:流量 ≈ 6:4（滚动配比，不必每日精确；见 `brain/positioning.md`）。
- **取题优先级**：backlog 顶部 `next_up` 指针（人钦点）→ 无则 `status: idea` 中按 score 取最高（同分先 depth）。
- **池子保鲜**：距上次调研 ≥2 天（看 `content/_research/` 最新报告日期）→ 当日先跑一轮 `douyin-ideate`（manual 模式，含过期清扫）再取题。
- 历史：2026-06-15~06-29 为「清系列日更」模式，EP02→EP15 已全部发布收官（过程见 `logs/`）。

## 执行步骤
1. 读 `brain/` 全部 + `CLAUDE.md`。
2. **取题**：读 `content/_backlog/backlog.yaml`：
   - 顶部 `next_up:` 非空 → 取该 id（最高优先）；promote 后把 `next_up` 置回 `null`。
   - 否则在 `status: idea` 中按 score 最高取一条（同分先 depth；`expired` 不取）。
   - 无题可取 → **停产 + 按「阻塞即上报」推飞书**，不硬造题。
   promote：该条 `status: idea→picked`、回填 `content_path: content/<今天>/<slug>/`，建该目录、`meta.yaml` 写 `source: <backlog id>`，据 backlog 条目写 `1-brief.md` 喂下一步（系列条目则用其 `plan_file` 当 brief）。
3. **创作**：按 `pipeline/2-create.md` 从 `plan_file`（脚本+源码导读）出口播成品；含 `dubbing-reviewer` 配音质检循环，过创作自检。
4. **出审**：每条 `meta.yaml` status=`review`，更新 `dashboard.md`，经 **`feishu-notify`** 把待审清单推到飞书等人审（见 `pipeline/3-review.md`）。
   - ★ **出审前必产 `4-publish.md`**（发布物料：标题/正文简介/话题标签 3–5 个/封面路径/媒体文件）。
     原因：飞书「过审 → 确认发布」卡在**人点过审后立即**读 `4-publish.md` 拼 sau 命令，这发生在阶段 4 之前；缺它则确认卡报「缺标题·无法发布」（EP03 踩过）。
     **别写可解析的「建议发布时段」字段**（非 datetime 文本会被原样传给 sau `--schedule`），默认走立即发布，要定时由人在确认时指定。
5. **不发布**：到此停。等人在飞书点过/打回。

## 阻塞即上报（铁律）
凡导致**当日无产出或流程挂起**的事件——取题空、TTS 余额 1008、录制失败超重试、审批通道故障等——
一律经 `feishu-notify` 能力三推文本通知给人（写清：事件 / 根因 / 需要人做什么），同时写运行日志。
**只写本地日志不算上报**（教训：2026-06-30~07-05 连续 6 天空跑，日志喊人 6 天没人看见）。

## 产出
- 当日 1 个内容目录（status=review）；或停产时一条飞书阻塞通知 + 日志
- 更新后的 `dashboard.md`
- 运行日志写入 `logs/<日期>.md`

## 参数
- 模式：**双赛道选题驱动**（每日 1 条，深度:流量 ≈ 6:4 滚动配比）
- 取题：`next_up` 指针优先，无则按 score；调研间隔 ≥2 天先跑 `douyin-ideate`
- 用到的 skill：见各 `pipeline/*.md`（创作四件套 + dubbing-reviewer 质检）
