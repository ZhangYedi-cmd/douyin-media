# 发布物料（4-publish）

> 飞书「过审 → 确认发布」卡在人点过审后立即读本文件拼 sau 命令。
> 字段键名严格匹配解析器（tools/feishu-bot/meta.py `_FIELD_RE`：`- **键**：值`）。
> 不写可解析的「建议发布时段」——默认立即发布，要定时由人在确认时指定。

- **标题**：AI 一条命令删光我整个 home 目录，给编程 agent 装张「安全网」拦住 rm -rf
- **正文/简介**：AI 编程 agent 一条 rm -rf 就能把你 home 目录删干净，几个小时的活儿一秒没。你在 CLAUDE.md 里写「别删我文件」有用吗？没用，那是软规则，AI 说违反就违反。cc-safety-net 是一个 PreToolUse hook，卡在 AI 和你的 shell 中间，命令要执行必须先过它这道闸——破坏性的当场拦死，根本进不了终端。它最狠的地方是防绕过：不是搜关键词那种一碰就碎的黑名单，而是真去把命令读懂：bash -c、python 包一层它给你递归扒开（封顶十层）；-rf 换成 -fr、拆成 --recursive --force 它逐字符去数照样认；删到根目录、家目录、$HOME、算不准的变量、项目文件夹外面，一律拦，只放行删项目里的东西。分析崩了？它选择拦（fail closed，宁可错杀）。拦了还给你原因和替代（git reset --hard 提示你先 stash）。一套东西七个编程 agent 通用：Claude Code、Codex、Gemini CLI、Copilot、Kimi、OpenCode、Pi。真怕 AI 手滑删库，就给它套一层这样的硬 hook。你被 AI 误删过东西吗？评论区聊聊。
- **话题标签**：#AI编程 #ClaudeCode #AIagent #防误删 #源码解读
- **封面**：assets/cover.png
- **媒体文件**：assets/cc-safety-net.mp4

## 给人审的备注（非发布字段）
- 成片：1920×1080 H.264，228.9s（3:49），约 11.4MB；已合成配音（voice moss_audio_4dd8142e，speed 1.1）+ 去停顿（13 段全 depause，cap0.25/minact0.45，>0.45s 内部死气全片复扫为 0）+ 烧字幕（?subs=1 分句闪现，字幕保留原文如 CLAUDE.md）+ 4.1 抽帧验音画同步（视频 228.931s vs 预期时间线 228.9s，factor≈1.000，无 headless 拉伸；抽帧 coldopen/1@11.1s、confirm/3@110.4s、confirm/4@129.9s、ending/2@220.9s 四处字幕==对应 narration、画面对齐）。
- 选题：非 claude-code-source-series（该系列15集已 2026-06-29 收官），是双赛道选题池按 score 自动取的独立深度题（backlog 2026-07-15-001，score 4.35，能诚实自动做完里的最高分——池内 4.55/4.50/4.30 三条需人工上手实测，自动 run 会踩「不臆造 benchmark」红线，沿 07-10/07-11 已确立惯例；dashboard 亦已标本条为「可自动真做的最高分」）。视觉沿用工程蓝图主题 + 本片安全网绿 accent（绿=安全网/放行、红=危险命令、橙=复用 EP01 吉祥物本体建立品牌）；封面 baoyu-image-gen 竖版 9:16（1536×2752），复用 EP01 像素吉祥物本体（--ref EP01 cover），徽章「AI 编程·机制拆解」为诚实非系列标识（不假冒 EPxx 源码解读，本题是第三方工具跨 7 CLI），非视频截帧。
- 内容红线自查：全部技术结论可溯源（口播稿 2-script.md 文末逐条锚 cc-safety-net 源码 file:line，源=github.com/kenryu42/cc-safety-net 公开仓 MIT，v1.0.6，2026-07-16 shallow clone 亲验：PreToolUse hook 定位 README:28 + hooks.json + constants.ts:1-2 + claude-code.ts:7-12；递归拆壳 analyze-command.ts:26-97 + shell-wrappers.ts + interpreters.ts + MAX_RECURSION_DEPTH=10 types.ts:161；flag 逐字符 rm-flags.ts:1-19；目标分类 rm.ts:69-202；fail closed index.ts:40-48；BLOCKED 消息+替代 format.ts:12-40 + git/rules.ts；七 CLI README「Supported agents」）。全片不报任何 benchmark/跑分数字（本题本无跑分）；作者删 home 事件为 repo README「Why this exists」自述真实动机，标「作者踩的坑」不添油加醋；对 Claude Code/各 CLI 描述均公开可核实（PreToolUse hook 机制、七家适配文件均在源码）；无违禁词/绝对化（不说「100% 防住一切」，「安全网」为产品名+限定「拦破坏性命令、防绕过」）；互动引导为「去 GitHub 搜 cc-safety-net」，非站外导流念链接；封面仅结构性标识（rm -rf ~/ / 安全网），无数值跑分。
- dubbing-reviewer 闸口：R1 PASS（真相源同步 13 段/完整性/无 >0.45s 死气/无语速离群 四硬门槛全绿；多音字 8 类逐段注音无同段冲突、音画整句一致）；R1 唯一软提醒（.md 文件名念法）已主回话处理：config 加 normalize `CLAUDE.md→CLAUDE 点 M D`、`AGENTS.md→AGENTS 点 M D`，重合成 coldopen/1、skeleton/1、ending/1 三段并复检死气为 0。

## 发布回填
- **实际发布时间**：2026-07-16 20:50（立即发布，飞书确认卡授权 --publish，sau 输出「视频发布成功」）
- **链接**：（sau 输出无链接，待从创作者中心作品管理人工补）
- **账号**：main
