# 阶段 2 · 创作

## 目标
把 `1-brief.md` 变成可发布的成品：口播稿 或 图文（含配图/封面）。

## 输入
- 该内容的 `1-brief.md`；**系列剧集**则用其 backlog 条目里的 `plan_file`（外部 plan repo 的 epXX 脚本 + 源码导读）当 1-brief 等价物——生产仍落本仓 `content/<日期>/<slug>/`，产物不落外部 repo（见 backlog 系列段「路由」约定）。
- `brain/persona.md`（语气）、`brain/style-guide.md`（规范）

## 分支 A：口播视频
> 画幅：**16:9 横屏**（先跑通，零改造；抖音支持横屏，技术演示横屏信息量大）。竖屏需求按数据再议。

> 四件套链路：**web-video-presentation（做网页+分段文案）→ tts-dub（配音）→ dubbing-check（体检）→ 录制（出 mp4）**。每个 step 都要有口播（无静音步），否则录制时间线会错位。

1. 写口播稿 `2-script.md`——**这是口播稿唯一真相源**。钩子(3s) → 分点主体 → takeaway/互动。
   - **冷开铁律**：第一句必须**自成立**，禁止依赖"上一集/上文/前面说过"——短视频第一次刷到的人没有上下文，开口就靠承接=劝退。系列承接放结尾钩，不放开头。
2. **做网页**：用 **`web-video-presentation`** 把 `2-script.md` 做成点击驱动的网页演示（动态、电影感）。
   - 它有硬节点：会停下跟你对齐"稿子/outline/主题/素材/开发模式"5 件事。
   - **落位**：Vite 项目放 `build/`（工作目录，不进 assets）；内部 script.md 是 `2-script.md` 的派生件，**以 2-script.md 为准**。
   - 在 `build/` 里 `npm run extract-narrations` → 产出 `audio-segments.json`（分段文案）。**不要**用它自带的 `synthesize-audio`（走坏掉的 mmx CLI）。
3. **配音**：用 **`tts-dub`** 合成——在 `build/` 里跑 `node <tts-dub>/scripts/synthesize.mjs --config tts.config.json --segments audio-segments.json`。config 用 **build 内的 `tts.config.json`**（从账号级模板 `brain/tts.config.json` 复制，克隆音色 `moss_audio_4dd8142e…`），输出落 `build/public/audio/<chapter>/<step>.mp3`。多音字/单段语速问题加 build 内 config 的 `overrides`；沉淀性读法规则回写 `brain/tts.config.json` 模板。
   - **真相源铁律**（防音画不符）：synthesize 读的是 `audio-segments.json`，不是 `narrations.ts`。**改过任何 narration 文案，必须先 `npm run extract-narrations` 重抽，再 `rm` 改动段 mp3（否则按文件名被 skip）再合成**。否则会"画面新文案、声音旧文案"。
   - **死气检查**：合成后 `silencedetect` 扫各段，>0.45s 的内部死气（常因 `「」`引号 / `——` / 拟声词）用 `rec/depause.mjs` 去停顿（cap 0.25 / minact 0.45，切静音边界不切词）。
4. **配音审批（subagent 闸口，最多 3 轮 loop）**：主回话合成完**第一批音频**后，**派 `dubbing-reviewer` subagent** 审批质量——它跑 `dubbing-check` 的合成后检查点（完整性 / 语速离群 / 多音字 / 音画一致），回判 **PASS / FAIL + 每条改法**。**职责分离**：reviewer 只判不改（无 Edit/Write），修复与重合成都由主回话做。
   - **PASS** → 进步骤 5 录屏。
   - **FAIL** → 主回话按 reviewer 的改法修（`tts.config.json` overrides / 文案 normalize / `segment-overrides.json` 单段调速 / 组件整句对齐）→ **重合成（步骤 3）** → 再派 reviewer 复审（带上轮次号）。
   - 上限 **3 轮**：第 3 轮仍 FAIL → **停，升级人审**（reviewer 报告写进 `3-review.md`，`meta.yaml` 挂起），**不强行往下录**。
   > 录屏后的 **4.1 抽帧对齐**不在本闸口，步骤 5 录完单独跑（防 headless 拉伸）。
5. **录屏成片（无人）**：`npm run build && npm run record -- --serve --out final.mp4`——headless 确定性渲染 + ffmpeg 自动配音 mux，全程零点击（见 web-video-presentation `references/RECORDING.md`）。
   - **录屏后体检（4.1，主回话做，不走 subagent）**：跑 dubbing-check 检查点 4.1——按调度时刻抽几帧验音画同步、查 headless 拉伸（webm 时长 > 墙钟则去拉伸 mux）。**这是录屏环节的小循环**：失败就修复重录，与步骤 4 的配音批次审批（`dubbing-reviewer`）分开，那个只管配音、不碰录屏产物。
   > 有静音步 / 想人工微调时退回 Auto 模式 `?auto=1` 人工录屏，但那不进无人流水线。
