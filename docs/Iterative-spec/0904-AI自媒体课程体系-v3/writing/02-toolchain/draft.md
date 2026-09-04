# 装备：开源件与自检基线

上一课把这条内容生产线摆清楚了，落成一份 `docs/00-walkthrough.md`：一张流程图，把选题、取题、创作、出审、发布五个动作串起来，每两个动作之间靠文件接力；一份人出现点清单，三种位置：选题池上提前写好的指针、出审和确认发布这两处闸门、异常时被叫醒。上一课结尾留了一句话：流程图和人出现点清单有了，可你手上一个工具都没有。这些环节要跑起来，机器上得先装齐哪些东西。

这一课回答的就是这句话。装的不是十件互不相干的东西，是给后面每一课的动手环节先把地基铺平，装错一步，后面的自检就会全数报错，排查起来还找不到根。这一课结束，你手上会多两样东西：一份 `docs/00-toolchain.md`，把十项工具的来源、装机命令、自检命令记在一处；一份跑过的自检输出，全绿。

装机命令这件事最容易出的错，是凭印象写。命令在写的人自己那台机器上一跑就过，因为那台机器早就装好了，跑没跑其实无所谓。换到一台干净机器上，得到的是一串 `command not found`。这一课的命令全部从官方渠道现查现核：Claude Code、Node、uv、ffmpeg 的官方文档，三个开源 skill 和一个发布引擎的官方 README。仓库里能找到的只是这些工具装好之后要用的配置样例和 skill 目录，不是装机说明书本身。

十项里有六项要靠外部账号或者外部服务，这一课只能给出装机命令和自检命令，跑没跑通留给你自己确认。

## 1. 基础运行环境：Claude Code、Node、uv、ffmpeg/ffprobe

这四项是其余六项的地基。Claude Code 是唯一一件所有开源 skill 都要跑在里面的工具，它不在就没有流水线。Node 和 uv 是两套包管理和运行时，后面第 12 到 16 课你要造的命令行工具是 Node 的，发布引擎和飞书服务是 Python 的，环境靠 uv 管。ffmpeg 和 ffprobe 是音视频处理的基础命令，后面第 07、08 课要造的配音质检脚本，读时长、读静音段、抽帧核对音画，都靠它俩。

四项里错一项，后面的自检会全数报错，所以先装这四项，装完再往下走。

### 1.1 Claude Code：装上并确认能对话

官方安装文档给的命令是这一条，macOS、Linux、WSL 通用：

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

装完先跑 `claude --version`，打印出一个版本号就算装上了；再跑 `claude doctor`，这是一次只读诊断，不开会话，能看出安装是否健康、设置文件有没有解析错误。第一次跑 `claude` 本体会走浏览器登录，登录需要 Pro、Max、Team、Enterprise 或者 Console 账号，免费版不含 Claude Code，这一项要花钱，课程不给替代路径。

官方文档还留了一条信息，值得记一笔：如果改用 npm 装（`npm install -g @anthropic-ai/claude-code`），从 2.1.198 版起要求 Node.js 22 以上，低版本会在安装时报一条 `EBADENGINE` 警告，但装还是能装上，因为这个包拉的是不吃 Node 运行时的原生二进制。这条正好说明装机命令是过期最快的一类内容，两种装法看着差不多，实际的版本门槛只写在官方文档里，凭印象写的人容易把这两条混成一句话。

### 1.2 Node 20+ 与 npm、uv：脚本和包管理跑不动就卡在这一步

Node 官方下载页给的是一个装好版本选择的安装包页面，没有一条能直接抄的终端命令，选好平台下安装包装上就行，装完用 `node -v && npm -v` 确认版本号能打出来。取题、创作两个阶段的工程都跑在 Node 上，这一步没装对，后面网页转视频的引擎和第 12 到 16 课要造的命令行工具都起不来。

uv 是 Python 的包和环境管理器，官方 GitHub README 给的安装命令是这一条：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

装完这条 README 没给出 `uv --version` 这样的例子，给的是另外两条：`uv self update`，能自我更新到最新版本，跑一下能看到当前版本号；`uv help`，能看到完整命令参考。用它俩里任意一条确认 uv 装上了都行。安装脚本会把 uv 加进 PATH，如果这一步跑完立刻 `uv self update` 报 `command not found`，多半是当前这个终端窗口还没重新加载配置，开一个新窗口再试一次。

### 1.3 ffmpeg/ffprobe：处理音视频的地基

