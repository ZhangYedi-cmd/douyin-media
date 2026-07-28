# 选题 Brief

- **标题方向**：上下文工程：怎么把 10 万 token 的 AI 会话压到 2 万，还不丢关键信息（实用干货向：先讲"窗口越大越好"是错觉，再给一套可落地的压缩打法）
- **支柱**：depth（工程提效实战）
- **形式**：口播（16:9 横屏）
- **目标人群**：一线工程师 / AI 应用开发者——每天用 Claude Code / Cursor / 自建 agent，撞过"聊着聊着上下文爆了、变慢变贵、AI 开始失忆"的人
- **核心钩子**（开口 3 秒说什么）：用 AI 写代码聊到一半，它突然"失忆"——前面说好的全忘了，还越跑越慢越贵。不是模型笨，是你不会经营上下文。今天给一套把 10 万 token 压到 2 万还不丢信息的打法。
- **要讲清的 1–3 个点**：
  1. 为什么不是"窗口越大越好"：context rot（token 越多，模型回忆准确率反而下降，Chroma 研究）+ 注意力是有限"预算"（Anthropic）→ 核心原则不是塞更多，是塞得准（信息密度最高的最小 token 集）
  2. 五招可落地打法：① 压缩/compaction（总结历史重开窗口，保留架构决策/bug/关键实现，丢冗余工具输出）② 文件系统当记忆（状态写到 context 外，Manus 可恢复压缩：丢网页正文留 URL）③ 子 agent 隔离（干净上下文啃细活，烧几万 token 只回吐 1-2 千提炼）④ JIT 按需检索（留轻量指针，用到再拉，Claude Code 的 glob/grep）⑤ 复述 recitation（todo.md 每步重写把目标推到末尾，对抗 lost-in-the-middle）
  3. 反转/平衡：别过度压——压太狠会丢掉"当时看着没用、十步后才发现关键"的信息（Anthropic + Manus 都警告）；所以压缩要可恢复、要保高保真。顺带给个成本感知：塞满窗口不只慢还贵（KV-cache 命中差 10 倍，Manus 引 Claude Sonnet 缓存 0.30 vs 非缓存 3 美元/MTok）
- **takeaway / 互动引导**：把上下文当"稀缺资源"经营，模型再强这套都用得上；先从最容易的两招上手（工具结果清理 + 关键状态写文件）。互动问"你从哪一招开始用 / 上下文爆炸时你怎么救的"
- **信息来源**（可溯源）：
  - Anthropic 工程博客《Effective context engineering for AI agents》https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
  - Manus《Context Engineering for AI Agents: Lessons from Building Manus》https://manus.im/en/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
  - Chroma 研究 context rot（Anthropic 博客引用）https://research.trychroma.com/context-rot
  - GitHub Siddhant-K-code/ContextLab（压缩/去冗余/salience 工具）https://github.com/Siddhant-K-code/ContextLab
  - GitHub leorod123/llm-context-engineering-playbook（读"对的上下文"治理层）https://github.com/leorod123/llm-context-engineering-playbook
- **打分**：契合5 / 价值5 / 时效2 / 可做4 / 差异4 = 合计4.05（tier S；score 见 backlog 2026-06-14-004）
- **预估**：偏深度长尾沉淀——常青实用题，二次传播靠"原来窗口不是越大越好 + 五招清单可收藏"；15 集源码解读后换实战格式，避审美疲劳
- **红线自查（选题层）**：全部技术结论有一手出处（Anthropic 官方 + Manus 实践 + 两个真实 repo）；"10 万→2 万"为技法可达能力的示意量级（非实测精确 benchmark），口播中以"这套打法能做到"表述、逐招给真实机制，不臆造精确压缩率/跑分。
