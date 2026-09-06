# 用开源 Skill 跑通一条内容：从口播稿到成片与封面

上一课产出了六份文件。`brain/` 目录下有四份填满的规则文档，分别是约束选题配比的 `positioning.md`、规范人设语气的 `persona.md`、明确制作规范的 `style-guide.md`，以及指定素材来源的 `sources.md`。此外还有一份初始留空的 `benchmarks.md`，等待第一批真实发布数据沉淀后再行回写。最后是一份 `tts.config.json`，设定了音色、语速和专有名词念法的默认值。这六份文件遵循相同的审核标准：杜绝无法客观判定的模糊词汇，内容配比必须拆解成具体数值，语气规范也不能停留在抽象形容词。上一课结尾留了一个问题：账号大脑配置完毕后，AI 已经清楚内容要求，如果要真正把一条内容跑通，从文字稿到最终成片需要经过哪些具体步骤。

本课我们就来走完这条通路。完整过程包含四个步骤：第一步将口播稿转换成可供录屏的网页演示工程；第二步把网页录制为无声成片；第三步为成片合成并压入配音；第四步补齐竖版封面。走完这四个环节后，对应产出分别归档在四个位置：一个 `build/` 前端工程、一条 `final.mp4` 视频文件、一张竖版 `cover.png` 封面图，以及一份自行构建的 `tts-dub` skill。在这条流水线上，需要人工介入判断的卡点非常明确。首先是口播稿主干立论是否扎实。其次是第一章网页版面排布是否得当。第三是配音合成听感是否自然。最后是封面视觉在移动端小屏上是否具备辨识度。至于中间格式转换与文件流转，均交由 AI 和自动化脚本推进，无需人工全程盯守。本课的重点在于理清各个环节的流转节点与确认责任，而不纠结于单个工具的具体参数微调。

具体选题内容，账号大脑不作微观限定。如同第 04 课设定账号定位时一样，它源自你自己想分享的技术实践，文档中并无现成预设。请挑选一个你熟悉且能讲透彻的技术主题，带着这个主题开始推进。

## 一、口播稿到网页 demo：web-video-presentation 建工程

首先为本条内容创建专属工作目录。在 `content/` 下按发布日期和 slug 新建文件夹，后续所有相关文件均归档在此：

```bash
mkdir -p content/<发布日>/<slug>
cd content/<发布日>/<slug>
```

在开始制作前，先确认两个开源 skill 已就位。其中一个位于当前项目仓库内，另一个安装在全局用户主目录下：

```bash
ls .claude/skills/web-video-presentation/SKILL.md
ls ~/.claude/skills/baoyu-image-gen/SKILL.md
```

两个文件路径均能正常显示即说明已就位，无需重复安装。

为什么先做网页演示，而不是直接配音后再录制。网页工程是整条链路中调整代价较高的环节。如果章节划分或动画节奏存在偏差，后续配音与录制均须推倒重来。先在网页演示阶段将文案分段与画面节奏校验妥当，相比录制完成后再返工排查，维护成本会低很多。

将选题主题、账号大脑文档以及 web-video-presentation 一并提交给 AI：

```
读 brain/positioning.md、brain/persona.md、brain/style-guide.md、
brain/sources.md。
我想讲的内容是：<把你心里那个点子写成一句话>。
按这四份文件定的语气和取材规则，把它写成一篇口播稿，存到 2-script.md：
钩子放最前面，第一句必须自成立，不依赖上一集、前面说过这类承接词；
中间是分点主体；结尾给一句 takeaway。
写完之后，用 web-video-presentation skill 把 2-script.md 做成 16:9 的
网页演示，工程放在 build/ 目录。2-script.md 是口播稿唯一真相源，你
产出的 script.md 要以它为准，不要改写内容。
按 skill 的流程走，在 Checkpoint Plan 停下来等我确认。
```

AI 完成稿件起草和演示开发计划后会暂停执行，将五个关键确认项提交给你核验：

| 确认项 | 核验要点 |
|---|---|
| 稿件 script.md | 与你的 2-script.md 内容严格一致，未被擅自改写 |
| 大纲 outline.md | 每章预估时长控制在 30 至 60 秒之间，每步仅规划界面呈现内容 |
| 视觉主题 | 从推荐的两至三套配色与字体预设中选定一套，若不合适可要求重新推荐 |
| 配图素材 | 需要实际插图的位置，确认当下提供还是先保留占位符 |
| 开发模式 | 首次执行建议选择逐章确认模式，每完成一章核对一次再继续推进 |

