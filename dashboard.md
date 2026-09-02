# 看板（派生视图）

> **本文件是派生视图，不是真相源**：状态从各内容 `meta.yaml` 汇总，选题池从 `backlog.yaml` 汇总。
> 只放当前快照；过程叙事一律进 `pipeline/logs/<日期>.md`，别写回这里。
> 状态机定义见 `content/_backlog/backlog.yaml` 头注释（双层：backlog 粗粒度 / meta.yaml 细粒度）。
> 最后同步：2026-07-19 19:30（生产线发布收尾：grok-build-teardown 飞书确认卡授权后 sau 真发成功 status=published（立即发布，main 账号），sau 未返回作品链接待人补。backlog `2026-07-17-002` picked→published）
> 上次同步：2026-07-19（生产线 daily-run：grok-build-teardown 出审 status=review，终检闸 A-G 全过，审核卡推飞书待人审、未发布。取题 backlog `2026-07-17-002` Grok Build 源码解读 4.00。★人 07-19 反馈「口播页字体放大到 CC 源码系列量级」已落地本条并存 memory kouban-font-scale-large）
> 上次同步：2026-07-18 09:09（治理线 retro：cc-safety-net 24h + kimi-k3-benchmark-check 24h 双条复窗，均出报告待人审、24h 窗不翻 retro_done。同轮天然对照坐实强CTA(评论8)/软CTA(评论2)打法。详见 `harness/logs/2026-07-18-retro.md`）
> 上次同步：2026-07-17 21:04（生产线：kimi-k3-benchmark-check 飞书二次确认后已真发 status=published；选题池由 ideate 更新：+4 新 idea、清扫 3 条；数据汇总由 retro 更新：karpathy 7d 收口 retro_done + context-engineering 7d 收口 retro_done⚠零触达）

## 在制 / 待处理

<!-- auto:wip:begin -->
| slug | status | since | blocker |
|---|---|---|---|
| open-weight-5 | scheduled | 2026-06-15 00:34 | 无 |
| ep04-esc-abort-chain | scheduled | - | 无 |
| hy3-moe-teardown | approved | 2026-08-19 10:18 | 无 |
| 4-cli-coding-agent-2 | drafting | 2026-08-26 13:02 | 无 |
| anthropic-claude-panic | ideated | 2026-07-15 | 无 |
| claude-code | ideated | 2026-07-19 | 无 |
| nvidia-550b-mamba-moe-10 | ideated | 2026-06-14 | 无 |
| opus-4-8-effort-fast-mode | drafting | 2026-08-19 17:31 | 无 |
| claude | drafting | 2026-08-26 11:44 | 无 |
<!-- auto:wip:end -->

## 待人确认 ⚠

<!-- auto:alerts:begin -->
**error**（2）：
- [CHK-03] open-weight-5: scheduled(2026-06-15 20:00) 超时 78 天未回填
- [CHK-03] ep04-esc-abort-chain: scheduled(2026-06-19 20:00) 超时 74 天未回填

**warn**（1）：
- [CHK-06] open-weight-5: meta.source=mer.vin 开源模型周报 2026-06-08（backlog 2026-06-14-003） 在 backlog 中查无此 id

**info**（2）：
- [CHK-07] 2026-09-02-001: 临近机械过期：today>2d，约 2 天内命中
- [CHK-07] 2026-09-02-003: 临近机械过期：today>2d，约 2 天内命中
<!-- auto:alerts:end -->

**人工调查记录**（机器区对同一事项另生成精简告警属预期重复；本表机器不碰）：

