---
topic: 用开源 Skill 跑通一条内容：口播稿到成片、封面一次走完
audience: 会用 Claude Code、没做过自动化流水线、手上没有参考仓库、只有前几课自己做出来的东西
mode: new
series_context: 《AI 自媒体流水线》v3 第 05 课，模块 1「单条内容」第一课，全书唯一的工具操作课
---

## 核心问题
账号大脑（`brain/`）写完之后，怎么用两个开源 skill 加一个自造 skill，把一条口播内容从选题一次做到成片、封面，人在哪几步停下来确认。

## 材料清单

1. 【承接】上一课成稿 `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/04-账号大脑-五份文件怎么写.md`（全文已读）。开篇：上一课交付的是骨架仓 + 五份阶段契约 + `content/_template/`；本课交付的是 `brain/` 五份 md（positioning、persona、style-guide、sources 四份填满，benchmarks 留空）+ `tts.config.json`，共六个文件，过的是「不许出现判不了的词」这道审。结尾：`positioning.md` 管取题（配比数字）、`persona.md` 管创作口气、`tts.config.json` 管配音参数（provider/voice_id/speed/pitch/normalize/pronunciation/overrides），`normalize` 只改配音文本不改字幕源、`pronunciation` 留空多音字走 `overrides`。收尾句：「账号大脑写完了，AI 知道你要什么内容了。现在真去做一条出来，从稿子到成片要走几步？」——这正是本课要接的问题。
   → 支撑：开篇复述、承接判断、tts.config.json 字段表。

2. `.claude/skills/web-video-presentation/SKILL.md`（全文已读）+ `references/RECORDING.md`（全文已读）。核心事实：四阶段流水线（内容编写→Checkpoint Plan→网页开发→Checkpoint Audio→音频合成→录制）；工作目录约定 `script.md`/`outline.md`/`presentation/`（本仓库项目里落 `build/`）；`narrations.ts` 是 step 数与音频的唯一真相源；Checkpoint Plan 一次对齐 5 件事（稿子/outline/主题/素材/开发模式）；第 1 章必须主线程做完 + 强制验收；`npm run record -- --serve --out final.mp4` 无人出片，原理是读 `audio-segments.json` 用 ffprobe 拿时长、headless 逐 step 按方向键推进、ffmpeg 拼音轨再 mux。
   → 支撑：第 1、2 节的机制解释、Prompt 设计、验收清单。

3. `.claude/skills/tts-dub/SKILL.md`（全文已读）+ `tts.config.example.json`（全文已读）。核心事实：输入 `segments`（兼容 web-video-presentation 的 `audio-segments.json`）+ `tts.config.json`，输出每段一个 mp3；字段表 provider/voice_id/speed/pitch/normalize/pronunciation/overrides；三条脚本 `list-voices.mjs`/`synthesize.mjs`/`providers/{minimax,openai}.mjs`；为什么要自己造（mmx CLI 的 `--pronunciation` 拼成字符串、API 要数组，注音失效）；多音字逐段注音靠 `overrides`，不靠全局 `pronunciation`（同字多音会误伤）。
   → 支撑：第 3 节两条 Prompt 的判据来源，「为什么自己造」的反例论证。

4. 一条本仓库真实内容的工程目录 `content/2026-08-23/claude/build/`（已用 find 与 cat 实读关键文件）。确认三件事：（a）脚手架模板 `.claude/skills/web-video-presentation/templates/` 下没有任何字幕相关文件（grep "subs\|字幕\|subtitle" 零命中源码文件，仅 RECORDING.md 提到"剪映加字幕"这类后期工具，不是脚手架自带层）；（b）这条真实内容的 `build/src/components/Subtitles.tsx` + `Subtitles.css` 是补出来的：`subsEnabled()` 读 `?subs=1`，`App.tsx` 里 `{subsEnabled() && <Subtitles text={stepText} />}` 条件渲染；（c）`build/scripts/auto-record.mjs` 里有一行注释「L15: 录屏必须带字幕 —— 强制在录制 URL 上挂 `?subs=1`（--url 覆盖也不豁免）」，代码 `const gotoUrl = url + (url.includes("?") ? "&" : "?") + "subs=1";`。另外 `build/tts.config.json` 与 `brain/tts.config.json` diff 为空（同一份模板复制而来，voice_id 已填真实克隆音色）。
   → 支撑：第 2 节「脚手架没有字幕层」的判断依据 + 字幕层怎么补的具体代码依据，材料清单第 3 条修法。

