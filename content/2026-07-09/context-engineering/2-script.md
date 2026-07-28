# 上下文工程：怎么把 10 万 token 的 AI 会话压到 2 万，还不丢关键信息

> 口播稿唯一真相源（2-create 步骤 1）。改 narration 必先改这里，再 `npm run extract-narrations` 重抽、`rm` 改动段 mp3 重合成。
> 16:9 横屏 · 三章 15 段 · 预计 ~3.3min（~1150字÷5.5字/秒）。
> 溯源：Anthropic 官方工程博客 + Manus 实践博客（两篇一手）+ Chroma context rot 研究 + 两个开源 repo，详见文末。

---

## 第一章 · 冷开钩子（coldopen，2 段）

**[1]** 你有没有过这种时刻：用 AI 写代码，聊到一半它突然失忆，前面说好的需求、定好的方案，它全忘了，还越跑越慢、账单越滚越贵。很多人第一反应是模型不行，其实是你不会经营上下文。

**[2]** 今天讲上下文工程，一套能把十万 token 的会话压到两万量级、还不丢关键信息的打法。五招，都能直接上手。先说一个反直觉的前提。

## 第二章 · 主体（build，10 段）

**[3]** 很多人以为上下文窗口越大越好，塞满就完事。恰恰相反。Chroma 有个研究叫 context rot：喂进去的 token 越多，模型从里面准确捞回信息的能力反而下降。窗口大，不等于它真记得住。

**[4]** Anthropic 说得更直白：模型和人一样，注意力是有预算的，每多一个 token 就从预算里扣掉一点。所以上下文工程的核心不是塞得更多，是塞得更准，挑出信息密度尽量高的那一小撮 token。想清楚这点，后面五招才好理解。

**[5]** 第一招，压缩，也叫 compaction。会话快撑满时，让模型把前面的历史总结成一份摘要，再拿摘要开一个干净窗口接着聊。Claude Code 就是这么干的：保留架构决策、没解决的 bug、关键实现，丢掉冗余的工具输出。

**[6]** 压缩里有个很省事的做法，叫清理工具结果。一个工具调用完了，那一大坨原始返回值没必要一直挂在上下文里，用过就清掉。这是很轻、也很安全的压缩，Anthropic 的开发平台已经做成了现成功能。

**[7]** 第二招，把文件系统当记忆。别啥都往上下文里塞，状态写到上下文之外的文件，要用再读回来。Manus 的关键是压缩要可恢复：一个网页，正文可以丢掉，只留住网址；文档同理，留个路径就行。信息没丢，只是挪到了外面。

**[8]** 第三招，用子 agent 隔离上下文。让专门的子 agent 顶着干净窗口去啃某个细活，它自己可能烧掉几万 token 到处翻，但只回吐一两千 token 的提炼结论。脏活累活留在子 agent 里，主线上下文始终清爽。

**[9]** 第四招，按需检索，用到才拉。别把所有资料提前一股脑全塞进去，只留轻量的指针：文件路径、一个查询、一个链接，真用到时再拿工具拉进来。Claude Code 里的 glob 和 grep 就是这思路，现查现用，不预先囤。

**[10]** 第五招，复述。Manus 有个细节：处理复杂任务时，它会建一个 todo 文件，每做一步就重写一遍。这不是花架子，是故意把当前目标反复推到上下文末尾，顶进模型的近期注意力，专治长对话跑着跑着就忘了要干嘛。

**[11]** 但有一条要记住：别压过头。Anthropic 和 Manus 都提醒过，压得太狠，会丢掉那种当时看着没用、走到第十步才发现关键的信息。所以好的压缩都是可恢复的，宁可留个指针，也别一刀切干净。

**[12]** 你可能会问，费这劲值吗。给个成本感：上下文塞得越满，不光慢，还烧钱，每个 token 都要花钱传输和预填充。Manus 给过一个数：同样的输入，命中缓存和没命中，成本能差到十倍。经营好上下文，省的是实打实的账单。

## 第三章 · 结论收官（ending，3 段）

**[13]** 所以一句话收：把上下文当稀缺资源来经营，别当垃圾桶随便塞。窗口再大也架不住乱塞，塞得准，比塞得多重要。

**[14]** 落地别贪多，先上两招门槛低的：调用完的工具结果随手清掉，关键状态和进度写进一个文件。这两样几乎零成本，立竿见影。模型往后再怎么迭代，这套经营上下文的思路都用得上。

