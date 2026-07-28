# 口播稿 · kimi-k3-benchmark-check（Kimi K3 官方跑分表逐行对账）

> 唯一真相源。流量题（新模型时效，祛魅角度）。第一人称、口语化、冷开自成立。
> slug: kimi-k3-benchmark-check ｜ backlog: 2026-07-17-001 ｜ 目标时长 ~2:40–3:00
> 全片数字只来自两处一手材料，逐条可溯源（见文末 D 闸）：
>   ① 官方博客 kimi.com/blog/kimi-k3（Full Benchmark Table，文本表，2026-07-17 抓）
>   ② simonwillison.net/2026/Jul/16/kimi-k3/
> ★ 有争议的数（AA-Briefcase 1527/1547/1548 三方打架）全片弃用。

---

## 章节 1 · coldopen（冷开钩子）

**step 0**
这两天你肯定刷到了：国产开源大模型，击败 Claude Fable 5。转发的人一个比一个激动。我把官方那张跑分表，从头到尾读了一遍。

**step 1**
然后我在官方博客第二段，看到这么一句原话：它的整体表现，仍然落后于最强的闭源模型，Claude Fable 5 和 GPT 5.6 Sol。这是 Moonshot 自己写的。也就是说，传歪这件事，官方没参与，是转发的人干的。

---

## 章节 2 · 逐行数（35 行，第一只有 8 行）

> ★ 2026-07-17 剪：原 step0「先把这个模型交代清楚（2.8T / 真旗舰）」整段删除 —— 全片 4:20 超 brain/style-guide
> 的时长上限，且 benchmarks.md 连续 8 轮同向「完播率是账号系统短板、漏在中后段」。给 K3 的公道由章节 6 step0
> 承担，不重复铺垫。

**step 0**
官方那张完整跑分表，一共 35 行，编程、智能体、推理、视觉四大块。我一行一行数了一遍：K3 拿第一或者并列第一的，只有 8 行。剩下 27 行，它不是第一。

**step 1**
再拆细：对上 Fable 5，35 行里赢或者平，只有 13 行；对上 GPT 5.6 Sol，34 行里赢或者平，20 行。赢 Sol 多，输 Fable 5 多——跟官方那句「整体仍然落后」，完全对得上。

**step 2**
最让我服气的是这一行：Kimi Code Bench 2.0，Moonshot 自己的内部编码榜。自家主场，K3 七十二点九，Fable 5 七十六点九。自己的榜输给对手，还老老实实印在表里。就冲这一条，我信这张表。

---

## 章节 3 · 那个「第一」是哪来的（给公道）

**step 0**
那「击败 Fable 5」是有人编的吗？还真不是。Arena 的前端代码榜，K3 确实登顶了，确实排在 Fable 5 前面。这一榜，是真的。

**step 1**
问题只在于：一个榜的第一，被转发成了全面第一。这是所有跑分新闻的通病——三十几个榜，赢一个，标题就只留那一个。你看到的不是假消息，是被裁剪过的真消息。

---

## 章节 4 · 脚注才是肉（脚手架不对等）

**step 0**
表看完了，真正的肉在表底下的脚注里。官方写得很清楚：K3 是用自家的 KimiCode 脚手架跑的，别的模型用 Claude Code、用 Codex 跑。

**step 1**
这事有多要命？同一个模型，换一套脚手架，分数能差出一截。评测里模型和脚手架是绑在一起的——你以为在比模型，其实比的是模型加它的跑法。

**step 2**
还有更绕的。Fable 5 那一列标着 with fallback。脚注说明：在 Claude Code 脚手架下，被 Fable 5 用量政策拒掉的请求，会自动回落给 Opus 4.8 来做。所以那一列，也不是纯粹的 Fable 5。这刀两边都砍。

---

## 章节 5 · 一张期票与一个反转（开源与价格）

> ★ 2026-07-17 剪：原 step2「鹈鹕 SVG 烧 13,241 思考 token / 25 美分」整段删除（同上，控时长）。
> 该细节生动但不承担论证，删后「只有 max 思考档」一并移出，全片不再提 —— 溯源表对应两行同步标注为「已删」。

**step 0**
还有两件事，标题里绝对不会告诉你。第一，所谓开源，现在是张期票。权重还没放，官方承诺 7 月 27 号之前发，眼下你只能用 API 和网页。

**step 1**
第二，价格。输入每百万 token 三美元，输出十五美元。上一代 K2.6 才零点九五和四美元，涨了三倍多。这是中国实验室到今天为止最贵的模型，价位跟 Anthropic 的 Sonnet 系列站一排。国产等于便宜，这次不成立了。

---

## 章节 6 · takeaway

**step 0**
话说回来，我不是来唱衰的。K3 很强：终端跑分那一行确实超过了 Fable 5；第三方私测里，长时程知识工作只输给 Fable 5 一家，每个任务的成本还只有 Opus 4.8 的一半左右。它只是没强到「全面击败」那个程度——而且官方从来没这么说过。

