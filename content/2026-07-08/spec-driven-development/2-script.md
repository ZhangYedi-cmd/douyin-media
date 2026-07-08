# AI圈突然都在说的 Spec Coding，到底在解决什么问题

> 口播稿唯一真相源（2-create 步骤 1）。改 narration 必先改这里，再 `npm run extract-narrations` 重抽、`rm` 改动段 mp3 重合成。
> 16:9 横屏 · 三章 15 段 · 预计 ~3.5min（~1138字÷5.5字/秒）。
> 调研底稿：知识库 `~/Documents/Knowledge Forge/40-Atoms/`（Spec-Driven-Development 相关 11 条原子笔记）+ 7 篇一手信源，详见文末溯源。

---

## 第一章 · 冷开钩子（coldopen，2 段）

**[1]** AI写错了代码，你说它错了，它立刻回你「你说得对，我马上修」，然后压根没修对。这半年，GitHub、亚马逊，一堆AI公司都在推同一个词：Spec Coding，想解决的就是这个尴尬。

**[2]** 写代码前，先让AI把「要干什么」写成说明书。人和AI都照它来，不是靠一句话让AI自己脑补。今天我把几家的做法扒了一遍，顺便告诉你这事到底成不成熟。

## 第二章 · 三个认知点（build，10 段）

**[3]** 先说为什么需要它。AI写代码有个老毛病——过度自信。拿到一句简短需求就敢动手，写错了还嘴硬说修好了，遇到冷门开源库，容易凭感觉编一个不存在的函数。

**[4]** 还有一点，代码库越大，AI为了完成你交代的这一个任务，越可能悄悄把别的功能改坏——行话叫「reward-seeking」，先把眼前的活干完，管它牵连了啥。

**[5]** 还有个更本质的问题：需求从你脑子里到写成代码，要经过好几次转手——先变产品需求，再变技术方案，再变代码。微软今年6月一篇博客说得直白：每次转手都可能走样，靠聊天记录传需求，复杂度一高必然对不上。Spec，就是想把这份说明书显性地留下来，变成人和AI共同的真相来源。

**[6]** 现在做这件事的主要是四家。先看GitHub Spec Kit，微软背后推的，流程最完整——先立「宪法」定原则，再写需求、消歧义、出方案、拆任务、最后实现，一套走完能生成七八份文档，是这里面最规范也最重的一个。

**[7]** 亚马逊的Kiro，直接做成IDE产品，只用三步：需求、设计、任务。最大亮点是「hooks」——存文件、提交代码这些动作能自动触发检查，比如自动扫有没有漏了密钥。

**[8]** Tessl走得最激进，想让说明书直接就是代码——人只改说明书，代码顶部写着「生成的，别手动改」。它还做了个说明书库，收了一万多条开源库的精确用法，专治AI瞎编API。

**[9]** 还有个OpenSpec，开源轻量，专盯存量项目——前面几家教程大多从零建新项目，但真实工作大部分是在改老代码，这个刚好补上这块空。

**[10]** 这些工具现在都还挺糙。有人拿一个很小的bug去测Kiro，结果被拆成4个用户故事、16条验收标准——用大锤砸核桃，小问题办得更慢。

**[11]** 用Spec Kit测一个中等功能，产出七八份markdown要你审，他说了句大实话：我宁愿直接看代码。就算写了这么多规则，AI照样挑着不听——上下文窗口变大，不代表它真把内容都当回事。

**[12]** 也有实打实的效果：微软有个案例。每次新增一种资产类型，以前都要重写一遍，后来做成模板化说明书。交付周期从两三周压缩到几天——不过这是厂商自己的案例，效果因团队而异，别直接照搬预期。

## 第三章 · 结论与收官（ending，3 段）

**[13]** 所以结论是什么？这个理念是对的——写代码前把「要干什么」讲清楚，这件事永远有价值。

**[14]** 但工具层面还早期，别一上来就套最重的那一套。先养成「把需求写清楚再动手」的习惯，就够了。

**[15]** 你写Spec会用哪家？评论区扣个名字，顺便说说踩过的坑。

---

## 溯源

- **[1] AI写错还嘴硬「已经修好了」/ GitHub·亚马逊·Tessl近期扎堆推**：Tessl 官方博客原话"they are quick to apologize... but are very likely to claim the problem is solved even if it 'absolutely isn't'"；GitHub Spec Kit、AWS Kiro、Tessl 均为近期活跃项目（见对应仓库/博客）。属实，非口嗨。
- **[3][4] 过度自信+编造API / reward-seeking牵连其他功能**：均为 Tessl 官方博客原文论证，见知识库 `AI-Agent-可靠性问题-为什么需要Spec.md`。原文："agents often hallucinate APIs"、"will happily burn down the house in the process"。
- **[5] 意图传递损耗 / 微软6月博客**：微软开发者博客 2026-06-10 发布，原文四个交接点（干系人→需求→架构→实现→验收）+ "spec become the shared source of truth"，见知识库 `SDD-意图传递损耗问题.md`。
- **[6] GitHub Spec Kit 七步流程+七八份文档**：官方仓库工作流 Constitution→Specify→Clarify→Plan→Tasks→Implement→Validate；文档数依据 Fowler 实测截图（spec/plan/tasks/data-model/research/api/component 等7份+contracts目录）。见 `GitHub-Spec-Kit-框架详解.md`。
- **[7] Kiro 三步+hooks自动扫密钥**：Kiro 官方博客原文 hooks 示例"security hooks scan for leaked credentials"，三步为 Requirements→Design→Tasks。见 `AWS-Kiro-Spec-IDE.md`。
- **[8] Tessl spec-as-source + DO NOT EDIT + 一万多条说明书**：Tessl 官方博客"over 10,000 Usage Specs"；spec-as-source 标注见 Fowler 实测截图 `// GENERATED FROM SPEC - DO NOT EDIT`。见 `Tessl-Framework-与-Spec-Registry.md`。
- **[9] OpenSpec 开源轻量专攻存量项目**：官方仓库原文"built for brownfield not just greenfield"；"前面工具教程多为从零建项目"为 Fowler 实测原话总结。见 `OpenSpec-轻量级规范工作流.md`。
- **[10] Kiro小bug测出16条验收标准**：Fowler 原文实测数据"4 'user stories' with a total of 16 acceptance criteria"，"像用大锤砸核桃"为其原话比喻直译。见 `SDD-实践批判-冗余与虚假控制感.md`。
- **[11] spec-kit七八份markdown+agent无视指令**：Fowler 原文"a LOT of markdown files"+具体案例（agent把已有代码当新需求重新生成造成重复）。见同上。
- **[12] 2-3周压缩到几天案例**：微软开发者博客原文案例，"reduced onboarding time from 2–3 weeks to a few days"。见 `SDD-ROI案例-入职周期从周到天.md`。**已在口播中注明"厂商自己的案例，效果因团队而异"，不作普适性承诺。**
- **冷开自成立**：[1] 首句直接陈述"AI写错代码嘴硬"这一具体现象，3秒站得住，不依赖任何前情。
- **合规**：无违禁/绝对化承诺（"唯一"用于客观技术差异化描述，非营销自夸）；[15]互动引导为具体的评论区提问（问"用哪家工具"），非空泛套话、非站外导流；未编造任何数字/benchmark，[12]数据已标注来源方与适用限制。
