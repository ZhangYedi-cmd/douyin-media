# 看板（自动更新）

> 由复盘/编排 agent 维护。状态来源：各内容 `meta.yaml`。

## 更新计划 ★ 清系列日更（2026-06-15 起）
每天 1 期 Claude Code 源码系列，按集号 EP02→EP15 顺序日更（约 3 周清完）。**流量辅线暂停**，daily-run 每天取系列队首（status:idea 中 episode 最小）。系列清完后回双赛道。

## 在制内容

| 内容 | 类型 | 状态 | 排期 | 更新时间 |
|---|---|---|---|---|
| open-weight-5（开源模型该装5个） | 图文 | scheduled（定时已提交 sau） | 2026-06-15 20:00 | 2026-06-15 |
| KV-01（冒烟测试） | 口播 | scheduled（定时已提交 sau） | 2026-06-16 19:30 | 2026-06-15 |
| EP02（17MB→1GB 内存暴涨） | 口播 | **published（飞书确认发布，2026-06-16 21:50 真发成功，账号 main）** | 已发布 | 2026-06-16 |
| EP03（token 经济学/省钱三招） | 口播 | **published（飞书确认发布，2026-06-18 19:05 真发成功，账号 main）** | 已发布 | 2026-06-18 |
| EP04（按下 Esc 的 0.1 秒/中止链路） | 口播 | **scheduled（飞书确认发布授权，2026-06-18 20:54 定时提交成功 sau，账号 main；到点抖音自动发布）** | 2026-06-19 20:00（定时已提交） | 2026-06-18 |
| EP05（凭什么敢让 AI 跑命令/权限管线） | 口播 | **published（飞书人审通过，2026-06-19 21:09 真发成功，账号 main；首发慢渲染超时失败、重试即过）** | 已发布 | 2026-06-19 |
| EP06（10个工具同时跑不写坏文件/并发调度） | 口播 | **published（飞书确认发布授权，2026-06-20 21:40 真发成功，账号 main）** | 已发布 | 2026-06-20 |
| EP07（假装记得你三小时前的话/上下文压缩） | 口播 | **published（飞书确认发布授权，2026-06-21 20:56 真发成功，账号 main）** | 已发布 | 2026-06-21 |
| EP08（60个工具只告诉AI一小半/工具懒发现） | 口播 | **published（飞书确认发布授权，2026-06-22 20:45 真发成功，账号 main）** | 已发布 | 2026-06-22 |
| EP09（同一份代码接 Claude/GPT/Gemini/多provider适配） | 口播 | **published（飞书「确认发布」授权，2026-06-23 21:40:55 真发成功，账号 main）** | 已发布 | 2026-06-23 |
| EP10（子 Agent 编排/AI 给 AI 打工） | 口播 | **published（2026-06-24 21:33:55 真发成功，账号 main；首次 21:03 因 UI 浮层挡「选择封面」EXIT=1，人清浮层后重跑同命令一次过）** | 已发布 | 2026-06-24 |
| EP11（claude --version 0 毫秒/启动快速路径） | 口播 | **published（飞书「确认发布」授权，2026-06-25 21:49 真发成功，账号 main）** | 已发布 | 2026-06-25 |
| EP12（按没按 Shift/FFI 直调系统底层） | 口播 | **published（飞书「确认发布」授权，2026-06-26 21:20 真发成功，账号 main）** | 已发布 | 2026-06-26 |
| EP13（防御性编程盘点5个最狠兜底） | 口播 | **published（2026-06-27 21:42，飞书「确认发布」授权 --publish 直发，账号 main，sau 一次过）— 终检闸 A–G 全过、dubbing-reviewer R1 PASS** | 已发布·作品链接待补 | 2026-06-27 |
| EP14（缓存崩了点名哪个工具/缓存破坏检测黑匣子） | 口播 | **published（2026-06-28 22:38，飞书「确认发布」授权 --publish 直发，账号 main，sau 一次过）— 终检闸 A–G 全过、dubbing-reviewer R1 PASS** | 已发布·作品链接待补 | 2026-06-28 |
| EP15（200 行手写迷你 Claude Code/系列完结篇） | 口播 | **published（2026-06-29 21:00:30，飞书「确认发布」授权 --publish 直发，账号 main，sau 一次过）— 成片 194.22s、真写 197 行 mini-agent 跑通(附 demo+transcript)、终检闸 A–G 全过、dubbing-reviewer R1 FAIL→R2 PASS（build/4「十几行」多音字修复+收官句降速）** | 已发布·作品链接待补 | 2026-06-29 |

状态机分两层（互不镜像）：
> - **选题池**（`backlog.yaml`，粗粒度）：`idea → picked → published`（异常 `rejected/expired/archived`）。
> - **生产线**（内容目录 `meta.yaml`，细粒度）：`ideated → drafting → review → approved → scheduled → published`（异常 `rejected`）。
> backlog 仅在 promote(→picked) 和 发布完成(→published) 翻动；中间细粒度只走 meta.yaml。`published` 是生产线终态；`retro_done` 由**治理线**（`automation/harness/`）复盘后置位，不属生产流程。

