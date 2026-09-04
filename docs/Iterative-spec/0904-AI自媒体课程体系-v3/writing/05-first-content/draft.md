# 用开源 Skill 跑通一条内容：从口播稿到成片与封面

上一课交出了六个文件。`brain/` 下四份填满的 md（`positioning.md` 管取题配比、`persona.md` 管语气、`style-guide.md` 管规范、`sources.md` 管素材来源），一份先留空的 `benchmarks.md`（等第一批数据回来再写），还有一份 `tts.config.json`（音色、语速、缩写念法都定了默认值）。这六个文件过的是同一道审：不许出现判不了的词，内容比例要能拆成一个数字，语气条目不能停在形容词。上一课收尾那句问题是，账号大脑写完了，AI 知道你要什么内容了，现在真去做一条出来，从稿子到成片要走几步。

这一课就是走这几步。答案是四步：口播稿变成能录屏的网页，网页录成无声成片，成片配上声音，最后补一张封面。走完你手上会多出四样东西：一个 `build/` 工程、一条 `final.mp4`、一张竖版 `cover.png`，还有一个自己造出来的 `tts-dub` skill。这条链上真正要你停下来判断的地方不多，就几个点：口播稿写得对不对、第一章网页像不像话、配音听着自不自然、封面第一眼抓不抓人。中间那些格式转换和文件搬运是 AI 和几行脚本的事，用不着你盯着。这一课讲的就是流程走到哪一步、该谁停下来看一眼，不是某个工具的参数怎么调。

这条内容具体讲什么，账号大脑管不到这一层，跟第 04 课的账号定位一样，这是你自己心里已经有的一个点子，不是哪个文件里现成摆着的东西。挑一个你想讲、也讲得明白的话题，带着它往下走。

## 1. 口播稿到网页 demo：web-video-presentation 建工程

先给这条内容一个家。在 `content/` 下建一个日期加 slug 的目录，后面所有文件都落在这里：

```bash
mkdir -p content/<发布日>/<slug>
cd content/<发布日>/<slug>
```

开工前顺手确认两个开源 skill 还在位，第 02 课装的时候一个进了项目仓库、一个进了家目录：

```bash
ls .claude/skills/web-video-presentation/SKILL.md
ls ~/.claude/skills/baoyu-image-gen/SKILL.md
```

两个文件都能看到就是在位，不用重装。

为什么先做网页，不直接配音再录制。网页这一步是这条链上返工成本最高的一环，段落划错了、节奏排错了，后面配的音和录的像都得跟着重来。先在网页这一步把段落和节奏核一遍，比录完发现问题再回头改省事得多。

把选题、账号大脑和 web-video-presentation 一次交给 AI：

```
读 brain/positioning.md、brain/persona.md、brain/style-guide.md、
brain/sources.md。
我想讲的内容是：<把你心里那个点子写成一句话>。
按这四份文件定的语气和取材规则，把它写成一篇口播稿，存到 2-script.md：
钩子放最前面，第一句必须自成立，不依赖"上一集""前面说过"这类承接词；
中间是分点主体；结尾给一句 takeaway。
写完之后，用 web-video-presentation skill 把 2-script.md 做成 16:9 的
网页演示，工程放在 build/ 目录。2-script.md 是口播稿唯一真相源，你
产出的 script.md 要以它为准，不要改写内容。
按 skill 的流程走，在 Checkpoint Plan 停下来等我确认。
```

AI 写完稿子和开发计划会停下来，把五件事一起摆给你确认：

| 五件事 | 你看什么 |
|---|---|
| 稿子 script.md | 和你的 2-script.md 内容一致，没被悄悄改写 |
| 开发计划 outline.md | 每章预计时长在 30 到 60 秒之间，每步只写屏幕上放什么内容 |
| 主题 | 从推荐的两三套配色字体预设里选一套，不满意也可以让它再推荐 |
| 素材 | 需要真图的地方，你现在能给还是先占位 |
| 开发模式 | 第一次跑选逐章确认，一章做完看一眼再往下走 |

开发计划里不该出现具体动画说明。skill 的设计是，outline 只管节奏和每一步屏幕上放什么信息，动画留给写章节代码那一步按内容临场决定。写死了动画，写章节的 AI 就退化成照抄，出来的东西会像一张会翻页的 PPT。如果 outline 里冒出"淡入""从左滑入"这类词，让它删掉。

五件事确认完，skill 会搭好脚手架，删掉自带的示例章节，接着做第一章。第一章必须在主线程做完整版，做完停下来等你在本地地址验收，这一步不能跳过。看四件事。停留时间和口播长短对不对得上。列表是一项一项亮出来的，还是一次全堆出来。屏幕上有没有一点口播没念、但原文里有的细节。紫粉渐变、圆角彩色药丸、emoji 这类东西有没有出现。四件都过了再让它接着做后面几章。