开发大纲中不应包含具体的过渡动画指令。根据 skill 的架构约定，outline 仅负责节奏编排以及每个操作步的信息承载，具体动效交由编写章节代码阶段依据实际内容设计。若在 outline 中固化动画说明，负责编写界面的 AI 容易陷入生硬套用，最终效果会趋近于机械翻页的演示幻灯片。如果在 outline 中出现淡入、从左滑入等动效词汇，应当要求其移除。

五个确认项核验完毕后，skill 会搭建工程脚手架，清理默认示例章节，随后开始制作第一章。第一章必须在主线程完成完整版构建，并在本地服务启动后暂停，等待你在浏览器中验收，该步骤不可略过。验收时重点核对四个方面。首先是画面停留时长与口播节奏是否协调。其次是列表元素是否依次展开，避免整屏文字一次性弹出。第三是界面中是否保留了必要的代码细节。第四是整体视觉是否保持克制，避免出现紫粉高饱和渐变、大圆角彩色卡片或装饰性表情符号。四项要求均达标后，方可继续推进后续章节的生成。

如果在页面上点击交互按钮时，整个演示画面意外跳转到了下一页，通常是因为该按钮缺少了 `data-no-advance` 属性标注。该属性是脚手架用于识别一次点击是否触发章节推进的关键标记，要求 AI 为相应按钮补充该属性即可解决。

## 二、网页录制成片：npm run record 与字幕层

网页演示搭建完成后，不要急于执行录制。脚手架模板位于 `templates/src/components/` 目录下，包含进度指示器、模式切换面板与演示舞台等基础组件，但默认并未包含字幕图层。如果未补充字幕层，录制出的成片底部将缺失文字对应，抖音用户在静音或弱音环境下浏览时极易直接划过。

为工程补充独立的字幕组件：

```
在 build/src/components/ 下加一个 Subtitles 组件：
1. 接收当前 step 的口播文本，渲染成舞台底部一条字幕条；
2. 只在 URL 带 ?subs=1 时渲染，平时不带这个参数就不显示；
3. 空文本时不渲染，避免转场步出现一条空字幕条。
在 App.tsx 里引入这个组件，条件渲染放在 Stage 内部，跟着舞台一起
缩放。
写完用本地地址加 ?subs=1 打开页面，确认字幕条跟着 step 内容切换。
```

核对 AI 生成的代码实现，重点确认这两个核心导出逻辑：

```tsx
export function Subtitles({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="subs-bar" key={text}>
      <span className="subs-text">{text}</span>
    </div>
  );
}
export function subsEnabled(): boolean {
  return new URLSearchParams(window.location.search).get("subs") === "1";
}
```

字幕层集成完毕后，需要将各章 `narrations.ts` 中定义的口播文案提取为配音引擎通用的标准化格式：

```bash
cd build
npm run extract-narrations
```

该命令会遍历扫描所有章节的 `narrations.ts`，合并生成 `build/audio-segments.json`。下一阶段的配音脚本即以此文件作为输入源。

视频合成与渲染由一条组合命令驱动：`npm run build && npm run record -- --serve --out final.mp4`。其底层原理是解析 `audio-segments.json` 获取各分段音频精确时长，随后启动无头浏览器按步推进画面渲染，最后调用 ffmpeg 将对齐的音轨与画面合成为完整视频。该命令必须在所有分段音频实际生成后方可运行。若缺少任意分段的 mp3 文件，进程将抛错中断，避免产出音画脱节的半成品。

在此处需要提前规避一个录制脚本的固有缺陷。无头录制脚本在启动浏览器访问页面时，默认 URL 中未附带 `?subs=1` 参数。而在 `--serve` 独立启动本地服务器的模式下，脚本还会覆盖外部手动传入的 `--url` 配置，导致录制视频底部依然缺失字幕。该问题曾在实际项目中发生。录制完成后抽帧对比历史视频才排查出漏配字幕，相关教训已收录于 `pipeline/lessons.md` 的 L15 条目。规避方案是直接修改 `build/` 目录下的 `auto-record.mjs`，在页面导航逻辑中强制追加 `/?subs=1` 参数：

```js
const gotoUrl = url + (url.includes("?") ? "&" : "?") + "subs=1";
await page.goto(gotoUrl, { waitUntil: "domcontentloaded" });
```

