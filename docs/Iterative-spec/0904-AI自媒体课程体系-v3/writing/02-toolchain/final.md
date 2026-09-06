# 装备：开源件与自检基线

上一课我们把整条内容生产线梳理清楚，形成了一份 `docs/00-walkthrough.md`。这份文档包含一张流程图和一份人工介入节点清单。流程图把选题、取题、创作、出审、发布五个动作串联起来，上下游依靠文件衔接。人工介入则涵盖三种场景：选题池上预先设置的指针、出审与确认发布两个业务闸口，以及异常告警唤醒。上一课结尾提出了一个实际问题：流程图和人工介入清单有了，机器上需要先装齐哪些工具，才能让整条流水线跑起来。

这一课要解决的就是环境基准问题。本课配置的十项工具，会在后续所有实操环节中直接使用。如果装错版本或漏配依赖，后续自检就会报出连环错误，排查起来十分费劲。这一课的交付产物包含两项：一份记录十项工具来源、安装命令与自检命令的 `docs/00-toolchain.md`，以及一份经过实际运行验证的全绿自检记录。

十项工具的验证深度各有不同。其中七项本地工具可以在本课直接验证，包括基础运行环境与前端展示组件。另有三项依赖外部账号和服务：包括 social-auto-upload、飞书自建应用与语音合成引擎。当前阶段我们重点核验账号申请与凭据配置是否就绪。真正发布内容或批量生成配音，需要等第 19、20 课完成飞书通道与发布 Skill 后再进行。

配置开发环境时最常见的疏漏，是凭记忆手写命令。在已经装好环境的旧机器上运行看似顺利，换到全新的干净环境往往会出现 `command not found` 错误。因此，本课整理的所有安装命令均严格取自官方渠道。这包括基础运行环境的官方文档，以及各个开源项目的官方说明。

## 一、基础运行环境：Claude Code、Node、uv、ffmpeg/ffprobe

这四项工具是流水线运转的基础运行时。如果版本不匹配，后续步骤的自检就会出现错误。其余六项工具各自包含的特定底层依赖，会在对应章节就近说明，不混入通用基础环境中。

Claude Code 是承载所有开源 Skill 的核心环境，是整条流水线的中枢。Node 与 uv 分别提供 JavaScript 和 Python 的包管理与运行环境。第 12 到 16 课构建的命令行工具基于 Node 技术栈。发布引擎与飞书服务采用 Python，依赖环境统一由 uv 进行隔离管理。ffmpeg 与 ffprobe 是音视频处理的基础命令行工具。第 07、08 课编写配音质检脚本时，解析音频时长与检测静音片段均依赖它们完成。

### 1.1 Claude Code：装上并确认能对话

这一步需要由你在终端中手动执行。因为在安装完成之前，当前环境还没有能执行 Prompt 的 Claude Code。官方文档推荐的安装命令适用于 macOS、Linux 与 WSL 环境：

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

安装完成后，首先运行 `claude --version`，能够打印出版本号即表示安装成功。接着运行 `claude doctor` 进行只读环境诊断。该命令无需开启交互会话，即可检查安装状态是否健康以及配置文件是否正确。初次启动 `claude` 会调起浏览器进行身份验证。使用 Claude Code 需要准备好 Pro、Max、Team、Enterprise 订阅或 Console API 凭据，免费账号不包含该工具的使用权限。

官方文档补充说明，如果选择通过 npm 安装（`npm install -g @anthropic-ai/claude-code`），从 2.1.198 版本起建议使用 Node.js 22 或更高版本。较低版本安装时会输出 `EBADENGINE` 警告。不过底层下载的是独立的原生二进制文件，通常仍可完成安装。两种安装方式在环境依赖上略有差异。本课统一推荐上述 curl 命令进行安装，避开额外的版本依赖问题。

### 1.2 Node 20+ 与 npm、uv：装法与版本门槛

Node 官方下载页提供各平台的安装包。下载对应系统的安装包完成安装后，通过运行 `node -v && npm -v` 验证环境与版本号。后续课程使用 Node 的环境要求为 20 或更高版本，第 12 到 16 课构建的命令行工具同样基于 20+ 环境。如果此前通过 npm 安装了 Claude Code，建议直接安装 Node 22 以上版本，同时兼顾两边需求。

uv 是 Python 的包和环境管理器，官方 GitHub README 给的安装命令是这一条：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