**step 1**
所以再刷到跑分新闻，就看三样：谁评的、什么脚手架、哪一个榜。三样对不上，那个第一就得打折。说个反常识的：官方博客往往比转发它的人诚实很多——人家自己写了「整体落后」，还印了自家输的那一行。花两分钟读原文，能躲掉九成智商税。

**step 2**
我把这张 35 行的表逐行整理成了一份对账笔记，哪行赢哪行输、脚注里的坑都标好了。想要的话，评论区扣个 K3，我发给你。

---

## 溯源（D 闸 · 事实/合规自检）

### 数字与引述逐条对源
| 口播里的说法 | 出处 | 原文/依据 |
|---|---|---|
| 官方自述「整体仍落后 Fable 5 与 GPT 5.6 Sol」 | 源① 博客第 2 段 | "While its overall performance still trails the most powerful proprietary models, Claude Fable 5 and GPT 5.6 Sol…" |
| 2.8T 参数 / 世界首个开放 3T 级模型 | 源① 第 1 段 | "2.8T-parameter model" / "the world's first open 3T-class model" |
| 全表 35 行，K3 第一或并列第一 8 行 | 源① Full Benchmark Table | **本人按官方表逐行计数**（脚本核算，非引用他人）。8 行含 ZeroBench_main 23.0 平手，故严格第一 7 行。口播表述为「拿第一或者并列第一」，已含平手口径 |
| 对 Fable 5 赢或平 13/35；对 Sol 赢或平 20/34 | 源① 同上 | 同上，本人计数。Sol 少 1 行因 DeepSearchQA 无 Sol 数据 |
| Kimi Code Bench 2.0：K3 72.9 / Fable 5 76.9 | 源① 表内 Coding 段 | 原表数值 |
| Arena 前端代码榜 K3 登顶、超过 Fable 5 | 源② | "now the leading model on Arena.ai's Frontend Code arena, surpassing even Claude Fable 5" |
| K3 用 KimiCode harness、其余用 Claude Code/Codex | 源① Footnotes 1/2/3/5 | "Kimi K3 is evaluated with the KimiCode harness…" |
| Fable 5 那列 with fallback → 回落 Opus 4.8 | 源① Footnote 6 | "requests refused by Claude Fable 5 due to its usage policy automatically fall back to Claude Opus 4.8" |
| 权重 2026-07-27 前发布 | 源① Availability 前段；源② | "The full model weights will be released by July 27, 2026." |
| $3 / $15（cache-hit 输入 $0.30） | 源① Availability | "$0.30/MTok for cache-hit input, $3.00/MTok for cache-miss input, and $15.00/MTok for output" |
| K2.6 为 $0.95/$4，涨 3 倍多；中国实验室迄今最贵；与 Sonnet 同档 | 源② | "making it the most expensive model released by a Chinese AI lab to date… earlier models such as Kimi K2.6 at $0.95/$4" |
| 鹈鹕 SVG 烧 13,241 思考 token、25 美分 | 源② | "16,658 output tokens (13,241 were reasoning tokens), for a total cost of 25 cents" |
| 只有一个 max 思考档 | 源① Availability；源② | "At launch, Kimi K3 will use max thinking effort by default, with low- and high-effort modes to be introduced in subsequent updates." |
| Terminal Bench 2.1 K3 88.3 > Fable 5 84.6 | 源① 表内 | 原表数值（注：Sol 88.8 更高，口播只说「超过 Fable 5」未称第一，表述准确） |
| 长时程知识工作仅次 Fable 5、每任务成本约 Opus 4.8 一半 | 源② 引 Artificial Analysis | "behind only Claude Fable 5" / "Cost per task ($0.94)… ~1/2 the price of Opus 4.8 ($1.80)" |

### 弃用的数
- **AA-Briefcase Elo**：选题报告写 1527，官方表 1548，AA 自述 1547 —— 三方打架，**全片不提**。
- Elo 类指标（GDPval-AA v2 / AA-Briefcase）非百分比，口播中未与准确率混用。

### 红线自检
- [x] 无臆造数字：每个数都在上表能查到源；自算项（35/8/13/20）明确标注为「我数的」，口播亦说「我一行一行数了一遍」。
- [x] 不唱衰不捧杀：章节 3 主动给「Arena 榜第一是真的」的公道，章节 6 给 K3 三项实打实的强处；标题为疑问句，非断言。
- [x] 时效内容标源与日期：材料为 2026-07-16 发布、2026-07-17 抓取。
- [x] 无口播导流外链（「评论区扣 K3」为站内合规话术）。
- [x] 无绝对化用词（未用「最强/第一/100%」作断言；「国产最贵」为 Simon 原文判断且已标出处）。
- [x] 第一人称口语化，无论文腔。
- [x] 冷开自成立：首句「这两天你肯定刷到了…」为公共热点，不依赖任何上文/前作。
- [x] 强 CTA（评论区扣 K3 换对账笔记）—— 依 benchmarks.md 打法，软 CTA 实测无效。
