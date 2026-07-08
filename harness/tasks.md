# 治理任务注册表（harness-dispatcher 读）

> dispatcher 读下面的 yaml，对每个 `enabled` 任务评估其 `trigger`，到点的才跑。
> **触发感知**，不是无脑加权随机——见规划文档第四节。改任务只动本文件，不改 dispatcher（调度/执行解耦）。
> yaml 是机器契约；每个任务在下方另有一张**任务卡**，讲透五件事：为什么存在 / 目标怎么选 / 干什么 / 产物与记账 / 人审关注点。
> 写法纪律：已有执行 skill 的任务，卡只写契约级判据（操作步骤住 skill，同一规则只写一处）；
> 尚无 skill 的 TODO 任务，卡就是未来写 skill 的规格种子，skill 建成后卡瘦身回契约级。

## trigger 类型
- `post-publish-window`：对 `status=published` 且到点(发布后 24h/72h/7d)还没做该检查点的内容跑。事件触发。
- `periodic:<N>d`：距上次成功运行 ≥N 天就跑（读 `logs/index.jsonl` 算）。周期触发。
- `weighted-pool`（**预留，暂无任务启用**）：同质 per-item 维护债，按 `weight` 加权随机挑目标摊开跑。初始权重按客观度分层：机器可判对错的 8–10，需人拍板的 ≤4（低客观任务高频跑只会堆积待审报告）。

```yaml
tasks:
  - task: retro
    skill: douyin-retro
    enabled: true
    trigger: post-publish-window
    windows: [24h, 72h, 7d]

  - task: benchmark-refresher
    skill: benchmark-refresher
    enabled: true
    trigger: periodic:30d

  # ── 以下 TODO（disabled）。任务卡即接入规格：接入 = 按卡写执行 skill + 翻 enabled ──
  - task: retro-debt-collector
    enabled: false
    trigger: periodic:7d

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

  - task: stale-fact-auditor
    enabled: false
    trigger: weighted-pool
    weight: 4

  - task: cover-style-normalizer
    enabled: false
    trigger: weighted-pool
    weight: 4

  # 元层（框架自审），自己也是 periodic 任务
  - task: account-audit
    enabled: false
    trigger: periodic:30d
```

---

## 任务卡

### retro（复盘）✅ 启用
- **为什么**：发布后没人看数据，brain 的打分就永远停在假设；且选题端不爬抖音，**受众平台信号只有这一条来路**（见 douyin-ideate Step 1 注）。断供 = 账号大脑停止迭代。
- **目标怎么选**：`content/*/meta.yaml` 中 `status=published`、发布时间落进某窗口（24h/72h/7d，容差 ±12h）、且 `index.jsonl` 无该 (retro, 目标, 窗口) 记录的内容。严重逾期（超窗 >7 天）不硬补——那是 retro-debt-collector 的活（未接入前人工 `/douyin-retro` 收）。
- **干什么**：拉创作者中心后台数据 → 漏斗归因找主漏点 → 评论区挖真实反馈与新选题线索。步骤住 `douyin-retro` skill，契约见 `retro.md`。
- **产物与记账**：报告 `logs/<date>-retro.md`（report-template 格式，含**大脑变更提议**）；7d 窗口做完后 meta status→`retro_done`；index.jsonl 记 `applied:false`，人审应用后翻 true。
- **人审关注点**：小样本别过度归因（播放量三位数时漏斗百分比全是噪音）；改 benchmarks 的提议要有 ≥2 条同向证据；评论区线索入池前过 ideate 去重。
- **跳过**：发布不足 24h 的不碰；数据通道（sau cookie）失效 → 本轮跳过并在报告记原因，连续 2 轮失效才推飞书（治理线可延迟，不套生产线的阻塞即上报）。

### benchmark-refresher ✅ 启用
- **为什么**：AI 圈打法几周一变、对标账号会停更转向；benchmarks.md 不复核，就是拿过时打法给新选题打分。
- **目标怎么选**：`brain/benchmarks.md` 全量条目（对标账号 / 有效打法 / 爆款拆解）。距上次成功 <30 天不跑。
- **干什么**：agent-reach 抓当前证据，逐条判 成立 / 存疑 / 失效 / 建议新增。步骤住 `benchmark-refresher` skill。
- **产物与记账**：报告 + 变更提议，人审后才改 benchmarks.md；index.jsonl 记 `applied:false`。
- **人审关注点**：判「失效」是否只凭单一来源；「建议新增」的对标是否贴账号定位（技术深度为主）。

### retro-debt-collector 📋 TODO（建议最先接入）
- **为什么**：retro 是窗口触发，错过即永久欠账、无人兜底，反哺断供——**当前实况：EP05 之后 7d 窗口欠了一串，大环断在这里**。这是把「发布→复盘→大脑」重新接上的任务。
- **目标怎么选**：扫 `content/*/meta.yaml`，`published` 超 7 天仍非 `retro_done` 的条目，全量。欠没欠机器可判，全客观。
- **干什么（规格）**：逐条补跑 `douyin-retro`；数据取当下快照，报告显著标注「补做，非窗口值，趋势指标不可比」。
- **产物与记账**：同 retro；index.jsonl 的 window 字段记 `debt` 以区分正窗数据。
- **人审关注点**：同 retro，另注意补做数据做横向对比时的口径偏差。