5. `pipeline/2-create.md`（全文已读，本仓库现行的创作阶段契约，不是待写材料而是权威依据）。确认：分支 A 口播视频的四件套顺序（web-video-presentation → tts-dub → dubbing-check → 录制）；步骤 3 明确写「config 用 build 内的 `tts.config.json`（从账号级模板 `brain/tts.config.json` 复制，克隆音色 `moss_audio_4dd8142e…`）」；步骤 5 录屏后体检写明「`auto-record.mjs` 默认 URL 无 `?subs=1` 且 `--serve` 覆盖 `--url`，会漏字幕；抽帧确认，缺则给 build 内 auto-record 加 `/?subs=1` 重录，L15」；步骤 6 封面「竖版 9:16，★ 必做，禁止拿横屏视频帧充数（L1）」。终检闸 C「钩子冷启动：第一句自成立、不依赖上文」。
   → 支撑：全课骨架的权威来源，第 4 节封面判据、路径修法的出处、"人在哪几步确认"的官方口径。

6. `pipeline/lessons.md` 的 L15 条目（已读）：「gemini-cli-teardown 首录漏字幕：`auto-record.mjs` 默认导航到无 `?subs=1` 的 URL，且 `--serve` 会覆盖 `--url`，成片无字幕，抽帧对照上集才发现」——真实踩坑记录，可作反例材料，不编造。
   → 支撑：第 2 节排障句「多半是」的一处真实依据。

7. 旧稿 `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/old-courses/v2-02-用开源Skill跑通第一条内容.md`（全文已读，仅当结构与措辞参考，不抄）。确认card点名的错误：「`cp ../../brain/tts.config.json build/tts.config.json`」——用 `ls`/`realpath` 实测：该命令写作时假定在 `content/<日期>/<slug>/`（build 的上一级）执行，但从那一级到 `brain/` 需要三级 `..`（`../../../brain/`），旧稿只写了两级，少一级；若命令在 `build/` 内执行（本课遵照 `pipeline/2-create.md` 的约定，配音相关命令都在 build/ 里跑），则需要四级 `..`（`../../../../brain/tts.config.json`），已用 `ls` 实测两种路径均可达。
   → 支撑：第 3 节路径修法的具体证据链。

8. `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/old-courses/mini-v3-05.md`（部分已读，另一台机器写过的同课成稿，只当口径参考不抄，不作为事实依据）。确认它也验证过脚手架模板搜 "subs" 零命中，字幕组件命名与本课用的真实仓库命名（`Subtitles.tsx`）不同，不采用它的命名，采用仓库里真实存在、可 grep 到的 `Subtitles.tsx`。

## 卡片（05.md）里发现的一处缺口
任务卡「2.1 大纲」开篇契约写「本课输入是账号大脑里的定位、人设、语气规范和一份口播稿选题」，但 `inventory.md` 第 04 课与第 05 课两节都没有「口播稿选题」这一条产物——它既不是上一课的落盘文件，本课大纲四步里也没有专门生成它的步骤。核对第 04 课「输入是你自己对账号定位…的口述」的先例，判定「口播稿选题」和账号定位一样，是读者自己心里已经有的一个内容点子（口述），不是某个文件产物，本课第 1 节开头会把这一点挑明，避免读者去找一个不存在的文件。这不算大纲局部调整（数目顺序不变，只是把默认隐含的输入来源说清楚），写进 outline.md 开头说明。

## 材料缺口
无实质缺口。8 条材料均为已打开实读的仓库文件（含一条真实内容工程目录的实地探查），覆盖大纲四步的判据、Prompt 依据、路径修法证据、排障句来源。唯一需要处理的是上面这条卡片缺口，已给出处理方式，不是材料不足，是描述精度问题。
