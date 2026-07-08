# 选题 Brief

- **标题方向**：AI圈突然都在说的 Spec Coding，到底在解决什么问题（反常识反转向：先讲多火多有用，再拆台讲工具还很糙）
- **支柱**：depth
- **形式**：口播
- **目标人群**：一线工程师/AI应用开发者（用过AI编程工具、听过"spec-driven"但没搞懂在讲啥）
- **核心钩子**（开口 3 秒说什么）：AI写代码写错了还嘴硬说"已经修好了"——这个梗直接开场，带出"为什么现在都在提前写spec再让AI干活"
- **要讲清的 1–3 个点**：
  1. 为什么需要 Spec Coding：agent 过度自信+不可靠（编造API、为完成任务牺牲其他功能）+ 意图传递损耗（需求经过多次转手失真），spec把意图显性固定下来，让人和AI对齐
  2. 主流框架有哪些、各自什么路子：GitHub Spec Kit（最重最规范）、AWS Kiro（IDE产品+EARS语法+Hooks自动化）、Tessl（唯一探索spec即代码，配Spec Registry治理开源库幻觉）、OpenSpec（轻量专攻存量代码库）——一句话说清三层成熟度（spec-first/spec-anchored/spec-as-source），多数工具其实还停在第一层
  3. 反转/平衡：Fowler实测发现工具还很糙——小bug被炸出16条验收标准，审查markdown比审查代码还累，agent照样无视指令；给个真实数字压轴（2-3周→几天的案例），但也提醒"厂商自己的案例，效果因团队而异"
- **takeaway / 互动引导**：不神化，但值得关注——先从"写spec-first意图"这个理念开始用，别急着上重工具；评论区问"你们现在AI编程前会先写清楚需求吗"
- **信息来源**（可溯源）：
  - Martin Fowler《Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl》https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html
  - GitHub Spec Kit 仓库 https://github.com/github/spec-kit
  - Kiro 官方博客《Introducing Kiro》https://kiro.dev/blog/introducing-kiro/
  - Tessl 官方博客 https://tessl.io/blog/how-tessls-products-pioneer-spec-driven-development/
  - 微软开发者博客《Spec-Driven Development: A Spec-First Approach to AI-Native Engineering》https://developer.microsoft.com/blog/spec-driven-development-ai-native-engineering
  - 知识库沉淀笔记：`~/Documents/Knowledge Forge/40-Atoms/Spec-Driven-Development-核心定义与三层次.md` 等 11 条原子笔记
- **打分**：契合4 / 价值4 / 时效4 / 可做4 / 差异4 = 合计4.2（tier A）
- **预估**：偏深度沉淀（专业人设+认知反转，二次传播靠"原来这些工具还没那么成熟"的反差感）