ffmpeg 官方下载页里，macOS 那一节只给了一条路径：`evermeet.cx/ffmpeg/` 提供的静态构建，没有提 Homebrew 或者 MacPorts。很多人实际装 ffmpeg 走的是包管理器，但那条命令查不到 ffmpeg.org 自己的出处，这一课按官方页面实际给的路径写。下载静态构建装好之后，跑 `ffmpeg -version | head -1` 和 `ffprobe -version | head -1` 确认两个命令都能打出版本信息。

ffprobe 和 ffmpeg 是同一个包里的两个命令，前者读音频时长和静音段，后者做抽帧。第 07、08 课要造的配音质检脚本，如果报的是找不到 ffprobe，多半是装了某个只打包了 ffmpeg 主程序、漏掉 ffprobe 的精简发行版，换一个完整的重装一次就好。

```
让 Claude Code 帮我按下面这四份官方文档，在这台机器上装好并验证：
1. Claude Code 官方安装文档 https://code.claude.com/docs/en/setup
2. Node.js 官方下载页 https://nodejs.org/en/download
3. uv 官方安装说明（GitHub README）https://github.com/astral-sh/uv
4. ffmpeg 官方下载页 https://ffmpeg.org/download.html
每一项都要求：
用 WebFetch 现查这份文档里当前给出的安装命令，不要凭你自己的记忆写。
装完跑一条能判断真假的自检命令，把命令和实际输出都贴给我。
如果某一项官方文档给的路径和你以为的常见做法不一样（比如某个工具
在某个系统上官方只给了一种安装方式），照官方给的写，并且告诉我
你查到的原文是哪一句、出自哪个链接。
最后整理成一张表：工具、装机命令、自检命令、实际输出，四列。
```

拿到结果先看这张表的第三列和第四列对不对得上，自检命令跑出来的东西和期望的是不是一回事，`claude --version` 该打出版本号却打出报错，说明装的过程哪一步没走完。

第二点，凡是它写的装机命令跟你自己以前用过的不一样，先别急着改回你熟悉的那条，去它给的链接上点开核实一遍，官方文档换写法是常有的事。

## 2. 内容生产开源件：web-video-presentation、baoyu-image-gen、agent-reach

这三个 skill 各自独立，装完各自能跑出一次自检结果，不依赖彼此，哪一个装错了只影响它自己负责的那一段。它们对应上一课流程图里创作和选题两个动作：口播稿变成能录屏的网页、生成封面、给选题提供素材来源。

### 2.1 web-video-presentation：网页转成片的引擎

来源是 `ConardLi/garden-skills` 这个仓库。官方 README 的安装方式是用 `skills` 这个命令行工具，它由 `npx` 临时下载，不用先单独装：

```bash
npx skills add ConardLi/garden-skills -s web-video-presentation
```

装完跑 `npx skills list`，能在已安装列表里看到 `web-video-presentation` 这一项，就算装上了。这个 skill 本身没有自己的二进制和凭据，它是一份写给 Claude Code 读的方法论加脚手架模板，第一次真用它是第 05 课把一条内容从稿子做成片的时候，那一课自然会验证它能不能用。

### 2.2 baoyu-image-gen：封面生成

来源是 `JimLiu/baoyu-skills` 这个仓库，官方 README 的安装命令是：

```bash
npx skills add jimliu/baoyu-skills
```

这个仓库有 20 多个 skill，装的时候会提示你只装用得上的，course 只用得着 `baoyu-image-gen` 这一个，其余先不装。它调用的是外部图片生成 API，凭据放在 `~/.baoyu-skills/.env` 这个用户级目录下，具体去哪个平台申请 key，官方 README 没有统一说法，各家平台自己走。装完自检，官方 README 给的调用示例是这样：

```
/baoyu-image-gen --prompt "一张竖版封面示意图" --image /tmp/selftest.png --ar 9:16
```

期望结果是 `/tmp/selftest.png` 这个文件存在，而且不是 0 字节。这里带的 `--ar 9:16` 不是随手写的参数，上一课的出审终检表里有一项是封面必须竖版比例，不能拿横屏视频帧充数，这条自检命令顺带把这一项也验了一遍。

### 2.3 agent-reach：选题情报抓取

来源是 `Panniantong/agent-reach`。官方 README 推荐的安装方式是 `pipx`：

```bash
pipx install https://github.com/Panniantong/agent-reach/archive/main.zip
agent-reach install --env=auto
```

第二条命令默认只是只读检查，不改系统，会检查 Node.js、gh CLI、mcporter 这些底层依赖装没装。装完跑 `agent-reach doctor`，这条命令会把每一个信息渠道的连通状态列出来，本课只要求网页、YouTube、RSS 这几个不用登录就能用的渠道显示可用，小红书、Twitter 这类要登录态的渠道留到真正用到选题调研那一课再配。

