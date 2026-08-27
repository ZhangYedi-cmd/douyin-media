# 选题 Brief

- **标题方向**：同一个模型塞进 5 个 CLI coding agent，跑分差出 2 倍——脚手架才是分水岭（★ 原 backlog 标题写「4 个」，2026-08-26 创作前核实为 **5 个 agent**，已纠正）
- **支柱**：depth
- **形式**：口播
- **目标人群**：一线工程师 / AI 应用开发者——在选 coding agent、纠结「哪家模型强」的人
- **核心钩子**（开口 3 秒说什么）：反差冷开——「同一个模型，换个壳跑分差 2 倍多」；且最有名的 Claude Code 没拿第一、Codex 垫底
- **要讲清的 1–3 个点**：
  1. 实验设计：作者 fork 了 3 个 agent（Codex/Gemini CLI/Mistral Vibe）统一路由到 ZAI API，加上免 fork 的 Claude Code 与 OpenCode，5 个 agent 全跑同一个 GLM-4.7，上 Terminal-Bench 2.0——模型变量被锁死，纯比脚手架。
  2. 结果反直觉：Mistral Vibe 0.35 > Claude Code 0.29 > Gemini CLI 0.23 > OpenCode 0.21 > Codex 0.15，头尾差 2.3 倍；升级 GLM-5 全员涨 38–54% 但**排名不变**——脚手架优势跨模型代际成立。
  3. 差在哪：文件编辑容错度、上下文管理、错误恢复、命令沙箱、跨会话记忆五个维度；结论「宽容的 edit 工具 + 干净的 adapter 赢，私有协议 + 深度厂商耦合输」（fork 改动量与跑分负相关）。
- **takeaway / 互动引导**：选 agent 别只看模型跑分，脚手架决定下限；彩蛋——KIRO 光纤路由 NP-hard 题上 Claude Code 60 分钟赢了作者手调 8 年的 C++ 解 0.2%。结尾强 CTA（评论区扣关键词）。
- **信息来源**（可溯源）：
  - GitHub 仓库（一手，含完整 README 数据表）：https://github.com/charles-azam/CLIArena （2026-08-26 经 raw README 核实全部数字）
  - Reddit 原帖（r/LLMDevs，仍被 403 挡，仅存标题）：https://www.reddit.com/r/LLMDevs/comments/1r2xf90/
  - 注意：所有分数为作者自报 benchmark 结果，口播中标注「作者实测」口径；GLM-5 侧 Gemini 0.35 带星号、OpenCode/Codex 未跑完，口播只引用 GLM-4.7 完整列 + 「涨 38–54% 排名不变」结论。
- **打分**：promote 自 backlog 条目带入（score 3.90 / tier A，见 2026-07-13-001），不在此重打
- **预估**：偏深度沉淀（宽口径跨厂商横评题——账号已验证打法：spec-driven 横评 7d 4.40x 基线）
