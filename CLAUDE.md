# 项目规则（抖音自媒体流水线）

## 系统一句话（双线闭环）
- **生产线 `pipeline/`**：消费选题池造内容——promote 取题→创作→出审，**停在人审**；发布经飞书两次确认（审核卡+确认发布卡）。编排入口 `pipeline/daily-run.md`。
- **治理线 `harness/`**：养资产——选题池保鲜/理池、已发布复盘、对标复核、自审元层。只产报告+变更提议，人审后应用（选题池入池与规则化清扫例外，视同记账）。任务清单唯一出处 `harness/tasks.md`。
- **大环**：发布→复盘拉数据→变更提议→人审→改 `brain/`→下轮选题打分。受众平台信号只有复盘这一条来路（选题端不爬抖音）。
- **触发**：两条线各一个 CC 客户端定时任务——治理线每天先跑（含周末，喂 `/harness-dispatcher`），生产线工作日后跑（喂 `daily-run.md`）。

## 开工前必读
每次选题/创作前，先读 `brain/` 全部文件（定位、人设、风格、对标、信息源），
再读对应阶段的 `pipeline/<阶段>.md`。这些是硬约束，不是参考。

## 账号一句话
AI 方向的工程提效实战 + 源码解读（技术深度为主），辅以 AI 新闻/新模型/前沿 skill（流量为辅）。

## 内容红线（审核不通过即重做）
- 不编造事实、不臆造数据/benchmark 数字，技术结论要可溯源。
- 不蹭未经核实的传闻；时效性内容标注信息来源与日期。
- 口播稿第一人称、口语化，不写成书面论文。
- 不违反抖音社区规范（无导流外链口播、无敏感词、无夸大承诺）。

## 流程纪律
- 工作日全自动只跑到「出审」为止（`pipeline/3-review.md`），**发布必须人审通过**。
- 每条内容的状态写在它的 `meta.yaml`，改状态同时更新 `dashboard.md`。
- 复盘只产变更提议，**人审通过后**才回写 `brain/benchmarks.md`（治理线硬约束：只产报告，不自动改）。
- 阻塞即上报：导致停产/挂起的事件必经 feishu-notify 推人，只写本地日志不算上报（`pipeline/daily-run.md`）。

## 文档架构约定（防漂移）
- `pipeline/*.md` 是**阶段契约**（输入/输出/状态翻转/闸口），操作细节住对应 skill；同一规则只写一处，其余引用。
- 踩坑教训的「故事」只登记 `pipeline/lessons.md`（SOP 里标 Lx 回指）；「打法」沉淀 `brain/benchmarks.md`。
- `dashboard.md` 是派生视图非真相源；状态真相源 = 各 `meta.yaml` + `backlog.yaml`。
- 状态记账唯一入口 = `media`（发布收尾见 `media publish-done --help`；合法状态值唯一定义 = `tools/console/packages/core/src/state.ts`），其它环节不代翻。
- `docs/` 是只读历史存档（纪要/ADR），现行规则不得只住那里。
- 设计/迭代文档一律住 `docs/Iterative-spec/<日期-事项>/` 子文件夹（初版方案 = `00-ADR.md`，后续 `01-`、`02-`… 递增编号），**md 不裸放**；skill 产出文档时覆盖其默认路径。细则见 `docs/README.md`。

## 流水线环节与核心 skill

### 生产线（契约住 `pipeline/*.md`，细节住 skill）
| 环节 | 阶段契约 | 核心 skill / 工具 |
|---|---|---|
| 编排+取题 | `daily-run.md` | 定时 agent 读它执行；取题 `next_up` 指针→按 score，promote 无独立 skill |
| 1 选题 | `1-ideate.md` | `douyin-ideate`（情报唯一来源 `agent-reach`，不爬抖音；调度归治理线，daily-run 留过渡兜底） |
| 2 创作 | `2-create.md` | 口播四件套：`web-video-presentation`（网页+`npm run record` 无人录屏）→ `tts-dub`（配音）→ `dubbing-check`（体检；配音批次由 dubbing-reviewer agent 质检 ≤3 轮）；封面 `baoyu-image-gen`（竖版 9:16）；深度拆解骨架 `ljg-*`、图文 `baoyu-*` 按需 |
| 3 出审 | `3-review.md` | `feishu-notify`（审核卡出站 + server 长连接收按钮闭环） |
| 4 发布 | `4-publish.md` | `douyin-publish`（薄封装 sau CLI；**dry-run 硬约束**；Step 5 = 唯一记账）+ `feishu-notify` 确认发布卡 |

### 治理线（注册表+任务卡 = `harness/tasks.md`，此处只列名不复述）
| 任务 | 核心 skill |
|---|---|
| 调度（框架层） | `harness-dispatcher`（读注册表，到点才跑） |
| 复盘 | `douyin-retro`（创作者中心数据→漏斗归因→大脑提议） |
| 对标复核 | `benchmark-refresher` |
| 选题养池 | `douyin-ideate`（periodic:2d，与生产线同一 skill，任务归本线） |
| 理池撞题 | `backlog-gardener`（只提议不翻状态） |
| 自审元层 | `account-audit`（调参限幅表在其任务卡） |