如果你点了页面上的一个按钮，整个页面却跟着往下翻了一页，多半是那个按钮没加 `data-no-advance` 这个标记，这是脚手架用来分辨一次点击算不算推进的标记，让它给按钮补上就行。

网页做完了，剩下的字是空的，画面是静的，下一步把它录成一条真正的视频。

## 2. 网页录制成片：npm run record 与字幕层

网页做完先别急着录。脚手架模板 `templates/src/components/` 目录下有进度条、模式切换、舞台这些组件，唯独没有字幕这一层。不补的话，录出来的成片底部是空的，抖音上刷到的人只能靠听，静音刷手机的人直接划走。

给工程加一层字幕组件：

```
在 build/src/components/ 下加一个 Subtitles 组件：
1. 接收当前 step 的口播文本，渲染成舞台底部一条字幕条；
2. 只在 URL 带 ?subs=1 时渲染，平时不带这个参数就不显示；
3. 空文本时不渲染，避免转场步出现一条空字幕条。
在 App.tsx 里引入这个组件，条件渲染放在 Stage 内部，跟着舞台一起
缩放。
写完用本地地址加 ?subs=1 打开页面，确认字幕条跟着 step 内容切换。
```

对照一下 AI 应该交回来的样子，核心是这两个函数：

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

字幕层加完，配音也合成完（下一节的事），就能出片了。录制是一条命令：

```bash
cd build
npm run build && npm run record -- --serve --out final.mp4
```

它自己读每段音频的时长，起一个无头浏览器逐步推进画面，再用 ffmpeg 把音轨和画面拼到一起，全程不用人盯着。这里有个每次跑都会撞上的坑：录制脚本内部打开页面时，默认地址不带 `?subs=1`，而且 `--serve` 这种自起服务的模式还会把你手动传的 `--url` 参数整个覆盖掉。仓库里真有一次是录完之后抽帧对照上一集才发现没有字幕，这条教训记在 `pipeline/lessons.md` 的 L15 条目里。躲开这个坑的办法是在 `build/` 内的 `auto-record.mjs` 里，把它打开页面那一行地址强制拼上 `/?subs=1`，不管有没有传 `--url` 都带着这个参数走：

```js
const gotoUrl = url + (url.includes("?") ? "&" : "?") + "subs=1";
await page.goto(gotoUrl, { waitUntil: "domcontentloaded" });
```

出片之后抽三帧看一眼，别信眼睛扫一遍时间线就完事：

```bash
for t in 1 20 40; do
  ffmpeg -y -ss $t -i final.mp4 -frames:v 1 frame_$t.png
done
```

看三件事：三帧底部都有字幕；第一帧和最后一帧是干净的画面，没有浏览器刚打开的空白，也没有停在终态的长尾；成片总时长和口播总时长差不多。自动录制严格按每段音频的时长推进画面，没有等动画播完的兜底。如果某一步的动画比这段口播还长，画面会被从中间切断，多半是这一步动画时间设长了。回章节代码把动画调快，或者把这段口播文案写得更长一点撑住时长。

无声成片有了，字幕也烧进去了，接下来把声音接上。

## 3. 配音合成：自己造一个 tts-dub skill

打开刚录出来的成片，画面在动，声音是空的。web-video-presentation 自带一条配音命令，但它走的是一个坏掉的命令行工具，多音字注音参数传的格式和接口要的对不上，注音传过去不生效。这一截缺口要自己补上，造一个项目级的 `tts-dub` skill 来接。

第一条 Prompt 给出这个 skill 的输入输出契约：

```
在 .claude/skills/tts-dub/ 下造一个项目级 skill，做分段文案配音这件事：
输入是 segments（形如 audio-segments.json 里 { chapter, step, text }
的数组）和一份 tts.config.json；输出是每段一个 mp3。
tts.config.json 的字段定成这样：provider（用哪家合成服务）、voice_id
（账户克隆音色编号，先留占位）、speed 和 pitch（全局语速语调，先给
默认值）、normalize（高频缩写的念法规整，只改配音文本不改字幕源）、
pronunciation（全局多音字，留空）、overrides（按"章/步"覆盖
speed/pitch/pronunciation 的占位对象，先给空对象）。
把这份契约写进 skill 的 SKILL.md，字段旁边加注释说明什么时候改。
脚本自己实现，不要现在编一个假的 voice_id。
```

第二条 Prompt 跑合成：

```
从 brain/tts.config.json 复制一份到 build/tts.config.json，用刚造好
的 tts-dub 在 build/ 里跑合成：读 build/audio-segments.json 和
build/tts.config.json，按段合成，输出到
build/public/audio/<章>/<步>.mp3，失败的段重试几次再报给我，不要
静默跳过。
```