uv 官方文档提供了两条校验命令：`uv self update` 可以在检查更新的同时输出当前版本号；`uv help` 则展示完整命令列表。运行其中任意一条能够正常输出，即说明 uv 已正确就绪。安装脚本会自动将 uv 路径加入系统的 PATH 环境变量。如果安装后立即执行报错 `command not found`，常见原因是当前终端尚未加载最新的环境配置，新开一个终端窗口重试即可。

### 1.3 ffmpeg/ffprobe：处理音视频的地基

在 ffmpeg 官方下载页面中，macOS 章节推荐了静态构建包下载路径。下载解压并配置环境变量后，运行 `ffmpeg -version | head -1` 与 `ffprobe -version | head -1`，确认两条命令均能正常打印出版本信息。

ffprobe 与 ffmpeg 通常随同一个软件包分发。前者负责解析音频时长与检测静音片段，后者用于媒体转码与剪辑。在第 07、08 课运行配音质检脚本时，如果提示找不到 ffprobe，常见原因是安装了精简发行版。这类版本往往仅打包了 ffmpeg 主程序，重新下载安装包含完整工具链的发行包即可解决。

Claude Code 就绪后，可以引导它按照官方指引协助完成剩下三项环境的配置与验证：

```
我这台机器已经装好 Claude Code 了。请你按下面三份官方文档，
帮我装好并验证剩下三项：
1. Node.js 官方下载页 https://nodejs.org/en/download
2. uv 官方安装说明（GitHub README）https://github.com/astral-sh/uv
3. ffmpeg 官方下载页 https://ffmpeg.org/download.html
每一项都要求：
用 WebFetch 现查这份文档里当前给出的安装命令，不要凭你自己的记忆写。
装完跑一条能判断真假的自检命令，把命令和实际输出都贴给我。
如果某一项官方文档给的路径和你以为的常见做法不一样，照官方给的写，
并且告诉我你查到的原文是哪一句、出自哪个链接。
最后整理成一张表：工具、装机命令、自检命令、实际输出，四列。
```

获取到执行结果后，重点核对输出表格中的自检命令与实际输出是否一致。如果 `node -v` 未能正常输出版本号而是提示错误，说明对应安装步骤尚未完全生效。另外，如果生成的安装命令与个人既往习惯存在差异，建议先点开对应的官方文档链接核对确认，开源工具的官方指引更新通常更为权威。

## 二、内容生产开源件：web-video-presentation、baoyu-image-gen、agent-reach

这三个 Skill 职责互相独立，安装后均可单独运行自检，彼此之间没有强依赖关系。它们分别对应前一课流程图中的创作与选题环节：将口播文案转为可供录制的网页、自动生成成片封面、以及为选题环节搜集外部情报。

### 2.1 web-video-presentation：网页转成片的引擎

该 Skill 来源于开源仓库 `ConardLi/garden-skills`。官方文档推荐使用 `skills` CLI 工具进行安装，借助 `npx` 即可直接拉取运行，无需提前全局安装：

```bash
npx skills add ConardLi/garden-skills -s web-video-presentation
```

安装完成后运行 `npx skills list`，在输出列表中查看到 `web-video-presentation` 即表示安装成功。该 Skill 本身不包含独立编译的二进制文件或私有密钥，其核心是提供给 Claude Code 的制作指引与页面模板代码。在第 05 课将口播稿转化为成片时，会正式调用该 Skill 并验证其实际渲染效果。

### 2.2 baoyu-image-gen：封面生成

来源是 `JimLiu/baoyu-skills` 这个仓库，官方 README 的安装命令是：

```bash
npx skills add jimliu/baoyu-skills
```

该仓库包含多个 Skill 组件，安装引导过程中建议选择仅安装 `baoyu-image-gen`。它通过调用外部图像模型 API 生成图片，密钥保存在用户目录下的 `~/.baoyu-skills/.env` 配置文件中。支持接入多家模型服务商，可根据自身需求选择。配置好 API 密钥后，可以运行官方示例命令进行功能自检：

```
/baoyu-image-gen --prompt "一张竖版封面示意图" --image /tmp/selftest.png --ar 9:16
```

执行后期望确认 `/tmp/selftest.png` 文件已成功创建且内容非空。参数中的 `--ar 9:16` 严格匹配了前一课确定的出审标准：封面必须保持 9:16 的竖版比例，不能直接使用横屏视频截图替代，这条自检命令顺带对比例规范进行了验证。

### 2.3 agent-reach：选题情报抓取

