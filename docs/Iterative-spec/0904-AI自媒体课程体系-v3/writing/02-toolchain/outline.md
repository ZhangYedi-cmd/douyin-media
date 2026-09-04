---
plan: fixed-from-card
length: standard
figures: none
sections: 5
---

大纲不做方案选型，直接展开任务卡「2.1 大纲」块。节的数目（四节正文 + 交付节合一，见下）和顺序照卡不动，只做两处局部调整，说明如下：

1. 卡里第 4 节「自检基线：一次跑完，全绿」本身就承担了「本课学员交付」和「结尾抛出的问题」两项，任务卡第 3 块「学员交付」与第 2.1 节的第 4 小节内容重复，写作时把它们合并成同一节的收尾段落，不另开一节，避免为了凑够五节而重复一遍交付物清单。
2. 卡里第 1 节写的是「二级标题：分（讲三块）」，指的是节内按 1.1/1.2/1.3 三个二级标题展开，第 2、3 节同理；第 4 节写「不分」，保持一个整节。这与 structure.md 的编号规则（节内三块以上内容才分二级标题）吻合，直接采用。

## 1. 基础运行环境：Claude Code、Node、uv、ffmpeg/ffprobe
核心判断: 这四项是其余六项工具能跑起来的前提，装错版本，后面的自检会全数报错，所以第一个装、第一个验。
支撑材料: ADR §5 十项清单；Claude Code 官方安装文档（curl 命令、claude --version/doctor、账号门槛、npm 安装 Node 22+ 门槛）；uv 官方 GitHub README（curl 安装、uv self update/uv help）；ffmpeg 官方下载页（macOS 只给 evermeet.cx 静态构建）；反例——凭印象写装机命令。
交付物: Prompt 块（让 AI 按四份官方文档装好四项并跑自检）+ 一张四项安装命令/自检命令对照表。
二级标题: 1.1 Claude Code：装上并确认能对话；1.2 Node 20+ 与 npm、uv：脚本和包管理跑不动就卡在这一步；1.3 ffmpeg/ffprobe：处理音视频的地基。
收尾交接: 地基装好了，下一节开始装三个真正要跑内容生产的开源 skill。

## 2. 内容生产开源件：web-video-presentation、baoyu-image-gen、agent-reach
核心判断: 这三个 skill 各自独立，装完各自能跑出一次自检结果，不依赖彼此，装错了只影响它自己那一段。
支撑材料: garden-skills 官方 README（npx skills add 语法、npx skills list）；baoyu-skills 官方 README（npx skills add jimliu/baoyu-skills、~/.baoyu-skills/.env、/baoyu-image-gen 调用示例）；agent-reach 官方 README 与 docs/install.md（pipx install、agent-reach install --env=auto、agent-reach doctor）；douyin-ideate SKILL.md（agent-reach 是选题情报唯一来源，不爬抖音）。
交付物: Prompt 块（分别装三项并各自跑一次自检）+ 三项安装命令/自检命令对照表。
二级标题: 2.1 web-video-presentation：网页转成片的引擎；2.2 baoyu-image-gen：封面生成；2.3 agent-reach：选题情报抓取。
收尾交接: 三个开源 skill 装完了，下一节看涉及外部账号和余额的那几项——它们装的同时还要准备申请材料。

## 3. 发布与配音：social-auto-upload、飞书自建应用、TTS 引擎
核心判断: 这三项不是装完就完事，还要准备账号或余额，装的动作和申请材料要一起走，不然自检会卡在服务不可用而不是没装对。
支撑材料: social-auto-upload 官方 README 与 docs/install.md（git clone、uv venv、uv pip install -e .、patchright install chromium、cp conf.example.py conf.py、sau douyin login/check）；douyin-publish SKILL.md（SAU_DIR 环境约定、dry-run 铁律）；tools/feishu-bot/config.example.yaml 六步申请说明 + requirements.txt；tts-dub SKILL.md 与 tts.config.example.json（provider/voice_id 等字段、MiniMax 用 ~/.mmx/config.json 或 MINIMAX_API_KEY，OpenAI 用 OPENAI_API_KEY）。
交付物: Prompt 块（装 social-auto-upload 并自检；飞书自建应用按配置样例六步申请；TTS 引擎按字段形状配好走一次最小合成自检）+ 三项对照表。
二级标题: 3.1 social-auto-upload：发布引擎；3.2 飞书自建应用：申请配置；3.3 TTS 引擎：MiniMax 或 OpenAI，脚手架自带 edge-tts 免费配方。
收尾交接: 十项工具和账号都装齐了，最后一步是把前面三节的自检命令拼成一份能一次跑完的基线。

## 4. 自检基线：一次跑完，全绿
核心判断: 单项自检都过不等于流水线能跑，得把十项自检命令拼成一份能一次跑完的清单，落成 docs/00-toolchain.md，全绿才算装完。这一节同时兑现任务卡「学员交付」的两件东西：docs/00-toolchain.md 和一份全绿的自检输出，不再单独开交付节。
支撑材料: 全篇前三节各自的安装/自检记录；上一课「人出现在哪几个位置」清单里「异常时被叫醒」那一类，用来说明装机自检和运行期自检的差别；handoff-ledger.md 第 02 行的结尾口径。
交付物: Prompt 块（让 AI 汇总前三节的安装命令 + 自检命令，生成 docs/00-toolchain.md，并跑一遍自检拿到全绿输出）。
二级标题: 不分。
收尾交接: 十项工具装齐验证过了，但它们各自为政，没有一个仓库把它们串起来；下一课立骨架仓，把它们串成流水线。结尾抛出的问题按上一课「一课一个问题」的体例落在这句上。