| 事项 | 详情 |
|---|---|
| EP04 发布状态 | meta=`scheduled`（2026-06-19 20:00 定时已提交 sau），到点应已自动发但无人回填。**2026-07-08 复盘拉创作者中心投稿列表(29条,回溯至05-17)未见匹配条目**——倾向未真正发布，但非100%排除(标题/口播词不完全对得上是弱证据)，仍需人去创作者中心肉眼确认后回填 meta + backlog(2026-06-10-004) |
| open-weight-5 发布状态 | 同类问题：meta=`scheduled`（2026-06-15 20:00 定时已提交），一直没人回填。**同一次投稿列表拉取同样未见匹配条目**，同上需人工确认 |
| spec-driven-development 作品链接 | 2026-07-08 23:36 已发布（main账号），sau 未返回链接，待从创作者中心补进 `4-publish.md`（status=retro_done，CHK-05 现行不覆盖，人工追踪） |
| ❗❗context-engineering 可见性异常（**复盘窗口已耗尽，此后无自动兜底**） | meta 记 2026-07-09 21:37「真发成功（飞书确认）」，但后台 **`audit=自见`、plays=0，发布 7.5 天持续零触达，第 6 轮确认**（07-10/07-11/07-13/07-14/07-16/07-17）。**24h/72h/7d 三窗 6 次拉数从未取到一个可归因数据点**——整条深度题制作成本 100% 白费。2026-07-17 已置 retro_done，但**该状态仅表示「复盘窗口走完」，非作品健康**。**需人工去创作者中心核可见性**：可恢复则改可见性/重提审（届时把 meta 翻回 `published` 重开复盘窗口），已废则删档止损。治理线未改其线上状态、此后不再自动拉它的数。详见 `harness/logs/2026-07-17-retro.md` |
| ❗gemini-cli-teardown 限流未解（7d 死档收口） | 后台 `audit=需优化`，plays 112(07-13)→121(07-14)→136(07-16)→142(07-17)→**161(07-18,7d)**，第 5 轮冻结、7d 窗已耗尽翻 ⚠retro_done。同批 karpathy/cc-safety-net 公开正常兑现 → 发布侧限流非内容差。**需人工看后台优化提示项**判可整改（改标题/标签/重传高画质）/误判申诉/删档止损；此后无自动兜底。详见 `harness/logs/2026-07-18-retro.md` |
| karpathy-autoresearch 作品链接 | 2026-07-10 20:55 已发布（main账号），sau 未返回链接，待从创作者中心补进 `4-publish.md`（status=retro_done，CHK-05 现行不覆盖，人工追踪） |
| gemini-cli-teardown 作品链接 | 2026-07-11 21:52 已发布（main账号，飞书确认卡授权），sau 未返回链接，待从创作者中心补进 `4-publish.md`（status=retro_done，CHK-05 现行不覆盖，人工追踪） |
| kimi-k3-benchmark-check 作品链接 + 自主声明 | 2026-07-17 21:04 已发布（main账号，飞书确认卡授权），sau 未返回链接，待从创作者中心补进 `4-publish.md`；另「自主声明」设置步骤 sau 超时跳过，若平台要求 AI 生成声明需人工补 |

## 已发布

**24 条**（源码系列 EP01~EP15 全集 + 系列前 KV-01 + spec-driven-development + context-engineering + karpathy-autoresearch + gemini-cli-teardown + ponytail-lazy-senior-dev + cc-safety-net + kimi-k3-benchmark-check + grok-build-teardown；EP04/open-weight-5 若确认已发则 26 条）。
明细看各 `content/<日期>/<slug>/meta.yaml`；系列收官过程见 `pipeline/logs/2026-06-30.md`。

## 选题池（backlog.yaml）

<!-- auto:backlog:begin -->
选题池：27 expired | 9 picked | 22 published | 23 idea
next_up：空

按分最高 idea（前 4）：
- `2026-09-02-001` OpenAI 掐断 Cursor 模型接口：马斯克收购 Anysphere 后的第一场 AI 诸侯割据（4.75）
- `2026-09-02-002` Anthropic 开放 Agent Skills 行业标准：三层「渐进式加载」怎么把 Prompt 消耗降 10 倍（4.5）
- `2026-09-02-003` DeepSeek-V4-Flash-Vision 开源：305B 专攻「看图操作软件」的多模态 Agent 架构拆解（4.4）
- `2026-09-02-004` Claude Code 与 Chrome 正式打通：终端 Agent 怎么一键接管浏览器调试（4.25）

