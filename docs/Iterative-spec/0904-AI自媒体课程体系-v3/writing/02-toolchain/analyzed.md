---
topic: 第 02 课：装备——十项开源件与自建项的来源、装机命令、自检基线
audience: 会用 Claude Code 或 Cursor、没做过自动化流水线的读者；手上没有参考仓库，只有第 01 课自己产出的 docs/00-walkthrough.md
mode: new
series_context: 全书 29 课的第 02 课，模块 0「起步」第二课。上一课（01·一条内容的端到端走查）交付了端到端流程图和人出现点清单；本课把流程图上每一站要用的工具装齐、验证装对；下一课（03·立骨架）把这些工具串成一个仓库。
---

## 核心问题
学员机器上现在一件工具都没有，流程图上的五个动作各自要靠哪些开源件和自建项撑住？这些工具从哪装、装完怎么用一条能判真假的命令确认装对了？

## 材料清单

- [真实项目案例/承接] 上一课成稿 `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/01-一条内容的端到端走查.md`：开篇交付「一张流程图 + 一份人出现点清单」；结尾提出的问题是「流程图和人出现点清单有了，可你手上一个工具都没有。这些环节要跑起来，机器上得先装齐哪些东西？」——这就是本课要接的问题，本课开篇必须按这句原文复述，不按 inventory.md 摘要。02 课结尾要往下抛的问题（第 03 课的钩子）用 handoff-ledger.md 第 02 行「工具装齐了，但它们各自为政，没有一个仓库把它们串起来。这套流水线的骨架长什么样？」核对。
- [权威出处] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/00-ADR.md` §5「借开源与自建清单」：十项工具的权威清单——Claude Code、Node 20+/npm、uv、ffmpeg/ffprobe、web-video-presentation（ConardLi/garden-skills）、baoyu-image-gen（JimLiu/baoyu-skills）、agent-reach（Panniantong/agent-reach）、social-auto-upload（dreammis/social-auto-upload）、飞书自建应用、TTS 引擎（MiniMax 或 OpenAI）。可支撑第 1 到第 4 节的骨架。
- [真实项目案例] `.claude/skills/web-video-presentation/SKILL.md`：工作目录约定（`my-video/` 下 `script.md`、`outline.md`、`presentation/`）、Provider-agnostic 的音频合成分层（内置 minimax.sh、openai.sh）。可支撑第 2 节「web-video-presentation 装的是什么」。
- [真实项目案例] `.claude/skills/tts-dub/SKILL.md` 与 `.claude/skills/tts-dub/tts.config.example.json`：配音引擎的配置字段形状（provider、voice_id、speed/pitch、normalize、pronunciation、overrides）、鉴权来源（MiniMax 读 `~/.mmx/config.json` 的 `api_key` 或环境变量 `MINIMAX_API_KEY`；OpenAI 用 `OPENAI_API_KEY`）。可支撑第 3 节 TTS 引擎那一小节的配置自检。
- [真实项目案例] `.claude/skills/douyin-publish/SKILL.md`：发布引擎的环境约定（`SAU_DIR` 下 `uv run sau ...`，cookie 存在 `SAU_DIR/cookies/`）、dry-run 铁律（不带 `--publish` 只拼命令不执行）。可支撑第 3 节 social-auto-upload 那一小节，以及和上一课「发布要两次授权」的呼应。
- [真实项目案例] `.claude/skills/douyin-ideate/SKILL.md`：agent-reach 是选题情报的唯一采集来源，本引擎不爬抖音平台（headless 抓不到、需人值守），只靠 AI 圈素材。可支撑第 2 节 agent-reach 那一小节的「装它的理由」。
- [真实项目案例/反例材料] `tools/feishu-bot/config.example.yaml` 与 `requirements.txt`：飞书自建应用的六步申请路径（建自建应用→拿 App ID/Secret→开机器人拉群→回调选长连接订阅 `card.action.trigger`→加密策略选不加密记 Verification Token→填进配置文件）；`ns` 命名空间字段用于同应用同群多项目隔离，避免一次点击被多个 server 误吃；`requirements.txt` 三个 Python 包（lark-oapi、requests、pyyaml）。可支撑第 3 节飞书那一小节。
- [真实项目案例] `brain/tts.config.json`：账号级配音配置实例，字段与 `tts.config.example.json` 一致，`voice_id` 已填真实值、`normalize` 已有四条英文缩写规整规则。可用作「工程级配置长什么样」的对照，但不作为学员本课要填的内容（那是第 04、05 课的事）。
- [参考素材，仅供口径对照，不能抄] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/old-courses/mini-v3-02.md`：另一台机器写过的同课成稿，结构是「十件工具挂在流程图哪一站→装机命令的出处→自检分三层→会过期的四项→让 AI 落成 docs/00-toolchain.md」。可用来校准篇幅感（约 3500 字）和自检分层的思路，但里面的具体安装命令未必是当前 README 的最新原文，本课重新逐条核实，不直接照抄。
- [外部数据/官方出处，WebFetch 核实，2026-09-04] Claude Code 官方安装文档 `https://code.claude.com/docs/en/setup`：macOS/Linux/WSL 用 `curl -fsSL https://claude.ai/install.sh | bash`；验证用 `claude --version`（打印版本号）和 `claude doctor`（只读诊断）；账号门槛写明需要 Pro/Max/Team/Enterprise/Console，免费版不含。npm 安装方式 2.1.198 起要求 Node.js 22+，旧版本报 `EBADENGINE` 警告但不阻断安装（因为装的是不吃 Node 运行时的原生二进制）——这条正好呼应「装机命令是过期最快的一类内容」的论点。
- [外部数据/官方出处] uv 官方 GitHub README `raw.githubusercontent.com/astral-sh/uv/main/README.md`：安装命令原文 `curl -LsSf https://astral.sh/uv/install.sh | sh`；README 没有给出 `uv --version` 这个例子，倒是给了 `uv self update`（自我更新）和 `uv help`（查命令参考）。本课自检命令要如实反映这一点，不编一个 README 里没有的例子当出处。
- [外部数据/官方出处] ffmpeg 官方下载页 `https://ffmpeg.org/download.html`：macOS 一节只给了一条路径——`evermeet.cx/ffmpeg/` 的静态构建，没有提 Homebrew 或 MacPorts。这是本课要如实交代的一处「官方给的和大家常用的不一样」。
- [外部数据/官方出处] `ConardLi/garden-skills` 官方 README：安装用 `npx skills add ConardLi/garden-skills -s web-video-presentation`（`skills` CLI 是 npx 临时下载，不用先装）；自检用 `npx skills list` 能看到已装列表。
- [外部数据/官方出处] `JimLiu/baoyu-skills` 官方 README：安装用 `npx skills add jimliu/baoyu-skills`；`baoyu-image-gen` 的凭据放 `~/.baoyu-skills/.env`（用户级）；调用示例 `/baoyu-image-gen --prompt "A cute cat" --image cat.png`（支持 `--ar` 指定比例，含竖版）。
- [外部数据/官方出处] `Panniantong/agent-reach` 官方 README 和 `docs/install.md`：真实安装路径是 `pipx install https://github.com/Panniantong/agent-reach/archive/main.zip`（推荐，最省心），装完 `agent-reach install --env=auto` 是只读检查（默认不改系统），`agent-reach doctor` 一条命令报每个渠道的连通状态。这与旧稿写的 `pip install` 不完全一致，本课按当前 README 原文改用 `pipx`。
- [外部数据/官方出处] `dreammis/social-auto-upload` 官方 README 和 `docs/install.md`：`git clone` → `uv venv && source .venv/bin/activate` → `uv pip install -e .`（注册 `sau` 命令）→ `PLAYWRIGHT_DOWNLOAD_HOST="https://npmmirror.com/mirrors/playwright" patchright install chromium` → `cp conf.example.py conf.py` → `sau douyin login --account <name>` → `sau douyin check --account <name>`（自检，期望输出 `valid`）。这条链路和仓库里 `douyin-publish` skill 描述的环境约定（`SAU_DIR`、`uv run sau`）完全对得上。
- [反例] 「装机命令是过期最快的一类内容」——本课要点破的反例是凭印象写命令：命令在写作者自己那台已装好的机器上一跑就过，因为机器早就装好了，跑没跑其实无所谓；换一台干净机器上，得到的是一串 `command not found`。npm 安装方式的 Node 22+ 门槛（EBADENGINE 警告不阻断）是这条反例最具体的落点。