**[15]** 你上下文爆炸的时候一般怎么救的，或者这五招你打算先从哪个上手，评论区扣一下，互相抄作业。

---

## 溯源

- **[1] 上下文爆炸导致失忆 / 变慢变贵**：现象在 Anthropic 与 Manus 两篇博客均有对应机理（注意力预算耗尽致回忆下降；长输入更慢更贵）。属实，非口嗨。
- **[3] context rot：token 越多回忆越差**：Anthropic 博客引用 Chroma 研究 context rot 原文"as the number of tokens in the context window increases, the model's ability to accurately recall information from that context decreases"。来源 https://research.trychroma.com/context-rot 。
- **[4] 注意力是有限预算 / 塞得准而非塞得多**：Anthropic 博客原文"LLMs have an 'attention budget'...Every new token introduced depletes this budget"、"find the smallest set of high-signal tokens that maximize the likelihood of your desired outcome"。来源 https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents 。
- **[5] 压缩 compaction / Claude Code 保留架构决策·bug·实现、丢冗余工具输出**：Anthropic 博客"Compaction"节原文"summarizing its contents, and reinitiating a new context window with the summary"、"preserves architectural decisions, unresolved bugs, and implementation details while discarding redundant tool outputs"。同上链接。
- **[6] 工具结果清理 = 最轻的压缩、已成开发平台功能**：Anthropic 博客原文"One of the safest lightest touch forms of compaction is tool result clearing, most recently launched as a feature on the Claude Developer Platform"。同上链接。
- **[7] 文件系统当记忆 / 可恢复压缩（丢网页正文留 URL、丢文档正文留路径）**：Manus 博客"Use the File System as Context"节原文"the content of a web page can be dropped from the context as long as the URL is preserved, and a document's contents can be omitted if its path remains available"。来源 https://manus.im/en/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus 。Anthropic 博客"structured note-taking / memory tool"节亦印证（NOTES.md、file-based memory）。
- **[8] 子 agent 隔离 / 烧几万 token 只回吐 1-2 千**：Anthropic 博客"Sub-agent architectures"节原文"Each subagent might explore extensively, using tens of thousands of tokens or more, but returns only a condensed, distilled summary of its work (often 1,000-2,000 tokens)"。同 Anthropic 链接。
- **[9] JIT 按需检索 / 轻量指针 / Claude Code glob·grep**：Anthropic 博客"just in time"节原文"maintain lightweight identifiers (file paths, stored queries, web links...) and use these references to dynamically load data into context at runtime"、"primitives like glob and grep allow it to navigate its environment and retrieve files just-in-time"。同 Anthropic 链接。
- **[10] 复述 recitation / todo.md 每步重写推到上下文末尾对抗 lost-in-the-middle**：Manus 博客"Manipulate Attention Through Recitation"节原文"By constantly rewriting the todo list, Manus is reciting its objectives into the end of the context...avoiding 'lost-in-the-middle' issues"。同 Manus 链接。
- **[11] 别过度压缩 / 压缩要可恢复**：Anthropic 博客"overly aggressive compaction can result in the loss of subtle but critical context whose importance only becomes apparent later"；Manus 博客"any irreversible compression carries risk"、"compression strategies are always designed to be restorable"。两篇均有。
- **[12] 长输入更贵 / 缓存命中差 10 倍（Claude Sonnet 缓存 0.30 vs 非缓存 3 美元/百万 token）**：Manus 博客原文"cached input tokens cost 0.30 USD/MTok, while uncached ones cost 3 USD/MTok — a 10x difference"、"Long inputs are expensive...you're still paying to transmit and prefill every token"。同 Manus 链接。**为厂商所引单价示例，口播已标注"Manus 给过一个数"，非普适定价承诺。**
- **[14] 落地先上两招（工具结果清理 + 状态写文件）**：分别对应 [6] Anthropic 工具结果清理 + [7] 文件/笔记记忆，均有出处。
- **冷开自成立**：[1] 首句"你有没有过这种时刻：用 AI 写代码聊到一半它突然失忆"直接陈述通用场景，3 秒站得住，不依赖任何前情（非系列内容）。
- **合规**：无违禁/绝对化承诺（已回避"最/第一/唯一/100%/永远"等词，技法均为客观机制描述）；[15] 互动引导为评论区具体提问（问"怎么救 / 先用哪招"），非站外导流；未编造任何数字/benchmark，[12] 单价为 Manus 原文所引并已标注来源方，"十万→两万"为技法可达量级示意（非实测精确压缩率）。
