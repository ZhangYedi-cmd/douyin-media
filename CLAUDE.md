# 项目规则（抖音自媒体流水线）

## 干活前必读
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
- 复盘结论要回写到 `brain/benchmarks.md`，让账号大脑迭代。
- 阻塞即上报：导致停产/挂起的事件必经 feishu-notify 推人，只写本地日志不算上报（`pipeline/daily-run.md`）。

## 文档架构约定（防漂移）
- `pipeline/*.md` 是**阶段契约**（输入/输出/状态翻转/闸口），操作细节住对应 skill；同一规则只写一处，其余引用。
- 踩坑教训的「故事」只登记 `pipeline/lessons.md`（SOP 里标 Lx 回指）；「打法」沉淀 `brain/benchmarks.md`。
- `dashboard.md` 是派生视图非真相源；状态真相源 = 各 `meta.yaml` + `backlog.yaml`。
- 状态记账唯一位置 = 发布收尾（douyin-publish Step 5：meta/backlog/dashboard 一次翻齐），其它环节不代翻。
- `docs/` 是只读历史存档（纪要/ADR），现行规则不得只住那里。

## Skill 调用约定
（待我们逐节点确认后补全。先占位，避免乱调。）
- 选题调研：`douyin-ideate`（内部用 `agent-reach` 抓料 + `computer-use` 看抖音）
- 口播视频：`web-video-presentation`（口播稿→网页演示→录屏，可选 TTS）
- 图文与封面：`baoyu-*` 系列
- 深度拆解/源码解读骨架：`ljg-*` 系列
- 抖音发布：`douyin-publish`（薄封装 → social-auto-upload `sau` CLI；dry-run 铁律）
