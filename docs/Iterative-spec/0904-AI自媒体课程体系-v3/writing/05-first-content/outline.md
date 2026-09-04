---
plan: fixed-from-card
length: standard
figures: mermaid-optional
sections: 4
---

## 大纲来源与局部调整说明

大纲照任务卡（`plan/cards/05.md`）「2.1 大纲」块展开，四节的数目和顺序不动，按卡片给定的核心判断、交付物、承接原样落实。仅两处局部调整，都不改变节的数目和顺序：

1. **口播稿选题的来源说明**（落在第 1 节开头）。任务卡开篇契约写「本课输入是…一份口播稿选题」，但 `inventory.md` 第 04、05 两课都没有把它列为落盘产物，本课大纲四步里也没有单独生成它的步骤。核对第 04 课「输入是你自己对账号定位…的口述」的先例，判定「口播稿选题」和账号定位一样是读者自己心里已有的点子，不是文件。第 1 节开头挑明这一点，不新增步骤、不新增交付物。
2. **tts-dub 的产出定位**（落在第 3 节）。学员交付清单写明本课结束要多出「一个 `tts-dub` skill」，对照背景包「产物目标是 1:1 实现参考仓库…十个自封装 skill」，判定这是要学员用 Prompt 让 AI 把 tts-dub 造出来（配置契约 + 合成脚本），不是单纯调用一个已经装好的第三方 skill。第 3 节的两条 Prompt 按这个定位写：第一条出配置契约（同时定义 skill 该有的输入输出和脚本职责），第二条跑合成。
3. **npm run record 实际执行的位置**（跨第 2、3 节）。核实 `auto-record.mjs` 的真实代码后发现，它对每个 step 的音频文件缺失会直接抛错停住（`缺音频 ${f}，先 npm run synthesize-audio`），`references/RECORDING.md` 的前置条件也写明要求音频已经合成好。这和卡片把 npm run record 放在「先录成片」的第 2 节、把配音放在其后的第 3 节字面顺序有出入。处理方式：第 2 节只做录制前的准备（补字幕层、跑 `extract-narrations` 产出 `audio-segments.json`、把 `auto-record.mjs` 的地址修正带上 `?subs=1`），把 `npm run record` 命令本身讲清楚原理但先不执行；第 3 节配完音、验完段数之后，回头把这条命令真正跑一遍并做抽帧检查。四节的数目和标题不变，只是把"命令的机制讲解"和"命令的真正执行"按技术上的先后顺序分落在第 2、3 两节，同时这个调整顺带解决了 Step 5 读者诊断挑出的问题：第 3 节的 Prompt 要读 `audio-segments.json`，这个文件现在先在第 2 节的 `extract-narrations` 里出场，读者不会在毫无来源的情况下被要求读一个没见过的文件。

记忆锚点（贯穿全篇）：这条内容从网页到成片一次走完，讲的是流程在哪一步、人在哪一步确认，不是这个工具具体怎么调参。

开篇契约：上一课交付了 `brain/` 五份和 tts 配置，AI 知道账号要什么内容、什么口气；本课输入是账号大脑里的定位、人设、语气规范和一个读者自己心里的口播选题；本课产出四件：一个 `build/` 工程、一条 `final.mp4`、一张竖版 `cover.png`、一个 `tts-dub` skill。

## 1. 口播稿到网页 demo：装 web-video-presentation

核心判断：网页 demo 是成片的骨架，先按口播稿的段落节奏搭出页面，人在这一步确认的是段落划分和大纲对不对，不是画面细不细。

二级标题：不分。

交付物：
- 开工前确认两个开源 skill 在位的命令块（`web-video-presentation`、`baoyu-image-gen`，两处安装第 02 课已经做过，这里只是开工前核实）。
- 一条 Prompt：读 `brain/` 四份 + 读者口述的选题，先出 `2-script.md`（口播稿），再用 web-video-presentation 把它做成网页工程，落 `build/`。
- Checkpoint Plan 5 件事对齐清单（表格）。
- 第 1 章验收 4 点。

学员此时手上有：`brain/` 四份文件、`tts.config.json`（上一课产出）、自己心里的一个选题。

交接：demo 搭出来了，下一步把它录成一条真正的视频。

## 2. 网页录制成片：`npm run record` 与字幕层

核心判断：录制是无人值守的一次性动作，人在这一步确认的是录出来的成片时长和翻页节奏对不对，字幕层要用 `?subs=1` 单独核对，不是等成片出来才发现漏配。

二级标题：不分。

交付物：
- 一段判断：脚手架模板没有字幕层（材料 4 已核实：`templates/` 下无字幕相关文件），需要先补一段字幕组件再录。
- 一条 Prompt：给 web-video-presentation 生成的工程加字幕层（读 `narrations.ts` 当前 step 文本，`?subs=1` 才渲染），依据本仓库真实内容 `content/2026-08-23/claude/build/src/components/Subtitles.tsx` 的做法。
- 命令块：`npm run build && npm run record -- --serve --out final.mp4`。
- 排障：`--serve` 会覆盖 `--url`，录制脚本默认导航地址不带 `?subs=1`，需要在 `build/` 内的 `auto-record.mjs` 里把跳转地址强制加上 `/?subs=1`（对照 `pipeline/lessons.md` L15 与 `pipeline/2-create.md` 步骤 5 的真实记录）。
- 抽帧核对清单（时长、首尾、字幕已烧入）。

学员此时手上有：第 1 节产出的 web-video-presentation 工程。

交接：无声成片录完了，下一步把配音接上去。

## 3. 配音与合成：tts-dub skill（L1，两条 Prompt）

核心判断：这一课的 tts-dub 只给配置契约和合成脚本两条 Prompt 钉死判据，多音字、语速、去停顿留到模块 2 的 Loop 里再展开，这里人只确认音色像不像、整体能不能听。

二级标题：不分。

交付物：
- Prompt 1（配置契约）：让 AI 把 `tts-dub` 造成一个项目级 skill，输入输出契约照 `.claude/skills/tts-dub/SKILL.md` 的真实字段表（provider/voice_id/speed/pitch/normalize/pronunciation/overrides）钉死。
- Prompt 2（合成脚本）：从 `brain/tts.config.json` 复制配置到 `build/`（用修正后的相对路径，依据材料 7 的实测：在 `build/` 里执行要 `../../../../brain/tts.config.json`），跑合成，输出 `public/audio/<章>/<步>.mp3`。
- 验收 3 点：段数、文件大小、听两三段。
- 一处路径排障句：旧稿 `cp ../../brain/` 少一级的错误说明与修法。

学员此时手上有：第 2 节的无声成片工程、`brain/tts.config.json`。

交接：配音合上了，最后补一张封面，把产物归位。

## 4. 封面与产物归位：baoyu-image-gen 与 build/ 目录

核心判断：封面要竖版比例，不能拿横屏视频帧充数，人在这一步确认的是封面比例和这条内容的第一眼观感。

二级标题：不分。

交付物：
- 一条 Prompt：baoyu-image-gen 出竖版 9:16 `cover.png`（依据 `pipeline/2-create.md` 步骤 6 与终检闸 E 的真实判据）。
- `build/` 与 `assets/` 目录归位清单（对照 `content/_template/README.md` 的真实 schema：档案层进 git，`build/` 工作区不进）。
- 结尾：本课做到了什么、还看不到什么、下一课补什么。抛出的问题：第一条成片出来了，你眼睛看着觉得还行，可下次你不在场的时候，谁来看这个「还行」。

学员此时手上有：第 3 节的 `final.mp4`。

交接：全课收尾，指向第 06 课「验证信号流向谁」。