完成字幕组件添加、分段文案抽取以及录制脚本修复后，当前准备工作已就绪。待下一节完成音频合成后，再重新运行录制命令产出成片。

## 三、配音合成：自己造一个 tts-dub skill

打开尚未进行音频合成的演示工程，画面结构均已就位，但音频资源尚为空缺。web-video-presentation 虽然内置了配音命令 `npm run synthesize-audio`，但在实际调用中存在兼容缺陷。`tts-dub` 的 SKILL.md 文档指出了根因：该工具在拼装多音字注音参数时将其序列化为了单一字符串，而下游云端接口要求接收数组结构，导致注音参数未能生效。为此我们需要自行构建一个项目级 `tts-dub` skill 承接语音合成工作。

通过第一条提示词定义该 skill 的输入输出契约：

```
在 .claude/skills/tts-dub/ 下造一个项目级 skill，做分段文案配音这件事：
输入是 segments（形如 audio-segments.json 里 { chapter, step, text }
的数组）和一份 tts.config.json；输出是每段一个 mp3。
tts.config.json 的字段定成这样：provider（用哪家合成服务）、voice_id
（账户克隆音色编号，先留占位）、speed 和 pitch（全局语速语调，先给
默认值）、normalize（高频缩写的念法规整，只改配音文本不改字幕源）、
pronunciation（全局多音字，留空）、overrides（按 章/步 覆盖
speed/pitch/pronunciation 的占位对象，先给空对象）。
合成脚本放 scripts/synthesize.mjs，命令行参数叫 --config 和
--segments；鉴权从环境变量读，MiniMax 读 MINIMAX_API_KEY，OpenAI 读
OPENAI_API_KEY，这两个变量第 02 课已经设过，不要另外编一份凭据文件。
把这份契约写进 skill 的 SKILL.md，字段旁边加注释说明什么时候改。
脚本自己实现，不要现在编一个假的 voice_id。
```

通过第二条提示词触发音频合成任务：

```
从 brain/tts.config.json 复制一份到 build/tts.config.json，用刚造好
的 tts-dub 在 build/ 里跑合成：读 build/audio-segments.json 和
build/tts.config.json，按段合成，输出到
build/public/audio/<章>/<步>.mp3，失败的段重试几次再报给我，不要
静默跳过。
```

在复制配置文件时需要格外注意相对路径层级。当前执行目录为 `content/<发布日>/<slug>/build/`，向上回溯至仓库根目录需依次经过 slug、发布日和 content 三层目录，总计四层相对深度，因此复制路径需连续使用四组 `..`：

```bash
cd build
cp ../../../../brain/tts.config.json ./tts.config.json
node ../../../../.claude/skills/tts-dub/scripts/synthesize.mjs \
  --config tts.config.json --segments audio-segments.json
```

若少写一层相对路径，`cp` 命令因无法定位源文件将直接抛出路径不存在错误。在终端执行前确认好目录层级，能有效减少排查耗时。

命令执行完毕后请检查终端日志。如果日志中出现了 `[FAIL]` 标记，常见原因是当前终端会话未正确加载 `MINIMAX_API_KEY` 环境变量，此时可重新运行第 02 课中的 `wc -c` 命令完成自检。排查并确认环境变量生效后，再次运行合成脚本即可。脚本具备断点续跑机制，会自动跳过已生成合格音频的段落，仅针对失败分段发起补充请求。

音频生成后首先核对文件完整度。`public/audio` 目录下 mp3 文件总数必须严格对应分段文案条数。每个文件体积需大于基础字节数。若出现 0 字节文件，通常由接口限流或网络请求中断引起。文件数量与体积确认无误后，抽查两至三段音频进行试听。重点排查是否存在明显多音字读错，以及段落间语速是否存在突兀失衡。本课暂不展开语速微调与多音字精细标注操作。配置中的 `overrides` 字段现阶段先保持结构清晰，后续章节将针对性深化处理。

配音文件就绪后，重新切回上一节配置的视频录制命令，此时即可全流程跑通：

```bash
cd build
npm run build && npm run record -- --serve --out final.mp4
```

视频导出完成后，建议抽取代表性帧画面进行质量核验，避免仅凭时间线概览而遗漏细节：

```bash
for t in 1 20 40; do
  ffmpeg -y -ss $t -i final.mp4 -frames:v 1 frame_$t.png
done
```

