# 口播稿 · karpathy/autoresearch 源码速读

> 唯一真相源。深度题（源码/设计拆解，立身支柱）。第一人称、口语化、冷开自成立。
> 目标时长 ~1:50–2:10。全片可溯源，不臆造 benchmark 数字（val_bpb 只作「越低越好的指标」讲）。
> slug: karpathy-autoresearch ｜ backlog: 2026-07-08-006

---

## 章节 1 · coldopen（冷开钩子）

**step 0**
你睡觉的时候，一个 AI 整晚在改你的模型代码、跑训练、看分数，好的留下、差的删掉，一晚上跑了上百个实验。你早上醒来，桌上多了一份实验记录，和一个更强的模型。

**step 1**
这不是科幻。是 karpathy 上个月悄悄开的一个仓，叫 autoresearch。它想干的事就一句话：让 AI 自己做 AI 研究。我把源码扒了一遍，整个仓就三个文件，但设计得很讲究——今天讲清楚它凭什么真能跑起来。

---

## 章节 2 · three-files（三个文件的分工）

**step 0**
第一个文件，prepare.py，只读。数据怎么准备、成绩怎么打分、有哪些固定常量，全在这。agent 一个字都不许改。你可以把它理解成裁判——它保证每一场实验的规则都一模一样。

**step 1**
第二个，train.py，是唯一让 agent 动手改的文件。六百多行，把整个 GPT 模型、优化器、训练循环，还有一堆超参，全塞进这一个文件，连命令行参数都不要，想调哪直接改哪。agent 干活，就跟它一个文件死磕。

**step 2**
第三个，program.md，是人写的，给 agent 的说明书，karpathy 自己管它叫「一个超轻量的 skill」。所以分工特别清楚：人编程 program.md，agent 编程 train.py，裁判 prepare.py 谁都别碰。

---

## 章节 3 · key-design（它凭什么跑得起来）

**step 0**
第一个关键设计：固定 5 分钟。不管这次改大改小，训练都只跑 5 分钟。好处很实在——两个实验直接能比，你不用去纠结谁多训了会儿。按这个节奏，一晚上大概能跑一百个实验。

**step 1**
第二个：只认一个分数，越低越好，衡量的是模型压缩数据的能耐。妙在这个指标跟词表大小无关，所以哪怕你把模型架构大改一遍，两次成绩照样能公平地比。

**step 2**
第三个：每个实验，就是一次 git 提交。分数变好，就把分支往前推、把这次改动留下；没变好或者更差，直接 reset 回去，当无事发生。改了啥、跑了多少分、留还是弃，全记在一张表里，一目了然。

---

## 章节 4 · paradigm（约束 + 真正的妙处）

**step 0**
它的约束卡得很死：不准改裁判、不准装新包、不准动评分。还有一条我特别喜欢的准则——同等效果下，越简单越好。删掉一段代码还能拿到一样的分，这不算亏，这叫大胜。

**step 1**
但最妙的是这句话：你不是在调 Python，你是在「编程那份说明书」。你真正写的，是「一个研究团队该怎么运转」——人往后退一步，退到设计流程那一层，把具体执行，整个外包给 AI。

---

## 章节 5 · ending（takeaway + 互动）

**step 0**
别把它只当成训模型的玩具。固定预算、一个可比的分数、单文件可改、每步 git 留痕、简单优先——这套骨架，你任何一个「改一版、跑个分、好就留差就弃」的优化活儿，都能照搬。官方虽然要好显卡，社区已经有人 fork 到 Macbook、Windows 上能跑。

**step 1**
所以问题来了：你敢让 AI 整晚改你的代码、一直跑到天亮吗？评论区聊聊。想自己上手的，去 GitHub 搜 karpathy autoresearch。

---

## 溯源（事实合规 · D 闸）

全部事实来自 karpathy/autoresearch 公开仓，2026-07-10 经 agent-reach 读取核对：

- 仓库与定位：`https://github.com/karpathy/autoresearch` —— README 原文「give an AI agent a small but real LLM training setup and let it experiment autonomously overnight … You wake up in the morning to a log of experiments and (hopefully) a better model」。karpathy 2026 年 3 月标注。
- 三文件分工：README「How it works」+ `program.md`。prepare.py = 只读（固定常量/数据/评测），train.py = agent 唯一可改（模型/优化器/训练循环/超参），program.md = 人写的 agent 指令，README 原话「essentially a super lightweight skill」。
- train.py 六百多行：实际 630 行（agent-reach 拉取 master 分支 `wc -l` = 630），含 GPTConfig/GPT/MuonAdamW/训练循环 + 超参区（DEPTH=8、WINDOW_PATTERN 等直接写死、无 CLI flag）。
- 固定 5 分钟 + 约一百个实验：program.md「fixed time budget of 5 minutes」；README「approx 12 experiments/hour and approx 100 experiments while you sleep」。
- 单一指标（口播说「越低越好、跟词表无关」）：README「The metric is val_bpb (validation bits per byte) — lower is better, and vocab-size-independent so architectural changes are fairly compared」。★口播不念指标英文名，只讲性质，避免臆造具体分数。
- git 每步留痕 / keep-discard / results 表：program.md「The experiment loop」第 8–9 步「If val_bpb improved you advance the branch … If equal or worse you git reset back」+「Logging results」results.tsv（commit/val_bpb/memory/status: keep|discard|crash/description）。
- 约束 + 简单性准则：program.md「What you CANNOT do」（不改 prepare.py、不装新包、不改评测）+「Simplicity criterion … removing something and getting equal or better results is a great outcome」。
- 「编程 program.md」范式：README「you're not touching any of the Python files … Instead, you are programming the program.md Markdown files that provide context to the AI agents and set up your autonomous research org」。
- 平台与 fork：README「Requirements: A single NVIDIA GPU (tested on H100)」+ Notable forks（MacOS/Windows/AMD）。口播弱化为「官方要好显卡，社区 fork 到 Macbook、Windows 能跑」，不点具体型号避免歧义。

> 合规：无绝对化用词、无口播导流外链（引导「去 GitHub 搜」为合规话术）、无未证实数据。