这个 skill 装的理由写在仓库自己的选题引擎里：抖音选题这一课不爬抖音平台本身，抖音反爬太重，headless 抓不到内容，能自动化的只有 AI 圈的素材源，靠的就是 agent-reach 打通的这几条渠道。它不在，选题池会一直是空的。

```
让 Claude Code 帮我按下面三份官方文档装好这三个开源 skill：
1. web-video-presentation，来自 ConardLi/garden-skills，
   README: https://github.com/ConardLi/garden-skills
2. baoyu-image-gen，来自 JimLiu/baoyu-skills，
   README: https://github.com/JimLiu/baoyu-skills
   （这个仓库有 20 多个 skill，只装 baoyu-image-gen 这一个）
3. agent-reach，来自 Panniantong/agent-reach，
   README: https://github.com/Panniantong/agent-reach
用 WebFetch 现查每份 README 当前的安装命令，装完各自跑一条能判真假的
自检命令：web-video-presentation 确认已安装在列表里即可；baoyu-image-gen
生成一张 9:16 的测试图，告诉我文件路径和大小；agent-reach 跑一遍 doctor，
把免登录那几条渠道的状态贴给我。
整理成一张表：skill、装机命令、自检命令、实际输出。
```

拿到结果核两点。第一点，baoyu-image-gen 生成的那张图，确认它是竖版而不是方形或者横版，尺寸信息在图片属性里能看到。第二点，agent-reach 的 doctor 输出如果有渠道显示不可用，看它是不是本课要求的那几条免登录渠道，如果是，回头查 Node.js、gh CLI 这些底层依赖是不是真装上了。

## 3. 发布与配音：social-auto-upload、飞书自建应用、TTS 引擎

这三项不是装完就完事，还要准备账号或者余额，装的动作和申请材料要一起走，不然自检会卡在服务不可用，看着像没装对，其实是装对了但账号还没通。

### 3.1 social-auto-upload：发布引擎

来源是 `dreammis/social-auto-upload`，本机没有这个项目的目录，装机命令全部来自它的官方 README 和 `docs/install.md`：

```bash
git clone https://github.com/dreammis/social-auto-upload.git
cd social-auto-upload
uv venv && source .venv/bin/activate
uv pip install -e .
PLAYWRIGHT_DOWNLOAD_HOST="https://npmmirror.com/mirrors/playwright" patchright install chromium
cp conf.example.py conf.py
```

`uv pip install -e .` 这一步装完会注册 `sau` 这个命令。patchright 是驱动浏览器的一个组件，装 Chromium 内核那一步默认从国外拉，前面那条环境变量指向国内镜像，不设的话下载常年卡住。这一段跑完，先跑 `sau douyin login --account main` 扫码登录，cookie 会落到项目目录下的 `cookies/` 里，`main` 这个账号名后面所有命令都要接着用。自检命令是：

```bash
sau douyin check --account main
```

期望输出是 `valid`。这一步依赖已登录的抖音账号，本机没有装这个项目，这一条命令有没有跑通，等你自己动手装的时候才知道。仓库里 `douyin-publish` 这个 skill 描述的环境约定和这条链路对得上：它约定发布引擎装在项目目录下，靠 `uv run sau` 调用，cookie 存在项目目录的 `cookies/` 下，账号名默认 `main`。如果 `sau --help` 报找不到命令，多半是虚拟环境没激活，或者 `uv pip install -e .` 那一步没跑成。

### 3.2 飞书自建应用：申请配置

飞书这一项没有安装命令，是一次账号申请，走六步，`tools/feishu-bot/config.example.yaml` 顶部写清楚了：在开放平台建一个企业自建应用；在凭证与基础信息页拿 App ID 和 App Secret；在应用能力里开机器人，发布应用，把机器人拉进要收卡的那个群；在事件与回调里把订阅方式选成长连接，订阅 `card.action.trigger` 这个事件；加密策略选不加密，记下 Verification Token；把这几个字符串和群的 `chat_id` 一起填进配置文件。

服务本身第 19 课才真正实现，这一课先把这几个值拿到手存好。有一点值得先知道：如果同一个飞书应用同时服务两个项目，还共用同一个群，配置文件里的 `ns` 这个字段要给每个项目分开填，不然一次点击会被两边的服务同时接住。自检要等服务起来才能做：起一次服务，看日志里有没有出现连接建立成功、没有鉴权失败的那一行。服务的 Python 依赖写在 `requirements.txt` 里，三个包：`lark-oapi`、`requests`、`pyyaml`。

### 3.3 TTS 引擎：MiniMax 或 OpenAI

