# 1-brief · karpathy/autoresearch 源码速读

> 据 backlog 条目 2026-07-08-006 写。喂给 pipeline/2-create.md。

## 选题
- backlog id：2026-07-08-006（07-08 调研批，score 4.00，tier S）
- track：depth（源码/设计拆解，立身支柱）
- format：口播视频（16:9 横屏）
- 建议标题：karpathy 新仓 autoresearch：让 AI 整夜自己做 AI 研究，源码就三个文件

## 为什么做这条
- 池内 4.55/4.50/4.30 三条最高分均需人工上手实测（自动 run 踩「不臆造 benchmark」红线），本条 4.00 是能诚实自动做完里的最高分。
- karpathy 出品 = 社交货币满格；源码/设计拆解接续账号立身心智；「AI 自己做 AI 研究」= 卧槽钩子。

## 核心料（全部可溯源，见 2-script.md 文末溯源节）
- 定位：给 AI agent 一个真的小型 LLM 训练环境，整夜自主实验——改代码→训 5 分钟→看分→留好删差→循环。醒来得到实验日志 + 更好的模型。
- 三文件：prepare.py（只读裁判：数据/评测/常量）｜ train.py（agent 唯一可改：模型/优化器/训练循环/超参，630 行，无 CLI flag）｜ program.md（人写的 agent 指令 = 超轻量 skill）。
- 关键设计：① 固定 5 分钟预算→实验可比、一晚约 100 次；② 单一指标 val_bpb（越低越好、跟词表无关→架构改动可公平比，口播只讲性质不念名/不报分）；③ 每实验一次 git commit，好则 advance 分支、差则 reset，results.tsv 留痕（keep/discard/crash）。
- 约束 + 准则：不改裁判/不装包/不改评测；简单性优先（删代码拿同分=大胜）。
- 范式：不是调 Python，是「编程 program.md」=写「研究组织怎么运转」，人退到设计流程层、把执行外包给 agent。
- takeaway：这套「固定预算+单一可比指标+单文件可改+git留痕+简单优先」骨架，可照搬到任意「改一版→跑指标→留/弃」的优化任务；官方要 H100，社区已 fork 到 Macbook/Windows/AMD。

## 交付
- 口播成品 mp4（横屏）+ 9:16 竖版封面 + 4-publish.md，做到出审停。
- 封面：品牌一致原创视觉（非系列吉祥物/EPxx）。