来源是 `Panniantong/agent-reach`。这个项目官方推荐的装法是把这句话原样发给已经装好的 Claude Code，不用自己一条条敲命令：

```
帮我安装 Agent Reach：
https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md
```

Claude Code 会自动解析该安装指南并执行只读预检，梳理当前系统缺失的依赖工具，例如 `pipx`、`gh CLI` 或 `mcporter`。安装指引中对各项依赖缺失时的应对方式均有明确说明。当涉及修改系统配置或安装软件包时，Claude Code 会主动请求用户确认授权后再继续推进。该指引底层执行的核心命令是通过 `pipx install https://github.com/Panniantong/agent-reach/archive/main.zip` 进行包安装，并调用 `agent-reach install --env=auto` 完成环境配置。安装完成后，运行以下命令进行自检：

```bash
agent-reach doctor
```

该命令会逐项检测各信息渠道的连通状态。现阶段只需确保网页抓取、YouTube、RSS 等免登录公开渠道显示正常即可。需要鉴权登录的社交平台渠道，在后续深入选题调研的课程中再行配置。

配置该 Skill 的关键背景在于，抖音平台本身有严格的防抓取限制，无头浏览器无法实现无人值守采集。流水线的情报来源主要依赖开源社区与前沿技术资讯，正是借助 agent-reach 聚合的渠道持续为选题池提供新鲜素材。

```
让 Claude Code 帮我按下面两份材料装好这两个开源 skill：
1. baoyu-image-gen，来自 JimLiu/baoyu-skills，
   README: https://github.com/JimLiu/baoyu-skills
   （这个仓库有 20 多个 skill，只装 baoyu-image-gen 这一个）
2. agent-reach：把这句话读一遍再执行——
   帮我安装 Agent Reach：
   https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md
每一项装完各自跑一条能判真假的自检命令：
baoyu-image-gen 生成一张 9:16 的测试图（如果 ~/.baoyu-skills/.env 里的
图片模型 key 还没申请，先跳过这一项，去对应平台申请完再补跑），告诉我
文件路径和大小；agent-reach 跑一遍 doctor，把免登录那几条渠道的状态
贴给我。web-video-presentation 前面已经用 `npx skills list` 验过在
安装列表里，这里不用重复跑。
整理成一张表：skill、装机命令、自检命令、实际输出。
```

拿到输出后核对两项指标。第一项，检查 baoyu-image-gen 生成的图片尺寸，确认符合竖版宽高比规范。第二项，检查 agent-reach 的 doctor 输出，确认上述几条免登录公开渠道均处于可用状态。若有异常，应根据诊断提示检查相关依赖是否已完整安装。

## 三、发布与配音：social-auto-upload、飞书自建应用、TTS 引擎

这三项工具紧密依赖外部平台账号与云端服务，软件配置需要与凭据申请同步进行。如果自检未通过，通常是第三方账号尚未完成开通或额度尚未充值生效。

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

安装完成后会在环境中注册 `sau` 命令行工具。patchright 作为浏览器自动化驱动组件，沿用了 playwright 的下载配置规范，因此环境变量继续使用 `PLAYWRIGHT_DOWNLOAD_HOST`。设置国内镜像源能够有效避免内核下载因网络延迟卡顿。环境配置完成后，执行 `sau douyin login --account main` 进行扫码授权，登录凭证会自动保存在项目目录下的 `cookies/` 中，`main` 为默认账号标识，后续操作均沿用该名称。自检命令如下：

```bash
sau douyin check --account main
```

自检的期望输出为 `valid`。该项验证依赖真实的账号登录状态。日常运行无需频繁手动激活虚拟环境，也可以通过 `uv run sau douyin check --account main` 直接调用，`uv run` 会自动关联项目的虚拟环境执行命令，兼具便捷与一致性。如果执行 `sau --help` 提示命令不存在，常见原因是虚拟环境未正确加载，或 `uv pip install -e .` 环节未执行成功。

### 3.2 飞书自建应用：申请配置

飞书审批通道不需要在本地编译软件，主要是完成开放平台的应用配置，具体分为六个步骤。首先在飞书开放平台创建企业自建应用。接着在凭证与基础信息页面获取 App ID 与 App Secret。然后在应用能力中开启机器人并发布版本，将机器人添加至接收审批卡片的目标群组。随后在事件与回调中将订阅模式配置为长连接，并订阅 `card.action.trigger` 事件。再将消息加密策略设为不加密，保存 Verification Token。最后将上述凭据以及接收群组的 `chat_id` 统一安全存储。

