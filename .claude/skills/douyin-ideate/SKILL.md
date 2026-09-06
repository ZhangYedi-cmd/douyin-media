---
name: douyin-ideate
description: >
  抖音 AI 技术账号的选题调研引擎。每 2 天跑一次：用 agent-reach 抓 AI 圈实质素材
  （X/Reddit/HN/GitHub/arxiv），借鉴 STEPPS 传播力模型做抖音版双赛道打分，
  产出排序选题报告 + 更新选题池 backlog。
  当用户提到"选题""调研""找话题""今天做什么内容""选题报告""内容规划"，或定时任务
  触发每两天的选题时使用。借鉴 xhs-topic-miner 的方法论，但评分、抓取、产物均为抖音版。
---

# 抖音选题调研引擎

把"靠灵感找选题"变成"用系统产选题"。每次运行回答三问：AI 圈此刻什么有料(What)、为什么会火(Why)、缺口在哪(Gap)，再按账号定位排出可执行选题清单。

## 开工前必读
1. `brain/positioning.md`（支柱、6:4 配比）、`brain/persona.md`、`brain/style-guide.md`
2. `brain/sources.md`（抓哪些源、抖音搜哪些词、对标账号）
3. `references/scoring.md`（抖音版双赛道 6 维权重 + 形式判断规则）
4. `references/report-template.md`（报告格式）

## 两种模式（一个开关）

| 模式 | 干到哪 | 何时用 |
|---|---|---|
| `manual`（默认，现在） | 出报告 + 写选题池，**人挑**。停在这 | 早期，校准它的判断 |
| `auto`（后期翻开关） | 自己挑 Top-N，定形式，`status` 直接置 `picked` 推进创作 | 信得过它的眼光后 |

两模式共用同一套抓取+打分引擎，区别只在最后一步是否自动 promote。即便 auto，也照常生成报告留痕。

## 用法
```
/douyin-ideate                 # 默认 manual，跑一轮调研出报告
/douyin-ideate --auto          # auto 模式：自己挑 Top-N 推进创作
/douyin-ideate --n 12          # 候选池目标条数（默认 8-12）
/douyin-ideate score "标题"    # 单题打分（用 scoring.md）
```

---

## 工作流（5 步）

### Step 1 · 情报采集（agent-reach）

按 `brain/sources.md` 的源与关键词，扫最近 2-3 天的 AI 动态：
- X / Reddit(r/LocalLLaMA, r/MachineLearning) / HackerNews：新模型、新工具、AI 新闻、热议
- GitHub Trending（AI/Agent/LLM 工程方向）：值得拆的项目
- arxiv：值得讲的论文（深度题用 `ljg-paper` 衔接）

每条线索记：`标题 / 链接 / 来源 / 热度信号 / 日期`。
> agent-reach 实操：`search-twitter` 链接字段常空，从推文正文末尾取 URL；热门泛词（如 Cursor）噪音多需筛；Reddit 读帖要代理。

> **本引擎不爬抖音平台信号**（实测 2026-06）：抖音主站反爬重、headless 抓不到内容；computer-use / Claude-in-Chrome 都需人值守，进不了无人流水线。故选题只靠 AI 圈素材 + 双赛道打分。
> **平台侧信号从哪来**：由发布后的 `douyin-retro` 复盘反向补足——哪类选题完播/涨粉好、评论区想看啥，回写 `brain/benchmarks.md` 影响下次打分。这是**自己受众**的真实信号，比爬通用平台热点更贴账号。

### Step 2 · 过滤去重
0. **过期清扫（expiry sweep，每轮必做，先于去重）**：机械规则清扫，记账走 CLI（规则定义唯一活在 core，不在此复述）：
   ```
   media backlog sweep --apply
   ```
   绝对路径兜底（无全局 PATH 时）：`node /Users/yedizhang/yedi-study/douyin-media/tools/console/packages/cli/dist/index.js backlog sweep --apply`
   深度常青题不在清扫规则命中范围，可长期排队；expired 条目**保留在池里**做去重比对，不删除。清扫结果（几条、哪几条）由命令输出，摘要写进当次报告。
