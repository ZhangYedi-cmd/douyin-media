---
plan: A
length: standard (3000–4500 汉字, ≤200 代码行)
figures: 1 mermaid 链路图（第 1 节讲解后）
sections: 8（含收尾）
title: 用开源 Skill 跑通第一条内容：从口播稿到成片与封面
series_position: L2；上承 L1 端到端走查，下接 L3 验证信号流向谁
---

## 1. 这一课要跑通什么
核心判断: 一条成片的生产链由四个开源 skill 接力完成，人只在五个点确认，其余步骤由 AI 和脚本推进。
支撑材料: 2-create.md 分支 A 四件套；SKILL.md 工作流总览；content/2026-08-23/claude/build 目录树
交付物: 输入/产出清单 + 五个确认点表（点 / 谁停下 / 你看什么）+ mermaid 链路图
二级标题: none
收尾交接: 确认点从第一个开始：口播稿。

## 2. 口播稿：第一句删掉上文还成立吗
核心判断: 口播稿是全链路唯一真相源，第一句必须不依赖上文自成立，这是人在这一步唯一要审的事。
支撑材料: 2-create.md 步骤 1 冷开铁律；SCRIPT-STYLE.md 每句 ≤20 字 / cold open；ep12 2-script.md 首句真实样例
交付物: 让 AI 出口播稿的 Prompt（内联）+ 两个审查点（首句自成立、每句 ≤20 字）+ 排障句（首句带承接词怎么改）
二级标题: none
收尾交接: 稿子定了，交给 skill 做网页，它会在一个地方停下来等你。

## 3. 让 skill 做网页：一次对齐五件事，第一章必须你验收
核心判断: web-video-presentation 把人工确认压缩到两处，Checkpoint Plan 一次对齐五件事，第 1 章做完停下等验收，之后的章节按你选的模式推进。
支撑材料: SKILL.md Phase 1 / Checkpoint Plan / 2.2 第 1 章强制 anchor / 2.3 模式 A/B/C；outline 不写动画的边界表；CHAPTER-CRAFT.md 标题（逐步揭示 / 双源 / 反 AI 味）；脚手架核验（23 套主题、data-no-advance、token）
交付物: 调用 skill 的 Prompt（内联）+ Checkpoint Plan 五件事怎么答（表）+ 第 1 章验收清单 4 条 + 排障句（outline 写了动画怎么办）
二级标题: 3.1 五件事一次对齐；3.2 第一章验收看什么；3.3 后面的章节选哪种模式
收尾交接: 网页有了，但声音还是文字。先把文字从组件里抽出来。

## 4. 抽分段：段数等于动画步数，改文案必重抽
核心判断: narrations.ts 是 step 数和音频的唯一真相源，extract-narrations 产出的 audio-segments.json 是配音输入，两者不同步就是音画不符的根源。
支撑材料: SKILL.md 关键约束（最大 step + 1 = narrations.length）；content/2026-08-23 narrations.ts 与 audio-segments.json 真实样例；lessons L2 反例（改 narration 没重抽，两轮截图检查没抓到）
交付物: 命令块 `npm run extract-narrations` + audio-segments.json 对照样例 + 两个审查点（段数对齐、无空串段）+ 排障句（画面新文案声音旧文案）
二级标题: none
收尾交接: 分段文案就位，交给配音引擎。

## 5. 配音：复制模板只改配置，先探余额再批量
核心判断: 音色、语速、多音字全在 tts.config.json 里，换工程只改配置不动代码；批量合成前先单段试跑，余额耗尽返 1008 就停线上报。
支撑材料: tts-dub SKILL.md 输入格式 / config 字段表 / 五条坑解法；brain/tts.config.json 模板原文；2-create.md 步骤 3 余额探测；lessons L9
交付物: 命令块（复制 config、单段试合成、批量合成）+ config 字段表（4 行）+ 审查点（mp3 数 = 段数、非空段 >1KB）+ 排障句（1008）
二级标题: none
收尾交接: 声音有了，但耳朵还没验。多音字、死气、语速这些坑先点名，L4 到 L6 逐个处理。

## 6. 录屏：一条命令出片，出完抽三帧
核心判断: `npm run record` 用每段音频时长驱动 headless 浏览器逐 step 推进，画面与音轨共用一条时间线，天然同步；但录完必须抽帧，字幕和拉伸靠眼睛兜底。
支撑材料: RECORDING.md 出片命令 / 原理四步 / 静音步错位 / 收尾抽帧；lessons L15（漏字幕，subs=1 是本仓库改动）；ep12 meta.yaml 真实数据（137.300s == 137.304s）
交付物: 命令块 + 原理四步（正文）+ 抽帧命令 + 审查点 3 条（字幕烧入、首尾干净、时长比）+ 排障句（漏字幕）
二级标题: none
收尾交接: 成片有了，还差一张封面。

## 7. 封面：用参考图锁住角色
核心判断: 封面是独立发布物料，必须竖版 9:16 且系列角色一致，`--ref` 传上一集封面是锁住角色的唯一手段。
支撑材料: 2-create.md 步骤 6；lessons L1 反例（自由发挥编出仓鼠、横屏帧充数）；ep12 assets/cover-prompt.md 结构
交付物: 命令块 + 让 AI 写封面 Prompt 的 Prompt（内联）+ 审查点 2 条
二级标题: none
收尾交接: 四样产出齐了。

## 8. 收尾
核心判断: 这条链路已经能从口播稿跑到成片，但每一步对不对都是你在听、在看，AI 做完一步就停下等你，这是下一课要处理的问题。
支撑材料: 五个确认点回顾；lessons L3（18 字撑 6.78 秒）作为「跑通不等于合格」的引子
交付物: 产出对照清单（文件 / 谁产 / 你验什么）
二级标题: none
收尾交接: 下一课给「人在收所有验证信号」这个状态起名字，再说怎么走出去。
