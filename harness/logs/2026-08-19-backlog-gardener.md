# 治理执行记录 · backlog-gardener · 2026-08-19

## 任务 / 触发 / 目标
- 任务：backlog-gardener（理池：撞题与重复）
- 触发：人在看板工作台手动触发（本任务上一次成功运行：index.jsonl 无记录，系首跑）
- 目标对象：`content/_backlog/backlog.yaml` 全池——`status: idea` 19 条为待查集；`published` 24 条 + `expired` 12 条为比对集（expired 参与防复活重复题）

## 现状（查了什么、用什么查）
- 数据来源：仅本仓文件，无外网抓取（本任务不需要）。读 backlog.yaml 全量（1250 行）；核 `content/2026-07-14/hy3-moe-teardown/meta.yaml`（状态 approved，未发布，不入比对集）。
- 待查集（idea 19 条）：06-14-007/008、07-08-009、07-10-002/003、07-13-002/003、07-15-003、07-17-004、07-19-003、08-19-001~009。
- 30 天硬撞窗口：今天 08-19，最近一条已发布为 07-19 grok-build（距今 31 天）——**窗口内已发布条目为零**，「与已发布重复」维度天然无硬撞。

## 发现（逐条，每条带证据）
| 条目 | 判定 | 证据 |
|---|---|---|
| **组① 07-10-002（benchmark 榜单祛魅，3.60/A/depth）vs 07-15-003（superpowers-evals 工作流评测台，3.55/A/depth）** | ⚠存疑（池内互撞） | 同属「怎么评 coding agent」母题；07-15-003 的 reason 早已自标「同母题已 3 条，精简/串题见人审(backlog-gardener 域)」。第三条 07-13-001 已于今日 promote 进生产（content/2026-08-19/4-cli-coding-agent-2），母题曝光将进一步饱和。tags 硬交集仅 {coding-agent}=1，靠 benchmark≈eval 归一才到 2——**角度确有差异**（榜单读法清单 vs 具体评测框架拆解），故不下硬结论 |
| **组② 07-10-003（PNAS 思考链真伪，3.50/A/depth）vs 07-19-003（隐藏状态探针论文，3.50/A/depth）** | ⚠存疑（池内互撞） | tags 交集 {paper, demystify}=2，命中规则；07-19-003 的 reason 自标「与 07-15-002/07-10-003 同属『LLM 认知内幕』母题，交 backlog-gardener/人裁」。第三条 07-15-002（J-space）已于今日 promote 进生产（content/2026-08-19/anthropic-claude-panic）。留分高者规则失效：两条同分 3.50、同 depth，tie-break 不出结果，必须人裁 |
| 08-19-002（GPT-5.6 Sol 降价）vs expired 07-08-003/005（GPT-5.6 对打/前瞻） | ✅非复活重复 | tags 交集 {gpt-5.6, openai, pricing}=3 命中规则，但事件不同：旧两条锚定 07-09 发布日（时效已废），新条锚定 08-17 OpenRouter 降价 50%（HN 49337602），是新事件，正常保留 |
| 08-19-009（GLM-5.3 上榜）vs expired 07-15-004（Grok 4.5 速览） | ✅误报排除 | 交集 {new-model, benchmark}=2 命中规则，但纯属泛用 tag 撞车，模型/事件完全不同 |
| 07-13-003（planning-with-files）vs 07-15-003 | ✅误报排除 | 交集 {workflow}=1（agent≈coding-agent 归一过宽会误伤），计划文件工作流 vs 评测框架，不同题 |
| 07-13-003 / 08-19-008（OpenViking）vs 已发布 06-14-004（上下文工程，07-09 发） | ✅不算硬撞 | 已发布超 30 天（41 天）；三者同属 context-engineering 心智但对象不同（文件式计划 / 记忆数据库基建 / 压缩实战），按规则注「可做新角度，需差异化」，07-13-003 的 reason 已自带差异化说明 |
| 其余 idea 条目两两 + 对比对集 | ✅全净 | 08-19-001（水印）、08-19-003（Cursor Origin）、08-19-004（Wiz 红队）、08-19-005（周额度）、08-19-006（打印机驱动）、08-19-007（故意变笨）、07-08-009（身份危机）、07-13-002（claude-tap）、07-17-004（Ornith）、06-14-007（MCP）、06-14-008（Mellum2）无 tags 交集 ≥2 的组合，标题/链接亦无同事件同仓库 |

## 变更提议（给人审勾选；不自动改）
- [ ] **组①二选一（默认按规则走 a）**
  - (a) 合并：留 07-10-002（分高 3.60>3.55），07-15-003 `idea → archived`，tags 并入（+eval, workflow, harness, agent-testing），superpowers-evals 作为 07-10-002 的「案例素材」写进其 links/reason —— 依据：发现组①；可逆（archived 可复挑）
  - (b) 都保留但错峰：07-13-001 视频发布并出复盘数据后再排这两条 —— 若判「角度差异值得两条」选这个
- [ ] **组②二选一（tie-break 失效，纯人裁）**
  - (a) 留一条：建议留 07-19-003（更贴账号 coding-agent 心智、有配套 repo 可演示），07-10-003 `idea → archived`，tags 并入（+reasoning, thinking-trace, llm-cognition）—— 依据：发现组②；可逆
  - (b) 规划成「LLM 认知内幕」小系列（J-space 已在产 → 探针 → 思考链真伪），三条错峰都做 —— 若想吃透可解释性心智选这个
- 人审通过后执行（示例，报告路径会写进条目注释）：
  `media backlog apply 2026-07-15-003 --action merge --into 2026-07-10-002 --proposal harness/logs/2026-08-19-backlog-gardener.md`
  `media backlog apply 2026-07-10-003 --action archive --proposal harness/logs/2026-08-19-backlog-gardener.md`

## 盲区 / 未决（机器查不了，需人工）
- 06-14-007（MCP）与 06-14-008（Mellum2）**无 tags 字段**，退化为标题+链接比对，判净的置信度低于其余条目；建议下轮 ideate 顺手补 tags。
- 「角度差异 vs 同题」本质是编辑判断：组①②我只摆了两种理解，没替人选。
- 母题堆积预警（非撞题，仅提示挑题节奏）：今日一次 promote 5 条进生产，其中「怎么评 coding agent」「LLM 认知内幕」各占 1 条，与池内存疑组直接相邻——**人审组①②前建议先看这两条在产内容的最终角度**，避免池里留的和刚发的实际同角度。
- hy3-moe-teardown 状态为 approved 未发布；若后续发布，池内 06-14-008（Mellum2 MoE 拆解）与它构成相邻题（>30 天窗口，仅需差异化，不算硬撞）。

## 落地记录（人审后回填）
- 批准：<> · 审核人：<> · 时间：<> · 已应用到：<>