## 材料缺口

- Node.js 官方下载页是一个 JS 渲染的 SPA，WebFetch 拿到的内容里没有一条现成的终端安装命令（只有平台安装包的下载链接），也没有官方给出的 `node -v` 校验语句作为「原文」。处理方式：如实写「官方页面给的是下载安装包，不是一条终端命令」，自检用 `node -v && npm -v` 这个所有 Node 发行版都自带的标准查询方式，不假托成 README 原文，也不编造具体安装步骤。
- ffmpeg 官方下载页 macOS 一节只给 evermeet.cx 静态构建这一条路，没有 Homebrew。多数人实际用 `brew install ffmpeg`，但这条命令查不到 ffmpeg.org 官方出处，写作时按「官方页面给的路径」如实呈现，不写成 brew 命令冒充官方原文。
- uv 官方 README 没有 `uv --version` 的示例，只有 `uv self update`、`uv help`。自检命令改用这两条里能判真假的（`uv self update` 的输出会报当前版本，`uv help` 能确认命令可执行），不写 README 里没出现过的 `--version`。
- 飞书自建应用没有 WebFetch 材料（卡里写明「按 `tools/feishu-bot/config.example.yaml` 的六步申请说明走，不额外 WebFetch」），这条按仓库内配置样例处理，不当作外部装机命令核对。
- 本机没有实际安装 social-auto-upload、agent-reach 等外部工具，本课不能写「本机跑过、验证通过」，只能写「按官方文档给的命令」和「期望输出应该是什么」，跑没跑得通留给学员自己动手确认。

材料条数（不含参考素材与官方出处小项）共 16 条，超过 5 条的门槛，进入下一步。