临近过期：
- `2026-09-02-001` OpenAI 掐断 Cursor 模型接口：马斯克收购 Anysphere 后的第一场 AI 诸侯割据（today>2d，约 2 天）
- `2026-09-02-003` DeepSeek-V4-Flash-Vision 开源：305B 专攻「看图操作软件」的多模态 Agent 架构拆解（today>2d，约 2 天）
- `2026-09-02-002` Anthropic 开放 Agent Skills 行业标准：三层「渐进式加载」怎么把 Prompt 消耗降 10 倍（timeliness4>7d，约 7 天）
- `2026-09-02-004` Claude Code 与 Chrome 正式打通：终端 Agent 怎么一键接管浏览器调试（timeliness4>7d，约 7 天）
- `2026-09-02-005` Claude Code 新周限额 9 月 14 日生效：促销期结束后，怎么用 fast mode 把额度省出来（timeliness4>7d，约 7 天）
- `2026-09-02-007` 国产 Flash-tier 军备竞赛：Qwen3.8-Flash、GLM-5.3-Flash 与 DeepSeek-V4-Flash 同周较量（timeliness4>7d，约 7 天）
<!-- auto:backlog:end -->

**人写区（运行记叙与人工观察，机器不碰）**：
- 运行记叙：2026-07-19 19:30 发布收尾：`2026-07-17-002` Grok Build picked→published。2026-07-19 ideate periodic:2d：+3 新 idea `2026-07-19-001~003`，清扫 0 条。2026-07-18 daily-run 取题：`2026-07-17-002` Grok Build promote idea→picked。2026-07-17 daily-run：`2026-07-17-001` Kimi K3 promote→picked→当日 21:04 发布 published；同日 ideate +4 新 idea、清扫 3 条 `2026-07-08-002/003/004`→expired
- 取题配比观察：近 8 条取题几乎全 depth、traffic 已欠账，本批 `2026-07-19-002` Inkling(A 3.65) 是唯一流量题可补配比。人工挑题改 backlog 顶部 `next_up`。
- 本轮（07-19）清扫：**0 条**。无 idea 命中机械规则（无 today 题；timeliness≥4 中最老的 07-13-004/005 入池 6 天未满 7 天）。
- ⚠**结构性观察（交人裁/account-audit，本任务不动）**：07-17 被清扫的 3 条入池即 S 级(4.55/4.50/4.30) 却全躺到过期，全是「亲手跑一天/对打/测账单」型——与复盘「评分引擎系统性高估需一手实测的题」同向。建议把「可诚实自动做完」升为硬字段或纳入打分，别只写 reason。
- 撞题待人审：`2026-07-17-003`(Muse Spark 跑分口径) 与 `2026-07-10-002`(benchmark 祛魅清单)同域可并「案例篇」；`2026-07-17-004`(Ornith 自造脚手架) 与 `2026-07-13-001`/`2026-07-15-003` 同 harness 母题（池内已多条待精简）；`2026-07-19-003`(coding agent 隐藏状态探针) 与 `2026-07-15-002`(J-space)/`2026-07-10-003`(思考链) 同「认知内幕/可解释性」母题可串/择一。
- 最近调研：`content/_research/research-2026-07-19.md`（治理线 ideate periodic:2d；抓 07-17 后增量：Claude Code AskUserQuestion 翻车/权限模型之辩、Thinking Machines Lab 开源 Inkling、coding agent 隐藏状态探针论文 Latent Programming Horizons）

## 数据汇总（复盘线维护）

