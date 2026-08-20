# 治理执行记录 · benchmark-refresher · 2026-08-19

## 任务 / 触发 / 目标
- 任务：benchmark-refresher（对标/打法时效巡检）
- 触发：**人工手动触发**（看板工作台点执行技能 benchmark-refresher）。周期判据同样已到点：上次成功 2026-06-28，距今 **52 天 ≥ 30d**（`logs/index.jsonl` 中无 benchmark-refresher 记录，以报告落盘日为准）
- 目标对象：`brain/benchmarks.md` 全量 —— 对标账号 8 行（2 正式 + 6 候选）、爆款拆解（仍为空占位）、自己的有效打法 5 行 + 顶部「系列方向校验（2026-06-28）」结论

## 现状（查了什么、用什么查）

**先说工具实况（影响本轮证据广度，如实记）**：`agent-reach doctor` 自报 7/12 渠道可用（含 Twitter/X「完整可用」、Reddit、B站），但实测 **`agent-reach` v1.2.0 只装了管理命令**（setup/install/configure/doctor/…），**没有 `read` / `search-*` 子命令**；底层 `mcporter`、`bird` CLI **均不在 PATH**。
→ 实际可用通道：`gh`(GitHub)、`yt-dlp`(YouTube)、`curl` + Jina Reader(任意网页，含 B站)。
→ **本轮 X/Twitter、Reddit、Exa 全网语义搜索均未能使用**，证据面收窄到 B站 + YouTube + GitHub。见「盲区」。

数据来源（全部 **2026-08-19 实抓**）：
- B站（Jina Reader）：`space.bilibili.com/12890453`(程序员鱼皮) 及其 `/upload`、`/474347248`(唐国梁Tommy)、`/503558013`(卢菁博士)、`/3546611527453161`(LLM张老师)、`video/BV1Y4oLBuEu6`
- B站搜索（Jina Reader）：`Claude Code 源码`（综合序 + `order=pubdate` 最新序）、`Codex`（`order=click`）、`AI Agent 源码解读`（最新序）
- YouTube（yt-dlp）：`ytsearch12:Claude Code source code internals architecture`、`ytsearch12:Codex vs Claude Code 2026 comparison`
- GitHub（gh api search/repositories）：`agent harness runtime created:>2026-05-01`（按 star）、`claude code`（按 star）

**口径限制**：Jina Reader 未能稳定返回单条视频发布日期，yt-dlp `upload_date` 返回 NA。因此**下表播放/粉丝数均为 2026-08-19 当日快照值，"新/旧"靠搜索的 `order=pubdate` 最新序位置判断，不是精确发布日期**。涉及趋势的结论已按此口径收敛表述。

## 发现（逐条，每条带证据）