复制配置这一步有个路径要注意。工作目录是 `content/<发布日>/<slug>/build/`，从 `build/` 往上数四级才到仓库根目录，所以复制命令要写四级 `..`：

```bash
cd build
cp ../../../../brain/tts.config.json ./tts.config.json
node ../../../../.claude/skills/tts-dub/scripts/synthesize.mjs \
  --config tts.config.json --segments audio-segments.json
```

旧版讲义里这条命令只写了两级 `..`，从 `build/` 的上一级往上数才够两级，从 `build/` 内部数是不够的，跑起来会报路径不存在。数错一级看着是小事，第一次跑流水线的人十有八九会在这里卡一下，数清楚目录深度再敲命令。

跑完看终端输出，`[FAIL]` 那一行如果出现，多半是鉴权没配好。MiniMax 读的是 `~/.mmx/config.json` 里的 `api_key`，这个文件不存在或者 key 是空的，对应那一段就会失败，但不影响其它段继续跑完。配好鉴权重新跑一遍命令就行，脚本对已经生成的 mp3 默认跳过，只会去补上失败的那几段。

合成完先数一遍文件：`public/audio` 下的 mp3 数量要等于分段文案的段数，每个文件大小要大于几 KB，0 字节的文件是限流或者失败留下的。数量和大小都对了，随手挑两三段听一下，重点听有没有明显读错的字、有没有一段特别快或者特别慢。这一课不展开多音字和语速怎么精细调，`overrides` 这个字段先记住它在哪，往细里改是后面几课的事。

配音合上了，`final.mp4` 现在画面声音都齐了，最后补一张封面，把这条内容的产物归位。

## 4. 封面与产物归位：baoyu-image-gen 与 build/ 目录

`final.mp4` 是横屏 16:9，但抖音主页是竖屏网格，封面必须另外做一张竖版 9:16。拿横屏视频帧充数在这条流水线上被打回过，本仓库的教训记在 `pipeline/lessons.md`：模型自由发挥编出过一个跟内容毫不相干的吉祥物，也拿视频帧当封面交过，两次都被打回。

先让 AI 写一份封面的图像 Prompt：

```
读 2-script.md 和 brain/style-guide.md，写一份封面图像 Prompt，
存到 assets/cover-prompt.md：
竖版 9:16，暗底，一个强调色；顶部一行小字写栏目名；底部两行大字
标题，标题取口播稿开头的钩子那句改写；背景放两三个跟这条内容相关
的关键词，不要编具体的产品截图或者数据。
只输出 Prompt 文本，不要解释。
```

出图：

```bash
set -a; source ~/.baoyu-skills/.env; set +a
npx -y bun ~/.claude/skills/baoyu-image-gen/scripts/main.ts \
  --promptfiles assets/cover-prompt.md \
  --image assets/cover.png --ar 9:16 --provider google
```

出图后核两件事：比例是不是竖版 9:16，不是方形也不是横版；标题字缩到手机屏幕宽度看还认不认得清楚。如果出来的图是方形或者横版，多半是 `--ar` 这个参数没传上，回头看 `~/.claude/skills/baoyu-image-gen/SKILL.md` 里 Aspect Ratios 那张表，确认 9:16 在支持列表里，重新传一遍参数再出一次。

产物归位，`assets/` 只放成品媒体，`build/` 是工作区不进版本库：

```text
content/<发布日>/<slug>/
├── 2-script.md          # 口播稿，唯一真相源
├── assets/
│   ├── cover-prompt.md
│   ├── cover.png
│   └── final.mp4
└── build/                # 工作区，网页工程、分段音频都在这里
```

这一课走完，`build/` 工程、`final.mp4`、`cover.png`、自己造的 `tts-dub` skill，四样都到手了。第一条成片出来了，你眼睛看着觉得还行，这个判断是你一步步盯着走完全程给出来的：稿子第一句你审过，第一章网页你验收过，配音你听过，封面比例你核过。可下次你不在场的时候，谁来看这个还行？

## 小结

四样产物、谁产的、你验了什么，摆在一张表里：

| 产物 | 谁产 | 你验什么 |
|---|---|---|
| 2-script.md | AI 写，你审 | 第一句自成立 |
| build/ 工程 | web-video-presentation | Checkpoint Plan 五件事、第一章四点 |
| final.mp4 | npm run record | 三帧字幕、首尾干净、时长对得上 |
| cover.png | baoyu-image-gen | 竖版比例、标题在小屏上看得清 |

这条链已经能从口播稿跑到成片，但右边那一列全是你在盯。这次是你一个人在场，下次你不在场的时候，这些判断怎么办，是下一课要接着问的事。
