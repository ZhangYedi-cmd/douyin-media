# 治理执行记录 · benchmark-refresher · 2026-06-28

## 任务 / 触发 / 目标
- 任务：benchmark-refresher（对标/打法时效巡检）
- 触发：harness-dispatcher 调度（periodic:30d，**首次运行**，index.jsonl 空 → 到点）
- 目标对象：`brain/benchmarks.md` —— 对标账号（2 个种子）、爆款拆解（空）、有效打法（空）

## 现状（查了什么、用什么查）
- benchmarks.md 当前为**种子态**：对标账号仅「程序员鱼皮」「柱子哥」（均抖音），爆款拆解占位空，打法表「待积累」。可复核的存量很薄——本轮真实增量是核种子账号近况 + 捞新对标候选。
- 数据来源（agent-reach，2026-06-28 抓）：
  - B站搜「程序员鱼皮」「柱子哥 AI」「Claude Code 源码解读」「AI Agent 源码 原理」
  - YouTube 搜「Claude Code internals source code architecture」

## 发现（逐条，每条带证据）

| 条目 | 判定 | 证据（链接 + 日期，2026-06-28 抓） |
|---|---|---|
| 对标「程序员鱼皮」仍是有效锚 | ✅成立 | B站主页活跃 https://space.bilibili.com/12890453/ ，近作做 AI 编程内容：「免费 AI编程自学网」 https://www.bilibili.com/video/BV1smrnBKEgk/ 、「Claude Fable 5 首发实测」 https://www.bilibili.com/video/BV1cpEd66EjT/ —— 选题通俗化 + 蹭新模型实测，正贴本账号定位 |
| 对标「柱子哥」（抖音技术/AI） | ⚠存疑 | B站搜无明确同人对应（「正义的柱子哥」「柱哥数学」多为同名异人）。无抖音读取通道（反爬），**无法直接核近况** → 见盲区 |
| 账号系列方向「Claude Code 源码解读」当下是否还热 | ✅成立（强） | B站同方向高产：「吃透Claude Code核心源码：架构设计与工程细节」LLM张老师 https://www.bilibili.com/video/BV1Y4oLBuEu6/ 、唐国梁Tommy「51万行源码泄露」 https://www.bilibili.com/video/BV1Mq9JBMEps/ 、卢菁博士「1884个文件背后」 https://www.bilibili.com/video/BV1zR9JBREua/ 。YouTube 高播放：AI Engineer「How Claude Code Works」95702 播 https://youtube.com/watch?v=RFKCzGlAU6Q 、Yifan「I Reverse-Engineered Claude Code」93817 播 https://youtube.com/watch?v=i0P56Pm1Q3U 、ByteMonk 86993 播 https://youtube.com/watch?v=szaszUEmjfU 。中英文都在涨，本账号清系列方向对当下需求 |
| 新对标候选（B站，源码/Agent 解读同方向） | ➕建议新增 | 唐国梁Tommy（Claude Code 源码 + Agent 框架双线）、卢菁博士_北大AI博士后（源码硬核拆解）、LLM张老师（Claude Code 核心源码架构）—— 与本账号「源码解读」支柱高度同方向，可作对标。**粉丝量级本轮未逐一核**，列候选待人工/复盘补数 |
| 新对标候选（YouTube，英文侧） | ➕建议新增 | AI Engineer、Yifan - Beyond the Hype、ByteMonk —— Claude Code/Agent 内部机制讲解，均 8w+ 播放，可作英文侧选题灵感 + 对标 |

## 变更提议（给人审勾选；不自动改）
- [ ] benchmarks.md 对标表「程序员鱼皮」补一行来源更新：B站仍活跃做 AI 编程（含 Claude Fable 5 实测），跨平台锚有效 —— 依据：发现 1 —— 可逆：是（仅加注）
- [ ] benchmarks.md 对标表「柱子哥」标注「⚠ 待人工核：B站无明确对应，抖音侧无读取通道」 —— 依据：发现 2 —— 可逆：是
- [ ] 对标表新增 B站候选行：唐国梁Tommy / 卢菁博士 / LLM张老师（方向：Claude Code 源码 + Agent 解读；状态：候选，粉丝量待补） —— 依据：发现 4 —— 可逆：是（新增可删）
- [ ] 对标表新增 YouTube 候选行：AI Engineer / Yifan - Beyond the Hype / ByteMonk（英文侧源码解读，8w+ 播放） —— 依据：发现 5 —— 可逆：是
- [ ] 在 benchmarks.md 顶部记一句「系列方向校验（2026-06-28）：Claude Code 源码解读中英文均高热，清系列方向成立」 —— 依据：发现 3 —— 可逆：是

## 盲区 / 未决（机器查不了，需人工）
- 「柱子哥」抖音活跃度/方向无读取通道（反爬），B站无明确同人 → 需人工核，或靠 `douyin-retro` 自有数据侧面印证是否仍值得对标。
- 新候选（唐国梁Tommy/卢菁博士/LLM张老师/3 个 YouTube）**粉丝/播放量级本轮未逐一拉数**，仅凭搜索露出判同方向；正式纳入对标前建议人工或下次复盘补数据。
- 顺手提一句（不越界改，归 sop-doc-sync TODO）：`brain/positioning.md` 写「技术深度:流量型≈6:4」，但 [[series-daily-cadence]] 现状是流量辅线暂停、纯源码系列日更 —— **定位文档与当前节奏脱节**，待 sop-doc-sync 对齐。

## 落地记录（人审后回填）
- 批准：<勾选了哪些提议> · 审核人：<> · 时间：<> · 已应用到：<文件>