| 条目 | 判定 | 证据（2026-08-19 抓） |
|---|---|---|
| 对标「程序员鱼皮」+ 其「蹭新模型首发实测」打法 | ✅成立（证据显著强化） | [主页](https://space.bilibili.com/12890453/) 99.4万粉 / 投稿 959，高度活跃。[近期投稿](https://space.bilibili.com/12890453/upload)中**首发实测就是他的头部驱动**：「DeepSeek Harness 首发实测+入门教程」**81.3万**、「Claude Code 封号原因被曝光」41.5万、「Claude Fable 5 首发实测…完爆 GPT 5.5」39.4万、「DeepSeek V4 Pro 首发实测」34.3万、「DeepSeek V4 Flash 接入 Codex」21.7万、「DeepSeek Harness 最新邪修」16.2万 |
| 对标「柱子哥」（抖音） | ⚠存疑（连续 2 轮无法核实，已挂 52 天） | 抖音渠道 `doctor` 显示 ⬜ 未配置（需 mcporter + douyin-mcp-server），**无读取通道**；B站仍无明确同人。与 2026-06-28 结论一致，**零新增信息** |
| 对标候选「唐国梁Tommy」 | ✅成立 → **建议候选转正**（补齐了上轮缺的粉丝量） | [space/474347248](https://space.bilibili.com/474347248/) **4.9万粉 / 投稿 374**。近作与本账号支柱高度重合：「Claude Code 为什么不会撑爆上下文？深入解析 Agent 上下文压缩与会话恢复机制」**1.1万**（其近作最高）、「MIT最新发现：Agent 泛化能力不在模型，而在 Harness」5813、「Kimi K3 的 5122万个 Agent 沙箱揭秘」6482、「DeepSeek Harness：连 Agent Loop 本身都是插件」2537 |
| 对标候选「卢菁博士_北大AI博士后」**主体错配** | ⚠存疑（名字对不上人） | B站搜「卢菁博士」出 4 个账号：**「卢菁博士」[space/503558013](https://space.bilibili.com/503558013/) 11.6万粉 / 投稿 999+**（真正的大号）；而叫「卢菁老师-北大AI博士后」的只有 183 粉、「卢菁-北大AI博士后」236 粉。**benchmarks.md 里写的名字指向的是小号，不是那个 11.6万粉的号** |
| 「卢菁博士」的**形式**对标价值有限 | ⚠存疑 | 其头部全是**超长课程合集**：「从零吃透 AI Agent开发：Agent入门+Loop闭环+Harness工程+RAG知识库」147.7万 / **时长 9:39:57**、102.1万 / 9:49:31、101.3万 / 3:43:34。而其**单条深度拆解**播放很低（「DeepSeek Harness实战与原理详解」2530、「DSpark 框架精讲」1767）。本账号是抖音短视频形态，**可借其选题嗅觉，不可借其播放量级**（口径不可比） |
| 对标候选「LLM张老师」条目**描述错误** | ❌失效（归因搞错了） | benchmarks.md 记其方向为「Claude Code 核心源码架构」，依据是上轮引的 [BV1Y4oLBuEu6](https://www.bilibili.com/video/BV1Y4oLBuEu6/)「吃透 Claude Code 核心源码」——**该视频 UP 主实为「极客时间App」[space/385960685](https://space.bilibili.com/385960685/)，不是 LLM张老师**。LLM张老师本尊 [space/3546611527453161](https://space.bilibili.com/3546611527453161/) 6.5万粉 / 投稿 210，实际方向是**手写大模型代码 / LLM 从零到一 / 深度流形漫谈**（「手写大模型代码(上)」3.9万、「什么是大语言模型」3.7万），**与 Claude Code 源码无关** |
| YouTube 三候选（AI Engineer / Yifan / ByteMonk） | ✅仍在，但**代表作已走平** | 52 天播放增幅个位数百分比：AI Engineer「How Claude Code Works」95702→**98147**(+2.6%)、Yifan「I Reverse-Engineered Claude Code」93817→**94411**(+0.6%)、ByteMonk 86993→**90110**(+3.6%)。**渠道有效，但那批代表作的红利期已过** |
| 顶部结论「系列方向：Claude Code 源码解读中英文均高热」（2026-06-28 钉） | ⚠**存疑——需按「热度已迁移」改写** | ① B站搜「Claude Code 源码」**最新序**首屏几乎没有源码解读，全是教程/横评/新工具：「Codex 和 Claude Code 做同一款应用，一方明显胜出」「AI编程助手深度评测：Anti Gravity vs Claude Code vs Cursor」「DeepSeek Harness VS Claude Code」「别再纠结 Codex 还是 Claude Code，DeepSeek 开源了第三种答案」。② 搜「AI Agent 源码解读」**最新序**的源码类新作播放只有**三位数甚至两位数**（「初音带你读源码」918、某《Claude Code 源码解读》EP01 **185**、多条论文解读 5~44）。③ 高播放源码解读（「源码泄露！首发解读51万行」37.4万、「源码分析与复刻实现」14.1万、「做成桌面端」13.6万）**都属 6 月泄露事件那波存量**。→ **方向没死，但"泄露驱动的源码解读"红利窗口已关闭** |
| 新热点一：**Codex 已是中文侧 AI 编程第一流量词** | ➕建议新增 | B站搜「Codex」按播放：「【2026最新Codex】保姆级完整教程」**211.1万**、「40分钟全面掌握Codex」**167.1万**、「Codex(APP)保姆级全攻略」135.7万、「零基础 Vibe Coding：Claude Code+Codex+Cursor」114.8万、「新版Codex零基础入门：GPT-5.6接入」50.3万、「**AI编程新王 Codex** 详细攻略」45.4万。**噪音已剔除说明**：该搜索结果含非同名异物（艾尔登法环「CODEX」破解组 131.1万、B站AI创造公开赛系列），上列已排除 |
| 新热点二：**"Harness / Agent Runtime" 是当下最锋利的新概念** | ➕建议新增（三方独立同向） | ① **鱼皮**：「DeepSeek Harness 首发实测」**81.3万**（其近期最高）。② **B站**：「【热门AI鉴定】DeepSeek Harness是什么？强在哪里？」**67.1万**。③ **两个对标同时转向**：唐国梁Tommy「Agent 泛化能力不在模型，而在 Harness」、卢菁博士「Harness工程」入课程标题、「DeepSeek Harness实战与原理详解」。④ **GitHub 新仓成片**（`created:>2026-05-01`）：truefoundry/trueforge 1323★「the runtime layer that turns an LLM into a working agent」、exoharness/exo 795★、sandbaseai/sandbase-harness 621★、DotHarness/dotcraft 386★、c4pt0r/pie 142★、codejunkie99/agentic-harness 84★ |
| 打法「宽口径 AI 工程题（跨厂商横评）破圈，远超窄众源码解读」 | ✅成立（**首次拿到外部独立证据**，此前纯自有数据） | 横评体裁在两个平台都是头部：YouTube「Claude Opus 4.6 vs GPT 5.3 Codex」(Lex Clips) 186588、「100 Hours Testing Claude Code vs ChatGPT Codex」130370、「I Made Codex and Claude Code Build the Same App」90646、「Codex vs Claude Code: which is better?」(Builder.io) 104219；B站「从夯到拉，锐评 32 个 AI 编程工具！」**62.7万**。**与本账号 spec-driven 横评 7d 30438=基线4.40x 的自有结论完全同向** |
| 打法「症状→机制→定位嫌疑人」式标题钩子（原标「候选，1 数据点」） | ⚠仍存疑，但**+1 条弱外部旁证** | 唐国梁Tommy 近作里**最高的一条正是该句式**：「Claude Code **为什么**不会撑爆上下文？深入解析…压缩与会话恢复机制」1.1万，显著高于其同期 2537/2845/3026/5813。**属他人账号的单点观察，不能直接迁移**，不足以把该打法从"候选"升级为定论 |
| 其余 3 条自有打法（强CTA优于软CTA / 完播率系统短板 / 反差式冷开） | 本轮**未外验**（非能力范围） | 三条均由**自有后台漏斗数据**推出，外部平台无对应可比信号；agent-reach 也无抖音通道。**本轮不改判、不背书**，其效力仍以 `douyin-retro` 复盘证据为准 |
| 「爆款拆解」整节仍是空占位 | ⚠缺口（自 2026-06-28 起未变） | benchmarks.md 该节只有「### 示例（占位）」+ 5 个空字段。`douyin-ideate` 每轮都读本文件，该节等于持续读到空 |

## 变更提议（给人审勾选；**本轮未应用任何一条**）

**A. 纠错类（事实错误，建议优先）**
- [ ] **改**「LLM张老师」行：方向由「Claude Code 核心源码架构」改为「手写大模型代码 / LLM 原理（6.5万粉，space 3546611527453161）」，并**从"同方向对标"降级**——它与源码解读支柱不同向 —— 依据：发现 6 —— 可逆：是
- [ ] **增**「极客时间App」行（B站 space 385960685）：即「吃透 Claude Code 核心源码」真实作者，才是上轮想收录的那个对象 —— 依据：发现 6 —— 可逆：是
- [ ] **改**「卢菁博士_北大AI博士后」行名与链接为「**卢菁博士**（space 503558013，11.6万粉）」，并加注「其高播放来自 3~10 小时长课合集，**播放量级与抖音短视频不可比**，只借选题嗅觉」 —— 依据：发现 4、5 —— 可逆：是

**B. 转正 / 补数类**
- [ ] **唐国梁Tommy 由「候选」转「正式对标」**，补粉丝量 4.9万 / 投稿 374，可学点写实为「Agent 机制拆解选题（上下文压缩、Harness、沙箱），其最高播放即机制拆解题」 —— 依据：发现 3 —— 可逆：是
- [ ] YouTube 三候选补一句「2026-08-19 复核：频道仍在，但 6 月那批代表作播放已走平（+0.6%~+3.6%/52天）」 —— 依据：发现 7 —— 可逆：是（仅加注）
- [ ] **增**英文侧新候选：**Nate Herk | AI Automation**（横评体裁头部，130370 / 90646）、**Theo - t3.gg**（198607）、**NeetCode**（173400）、**ForrestKnight**（107423）—— 依据：发现 7、打法横评行 —— 可逆：是

**C. 方向类（**影响 `douyin-ideate` 打分，建议人重点看**）**
- [ ] **改写顶部「系列方向校验」**：由「Claude Code 源码解读中英文均高热，清系列方向成立」改为「**2026-08-19 复核：源码解读方向仍成立但红利期已过**——高播放源码解读均为 6 月泄露事件存量，最新序源码类新作普遍三位数播放；热度已迁移至 Codex / DeepSeek Harness / 多工具横评」 —— 依据：发现 8 —— 可逆：是
- [ ] **爆款拆解节**补入两条真实拆解（本轮已抓到素材）：① 鱼皮「DeepSeek Harness 首发实测」81.3万 —— 为什么火 = 新工具首发 × 实测 × 人格化钩子（"梁神我错了"）；② 「AI编程新王 Codex 详细攻略」45.4万 —— 为什么火 = 封王式定性 + 一期精通承诺 —— 依据：发现 9、10 —— 可逆：是
- [ ] **`brain/sources.md` Layer B/C 关键词补充**：Layer B 增 `Harness` / `Agent Runtime` / `Codex`；Layer C 增 `DeepSeek Harness` / `DeepSeek V4` / `GPT-5.6` / `Anti Gravity` —— 依据：发现 9、10 —— 可逆：是 —— ⚠**注意这条改的是 sources.md 不是 benchmarks.md，需一并授权**

**D. 不建议自动做、仅记录**
- [ ] 「柱子哥」已连续 2 轮（52 天）无法核实 —— 建议**人拍板**：配抖音渠道去核 / 降级为"存疑"保留 / 直接剔除。**不建议 AI 代决** —— 依据：发现 2

## 盲区 / 未决（机器查不了或本轮没查成，需人工）

1. **抖音侧全盲**（结构性）：无读取通道（`doctor` 显示抖音 ⬜ 未配置）。**benchmarks.md 里唯二两个抖音对标（鱼皮的抖音号、柱子哥）的抖音表现本轮均未核**——鱼皮的结论全部来自其 B站。
2. **X/Twitter、Reddit、Exa 全网搜索本轮不可用**：`agent-reach` 只装了管理命令，`mcporter` / `bird` 不在 PATH，而 `doctor` 却自报这些渠道「完整可用」——**doctor 输出与实际能力不符**。→ 建议人决定是否补装（`npm install -g mcporter` + `agent-reach install`）。**这直接决定下轮能否覆盖英文技术圈一手讨论**。
3. **单条发布日期未取到**：Jina Reader / yt-dlp 均未稳定返回 publish date，本轮"新旧"判断依赖搜索最新序位置，属**弱时间证据**。涉及"红利期已过"的结论（发现 8）建议人抽查 2~3 条视频页面确认发布月份后再落地。
4. **粉丝量/播放量为单点快照**，无历史序列，无法判断"正在涨还是正在掉"（唯一有前值可比的是 YouTube 三条，故只有那三条给了增幅）。
5. 顺手提一句（**不越界改，归 `sop-doc-sync` TODO**）：benchmarks.md 表头仍写「其余由技能在**抖音搜索中自动发现**补充」、表内仍留「_（技能自动补充）_ | 抖音 | 自动发现」占位行，与现架构（`brain/sources.md`：「**不再靠爬抖音自动发现**」）矛盾。上轮报告提的 `positioning.md` 6:4 比例脱节问题**至今未处理**。

## 待人拍板的节点（本轮停在这里，未继续）
- 上面 **A~D 共 10 条提议，一条都没应用**——`brain/benchmarks.md` 与 `brain/sources.md` 本轮**零改动**（治理线铁律）。
- **C 组第 1 条（改写系列方向结论）优先级最高**：它是 `douyin-ideate` 打分的直接输入，压着不改 = 继续按"源码解读高热"给新选题加权，而证据显示该窗口已关闭。
- **提议 C 第 3 条会改 `sources.md`**，超出本任务默认对象（benchmarks.md），需人**单独授权**。
- **盲区 2（agent-reach 渠道退化）需人决定是否补装**——不修的话下轮巡检覆盖面仍是 B站+YouTube+GitHub，英文一手讨论持续缺位。

## 落地记录（人审后回填）
- 批准：<勾选了哪些提议> · 审核人：<> · 时间：<> · 已应用到：<文件>
