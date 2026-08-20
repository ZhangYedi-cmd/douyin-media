# 发布物料（4-publish）

> 飞书「过审 → 确认发布」卡在人点过审后立即读本文件拼 sau 命令。
> 字段键名严格匹配解析器（tools/feishu-bot/meta.py `_FIELD_RE`：`- **键**：值`）。
> 不写可解析的「建议发布时段」——默认立即发布，要定时由人在确认时指定。

- **标题**：腾讯 Hy3 只有别人一半大，凭什么敢对标两倍参数的旗舰？架构表扒完，是这三笔账
- **正文/简介**：腾讯刚把 295B 的混元 Hy3 用 Apache 2.0 全开源，官方主页标一句「对标 2-5 倍参数的旗舰」。我把它的架构表整个扒开算了一遍，这个「一半」是三笔账算出来的：第一笔，MoE 里 192 个专家每次只激活 8 个，实际激活才 21B，知识按大模型存、算力和账单按小模型收；第二笔，专门挂了个 3.8B 的 MTP 层做投机解码，一次多猜几个 token 提吞吐；第三笔最实在，FP8 部署不到 300GB，是 GLM-5.2 的不到一半，8 张 H20 一个节点就装下。但它那句「打赢 GLM-5.2」得打个折：盲测赢的其实是上一代 GLM-5.1，当打的 GLM-5.2 编码还全面领先（SWE-bench Verified 84.2 对 78.0）。Hy3 真正的本事是取舍——拿仓库级编码，换来一半体量的性价比 + 更强的 agent 搜索/工具/长上下文能力，可靠性也大幅提升（幻觉率 12.5% 降到 5.4%）。提醒一句：这些数字全是腾讯官方自测，第三方独立评测还没跟上，别当铁板结论。你会选一半机器的 Hy3，还是编码封顶但要双倍机器的 GLM-5.2？评论区聊聊。
- **话题标签**：#大模型 #腾讯混元 #开源大模型 #MoE架构 #AI编程
- **封面**：assets/cover.png
- **媒体文件**：assets/hy3-moe-teardown.mp4

## 给人审的备注（非发布字段）
- 成片：1920×1080（16:9 横屏），254.2s（≈4 分 14 秒），约 5.5MB；已合成配音 + 烧入分句字幕 + 4.1 抽 6 帧验证声画同步（video 254.16s / audio 251.9s+buffer≈254.3s，factor≈1.0 无拉伸、无滞后，字幕已烧入）。**片长偏长**（深度架构拆解题，超 style-guide 的 2-3min 上限），信息密度高、节奏稳；人审若嫌长可要求砍「点四·可靠性」一章（约省 42s），但会弱化「它真正想卖可靠性」的落点，建议保留。
- 选题决策：backlog 顶部 next_up 为空，按 score 取。池内 top-3（Fable5 实测 4.55 / 三旗舰对打 4.50 / GLM-5 NIM 白嫖实测 4.30）全是「亲手跑一天/对打/测真实账单」的实证题，无人值守定时 agent 无法如实产出（硬做=臆造 benchmark，踩内容红线），按红线优先跳过；3.90 的「4 个 CLI agent 差 2 倍」需核 Reddit 原帖数据，本轮 agent-reach 读取被 Reddit 403 挡（.json 变体、Exa 均未拿到正文），核不到、跳过；取 3.85 depth 架构拆解题 Hy3（3.85 三方并列 tie-break 先 depth）。此现象（评分引擎系统性高估无人线做不了的实测题）延续 07-13 观察，建议治理线关注，本轮不改 brain。
- ★角度修正（重要）：backlog 旧钩「一半大小打赢 GLM-5.2」有误导。成片已如实澄清=盲测赢的是旧版 GLM-5.1、GLM-5.2 编码仍领先（SWE-bench 84.2 vs 78.0 等），主线走「取舍换性价比」而非「打赢」。封面用中性词「叫板」（发起挑战，非宣称胜利），标题用「敢对标」（官方自标口径，加问号），均不误导。
- 内容红线自查：全部数字来自腾讯官方 HF model card / benchmark 附录 / VentureBeat 转述（2026-07-14 curl HF raw README + agent-reach 读 VentureBeat 坐实），非我方实测、非臆造；片尾 [12] 与收官画面均明确标注「全片数字均为官方自测，第三方独立评测（Artificial Analysis）待定，别当铁板结论」；无违禁词/绝对化（用「近前沿/逼近/领先开源」不用「最强/第一/100%」）；互动为评论区提问，无站外导流；口播不念外链（结尾只说去 Hugging Face 搜 tencent/Hy3）。溯源清单见 2-script.md 文末（7 条，全官方一手/详引 model card 的二手）。
- 配音质检（dubbing-check 合成后检查点，主回话内联跑——subagent 通道本轮被拦，退内联）：①完整性 12/12 段无空段；②语速均值 3.51 汉字/s 无真离群（truth/2 的 2.28 是「只数汉字」度量假象，该段全是 GLM-5.2/SWE-bench/数字，normalize 拼读占时长）；③死气 silencedetect(d=0.45) 各段 0.45–0.74s 停顿均落逗号/句号边界=句读韵律，非句中死气（停顿数与标点数吻合）；④多音字：coldopen/2「得给你打个折」的「得」已加段级注音 override（得→dei3）重合成；⑤L2 音画一致 audio-segments 12/12 == 2-script narration。
- 未经核实项（无人耳/whisper 通道，脚本层无法凭听感 100% 坐实，建议人审人耳复核）：
  - accounts/2「照着…这类卡，去卡它的体量」——前两个「卡」是名词 kǎ（显卡），第三个「卡」是动词 qiǎ（限定/框定）；同段三个「卡」混用无法段级注音（会误伤前两个），未加 override。若人耳听到读 kǎ 有违和，改法：拆句重录该段或对该段做逐字 pronunciation。实际口语「卡预算」常读 kǎ，违和度低。
  - 英文型号连读：Hy3→「H Y 3」、GLM-5.2→「G L M 5.2」、SWE-bench→「S W E bench」、MoE→「M o E」、MTP、FP8、H20 已进 normalize 规整念法；MiniMax 常规读对，建议人耳抽听 truth/2（型号最密）确认无拼读异常。