### link-rot-checker 📋 TODO
- **为什么**：口播稿、发布物料、`brain/sources.md` 里的外链会死。观众按稿找源找不到损可信度；sources 死链让 ideate 抓料空转。
- **目标怎么选**：已发布条目 `2-script.md`/`4-publish.md` 中的 URL + `brain/sources.md` 全部外链；单链接冷却 30 天不重查。
- **干什么（规格）**：agent-reach/curl 逐链判活，死链分三类：404 / 跳转改址 / 内容漂移（页面在但标题对不上原引用）。
- **产物与记账**：死链清单 + 替换源提议，不改任何文件；index.jsonl 记账。
- **人审关注点**：替换源是否等价可信。通不通是机器说了算，全客观——TODO 里接入门槛最低，权重 10 的依据。

### sop-doc-sync 📋 TODO
- **为什么**：`pipeline/*.md` 契约与 `.claude/skills/` 实操是两层，大改后必脱节；AI 读到过时契约会按错的跑（本仓刚做完大重组，是高危期）。
- **目标怎么选**：pipeline/*.md + CLAUDE.md 约定，逐条对 `.claude/skills/*/SKILL.md` 与仓库实际核验。
- **干什么（规格）**：核对三件事：引用路径还在不在、状态机字段名一致不一致、指的 skill/参数还存不存在。
- **产物与记账**：偏差清单分两级：机械错误（路径不存在、字段改名）标「低风险可直改」；语义偏差（规则意图变了）标「需人裁」。
- **人审关注点**：语义级偏差的裁决；防止把「有意的简化」误报成脱节。机械层全客观，权重 10。

### backlog-gardener 📋 TODO
- **为什么**：过期清扫已并入 ideate Step 2.0，但**撞题**（池内互撞、与已发布重复）没人管；池子越大，重复题越浪费人挑题的注意力。
- **目标怎么选**：`backlog.yaml` 中 `status: idea` 条目两两比对 + 对已发布条目 tags 比对，每轮全池。
- **干什么（规格）**：按 tags 归一化判同题，产合并/剔除提议（默认留分高者、并 tags）。
- **产物与记账**：提议清单；**不直接翻状态**——翻状态是 ideate 清扫和人挑题的事，本任务只提议。
- **人审关注点**：合并方向留哪条；防误判「看似同题、实则不同角度」（半客观，权重 8）。

### stale-fact-auditor 📋 TODO
- **为什么**：已发布视频里的技术结论会被新模型/新版本推翻，旧视频仍被推荐 = 持续传播过时信息，砸「技术结论可溯源」的账号信用。
- **目标怎么选**：已发布条目 `2-script.md` 中的技术断言与 benchmark 数字；单条内容冷却 60 天。
- **干什么（规格）**：提取可核断言 → agent-reach 复核现状 → 判 仍成立 / 已过时 / 被推翻。
- **产物与记账**：处置提议三选一：置顶评论更正 / 简介补注 / 不动。
- **人审关注点**：「被推翻」的证据可溯源否；更正值不值得打扰老视频。判定依赖检索质量，低客观，权重 4，强人审。

### cover-style-normalizer 📋 TODO
- **为什么**：封面风格漂移让主页看起来不像同一个账号，损点进与关注转化。
- **目标怎么选**：已发布条目 `assets/cover.png` 全量，对 `brain/style-guide.md` 封面规范比对。
- **干什么（规格）**：逐张标漂移项与漂移维度（配色 / 字号层级 / 构图锚点）。
- **产物与记账**：漂移清单 + 是否值得重制的建议；不动线上、不重制。
- **人审关注点**：全部（审美判定低客观，权重 4）。

### account-audit 📋 TODO（元层，缓建）
- **为什么**：weight/周期/窗口全是初始拍脑袋。不对着运行数据调，dispatcher 会一直选注定低产的任务——没有这层，配置在钉下那一刻就被冻结，而账号状态在持续变化。
- **目标怎么选**：`logs/index.jsonl` 全量 + 报告抽样。**熄火条件：单任务有效记录 <5 条只出报告标「样本不足」，不调参**。现 index.jsonl 为空，故缓建。
- **干什么（规格）**：统计每任务 执行数 / 成功率 / 人采纳率 / 逾期积压 → 按规则调本文件配置。
- **自调边界（2026-06-14 已议）**：可逆数值（weight、periodic 间隔，限 min~max 内）可自动应用并记账；启停、窗口结构、大跳变只提议人审。
- **人审关注点**：采纳率口径——提议多但人采纳低 = 任务跑偏产报告垃圾，该降权或修 prompt，不是加大力度。
