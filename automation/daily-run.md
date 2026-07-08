# 工作日全自动编排（入口 Prompt）

> 定时 agent 读这个文件执行。串起 取题→创作→出审，**停在人审**。

## 当前模式 ★ 清系列日更（2026-06-15 起）
- **每天产出 1 期** Claude Code 源码系列，按集号顺序 EP02→EP15（约 3 周清完）。
- **流量辅线暂停**：清系列期间 daily-run 不跑 `douyin-ideate`、不产流量条。ideate 可人工单独跑攒池子，但不进每日产出。
- 因为取题是确定性的队列出队（无人挑决策），daily-run 在此模式下**真·全自动跑到出审**。
- 系列清完后再回到「选题驱动」双赛道模式（恢复步骤 2 的 ideate）。

## 执行步骤
1. 读 `brain/` 全部 + `CLAUDE.md`。
2. **取题（系列队首出队）**：在 `content/_backlog/backlog.yaml` 里取 `series.slug=claude-code-source-series` 且 `status: idea` 中 **episode 最小**的一条 = 今天要做的。
   promote：该条 `status: idea→picked`、回填 `content_path: content/<今天>/<ep-slug>/`，建该目录、`meta.yaml` 写 `source: <backlog id>`，把 `plan_file` 当 1-brief 喂下一步。队列空了则停并告知系列已清完。
3. **创作**：按 `pipeline/2-create.md` 从 `plan_file`（脚本+源码导读）出口播成品；含 `dubbing-reviewer` 配音质检循环，过创作自检。
4. **出审**：每条 `meta.yaml` status=`review`，更新 `dashboard.md`，经 **`feishu-notify`** 把待审清单推到飞书等人审（见 `pipeline/3-review.md`）。
   - ★ **出审前必产 `4-publish.md`**（发布物料：标题/正文简介/话题标签 3–5 个/封面路径/媒体文件）。
     原因：飞书「过审 → 确认发布」卡在**人点过审后立即**读 `4-publish.md` 拼 sau 命令，这发生在阶段 4 之前；缺它则确认卡报「缺标题·无法发布」（EP03 踩过）。
     **别写可解析的「建议发布时段」字段**（非 datetime 文本会被原样传给 sau `--schedule`），默认走立即发布，要定时由人在确认时指定。
5. **不发布**：到此停。等人在飞书点过/打回。

## 产出
- 当日 1 个系列内容目录（status=review）
- 更新后的 `dashboard.md`
- 运行日志写入 `logs/<日期>.md`

## 参数
- 模式：**清系列日更**（每日 1 期源码，辅线暂停）
- 顺序：EP02→EP15 按 episode 升序，跳过已 published
- 用到的 skill：见各 `pipeline/*.md`（创作四件套 + dubbing-reviewer 质检）
- 系列清完后切回双赛道（N/日条数、深度:流量比例 6:4 届时再定）