1. agent-reach 线索按主题合并去重。
2. 对 `content/_backlog/backlog.yaml` + `content/` 已发历史做去重：按每条 `tags`（归一化主题标签）比对，**30 天内同主题直接丢**；无 tags 时退化为标题+链接比对。
3. 砍掉不符定位 / 做不了 / 纯噪音的。
4. 留下干净候选（目标 8-12 条，按 `--n`）。

### Step 3 · 机制分析（Why + Gap，借 topic-miner 灵魂）
1. **What**：把候选聚成 3-5 个主题群（如"新模型实测""框架源码拆解""AI 提效工作流""AI 圈新闻"）。
2. **Why**：每群诊断传播机制——靠 实用 / 惊奇 / 时效热度 / 社交货币 中的哪 2-3 个，给一句机制性解释（不只是打分）。
3. **Gap**：列需求-供给缺口。哪些角度需求高、抖音供给少或差（🔴蓝海）；哪些已红海需差异化。

### Step 4 · 双赛道打分排序
按 `references/scoring.md`：
1. 每条候选先判赛道：`depth(深度)` 还是 `traffic(流量)`。
2. 6 维打分（实用 / 社交 / 惊奇 / 完播 / 时效 / 触发，各 1-5）。
3. 按**对应赛道权重**算总分 → S/A/B/C/D 分级。
4. 判定形式 `口播 | 图文`（用 scoring.md 的形式规则）。
5. urgency：流量题蹭突发热点=`today`；深度题默认 `queue`，但**蹭旗舰发布/突发热点可破例=`today`**（趁热做深度实测）。
6. 按账号 6:4 配比把深度/流量题混排成最终清单。

### Step 5 · 产出
1. 写报告 `content/_research/research-{YYYY-MM-DD}.md`（用 report-template.md）。
2. 候选**全部**按字段契约写入候选文件（`title`/`alt_titles`/`track`/`format`/`score`/`tier`/`scores`{6 维}/`urgency`/`reason`/`links`/`tags`{去重用}/`created`——即 Step 3/4 已算好的字段，逐条 schema 见 `docs/Iterative-spec/0818-看板工作台/01-CLI执行方案.md` §2.8），入池记账走：
   ```
   media backlog add <候选文件路径>
   ```
   绝对路径兜底（无全局 PATH 时）：`node /Users/yedizhang/yedi-study/douyin-media/tools/console/packages/cli/dist/index.js backlog add <候选文件路径>`
   撞车条目默认拒收，命令输出会列对照（撞谁/交集 tags）；确认是差异化新角度可 `--force <n>`（1-based）单条放行。
3. **manual**：到此停，提示用户读报告挑题。
   **auto**：挑 Top-N（按分数+配比+urgency），其 `status` 置 `picked`，复制 `content/_template/` 成 `content/{发布日}/{slug}/` 并回填 `1-brief.md`，移交创作。

---

## 去重与时效纪律
- 去重窗口 30 天，比对 backlog + 已发历史的主题关键词。
- 过期清扫规则见 Step 2.0（timeliness≥4 超 7 天 / today 超 2 天 → expired），每轮运行自动执行——只入不出的池子会烂（2026-07-08 教训：9 条 idea 躺 24 天全过时）。
- 深度题可在池子里排队滚动复用。

## 依赖
| 依赖 | 用途 | 必须？ |
|---|---|---|
| agent-reach | 抓 X/Reddit/HN/GitHub/arxiv 素材（唯一情报源） | 是 |
| brain/* | 定位、信息源、对标、风格 | 是 |
| ljg-paper 等 | 深度题创作衔接（非本技能） | 否 |

## 产物一览
```
content/_research/research-YYYY-MM-DD.md   每次调研报告（人读快照）
content/_backlog/backlog.yaml              选题池总账（机器读+去重，全程留痕）
```
