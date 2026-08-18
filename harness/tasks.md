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

  - task: ideate
    skill: douyin-ideate
    enabled: true
    trigger: periodic:2d

  - task: backlog-gardener
    skill: backlog-gardener
    enabled: true
    trigger: periodic:7d

  - task: check
    enabled: true
    trigger: periodic:1d

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
    skill: account-audit
    enabled: true
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

### ideate（选题调研与入池）✅ 启用（2026-07-08 自生产线迁入）
- **为什么**：选题池是生产线的原料**库存资产**，只入不出会烂（实证一：6-14 后 24 天没补水，9 条全过期）；耦合在 daily-run 上，生产一换模式保鲜就停摆（实证二：清系列期+空跑期共三周零调研）。类比 coze 的 add-tests：生成型维护，给生产补库存，没人催、断供才痛。
- **目标怎么选**：AI 圈信源全量扫 + 现存池过期清扫。到点判据**以 `content/_research/` 最新报告日期为准**（调研可能被人工或生产线兜底触发，不止 index.jsonl 有记录），距今 ≥2 天才跑。
- **干什么**：agent-reach 抓料 → 双赛道 6 维打分 → 30 天去重 → 过期清扫（Step 2.0）→ 候选全部入池 `status: idea` + 调研报告。步骤住 `douyin-ideate` skill（manual 模式），阶段契约见 `pipeline/1-ideate.md`。
- **产物与记账**：`research-<日期>.md` + backlog 入池/清扫翻 expired + dashboard 选题池小节；index.jsonl 记账。入池与规则化清扫**视同状态记账可自动**（清扫规则已人审钉死）；promote 不归本任务，那是生产线取题的事。
- **人审关注点**：manual 模式本身停在人挑题（这就是闸）；打分偏差靠复盘反哺校准，不在本任务内修。
- **跳过**：距最新报告 <2 天；突发热点不等周期 tick，走人工触发或 `next_up` 钦点，与本任务并行无冲突（≥2 天判断幂等，谁先跑谁更新报告日期）。

### backlog-gardener（理池：撞题与重复）✅ 启用（2026-07-08）
- **为什么**：过期清扫在 ideate Step 2.0 顺手做，但**撞题**（池内互撞、与已发布重复）没人管；池子越大，重复题越浪费人挑题的注意力。
- **目标怎么选**：backlog `status: idea` 全池两两 + 对已发布条目 tags 比对。trigger 用 `periodic:7d` 不用加权池：池子就一个、量小，周期跑比随机抽可预测（weighted-pool 仍预留给 link-rot 这类海量 per-item 债）。
- **干什么**：tags 归一化判同题，产合并/剔除提议（默认留分高者、并 tags）。步骤住 `backlog-gardener` skill。
- **产物与记账**：提议清单落 `logs/<date>-backlog-gardener.md`；**不翻状态**——合并/剔除是判断性变更，人审后才应用（能自动翻状态的只有 ideate 规则化清扫和人挑题）。
- **人审关注点**：合并方向留哪条；防误判"看似同题、实则不同角度"。

### check（状态账本日巡）✅ 启用（0818 看板工作台 01 方案第 11 步注册）
- **为什么**：状态漏翻此前只能靠人偶然发现（历史事故：EP04 scheduled 超时未翻、meta/backlog 双层不同步、published 条目无作品链接）；`media check` 是全仓状态一致性的机器判据，日巡把「人偶然发现」变成「治理线每日必报」。无 skill 依赖，纯 CLI，接入门槛最低。
- **目标怎么选**：全仓状态账本（`content/*/meta.yaml` + `backlog.yaml` + `dashboard.md`），无筛选——每次全量跑。
- **干什么**：直接执行 `media check --json`（不经 LLM/skill，规则唯一定义见 `tools/console/packages/core/src/alerts.ts`）；退出码非零或输出含 `error` 级问题 → 按「阻塞即上报」纪律处理（经 feishu-notify 推人说清事件/根因/需要人做什么；只写本地日志不算上报，见 CLAUDE.md 流程纪律）；`warn`/`info` 级不阻断，累积进日常报告即可。
- **产物与记账**：check 结果摘要（errors/warns/infos 计数）随本次 dispatcher 执行记录一并 append 进 `logs/index.jsonl`；纯读，不改任何文件、不产变更提议。
- **人审关注点**：`error` 级当天必须有人介入，不能带病继续跑生产线；`warn` 级按人力择期处理，别攒成噪音淹没真问题。

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

### account-audit（元层：治理线自审）✅ 启用（2026-07-08，带熄火线早启）
- **为什么**：weight/周期/窗口全是初始拍脑袋。不对着运行数据调，dispatcher 会一直选注定低产的任务——没有这层，配置在钉下那一刻就被冻结。早启的代价被熄火线兜住：没数据时只产心跳报告，顺带验证账本格式。
- **目标怎么选**：`logs/index.jsonl` 全量 + 报告抽样。**熄火线：单任务有效记录 <5 条只出报告标「样本不足」，不调参**。
- **干什么**：统计每任务 执行数 / 成功率 / 人采纳率 / 逾期积压，按下表边界调本文件配置。步骤住 `account-audit` skill。
  **采纳率口径**：只统计落盘 ≥7 天的报告（给人审留时间，别把「还没来得及审」算成「不采纳」），分母 = 有变更提议的报告数。
- **自调边界（2026-07-08 钉数）**：自动档 = 可逆数值、限幅、必留痕；其余一律提议人审。

  | 参数 | 当前 | 可自调范围 | 单次步长 |
  |---|---|---|---|
  | benchmark-refresher 间隔 | 30d | 14~60d | ×1.5 或 ÷1.5 |
  | backlog-gardener 间隔 | 7d | 7~30d | ×1.5 或 ÷1.5 |
  | ideate 间隔 | 2d | **锁定**（生产线消费节奏依赖，动它=动生产，人审） | - |
  | retro 窗口 24h/72h/7d | - | **锁定**（复盘方法论，不是调度参数） | - |
  | weighted-pool weight | 预留 | 1~12 | ≤±3 |

  **调整规则**：连续 2 轮成功且零发现 → 间隔放宽一档；出现人采纳的重要提议 → 间隔收紧一档；采纳率 <30%（样本 ≥5）→ 不自动动，提议降频或修任务卡；连续 3 次执行失败 → 提议停用（比 coze 自动归零保守：任务少且各有独立职责，误停伤闭环）；retro 逾期积压 >3 条 → 报警并建议接 retro-debt-collector。
- **人审关注点**：自动档改动在 git diff 里逐条核（改错可回滚）；提议档重点看采纳率归因——提议多人采纳低 = 任务跑偏产报告垃圾，该修任务卡而非加大力度。