配音引擎在仓库里的形态是 `tts-dub` 这个 skill，它自己不装二进制，读的是一份 `tts.config.json`，字段形状在 `.claude/skills/tts-dub/tts.config.example.json` 里定死了：`provider` 填 `minimax` 或者 `openai`，`voice_id` 是账户里的音色，`speed` 和 `pitch` 是整段语速和音高，`normalize` 是念法规整规则，`pronunciation` 和 `overrides` 管多音字。两种 provider 有个差别要记住：MiniMax 支持多音字注音和音高精确控制，OpenAI 不支持这两项，多音字只能靠改文本绕开。

鉴权走环境变量或者本地配置文件：MiniMax 读 `~/.mmx/config.json` 里的 `api_key`，也认环境变量 `MINIMAX_API_KEY`；OpenAI 认 `OPENAI_API_KEY`。装好之后按字段形状复制一份 `tts.config.json`，填上你自己的 `voice_id`，走一次最小合成自检：

```bash
node .claude/skills/tts-dub/scripts/synthesize.mjs \
  --config tts.config.json \
  --segments <一段十几个字的测试文案>
```

期望结果是产出一个 mp3 文件，用 `ffprobe` 读它的时长，大于 0 就算这一步通过。这条命令用到的正是第 1 节装好的 ffprobe，四项底座工具装错了，这一步会连带跑不出结果。

```
飞书自建应用我已经按下面六步申请好了：
<把 App ID、App Secret、Verification Token、chat_id 这四个值贴进来
（脱敏或者写「已拿到，暂不贴」都行）>
TTS 引擎我打算用 <MiniMax 或 OpenAI>，key 已经设成环境变量。
请你：
1. 用 WebFetch 读 dreammis/social-auto-upload 的官方 README，
   把装 social-auto-upload 的完整命令按官方原文列出来，装完跑
   sau douyin check --account main，把实际输出贴给我。
2. 按 .claude/skills/tts-dub/tts.config.example.json 的字段形状，
   帮我在项目根目录建一份 tts.config.json，只改 provider 和
   voice_id 两处，其余先留着示例值。
3. 用建好的配置跑一次最小合成自检，一段十几个字的文案，把生成的
   mp3 路径和 ffprobe 读出的时长贴给我。
```

拿到结果核两点。第一点，`sau douyin check` 如果报的不是 `valid`，看是登录没做还是虚拟环境没激活，这两种失败原因看着都是报错，处理方式不一样。第二点，TTS 那条自检如果时长是 0 或者文件不存在，多半是 key 没读到，先确认环境变量在当前这个终端窗口里真的生效了。

## 4. 自检基线：一次跑完，全绿

前三节各自的自检都过，不等于流水线能跑。十条自检命令原本一个查一个工具，装的时候是分批装的，跑的时候也该拼成一份能一次跑完的清单，把每一条命令、期望输出、实际输出记在同一份文件里，这样几个月后某一项突然坏了，能有一份当时的记录做对照。这份文件就是本课要交的两件东西之一：`docs/00-toolchain.md`。

十项里 Claude Code、Node、uv、ffmpeg 这四项属于装上就一直在，除非自己删掉；social-auto-upload 的登录态、飞书的长连接、TTS 的账户余额，这三项会过期，坏的时候人往往不在场，跟上一课说的异常时被叫醒是同一类信号。这一课先把十条命令跑一遍拿到全绿，后面第几课把哪几条挂到每天的编排里去自动探测，不是本课的事。

```
把前面三节的十项工具、装机命令、自检命令、期望输出汇总成
docs/00-toolchain.md，四节，一节一项来源：
1. 基础运行环境（Claude Code、Node、uv、ffmpeg/ffprobe）
2. 内容生产开源件（web-video-presentation、baoyu-image-gen、agent-reach）
3. 发布与配音（social-auto-upload、飞书自建应用、TTS 引擎）
4. 十项自检命令汇总表
每一项都要有：工具名、来源链接、装机命令、自检命令、期望输出。
装机命令后面注明它是从哪份官方文档取的，链接我不确定的地方，
写成待核对，附上我该去看的那个页面，不要凭记忆补。
写完之后，把第 4 节那张表从头到尾跑一遍，把每一条的实际输出贴到
docs/00-toolchain.md 末尾，跟期望输出对不上的单独列出来，写清楚是
哪一条、实际打印的是什么。
```

十项工具装齐、验证过了，但它们各自为政，没有一个仓库把它们串起来：选题那件不知道创作那件要什么，发布那件也不知道审核结果写在哪。这套流水线的骨架长什么样，是下一课要立的事。
