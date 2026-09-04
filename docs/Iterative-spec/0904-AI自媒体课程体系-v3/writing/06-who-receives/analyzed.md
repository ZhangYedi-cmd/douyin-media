---
topic: 一个验证信号最后回给谁，决定这条流水线能不能自己纠错
audience: 会用 Claude Code、没做过自动化流水线的学员，手上没有参考仓库，只有前五课自己做出来的东西
mode: new
series_context: 《AI 自媒体流水线》v3 第 06 课，模块 1「单条内容」第二课，心法课（篇幅按讲透为准，可到八九千字）
---

## 核心问题
AI 工具能不能自己纠错，看的是一步检查跑完之后，那个验证结果最后回给了谁，不是看用了什么框架或者模型能力强不强；落到学员自己那条流水线上，就是把检查点摊开，一格一格看它现在回给谁、以后该回给谁。

## 材料清单

1. [出处] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/00-写作背景包.md` —— 定四条铁律（学员不写代码、Prompt 输入必须是学员已有的东西、零编造、禁装逼）、教法分档、每课形状（三到六步、四段式、一课一产物）、心法课往厚里写的口径。支撑全文的写法约束。
2. [出处] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/cards/06.md` —— 本课任务卡，钉死大纲四节、记忆锚点、开篇契约、承接三行、材料清单、验收参数「方法论」。支撑 outline.md 直接展开，不再自选。
3. [出处] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/handoff-ledger.md` 第 05、06 行 —— 05 课成稿本机尚不存在（并发写作），按台账口径承接：上一课交付 `build/` 工程、`final.mp4`、封面、`tts-dub` skill；结尾问题是「谁来看这个还行」。支撑开篇契约与结尾抛出的问题。
4. [出处] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/inventory.md` 第 05 课那一节 —— 学员写到本课之前手上具体有什么：五份阶段契约、四份填满的 brain、tts.config.json、`build/` 工程、`final.mp4`、`cover.png`、字幕层。核对本课每条 Prompt 的输入必须在这张表里。这张表里没有：真实仓库任何路径（`pipeline/2-create.md` 的 85 行版本、`dubbing-check` 六个脚本、`dubbing-reviewer` 子代理）——这些是我读仓库拿判据用的材料，不能写进学员的 Prompt 输入里当成他手上已有的东西。
5. [案例/反例] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/old-courses/v1-02-状态机思维.md` —— 旧稿给了一张四代对照表（Chatbot / Agent / Harness / Loop）和三条工程设计（结构化信封、带改法的判决、三轮熔断）。本课只用它的「四代演进，一刀切法看信号回给谁」这个骨架，第三代要按任务卡改名「护栏代」并加撞名括注；三条工程设计属于第 07 到 10 课范围，本课不展开，只留一句指路。
6. [案例] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/old-courses/mini-v3-06.md` —— 另一台机器写过的同课成稿，口径参考：六个检测脚本的真实三比三分法（`check-completeness`、`check-source-sync`、`check-silence` 有 `process.exit`；`check-pace`、`check-pronunciation`、`check-av-consistency` 没有或只在异常分支退出）；退出码会骗人的真实事故（`depause.mjs` 原地写导致静默失败、exit 0）；判流向文档还是没人管的判据（说不说得出文件名）。只当素材看口径，不能抄它的六节结构，本课按任务卡四节大纲重写。
7. [事实核验] `pipeline/2-create.md` 全文 —— 真实仓库的创作阶段契约，用来核实配音审批闸口（步骤 4，`dubbing-reviewer` 子代理，最多 3 轮，reviewer 只判不改）、死气检查（`rec/depause.mjs`，`cap 0.25 / minact 0.45`）、终检闸七组的真实字段名。这是我用来保证判据不编造的材料，不作为学员的 Prompt 输入出现。
8. [事实核验] `pipeline/3-review.md` 全文 —— 真实仓库的人审阶段契约，六项人审清单（事实/时效/定位/语气/合规/观感）、飞书通道、打回记入 `3-review.md`。用来核实「流向人」这一格的真实长相。
9. [事实核验] `.claude/skills/dubbing-check/scripts/` 六个脚本文件名 + `process.exit` 出现位置 grep 结果 —— 六个脚本按退出码有无分两类：`check-completeness.mjs`（第 30 行）、`check-source-sync.mjs`（第 47 行）、`check-silence.mjs`（第 42 行）三个给 PASS/FAIL 退出码；`check-pace.mjs`、`check-pronunciation.mjs` 全篇无 `process.exit`；`check-av-consistency.mjs` 只在目录不存在时退 1（第 10 行），正常路径不退出。这组事实支撑「同一批脚本天然分两半，退出码不是脚本会不会写，是问题本身能不能写成不看语境的判断」。
10. [出处] `CLAUDE.md`「流程纪律」节 —— 工作日全自动只跑到出审为止、发布必须人审通过；阻塞即上报；状态记账唯一入口 `media`。支撑「流向人」这一格里，人不是可有可无而是流程刻意留的闸。
11. [事实核验] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/03-立骨架-仓库、目录、契约.md` 第 3 节 —— 学员自己第 03 课写的五份契约长什么样：骨架只有四件事（输入/输出/状态翻转/闸口），创作契约现在的体量是学员口述出来的，比真实仓库的 85 行短得多，两处闸口（配音审批、出审前终检闸）是学员自己写进去的名字。这条材料决定了本课 Prompt 不能假设学员的契约像真实仓库那样列了六个脚本名，只能让 AI 读学员自己写的那份，列出来多少算多少。

## 材料缺口
无实质缺口，8 条以上核验材料齐全。唯一需要注意的收窄：第 3 节的 Prompt 设计不能预设学员的 `pipeline/2-create.md` 里已经写出「六个检测脚本」这种细节——学员第 03 课写的契约只到「配音审批」这个闸口名字，脚本级的细节要到第 07、08 课才会出现在学员自己的仓库里。本课第 4 节收尾时可以用真实仓库六脚本三比三这条事实做旁证（写清楚这是仓库里的例子，不是学员此刻能查到的东西），但不能要求学员现在就把自己的检查点拆到脚本粒度。
