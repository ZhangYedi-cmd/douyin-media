# 1-brief · kimi-k3-benchmark-check（Kimi K3 官方跑分表逐行对账）

> 喂给 pipeline/2-create.md 的创作简报。流量题（新模型时效，祛魅角度）。
> backlog: 2026-07-17-001 ｜ slug: kimi-k3-benchmark-check ｜ track: traffic ｜ format: kouban（16:9 横屏）

## 一句话选题
X 上疯传「国产开源模型击败 Claude Fable 5」。我把 Moonshot 官方博客那张 35 行的跑分表逐行读了一遍——**官方自己白纸黑字写着「overall 仍落后 Fable 5 和 GPT 5.6 Sol」**。传歪的不是官方，是转发的人。

## 为什么现在做（时效 + 比较优势）
- K3 是 07-16 的大新闻，旗舰热度窗只有 2-3 天，祛魅角度过两天就没人搜。
- 别人抢发情绪，我发对账：账号「技术结论可溯源」的比较优势变现。全程读公开材料，**不需要一手实测、不臆造任何数字**。
- 本条是本批唯一 urgency=today。

## 核心事实（全部亲验，2026-07-17 抓）
> 源 1 = 官方博客 kimi.com/blog/kimi-k3（Full Benchmark Table 是**文本表**，已抓全）
> 源 2 = simonwillison.net/2026/Jul/16/kimi-k3/

1. **官方原话（钩子的地基）**：「While its overall performance still trails the most powerful proprietary models, Claude Fable 5 and GPT 5.6 Sol, Kimi K3 demonstrated frontier-level performance across our evaluation suite」——官方**从没说**赢了 Fable 5。
2. **逐行对账（我自己按官方表算的，非引用他人）**：全表 **35 行**，K3 拿第一或并列第一的只有 **8 行**（其中 ZeroBench_main 23.0 是**平手**，故严格第一 = 7 行）。
   - K3 第一的 8 行：Program Bench 77.8｜SWE Marathon 42.0｜BrowseComp 91.2｜DeepSearchQA 95.0｜Automation Bench 30.8｜SpreadsheetBench 2 34.8（34.8 vs 34.7，差 0.1）｜ZeroBench_main 23.0（平）｜OmniDocBench 91.1
   - 对 Fable 5：赢或平 **13/35**。对 GPT 5.6 Sol：赢或平 **20/34**（有一行 Sol 无数据）。
   - **最诚实的一行**：`Kimi Code Bench 2.0 (Internal)` —— Moonshot **自己的内部编码榜**，K3 72.9，Fable 5 76.9。**在自家主场输给对手，还把它印在表里**。
3. **「击败 Fable 5」在哪成立**：Arena.ai 的 **Frontend Code arena** 单一榜单，K3 确实登顶、确实超过 Fable 5（Simon Willison 引 arena 官推）。→ **一个榜是真的，「全面击败」是假的**。这是全片最需要讲公道的一处。
4. **脚手架不对等（表底下最大的坑）**：官方脚注写明——**K3 用自家 KimiCode harness 评测，其他模型用 Claude Code 或 Codex harness**。同一个模型换脚手架分数能差一截（账号 07-13 选题池里正有「脚手架才是分水岭」一题）。
   - 更绕的一条：Fable 5 那列标着 **(max, with fallback)**，脚注 6 说明——Claude Code harness 下**被 Fable 5 用量政策拒绝的请求会自动回落到 Opus 4.8**。→ **Fable 5 那一列也不是纯 Fable 5**。这刀两边都砍。
5. **「开源」是期票**：权重承诺 **2026-07-27 前**发布，现在只有 API / 网页。Simon 原话「an open weight release is promised "by July 27, 2026"」。
6. **价格反转**：$3/MTok 输入、$15/MTok 输出（cache-hit 输入 $0.30）。较 K2.6 的 $0.95/$4 涨 3 倍多，**是中国实验室迄今最贵的模型**，与 Anthropic Sonnet 系列同档（Simon 判断）。「国产 = 便宜」这个默认预期不成立了。
7. **只有一个 max 思考档**：Simon 用 OpenRouter 让 K3 画一只骑自行车的鹈鹕 SVG——烧掉 **13,241 个 reasoning token**（总输出 16,658），一张图 **25 美分**。官方也承认发布时只有 max 档，low/high 后续再上。
8. **官方自己列的 Limitations 第 3 条**：「K3 nonetheless exhibits a noticeable gap in user experience compared with Claude Fable 5 and GPT 5.6 Sol」——**用户体验有明显差距，官方自己写的**。
9. **该给的公道**（不能只拆台）：K3 是首个 2.8T 开放级模型；Artificial Analysis 私测长时程知识工作 Elo 1547，**仅次于 Fable 5**，每任务成本 $0.94 ≈ Opus 4.8（$1.80）的一半；官方表里 Terminal Bench 2.1 88.3 也确实超过 Fable 5 的 84.6（但低于 Sol 的 88.8）。**这是一个很强的模型，只是没强到 X 上说的那样。**

## ⚠️ 数字纪律（本条特别注意）
- 选题报告里写的「AA-Briefcase 第二 1527」与实际不符：官方表是 **1548**、AA 自述 **1547**。**三个数打架 → 全片不提这个数**，只用官方表 1548 或干脆不提。
- Elo 类指标（GDPval-AA v2、AA-Briefcase）不是百分比，别跟准确率混着念。
- 「35 行里第一 8 行」是**我按官方表自己数的**，口播里要讲清「我数的」，不假装是官方结论。

## 口播骨架（钩子 → 分点 → takeaway）
- 冷开钩子（自成立、不依赖上文）：这两天你刷到的「国产开源模型击败 Claude Fable 5」——我把官方那张表从头到尾读了一遍，官方自己写的是「仍然落后 Fable 5」。
- 点1 官方原话打脸转发：博客第二段白纸黑字。传歪的不是 Moonshot，是转发的人。
- 点2 逐行数：35 行，第一只有 8 行；最狠的是自家 Kimi Code Bench 输给 Fable 5 还照印。
- 点3 那「第一」哪来的：Arena 前端代码榜——**一个榜是真的**。单榜第一 ≠ 全面第一，这是所有跑分新闻的通病。
- 点4 表底下的脚注才是肉：K3 用自家 KimiCode harness、别人用 Claude Code / Codex；Fable 5 那列还带 Opus 4.8 fallback。**脚手架不对等，两边都不干净**。
- 点5 另外两张期票：权重 7/27 才放，「开源」现在是期票；价格 $3/$15，国产最贵，涨了 3 倍多。
- takeaway：看跑分先看三样——**谁评的、什么脚手架、哪个榜**。官方博客往往比转发诚实，花两分钟读原文就能避开 90% 的智商税。互动：评论区扣「K3」，我把这张表逐行整理的对账笔记发你。

## 红线自检
- 全片数字只来自官方表 + Simon 原文，逐条可溯源；有争议的数（1527/1547/1548）直接不用。
- 不唱衰、不捧杀：明确给 K3 该给的公道（点9），标题是疑问句不是断言。
- 「击败 Fable 5」在 Arena 前端榜**确实成立**，必须讲，否则我自己就成了传歪的另一边。
- 无口播导流外链；「评论区扣 K3」= 强 CTA（benchmarks 打法：软 CTA 实测无效）。
- 无绝对化用词；第一人称口语化。
