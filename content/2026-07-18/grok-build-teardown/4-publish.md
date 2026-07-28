# 发布物料（4-publish）

> 飞书「过审 → 确认发布」卡在人点过审后立即读本文件拼 sau 命令。
> 字段键名严格匹配解析器（tools/feishu-bot/meta.py `_FIELD_RE`：`- **键**：值`）。
> 不写可解析的「建议发布时段」——默认立即发布，要定时由人在确认时指定。

- **标题**：xAI 把旗舰 coding agent 源码全开了：拆开核心，就是一个 while 循环
- **正文/简介**：xAI 前几天把自家旗舰的 coding agent 全部源码开到了 GitHub，纯 Rust，Apache 协议。我挑核心那几个 crate 读完，最意外的是：那个让很多人觉得高深的 agent loop，拆开就是一个 while 循环——拼请求、调模型、看模型回复里有没有工具调用，没有就结束、有就执行掉再继续。一个旗舰 agent 的心脏，朴素得没什么黑魔法。真正值钱的是循环外面那圈，讲三个我读到时愣一下的设计：① 它的系统提示词是加密藏在源码里的，运行时才解密、用完清零，别家都是明文；② 它会主动去读你机器上 Claude Code 和 Cursor 的配置（.claude/skills、settings、.cursor/skills 全认，还内置去重名单），你在 Claude Code 攒的家当装上它直接能用；③ 它干脆把 OpenAI Codex 和 opencode 的工具代码原样搬进自己仓库，规矩地标了第三方许可——大厂旗舰明着抄，还抄得挺坦荡。所以别再把 coding agent 当黑盒：循环是公开、朴素的，差距在循环外那圈——上下文怎么压、扩展怎么加载、工具怎么调度。想自己顺着读，我把源码地图整理好了（哪个 crate 管什么、agent loop 在哪一行、加密提示词藏哪），评论区扣「源码」我发你。
- **话题标签**：#GrokBuild #xAI #codingagent #AI编程 #源码解读
- **封面**：assets/cover.png
- **媒体文件**：assets/grok-build-teardown.mp4

## 给人审的备注（非发布字段）
- **成片**：1920×1080 H.264，116.66s（1:57），约 5.4MB。已合成配音（voice moss_audio_4dd8142e，speed 1.1）+ 去停顿（9 段全 depause，cap0.25/minact0.45；>0.45s 段内死气逐段复扫为 0）+ 烧字幕（?subs=1 分句闪现，字幕保留原文、normalize 只改配音）+ 4.1 抽帧验音画同步。
- **★ 字体已按人反馈放大（2026-07-19）**：口播页场景文字放大到 Claude Code 源码系列 EP01 量级（钩子 while 循环 120px、章节标题 66px、正文/verdict 46px、次级 30-34px、源码出处 24px），字幕 46→54px。原因：抖音竖屏把 16:9 压成窄横带，此前 kimi/cc-safety-net 那档（钩子 68/标题 42/正文 22-30）在手机上偏小。已抽 5 帧复检无溢出（coldopen 大钩子 / loop 代码面板 / gems 三卡 / ending CTA）。沉淀为偏好 memory `kouban-font-scale-large`。
- **音画同步（F 闸）**：视频 116.66s vs 口播总时长 114.86s，差 1.8s = 9 段 × 200ms trailMs（分节拍呼吸），非 headless 拉伸，factor≈1.000。抽帧 @6.5s(coldopen/1)、@17.2s(coldopen/2 while 钩子)、@25s(theloop/1 loop 面板)、@47s(gems/1 加密对比)、@83s(gems/3 搬竞品工具)、@110.5s(ending/2 CTA) 六处，字幕 == 对应 narration、画面对齐。
- **终检闸 A–G**：A 声画一致（9 段 audio-segments.json == narrations.ts == 2-script.md 三源，dubbing-reviewer R1 独立核过；抽 6 帧字幕==narration==画面）；B 音频自然度（段内 >0.45s 死气逐段复扫 0；成片段边界 0.5-0.78s 停顿为分节拍呼吸非段内死气）；C 冷开（coldopen/1「xAI 把自家旗舰的 coding agent 全部源码开到 GitHub…」自成立、非系列不依赖上文）；D 事实合规（见下红线）；E 封面（竖版 9:16 baoyu-image-gen，非截帧）；F 音画同步（factor≈1）；G 本文件（5 字段可解析）。
- **选题**：双赛道选题池按 score 自动取题（backlog 2026-07-17-002，score 4.00 = status:idea 中唯一最高，next_up 为 null）。depth 赛道接上一轮流量题 Kimi K3，合 positioning 6:4 滚动配比。★ 本条属「可诚实自动做完」——全程读公开源码 + 官方公告 + 文档，无一手实测、不臆造数字/benchmark。
- **视觉**：新建 theloop（源码终端）主题——冷蓝黑终端底 + 极细扫描线，铁锈橙=循环/核心身份色（呼应 Rust + the loop）、teal=可偷的工程细节/复用红利、红=别家旧做法的反差；与 kimi 的 ledger 琥珀、cc-safety-net 的 blueprint 藏青刻意区分。封面 baoyu-image-gen 竖版 9:16（1536×2752），复用 EP01 像素吉祥物本体（--ref EP01 cover），吉祥物站在铁锈橙 while 循环环里一图讲透钩子，徽章「AI 源码解读 · coding agent」为诚实非系列标识、非视频截帧。
- **内容红线自查**：全片技术结论逐条溯源见 2-script.md 文末对照表，源=官方公告 x.ai/news/grok-build-open-source + 仓库 github.com/xai-org/grok-build（main 分支，2026-07-18 由 agent-reach + 真读源码核对，源码副本留存 scratchpad/src/）。逐条：agent loop=turn.rs（loop@1799/build_request@1853/run_turn_via_sampler@1915/tool_calls@2054/Completed@2112/execute@2260）；XOR 加密提示词=prompt_encrypted.rs；读竞品配置=skills/discovery.rs（.claude/.cursor 搜索路径 + CLAUDE_DEFAULT_SKILLS 去重）；移植竞品工具=implementations/codex·opencode + THIRD-PARTY-NOTICES。★ 口径纪律：「加密」不念字母缩写 XOR；「明着抄」如实说成合规 vendored（有第三方许可）非抄袭指控；「读竞品配置」如实说成兼容复用非窃取数据；star/fork 数（移动快照）、SpaceXAI 品牌名歧义、默认模型 id 均存疑未写进稿。无绝对化用词；无口播导流外链（「评论区扣源码」为站内话术）；第一人称口语化、非论文腔。
- **dubbing-reviewer 闸口**：R1 PASS（1 轮，未触 3 轮上限）。六项检查点全过：9 段三源逐字一致、per-段动态注音机制正确、5 类高危多音字（调 diào/藏 cáng/塞 sāi/重 chóng/行 háng）无误伤、死气 0、无逐字 CTA 冲突。R1 非阻断建议「当」读音（当机密/家当/当黑盒应 dàng）主回话已顺手补 `当/(dang4)` 到 gems/1、gems/2、ending/1 并重合成（保险，防录屏后返工）。
- **时长**：1:57，在 style-guide「深度题 2-3min」内且刻意做短（benchmarks 完播率短板 9 轮同向），未超时。

## 发布回填（发布后人填）
- **实际发布时间**：2026-07-19 19:30（立即发布）
- **链接**：（sau 输出不带作品链接，待人去抖音作品管理补）
- **账号**：main
- **发布备注**：飞书确认卡授权后 sau upload-video 真发，输出「视频发布成功」；竖版封面上传成功，自主声明选「内容为个人观点或见解」。