通道的完整服务在第 19 课中搭建，本课的核心是提前准备好必要的凭据。飞书的凭据标识有固定的格式特征：App ID 通常以 `cli_` 开头，群组 `chat_id` 则以 `oc_` 开头。核对时可首先检查标识前缀是否规范。接着在飞书群组的成员列表中确认能够看到机器人名字，即表明基础关联配置正确。若后续存在一个飞书应用同时对接多个服务且共用群组的场景，服务配置中需额外指定独立的命名空间以隔离事件回调，这一细节在第 19 课会展开实践。

### 3.3 TTS 引擎：MiniMax 或 OpenAI

配音自动化会在第 05 课引入配音 Skill 时正式合成，当前重点是完成平台账号开通与环境密钥配置。两家主流方案在特性上各有侧重：MiniMax 支持多音字音素标注与音高细节调控；OpenAI 在多音字处理上主要依赖文案微调。开通服务并获取 API 密钥后，将其配置为系统环境变量：MiniMax 对应 `MINIMAX_API_KEY`，OpenAI 对应 `OPENAI_API_KEY`。

自检只做一层，确认这个环境变量在当前终端里真的读得到，不是空的：

```bash
echo -n "$MINIMAX_API_KEY" | wc -c
```

若选用 OpenAI，将命令中的变量名替换为 `OPENAI_API_KEY` 即可。自检的期望输出为大于 0 的字符长度数值。该检查主要验证环境变量配置已在当前终端上下文中生效，具体的密钥有效性与账户余额状态，在第 05 课实际调用配音时进行联调。

```
飞书自建应用我已经按下面六步申请好了：
<把 App ID、App Secret、Verification Token、chat_id 这四个值贴进来
（脱敏或者写「已拿到，暂不贴」都行）>
TTS 引擎我打算用 <MiniMax 或 OpenAI>，key 已经设成环境变量。
请你：
1. 用 WebFetch 读 dreammis/social-auto-upload 的官方 README，把装
   social-auto-upload 的完整命令按官方原文列出来，装完提示我用手机
   扫码登录（这一步要人在场，等我确认登录成功你再往下走），登录完
   跑 sau douyin check --account main，把实际输出贴给我。
2. 帮我确认 <MINIMAX_API_KEY 或 OPENAI_API_KEY> 这个环境变量在当前
   终端里非空，把结果贴给我。
```

收到结果后核对两项内容。第一项，如果 `sau douyin check` 未返回 `valid`，需区分排查是账号尚未扫码登录，还是 Python 虚拟环境未加载，二者的解决方式不同。第二项，若环境变量自检输出为 0，通常是因为环境变量仅在原有窗口中设置而未在当前终端会话生效，在新窗口重新导出环境变量即可。

## 四、自检基线：十条命令汇总跑一遍

前三节各个工具的独立自检通过，还不等于流水线已经具备完整的协同能力。十条自检命令原本各自针对单一工具，分批完成安装。在交付时，应该将它们整合为一份可一次性串行运行的自检基线清单。将每项工具的检验命令、期望输出与实际运行结果记录在同一份基线文档中，后续若某个依赖出现故障，就能有一份基准记录快速比对。这份文档就是本课的核心交付物：`docs/00-toolchain.md`。

在十项工具中，Claude Code、Node、uv 与 ffmpeg 属于静态本地依赖，安装后通常保持常驻。另有四项具备时效性，包括登录态、长连接与云端 API 余额。具体涉及 social-auto-upload、飞书长连接、语音合成账户以及图片生成服务。这些时效性服务失效时人工往往不在场，正是上一课提到的异常告警场景。本课的目标是完整运行十条自检命令并拿到全绿通过的基线，后续课程会进一步探讨如何将这些检测挂载到每日定时任务中自动巡检。

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
写完之后，把第四节那张表从头到尾跑一遍，把每一条的实际输出贴到
docs/00-toolchain.md 末尾。跟期望输出对不上的单独列出来，写清楚是
哪一条、实际打印的是什么；因为账号还没走完某一步而暂时跑不出结果的，
也照实记成待办，不要为了凑全绿而回避。
```

十项工具装齐、验证过了，但它们各自为政，没有一个仓库把它们串起来：选题模块不知道创作环节要什么，发布模块也不知道审核结果写在哪。这套流水线的骨架，该长什么样？