## 选题池
见 `content/_backlog/`：**9 条 idea ｜ 2 条 picked**（open-weight-5、EP04）**｜ 14 条 published**（EP01、EP02、EP03、EP05、EP06、EP07、EP08、EP09、EP10、EP11、EP12、EP13、EP14、EP15）。最近调研：`content/_research/research-2026-06-14.md`。
> ★ EP15 完结篇已发布（2026-06-29 21:00:30）→ **claude-code-source-series 15 集全清完，「清系列日更」模式结束**。下次 daily-run 应切回双赛道选题（先跑 douyin-ideate 攒/选题，深度:流量≈6:4）。
> ★ 2026-06-30 daily-run：系列队列已空（`status: idea` 零条），按铁律**停产报告，未生产新内容**。顺手据 meta.yaml 把 backlog EP12/13/14 从 `picked` 补翻 `published`（发布侧当日漏翻）。**EP04 状态存疑待人确认**：meta.yaml=`scheduled`（2026-06-19 20:00 定时已提交 sau），到点抖音应已自动发，但无人回填 published —— 请去创作者中心确认后回填。

**Claude Code 源码解读系列**（claude-code-source-series，15 集，规划见 `/Users/yedi/yedi-medias/plan/claude-code-source-series/`）：
EP01 已发布 ｜ **EP02「17MB→1GB 内存暴涨」= 已发布（2026-06-16 21:50）** ｜ **EP03「token 经济学」= 已发布（2026-06-18 19:05）** ｜ **EP04「按下 Esc 的 0.1 秒/中止链路」= scheduled→已到点（2026-06-19 20:00 自动发布）** ｜ **EP05「凭什么敢让 AI 跑命令/权限管线」= 已发布（2026-06-19 21:09）** ｜ **EP06「10个工具同时跑不写坏文件/并发调度」= 已发布（2026-06-20 21:40）** ｜ **EP07「假装记得你三小时前的话/上下文压缩」= 已发布（2026-06-21 20:56）** ｜ **EP08「60个工具只告诉AI一小半/工具懒发现」= 已发布（2026-06-22 20:45）** ｜ **EP09「同一份代码接 Claude/GPT/Gemini/多provider适配」= 已发布（2026-06-23 21:40:55，飞书「确认发布」授权直发）** ｜ **EP10「子 Agent 编排/AI 给 AI 打工」= 已发布（2026-06-24 21:33:55，人清 UI 浮层后重跑 sau 一次过，账号 main）** ｜ **EP11「claude --version 0 毫秒/启动快速路径」= 已发布（2026-06-25 21:49，飞书「确认发布」授权直发，账号 main）** ｜ **EP12「按没按 Shift/FFI 直调系统底层」= 已发布（2026-06-26 21:20，飞书「确认发布」授权直发，账号 main）** ｜ **EP13「防御性编程/盘点5个最狠兜底」= 已发布（2026-06-27 21:42，飞书「确认发布」授权 --publish 直发，账号 main，sau 一次过）：首跑卡配音余额(MiniMax 1008)、人充值后续跑一次到位；成片 158.57s、终检闸 A–G 全过、dubbing-reviewer R1 PASS（4003/4001 等数字读法标 NON-BLOCKING 待人耳）；作品链接待去创作者中心补** ｜ **EP14「缓存崩了点名哪个工具/缓存破坏检测黑匣子」= 已发布（2026-06-28 22:38，飞书「确认发布」授权 --publish 直发，账号 main，sau 一次过）：成片 199.73s、终检闸 A–G 全过、dubbing-reviewer R1 PASS（英文词 prompt/token/schema/diff 读法+开头语速标 NON-BLOCKING 待人耳）；TTS 余额充足、配音前单段探测通过无 1008；作品链接待去创作者中心补** ｜ **EP15「200 行手写迷你 Claude Code/系列完结篇」= 已发布（2026-06-29 21:00:30，飞书「确认发布」授权 --publish 直发，账号 main，sau 一次过）：真写 197 行单文件零依赖 mini-agent 并真机跑通(demo/mini-agent.ts + run-transcript.txt，loop/工具/权限闸/流式四件套俱全)；成片 194.22s、终检闸 A–G 全过、dubbing-reviewer R1 FAIL→R2 PASS（build/4「各十几行」多音字漏注 háng→toneFor 补「几」修复重合成；收官句 ending/2 降速 1.0 打磨；英文词 while/query/Node/agent/report 读法标 NON-BLOCKING 待人耳）；TTS 余额充足、配音前单段探测无 1008；作品链接待去创作者中心补**。★ **系列 15 集全部发布完成，「清系列日更」收官，恢复双赛道选题。**

## 数据汇总
| 周期 | 发布数 | 平均完播 | 平均点赞 | 涨粉 | 备注 |
|---|---|---|---|---|---|
| 源码系列至今（2026-06-28 拉） | 12 | 1.64% | ~111 | 130（累计） | 治理首跑快照；账号级完播率 1.65% 低于96%同类=系统短板；播放/互动/涨粉均高分位 |
