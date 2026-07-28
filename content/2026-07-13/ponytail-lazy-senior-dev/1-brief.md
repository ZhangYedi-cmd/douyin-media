# 选题 Brief

- **标题方向**：ponytail：给你的 AI agent 装一个「最懒高级工程师」，代码反而更好（反直觉：少写代码=更好，但底线不许砍）
- **支柱**：depth（工程提效实战 + 可复用的 prompt 工程套路）
- **形式**：口播（16:9 横屏）
- **目标人群**：一线工程师 / AI 应用开发者（每天用 Claude Code / Cursor / Copilot 写代码，被 AI「热心过度」坑过）
- **核心钩子**（开口 3 秒）：你让 AI 写个日期选择器，它给你装库、写包装组件、加样式表、还开始跟你聊时区——真正的高级工程师看一眼，一行 `<input type="date">` 就完事。有个开源项目 ponytail，就是把这个「最懒高级工程师」塞进你的 AI agent。
- **要讲清的 3 个点**：
  1. **它改的不是「少打字省 token」，是决策**：给 AI 一套「该不该写」的判断，核心信条「最好的代码是不写的代码」；但底线是校验/错误处理/安全/可访问性一个都不许砍——小是因为必要，不是偷工（README「The rule was never fewest tokens」）。
  2. **7 级阶梯（可直接抄进你的 prompt 的干货）**：写代码前停在第一个成立的台阶——①需要存在吗(YAGNI) ②库里已有?复用 ③标准库能做?用 ④平台原生?用 ⑤已装依赖能做?用 ⑥一行搞定?一行 ⑦实在不行才写刚好够用的最少代码。关键：阶梯在「读懂问题、读完相关代码」之后才爬，不代替思考——「对方案偷懒，对读代码从不偷懒」。
  3. **数据 + 诚实的故事（正中账号'别信榜单虚数'心智）**：项目自己在真实 Claude Code 会话上测（改真实开源项目 full-stack-fastapi-template，12 个功能任务，同一 agent 开/不开 skill，n=4，Haiku 4.5）：代码量 -54%、token -22%、成本 -20%、耗时 -27%、安全项 100% 不掉，是唯一「全指标都降还全程安全」的一档。更值得说：它早期宣传「少写 80-94% 代码」，后被 issue #126 指出是单发生成、裸模型基线灌废话撑出来的水分，项目方自己把数字回撤成公允的 -54%——敢砍掉自己一半宣传数字的 benchmark 反而更可信。
- **平衡 / 边界**：不是银弹。省成本省时间是「模型愿照阶梯走」的副作用；换个啰嗦的推理模型，光纠结爬哪级就把 token 烧回去（项目自述 GPT-5.5 上会反向）。
- **takeaway / 互动**：就算不装它，把这 7 级阶梯抄进你给 AI 的规则里，让它写代码前自己爬一遍，过度工程能少一大半。互动：你被 AI「热心过度」坑过最离谱的一次是啥？评论区聊。
- **信息来源**（可溯源，全部一手）：
  - ponytail 仓库 README（MIT，npm `@dietrichgebert/ponytail`，works with 20 agents）：https://github.com/DietrichGebert/ponytail
  - 7 级阶梯 = README「How it works」章
  - agentic benchmark 数据 = README「Numbers」表 + `benchmarks/results/2026-06-18-agentic.md`
  - 数字回撤故事 = README「Older single-shot numbers」折叠段 + issue #126
- **打分**：score 3.90 / tier A（practical4 social4 emotion4 hook4 timeliness3 trigger4）
- **备注（取题决策）**：backlog 顶部 `next_up` 为空，按 score 取。top-3（Fable5 实测 4.55 / 三旗舰对打 4.50 / GLM-5 NIM 白嫖实测 4.30）均为「亲手跑一天/对打/测真实账单」实证题，无人值守定时 agent 无法如实产出（硬做=臆造 benchmark，踩内容红线），故按红线优先跳过，取最高分「可溯源解读题」ponytail。此现象（评分引擎系统性高估无人线做不了的实测题）建议治理线关注，本轮不改 brain。