- 视觉：暖炭黑底 + 单热橙主题（账号 house style，与视频统一）；封面为 baoyu-image-gen 原创竖版 9:16（1536×2752），独立视觉（小橙立方内 MoE 点阵+8 点亮标 21B 激活 vs 大暗立方标 2× 参数 + VS 记号），标题「只有对手一半大 / 凭什么叫板两倍旗舰」承担钩子，非视频截帧、非系列吉祥物（本片非 claude-code-source-series）。

## 发布回填（发布成功后由 douyin-publish 执行侧回填，出审阶段留空）
- **实际发布时间**：
- **账号**：
- **链接**：

## 发布失败记录（2026-08-19，douyin-publish --publish）
人已在看板确认发布并授权直发，但 **Step 0 物料校验未过，未执行任何 sau 命令，status 保持 approved（未调用 `media publish-done`）**。

- **阻断 1（硬阻断）· 成片 mp4 不存在**：`deliverables.video` 声明 `assets/hy3-moe-teardown.mp4`，实际 `assets/` 只有 `cover-prompt.md` + `cover.png`。全仓 + home 目录扫描均无该文件（`.gitignore:5 *.mp4`，故 git 里本就没有，属本地产物丢失/从未落盘）。无视频文件则 `sau douyin upload-video --file` 无从谈起。
- **阻断 2 · cookie 失效**：`uv run sau douyin check --account yedi` → `invalid`。按铁律 4 不自动登录，需人工扫码：
  `cd /Users/yedizhang/tools/social-auto-upload && uv run sau douyin login --account yedi --headed`
- **附带发现（文档漂移）**：SKILL.md 写 `SAU_DIR=/Users/yedi/douyin-media/tools/social-auto-upload`、默认 `--account main`；实际引擎在 `/Users/yedizhang/tools/social-auto-upload`，cookie 只有 `douyin_yedi.json`（账号名 `yedi`）。

**解阻路径**：先重跑 `web-video-presentation` 的 `npm run record` + `tts-dub` 复现成片（2-script.md 为唯一真相源，配音/字幕/终检 A–G 需重走），落盘到 `assets/hy3-moe-teardown.mp4`；再人工扫码刷 cookie；两者齐了重跑 `/douyin-publish hy3-moe-teardown --publish`。