6. **封面生成（★ 必做 · 竖版 9:16 · 交审前强制，不可跳过）**：用 **`baoyu-image-gen`** 出竖屏封面 → `assets/cover.png`（**禁止拿横屏视频帧充数**，EP02 踩过）。
   - **风格选择**：
     - 用户**指定了**封面视觉风格 → 按用户的来。
     - 用户**没指定** → 用 baoyu-image-gen 生成「最合适」的；**本系列（claude-code-source-series）默认 = 仿 EP01 系列统一风格**：以 EP01 `cover.png` 当 `--ref` 锁定身份，**复用那只方块像素吉祥物本体**（别让模型新编角色——EP02 编出仓鼠被打回），暗底+虚化代码+单热橙+顶部胶囊徽章「Claude Code 源码解读·EPxx」+底部大字双行标题（橙高亮）。中心姿态/标题按本集内容定（"最合适"体现在这）。
   - **命令**：`set -a; source ~/.baoyu-skills/.env; set +a`（加载 GOOGLE_API_KEY）→ `npx -y bun <baoyu-image-gen>/scripts/main.ts --promptfiles <prompt.md> --image assets/cover.png --ar 9:16 --ref /Users/yedi/yedi-medias/videos/ep01-agent-while-loop/assets/cover.png --provider google --model gemini-3-pro-image-preview`。生成提示词存 `assets/cover-prompt.md` 留底。
   - 出图 1536×2752。**封面是独立发布物料、不入录屏**（改封面无需重录）。
   - 成片 mp4 + cover.png 都进 `assets/`（assets 只放成品媒体）。

## 分支 B：图文
1. 写图文文案 `2-script.md`：首图钩子 + 一图一观点。
2. 生成配图与封面到 `assets/`（架构/流程图 or 图鉴风按内容选）。

## 出审前 · 成片终检闸（必过，全部在「最终 mp4」上验，不是组件截图）
> ★ EP02 教训：分轮反应式修 = 反复重渲染（钩子、封面、音画不符、TTS 死气各炸一轮，有的还过审后才发现）。
> **所有检查一次性前置过完再交审**；组件截图只证明画面，不证明声音/节奏/成片。

**A. 声画一致**（防音画不符——EP02 画面新钩子/声音旧钩子，连过两轮没抓到）
- [ ] `audio-segments.json` 各段文本 == 对应 `narrations.ts`（改过 narration 必先 extract 再合成）
- [ ] 成片**听到的 == 看到的 == 字幕**：至少抽查钩子 + 2 段（实在不能听，就核对三方文本一致 + 段时长合理）

**B. 音频自然度**（防 TTS 死气——EP02 开头 966 段 18 字撑 6.78s，含 1s 死气）
- [ ] silencedetect 扫各段，无 >0.45s 内部死气；有则 `rec/depause.mjs` 去停顿后重渲染

**C. 钩子冷启动**（防"上一集"式失效）
- [ ] 第一句自成立、不依赖上文，第一次刷到的人 3 秒站得住

**D. 事实 / 合规**
- [ ] 技术结论可溯源、无臆造数据；persona 语气无论文腔；无违禁词/绝对化/口播导流

**E. 封面**（防横屏帧充数 / 吉祥物乱编 —— ★ 每集必生成，见步骤 6）
- [ ] **已用 baoyu-image-gen 生成竖屏 9:16 封面**（`assets/cover.png`，非视频帧）
- [ ] 用户指定风格→按其来；未指定→仿 EP01 统一风格（**复用 EP01 吉祥物本体**，别让模型新编角色）+ 标题承担钩子

**F. 音画同步**
- [ ] 按调度时刻抽帧，画面与口播对齐；mux 去拉伸 factor≈1

**G. 发布物料 `4-publish.md`**（★ 出审前必产，否则过审后确认发布卡报「缺标题·无法发布」——EP03 踩过）
- [ ] `4-publish.md` 已写，含可解析 bullet：`- **标题**：…`、`- **正文/简介**：…`、`- **话题标签**：#a #b…`（3–5 个）、`- **封面**：assets/cover.png`、`- **媒体文件**：assets/<slug>.mp4`
- [ ] 字段键名严格匹配解析器（`tools/feishu-bot/meta.py` `_FIELD_RE`：`- **键**：值`）；**不写**可解析的「建议发布时段」（非 datetime 会被原样传给 sau `--schedule`，默认立即发布）

全部过 → `meta.yaml` status=`review`，更新 `dashboard.md`，经 feishu 交审。

## 用到的 skill
- **口播视频**：`web-video-presentation`（口播稿→网页演示→`npm run record` 无人录屏）
- **配音**：`tts-dub`（分段文案+`tts.config.json`→每段 mp3，直调 MiniMax HTTP、绕开坏 mmx CLI、多音字/单段语速可控）
- **配音审批闸口**：`dubbing-reviewer` subagent（`.claude/agents/`）——封装 `dubbing-check`，合成后判 PASS/FAIL，FAIL 打回主回话修复重合成，最多 3 轮，超限升级人审
- **图文配图**：`baoyu-diagram`（架构/流程图）、`baoyu-infographic`、`baoyu-xhs-images`、`retro-enc`/`wanwu-series`（图鉴风）
- **封面**：**`baoyu-image-gen`**（竖版 9:16，直调 `scripts/main.ts`，GOOGLE_API_KEY 在 `~/.baoyu-skills/.env`；默认仿 EP01：`--ref` EP01 cover 复用吉祥物本体）。每集必生成，见步骤 6。`baoyu-cover-image` 是其上层封装，要走完整 5 维流程时用。
- **深度题骨架**：`ljg-paper`/`ljg-think`/`ljg-rank`（源码/论文拆解）
