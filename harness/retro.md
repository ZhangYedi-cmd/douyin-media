# 治理任务 · 复盘

> 属**熵增治理线**(`harness/`),不是生产流水线阶段。生产线到「发布」为止;
> 复盘作用于**已发布**作品,时间驱动、可延迟,故归治理线。执行 skill：`douyin-retro`。

## 目标
用数据回答「这条为什么火/不火」,把结论沉淀回账号大脑,反哺选题打分。

## 时机
发布后 24h / 72h / 7d 各拉一次数据(或按需)。超期未做由 `retro-debt-collector` 兜底(规划中)。

## 拉取指标
- 曝光、播放、完播率、平均播放时长
- 点赞、评论、收藏、转发、主页访问、涨粉
- 同类作者对标百分位(平台白送)

## 分析
1. 漏斗定位:每一环对比同类百分位 / 自己历史均值 / 同支柱均值,找最先低于基线的「主漏点」。
2. 归因:钩子？选题？封面？时段？形式？(见 `douyin-retro/references/funnel-attribution.md`)
3. 看评论区抓真实反馈与新选题线索。

## 沉淀(关键)——只产**变更提议**,人审后应用(治理线铁律)
- 有效打法 → 建议改 `brain/benchmarks.md`。
- 好选题源 → 建议标注 `brain/sources.md`。
- 新选题线索 → 建议进 `content/_backlog/`。
- 以上写进**执行记录报告**,人审通过后才落地。**复盘不自动改 brain/线上资产**。
- `meta.yaml` status=`retro_done`(治理线终态,非生产线状态)——状态机推进属任务记账,不算"改大脑"。

## 执行 skill
**`douyin-retro`**（`.claude/skills/douyin-retro/`）
- 数据通道：复用 `tools/social-auto-upload` 的抖音 cookie(免扫码),Playwright 拉创作者中心后台。
- 采集：`scripts/fetch.py`(导出投稿列表 xlsx + 抓同类对标,标准库解析,零额外依赖)。
- 分析：`references/funnel-attribution.md`(传播漏斗 + 症状→病因→动作归因表)。
- 触发：手动 `/douyin-retro [slug|all]`(定时 cron 待验稳后加)。
- 产出：执行记录报告(数据快照+诊断+**大脑变更提议**),人审后应用,不自动改 brain(注明依据可溯源、可回滚)。