抽帧核验需重点关注三个指标。一是所抽帧画面底部均完整展示了对应字幕。二是视频首尾两帧画面纯净，既无浏览器初始载入的空白底色，亦无停留过久的操作残余状态。三是最终视频总时长与口播累计时长基本一致。自动化录制严格依照各音频片段的物理时长推进画面，并未对未完成的前端动效设置强制等待逻辑。若某一交互步的动画耗时超过了该步音频长度，画面动作会被强行截断。遇到此类情况，通常需要调整章节代码缩短动画耗时，或者适度扩充该分段的口播解说长度以支撑视觉展示。

## 四、封面与产物归位：baoyu-image-gen 与 build/ 目录

至此 `final.mp4` 已完整具备画面、旁白与字幕三大要素。而在短视频平台主页呈现中，还需要一张配套的视觉封面。`final.mp4` 采用 16:9 横屏规格，而平台主页信息流呈现为 9:16 竖版网格，因此必须单独制作一张 9:16 竖版封面图。直接截取横屏视频画面充当封面的做法在流水线验收中曾被判定不合格。相关教训已收录在 `pipeline/lessons.md`：此前因提示词约束不足，模型自由发挥生成了与主题无关的卡通形象；也发生过直接拿视频帧当封面导致排版错乱的情况，两次提交均被人工打回。

首先让 AI 编写针对封面生成的绘图提示词：

```
读 2-script.md 和 brain/style-guide.md，写一份封面图像 Prompt，
存到 assets/cover-prompt.md：
竖版 9:16，暗底，一个强调色；顶部一行小字写栏目名；底部两行大字
标题，标题取口播稿开头的钩子那句改写；背景放两三个跟这条内容相关
的关键词，不要编具体的产品截图或者数据。
只输出 Prompt 文本，不要解释。
```

执行图像生成脚本：

```bash
set -a; source ~/.baoyu-skills/.env; set +a
npx -y bun ~/.claude/skills/baoyu-image-gen/scripts/main.ts \
  --promptfiles assets/cover-prompt.md \
  --image assets/cover.png --ar 9:16 --provider google
```

此处的命令行调用与第 02 课自检环节使用的 `/baoyu-image-gen --prompt … --ar 9:16` 是同一工具的两种使用形态。skill 的文档在规范说明中将该 `npx -y bun` 形式作为底层标准调用，第 02 课的斜杠命令属于交互环境下的快速缩写，两者在底层均执行相同的 `scripts/main.ts` 脚本。

图片生成后需核对两项指标：一是画幅比例是否为 9:16 竖版，避免产出方形或横向画幅；二是大标题文字缩放至移动端小屏宽度时，核心信息是否依然清晰易读。如果生成的图像画幅出现异常，通常是因为 `--ar` 参数未能正确解析传递。此时可以参考 `~/.claude/skills/baoyu-image-gen/SKILL.md` 中 Aspect Ratios 支持表格，确认 9:16 语法匹配后重新执行命令生成。

完成所有物料生成后进行产物归位整理，成品媒体统一收拢于 `assets/`，中间开发目录 `build/` 仅作为工作空间，不纳入版本控制：

```text
content/<发布日>/<slug>/
├── 2-script.md          # 口播稿，唯一真相源
├── assets/
│   ├── cover-prompt.md
│   ├── cover.png
│   └── final.mp4
└── build/                # 工作区，网页工程、分段音频都在这里
```

全流程四个核心产物的生成归属与人工校验标准如下：

| 产物 | 生成主体 | 人工核验标准 |
|---|---|---|
| 2-script.md | AI 生成，人工审核 | 首句独立自成立，论点完整 |
| build/ 工程 | web-video-presentation | 确认计划五项指标、第一章四项要点 |
| final.mp4 | npm run record | 抽帧字幕对齐、首尾纯净、时长匹配 |
| cover.png | baoyu-image-gen | 竖版画幅比例、小屏辨识度合格 |

按照既定顺序推进上述步骤后，`build/` 演示工程、`final.mp4` 视频文件、`cover.png` 封面图以及自建的 `tts-dub` skill 便全部整理就绪。首条成片顺利跑通，各项技术指标也在屏幕前得到了逐项确认。不过这种判断高度依赖于人工在场盯守。在接下来的自动化演进中，如果人工不在场，应该由什么机制来客观判定成片是否达标？
