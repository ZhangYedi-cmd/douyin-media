# 选题 Brief

> promote 时未回填（模板空置），2026-08-19 创作启动时从 backlog 条目 2026-06-14-006 + 官方一手资料补齐。

- **标题方向**：Opus 4.8 的 effort 控制 + fast mode，省钱开关怎么按（backlog 工作标题「怎么让我账单降一半」含实测口吻，无人线不可臆造实测账单 → 角度修正为机制拆解 + 官方数字，见下）
- **支柱**：depth（AI 工程提效实战，宽口径工程题——符合 brain 打法「宽口径破圈」）
- **形式**：口播（16:9 横屏）
- **目标人群**：用 Claude API / Claude Code 的工程师、被 token 账单困扰的 AI 应用开发者
- **核心钩子**（开口 3 秒说什么）：同一个模型、同一个任务，账单能差出好几倍——差别只在两个大多数人从没动过的开关（反差/悖论冷开，brain 打法：压 2 秒跳出）
- **要讲清的 1–3 个点**：
  1. **effort 开关**：不是"思考深度"，是整条回复的 token 油门（文字+工具调用+思考全受控）；五档怎么选（官方：编码 xhigh 起步、省钱降 medium、subagent 用 low）
  2. **fast mode 开关**：同一个 Opus 不降智、2.5× 速度、单价翻倍 $10/$50，且比上代 fast mode 便宜 3 倍；`/fast` 一键开关
  3. **三个官方文档里藏的省钱坑**：① effort 中途换挡打爆 prompt cache（缓存读只按一折计价，作废=回全价）② fast mode 中途开要为整个上下文重付全价 uncached input（要开就开局开）③ 订阅党 fast mode 走 usage credits 单独扣钱、不占套餐额度
- **takeaway / 互动引导**：省钱三句话（effort 一次定档别中途换 / fast mode 开局开 / 订阅党看好 usage credits）+ 强 CTA（brain 打法：软 CTA 实测无效）
- **信息来源**（可溯源，全部官方一手，2026-08-19 Jina Reader 抓取）：
  1. https://www.anthropic.com/news/claude-opus-4-8 （定价、fast mode 2.5×/3× 便宜、effort 默认 high）
  2. https://platform.claude.com/docs/en/build-with-claude/effort （五档定义、影响全部 token、4.8 档位建议、中途换挡破 cache）
  3. https://code.claude.com/docs/en/fast-mode （/fast 用法、$10/$50、中途开启重付 uncached input、订阅走 usage credits、fast+low 组合）
- **打分**：promote 自 backlog 2026-06-14-006 带入：score 3.75 / Tier A（practical 5, social 3, emotion 3, hook 3, timeliness 2, trigger 4）
- **预估**：偏深度沉淀（实用向长尾；「省钱」话题自带传播触发）