| 周期 | 发布数 | 平均完播 | 平均点赞 | 涨粉 | 备注 |
|---|---|---|---|---|---|
| 源码系列至今（2026-06-28 拉） | 12 | 1.64% | ~111 | 130（累计） | 治理首跑快照；账号级完播率 1.65% 低于96%同类=系统短板；播放/互动/涨粉均高分位 |
| 源码系列至今（2026-07-08 拉） | 14 | 1.84% | ~125 | 194（累计） | 补跑 ep10~ep15 共6条7d(+ep14/15 72h)窗口；账号级完播率 3.79% 仍低于86.71%同类=系统短板持续；ep15(结尾CTA)互动/涨粉全系列最强，ep11 完播/互动/涨粉全系列垫底；详见 `harness/logs/2026-07-08-retro.md` |
| spec-driven-development · 24h（2026-07-10 拉） | 1 | 1.92% | 196 | 8 | 双赛道恢复首条深度题；播放 16060=源码基线2.3x、5s完播/均播/ctr全优，**但涨粉8(<中位9.5)+互动率2.58%(<3.08%)=主漏点关注转化弱**；收藏202>点赞196(收藏向)；账号级完播率2.76%低于91.55%同类(第3轮同向)；详见 `harness/logs/2026-07-10-retro.md` |
| karpathy-autoresearch · 24h（2026-07-11 拉,实~12h早边） | 1 | 1.12% | 128 | 9 | 播放6419≈基线、2s跳出优(钩子强)，**主漏点完播率1.12%(基线0.6x)**；互动率4.07%>基线但靠收藏(119≈点赞128)撑、评论仅1；**软CTA→低评论第3数据点**(karpathy评1/spec评7/ep15强CTA最高)；账号级完播率2.07%低于94.61%(第4轮同向)；早边待72h复核；详见 `harness/logs/2026-07-11-retro.md` |
| context-engineering · 24h（2026-07-11 拉,实~35.5h） | 1 | — | — | 0 | ❗**后台 audit=自见/plays=0，无法归因**；发布~35.5h仍未公开分发、第2轮确认(07-10~11.5h已自见)，倾向被限/私密/卡审非滞后；**人工待办最高优先：去创作者中心核可见性**，若被打回走生产线处理；本任务未改其状态；详见 `harness/logs/2026-07-11-retro.md` |
| karpathy-autoresearch · 72h（2026-07-13 拉,实~60h） | 1 | 1.23% | 160 | 11 | audit=公开正常分发；播放6419→8778(+37%长尾)；**完播率1.12→1.23%仍低于基线(主漏点坐实,账号第5轮同向)**；profile_visits 0→44、转粉正常(24h「转粉弱」是早边假象)；收藏153≈点赞160(收藏党)、评论仍1(软CTA→低评论第4点)；健康偏好片、微调即可；详见 `harness/logs/2026-07-13-retro.md` |
| context-engineering · 72h（2026-07-13 拉,实~59.5h） | 1 | — | — | 0 | ❗**仍 audit=自见/plays=0，第3轮确认**；发布近62h持续零触达、卡审解释排除、判定可见性被限/误设私密；**人工核查最高优先已第3轮催**；本任务未改其状态；详见 `harness/logs/2026-07-13-retro.md` |
| gemini-cli-teardown · 24h（2026-07-13 拉,实~35.3h） | 1 | — | — | 0 | ❗**后台 audit=需优化/plays仅112，三位数噪音不归因**；被平台质量标记限流(区别于context-eng的自见)；同批karpathy公开正常兑现→坐实是发布侧限流非内容差；**人工待办：看需优化提示项判可整改/申诉**；本任务未改其状态；详见 `harness/logs/2026-07-13-retro.md` |
| ponytail-lazy-senior-dev · 24h（2026-07-14 拉,实~12.1h早窗） | 1 | 0.82% | 58 | 2 | audit=公开正常分发；播放4801(~12h在轨)；**主漏点完播率0.82%(基线0.6x不到)但均播15.6s>基线=长题结构tradeoff非节奏拖**；前段钩子/开场健康；**收藏59≈点赞58(收藏向深度题第3例)**；**软CTA→低评论第5数据点**(评论1)；转粉pv0/涨粉2早窗未熟待72h；账号级完播率1.61%低于96.39%(第6轮同向)；详见 `harness/logs/2026-07-14-retro.md` |
| gemini-cli-teardown · 72h（2026-07-14 拉,实~59.3h） | 1 | — | — | 0 | ❗**仍 audit=需优化，plays 112→121(48h仅+9冻结)，限流未解第2轮确认**；同批karpathy公开正常兑现坐实发布侧限流非内容差；与context-eng(自见/0第4轮)合并=近5条2条卡非公开；**人工待办升级+强化发布收尾加T+Nh校验audit=公开**；本任务未改其状态；详见 `harness/logs/2026-07-14-retro.md` |
| spec-driven-development · 7d（2026-07-16 拉,实~177h）✅retro_done | 1 | 1.71% | 262 | 15 | **正式收口=账号最成功作品**；播放16060→**30132(全账号最高,基线4.36x,破圈坐实)**；漏斗前段全优、完播率1.71%略低是长题tradeoff；**修正24h两处误判**：①转粉不弱(pv77→fans15/19.5%,24h pv=0是早窗artifact)②互动率1.82%低是破圈稀释非缺钩子(绝对互动量全账号最高)；收藏264≈赞262(收藏向)；软CTA→评论7零增长；详见 `harness/logs/2026-07-16-retro.md` |
| ponytail-lazy-senior-dev · 72h（2026-07-16 拉,实~60h） | 1 | 0.88% | 63 | 2 | audit=公开正常分发；播放4801→5145(+344长尾平,中位偏下题)；**完播率0.88%主漏点第2轮坐实(均播15.3s>基线=长题tradeoff)**；**转粉校正**：pv0→10(早窗假象成立)但fans仍2(转粉真弱,对照karpathy 72h pv44)；收藏63=赞63(收藏向第4/5例)、评论1(软CTA→低评论第6点)；账号级完播率1.57%低于96.56%(第7轮同向)；详见 `harness/logs/2026-07-16-retro.md` |
| karpathy-autoresearch · 7d（2026-07-17 拉,实~156h）✅retro_done | 1 | 1.32% | 172 | 11 | **正式收口=健康偏好、非破圈**；播放8778→**9504(+8.3%长尾耗尽,终值=基线1.37x)**；**完播率1.12→1.23→1.32%跨三窗均垫基线下=主漏点坐实**(账号级短板第8轮同向,非本条特有,不必重做)；互动率3.78%>基线靠收藏撑(收藏167≈赞172,收藏向7d坐实)；**评论7天冻结在1=软CTA→低评论最干净数据点(第7点)**；转粉pv51/fans11正常但72h→7d冻结(长尾不转粉,小样本不归因)；**「宽口径>窄众源码」对照组成立**：本条基线1.37x vs spec-driven 4.40x=3.2倍差；详见 `harness/logs/2026-07-17-retro.md` |
| context-engineering · 7d（2026-07-17 拉,实~179.5h）⚠retro_done | 1 | — | — | 0 | ❗**仍 audit=自见/plays=0，第6轮确认，发布7.5天零触达**；**三窗6次拉数从未取到一个可归因数据点**(不是数据不好是根本没数据)，整条深度题(终检闸A-G全过)制作成本100%白费；**⚠此处 retro_done 仅表示「复盘窗口走完」非作品健康/已归因**，人工恢复可见性后应翻回 published 重开窗口；**人工核查已第6轮催且窗口已耗尽=此后无自动兜底**，可恢复则改可见性/重提审、已废则删档止损；本任务未改其线上状态；详见 `harness/logs/2026-07-17-retro.md` |
| cc-safety-net · 24h（2026-07-18 拉,实~36h窗尾） | 1 | 1.15% | 71 | 1 | audit=公开正常分发；播放5814、ctr30%封面强、2s跳出低；**主漏点完播率1.15%<深度基线1.84%(均播17.67s>基线=长题tradeoff,片长3:49超目标49s)=账号级短板第9轮同向**；**软CTA→低评论坐实**(评论仅2,同轮kimi强CTA评论8=4倍差,cc为打法07-17定型前的「无辜样本」反向印证)；收藏41≫评论2(收藏向)；pv5/fans1早窗未熟待72h；详见 `harness/logs/2026-07-18-retro.md` |
| kimi-k3-benchmark-check · 24h（2026-07-18 拉,实~12h在窗） | 1 | 2.13% | 44 | 8 | 流量题(traffic)；播放4802、ctr21.4%；**逆势亮点：完播率2.13%反超深度基线1.84%、均播21.43s近20条最高**(高密度逐行对账题=留存结构,1数据点记待验假设)；**强CTA首次正向验证**(「评论区扣K3换对账笔记」，评论8=近期早窗最高，同轮软CTA的cc仅2)；主漏点在互动率1.54%(<peer2.18%)—看得完但没转互动；争议性祛魅题天然催评论；待72h看互动补涨/转粉；详见 `harness/logs/2026-07-18-retro.md` |
| gemini-cli-teardown · 7d（2026-07-18 拉,实~155h）⚠retro_done | 1 | — | — | 0 | ❗**限流死档收口，第3轮确认**；audit仍`需优化`，plays 121(72h)→**161(7d)** 4天+40仍三位数噪音、从未进公开分发；同批karpathy/cc-safety-net公开正常兑现坐实发布侧限流非内容差；**⚠retro_done仅表示复盘窗口走完非健康**，7d窗耗尽此后无自动兜底；**人工待办：看「需优化」提示项判整改/申诉/删档止损**，本任务未改线上可见性；详见 `harness/logs/2026-07-18-retro.md` |
