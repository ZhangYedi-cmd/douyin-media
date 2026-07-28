# 发布物料（4-publish）

> 飞书「过审 → 确认发布」卡在人点过审后立即读本文件拼 sau 命令。
> 字段键名严格匹配解析器（tools/feishu-bot/meta.py `_FIELD_RE`：`- **键**：值`）。
> 不写可解析的「建议发布时段」——默认立即发布，要定时由人在确认时指定。

- **标题**：拆完 Claude Code 再拆 Gemini CLI：Google 的开源答案，抄了什么改了什么
- **正文/简介**：拆完 Claude Code 的源码，我又把 Google 开源的 Gemini CLI 扒了一遍——同一道题「做个住在终端里的 AI 编码 agent」，一个把答案锁进压缩混淆的打包文件，一个直接 Apache 全开源摊开给你看。结果像得吓人：核心还是那个循环（模型说话→调工具→喂回结果→接着说，封顶 100 轮）；工具集几乎一比一，连待办清单、计划模式、Skills、MCP 这些 Claude Code 立起来的招它一个没落；连系统提示给模型的人设都撞了。但它也亲手改了几处：开源换来干净分包（core 纯引擎、cli 界面分家）、循环加了刹车（每转完一圈还问一句下一个该谁说）、沙箱更偏执、甚至留了条本地模型的路。一句话：终端编码 agent 这套架构已经收敛成事实标准——Claude Code 让你隔着混淆猜，Gemini CLI 让你真能读、真能改。你更想日常用哪个？评论区聊聊。
- **话题标签**：#AI编程 #GeminiCLI #ClaudeCode #源码解读 #AIagent
- **封面**：assets/cover.png
- **媒体文件**：assets/gemini-cli-teardown.mp4

## 给人审的备注（非发布字段）
- 成片：1920×1080 H.264，212.9s（3:32），约 11.5MB；已合成配音（voice moss_audio_4dd8142e，speed 1.1）+ 去停顿（12 段全 depause，>0.45s 内部死气复扫为 0）+ 烧字幕（?subs=1 分句闪现）+ 4.1 抽帧验音画同步（视频 212.86s vs 音频 212.9s，factor≈0.9998，无拉伸；抽帧 s_8/s_150/s_202 三章字幕==对应 narration）。
- 选题：非 claude-code-source-series（该系列15集已 2026-06-29 收官），是双赛道选题池按 score 自动取的独立深度题（backlog 2026-07-08-007，score 4.00，能诚实自动做完里的最高分——池内 4.55/4.50/4.30 三条需人工上手实测，自动 run 会踩「不臆造 benchmark」红线；4.15 前瞻题时效已过）。视觉沿用工程蓝图主题 + Gemini 靛紫 accent（对比题用暖橙标 Claude Code、靛紫标 Gemini），封面为品牌一致原创视觉，非系列吉祥物、非 EPxx 徽章。
- 内容红线自查：全部技术结论可溯源（口播稿 2-script.md 文末逐条锚 gemini-cli 源码 file:line，源=google-gemini/gemini-cli 公开仓 Apache-2.0，2026-07-11 clone 读取核对：agent 循环 turn.ts:240/client.ts:79 MAX_TURNS=100；工具集 tools/ 目录含 write-todos/enter-plan-mode/activate-skill/mcp-client；persona snippets.ts:192；确认枚举 ToolConfirmationOutcome tools.ts:1094；分包 core/cli；本地模型 localLiteRtLmClient.ts）。全片不报任何 benchmark/跑分数字；「抄」为修辞钩子，正文与视频均用「撞车/同一套/收敛」表述，趋同设计非实证抄袭；对 Claude Code 的描述均为公开可核实事实（闭源打包、具备 TodoWrite/计划模式/Skills/MCP/权限弹窗、云端无本地模型），非引用其源码；无违禁词/绝对化；互动引导为「去 GitHub 搜」，非站外导流念链接；封面代码卡仅结构性标识符（class Turn / MAX_TURNS=100 / shouldConfirmExecute / packages），无任何数值跑分。
- dubbing-reviewer 闸口：R1 PASS（真相源同步/完整性12段/无>0.45s死气/无语速离群 四硬门槛全绿；多音字 9 类已逐段注音，音画整句一致）。

## 发布回填
- **实际发布时间**：2026-07-11 21:52（立即发布，sau 报「视频发布成功」）
- **链接**：sau 未返回作品链接，待人工从创作者中心补
- **账号**：main
