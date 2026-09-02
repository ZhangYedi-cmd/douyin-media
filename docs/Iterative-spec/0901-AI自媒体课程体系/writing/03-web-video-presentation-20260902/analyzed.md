---
topic: 用开源 skill 把一篇口播稿跑成第一条成片（网页、配音、录屏、封面），人只在几个对齐点确认
audience: 会用 Claude Code 或 Cursor 这类 agent 工具、没做过自动化视频流水线的开发者；目标是学 Loop 思维，自媒体只是载体
mode: rewrite
series_context: 0901 课程重写后的 L2（原 03+04 合并）。上承 L1 全景走查，下接 L3「验证信号流向谁」。写作范式按 02-重写方案 §二：动作步骤四段式，Prompt 内联，篇幅 ≤4.5k 汉字 + 200 代码行
---

## 核心问题
不写一行代码，靠开源 skill 和几段 Prompt，怎么把一篇口播稿变成一条可发的成片，并且清楚自己在哪几个点必须亲自确认。

## 材料清单

- [案例] `pipeline/2-create.md` 分支 A 步骤 1–6：四件套链路（web-video-presentation → tts-dub → dubbing-check → 录制）、冷开铁律、真相源铁律、余额探测、depause、同段两读、overrides 重排、封面 `--ref`。支撑全篇骨架。
- [出处] `.claude/skills/web-video-presentation/SKILL.md`：Phase 1 一次产出 script.md + outline.md → Checkpoint Plan 一次对齐 5 件事（稿子 / outline / 主题 / 素材 / 开发模式）→ Phase 2 第 1 章主线程做完必须人验收 → 第 2~N 章按 A/B/C 模式 → Checkpoint Audio → Phase 4 录屏。outline 只规划节奏不规划动画。narrations.ts 是 step 数与音频的唯一真相源。支撑「人在哪几个点确认」。
- [出处] `references/RECORDING.md`：`npm run build && npm run record -- --serve --out final.mp4`；原理四步（ffprobe 取每段时长 → headless Manual 模式逐 step 推进 → ffmpeg 拼音轨 → mux）；静音步会让时间线错位；收尾必抽帧。支撑录屏一节。
- [出处] `references/OUTLINE-FORMAT.md`：估时按中文 4 字/秒，单步 3~10s。支撑节奏审查点（旧稿的「字数÷4」有出处，可保留）。
- [出处] `.claude/skills/tts-dub/SKILL.md`：输入 `audio-segments.json` + `tts.config.json`；config 字段表；五条内置坑解法（绕开 mmx CLI、逐段注音、normalize 只改配音不碰字幕、per 段 speed、批量重试 3 次）。支撑配音一节。
- [案例] `brain/tts.config.json`：账号级模板，voice_id 克隆音色、speed 1.1、normalize 四条缩写、pronunciation 留空、overrides 空。支撑「复制模板只改 config」。
- [案例] `content/2026-08-23/claude/build/`：真实工程目录结构（article.md / script.md / outline.md / src/chapters/01-coldopen～05-ending / audio-segments.json / tts.config.json / rec/），narrations.ts 真实样例，package.json 三条命令 extract-narrations / synthesize-audio / record。支撑「产出长什么样」对照块。
- [数据] `content/2026-06-26/ep12-ffi-native/meta.yaml`：一条真实成片的终检记录。11 段音频、成片 137.3 秒与音轨 137.304 秒对齐、depause 跑 2 轮、dubbing-reviewer R1 PASS、语速离群经复核判为英文密集的统计假象。支撑「跑通后该看到什么」以及 L3 的伏笔。
- [反例] `pipeline/lessons.md` L1：EP02 封面让模型自由发挥编出仓鼠吉祥物，还试过拿横屏视频帧充数。支撑封面步。
- [反例] `pipeline/lessons.md` L2：EP02 改了 narration 没重抽分段，画面新钩子声音旧钩子，两轮组件截图检查都没抓到。支撑真相源铁律。
- [反例] `pipeline/lessons.md` L3：EP02 18 字撑 6.78 秒含 1 秒死气（引号 / 破折号 / 拟声词触发）。支撑「跑通不等于合格」。
- [反例] `pipeline/lessons.md` L9：EP13 MiniMax 余额耗尽返 1008 卡死链路。支撑余额探测。
- [反例] `pipeline/lessons.md` L15：首录漏字幕，`auto-record.mjs` 默认 URL 无 `?subs=1` 且 `--serve` 覆盖 `--url`。支撑录屏后抽帧。
- [反例] `pipeline/lessons.md` L16 / L17 / L18：depause 原地写静默失败、同段两读、增删段后 overrides 键错位。本课只点名不展开，留给 L4 / L6。
- [出处] `references/CHAPTER-CRAFT.md`、`SCRIPT-STYLE.md` 标题：逐步揭示、双源原则、反 AI 味、每句 ≤20 字、cold open。支撑第 1 章验收清单。
- [出处] 脚手架源码核验：`data-no-advance`（6 个文件）、主题 token `--shell` / `--accent`（27+ 文件）、`?auto=1`（5 个文件）、23 套主题、`scaffold.sh <dir> --theme=<id>` 均真实存在。

## 旧稿里不能沿用的内容
- METR 链接被写成「上下文切换实验、返工耗时上升 19%」。METR 那项研究讲的是资深开发者用 AI 工具反而慢 19%，与图形剪辑和文本接口无关。删。
- `window.__READY__` 录屏就绪信号：脚手架中不存在。删。
- 旧稿五节（架构选型 / 输入契约 / 提示词工程 / 排障 / 验收）是解释型结构，Prompt 集中在第 3 节。不作为结构基线。
- 旧稿的 4.1 GPU 加速、4.2 字号梯度、4.3 音画脱节三段排障提示词，内容真实但属于「网页做不好怎么修」，与本课主线（跑通链路、认清人在哪确认）关系弱。降为一句指路，指向 CHAPTER-CRAFT.md。

## 材料缺口
- 没有一条「学员第一次跑」的真实耗时数据。不编，只写命令和该看到的产物。
- `subs=1` 是本仓库对 auto-record.mjs 的本地改动，不在 skill 原版里。写的时候说清「本仓库加的参数」。
- 配音 provider 若学员没有 MiniMax 账号，走 openai provider 时 pronunciation 不生效。正文一句带过，不展开。
