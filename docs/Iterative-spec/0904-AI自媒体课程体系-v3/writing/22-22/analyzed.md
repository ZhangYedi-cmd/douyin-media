---
topic: 第 22 课·复盘归因反哺大脑——单条内容的传播漏斗归因怎么做，只产报告和变更提议
audience: 用 Claude Code 或 Cursor 的学员，没做过自动化流水线，跟到第 21 课，手上有 harness/ 骨架和资产读写表，治理线边界画好了但还没有一个真正跑起来的任务
mode: new
series_context: 模块 5 治理线，第 22 课（21 立骨架 → 22 复盘归因 → 23 选题池 → 24 总调度与自审），反哺大环三段中的第二段（21 讲为什么只提议不落笔，22 讲单次归因怎么做，24 讲自审作用在治理线自己身上）
---

## 核心问题

一条已发布的内容，怎么用传播漏斗把「为什么火/不火」定位到具体一环，再把定位结果变成能交给人审的变更提议，同时不碰 `brain/benchmarks.md` 的落笔权。

## 材料清单

- [仓库文件] `.claude/skills/douyin-retro/SKILL.md` 全文：参考流水线的复盘 skill，采集（`fetch.py`）→ 记账（`media metrics record`）→ 分析（漏斗定位+归因）→ 产出（`5-retro.md` + 状态收口 `flip retro_done`）→ 变更提议（人审后落 `brain/`）五段结构，可支撑第 2、3、4 节的封装思路和沉淀边界
- [仓库文件] `.claude/skills/douyin-retro/references/funnel-attribution.md`：五（六）环传播漏斗模型（曝光→点击→留下→看完→互动→关注）+ 症状病因动作归因表 + 三重基准线定位法（同类百分位/自己历史均值/同支柱均值），可支撑第 1 节漏斗五环表、第 3 节归因示范
- [仓库文件] `.claude/skills/douyin-retro/references/data-channel.md`：创作者中心数据通道、投稿列表 16 列字段（含 ctr、bounce_2s、finish_5s、finish_rate、avg_play_sec、likes/shares/comments/collects、profile_visits、fans_delta）、账号诊断对标白送基线，可支撑第 1 节的「量什么」列、第 2 节采集规格
- [仓库文件] `tools/console/packages/cli/src/commands/metricsRecord.ts` + 对应测试：`media metrics record <slug> --window <24h|72h|7d> --json-data '<json>'` 的真实行为——每个窗口都 append 一行到 `harness/logs/metrics.jsonl`，只有 `--window 7d` 才回填 `content/_backlog/backlog.yaml` 对应条目的 `metrics` 字段（覆盖式 flow map）。可支撑第 2 节「记账落点」判据，也是本课卡最强调的一处事实核对：结构化指标的读者可用落点是 `backlog.yaml.metrics`，不是 `harness/logs/metrics.jsonl`（本机该文件不存在，只有测试 fixture 同名，见 `tools/console/packages/server/__test__/fixtures/repo/harness/logs/metrics.jsonl`）
- [仓库文件] `content/_backlog/backlog.yaml` 头部注释与真实条目：`metrics` 字段发布后回填 `{plays,完播率,likes,...}`，取值 `{}` 到有值前是空对象，可支撑第 2 节记账落点的真实字段形态
- [仓库文件] `content/_template/5-retro.md`：学员自己第 03 课就有的复盘报告模板（数据表 24h/72h/7d + 归因三行 + 沉淀动作三条勾选），是第 3 节交付物的真实产出容器
- [仓库文件] `content/2026-07-08/spec-driven-development/5-retro.md`：参考流水线一份填满的复盘报告实例，示范「24h 先归因、7d 正式收口并修正 24h 误判」的两段式写法，只当参考流水线的产出看，不当学员自己的文件
- [仓库文件] `harness/retro.md`：治理任务契约，复盘的目标、时机（24h/72h/7d）、拉取指标、沉淀铁律（只产变更提议，人审后应用），可支撑开篇契约与第 4 节铁律复述
- [仓库文件] `harness/report-template.md`：治理线统一报告模板（任务/触发/目标、现状、发现表、变更提议清单勾选框、盲区、落地记录），可支撑第 4 节变更提议清单的格式对照
- [仓库文件] `tools/console/packages/core/src/state.ts`：`published → retro_done` 是治理线唯一迁移，经 `flip` 命令，`line: 'harness'`，可支撑复盘收口时的状态翻转判据
- [仓库文件] `brain/benchmarks.md`：文件头部写明「由复盘按治理铁律产出变更提议，人审通过后才落地到本表，复盘不自动改本文件」，本课要精确复述这句
- [旧稿口径] `plan/old-courses/v1-13-数据反哺与复盘归因.md`：五层漏斗拆解与三重基准线思路可借鉴，但旧稿写了大段 Python 代码，与本课「学员不写一行代码」的铁律冲突，只取思路，不照抄代码
- [卡片裁定] 第 22 课卡「转换时发现的问题」：`harness/logs/metrics.jsonl` 材料条目本机不存在（仅测试 fixture 同名），结构化指标唯一落点改看 `backlog.yaml` 的 `metrics` 字段，写课时按此口径

## 材料缺口

- 附录脱敏样例数据（三到五条内容的五环数据+基线）现在不存在，需要本课造：落 `docs/Iterative-spec/0904-AI自媒体课程体系-v3/appendix/22-复盘脱敏样例数据.md`，数字自编但要自洽（比如互动率算出来要能对上点赞收藏评论转发之和除以播放），标明是脱敏样例，正文引用其路径
- 第 21 课的资产读写表具体长什么样（列名、覆盖哪些资产）现在无法读到成稿，只能按第 22 课卡「开篇契约」和第 21 课卡「2.1 大纲」第 4 节的规划复述其存在和大致作用，不描述其未经验证的具体列值
- `douyin-retro` skill 的采集脚本细节（`fetch.py`、`patchright`、cookie 复用路径）一律说成「参考流水线的」，读者自己是按规格表 + 两三条 Prompt 让 AI 造，不给读者一份可抄的脚本
