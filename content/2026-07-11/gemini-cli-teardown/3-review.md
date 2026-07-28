# 阶段 3 · 审核记录 · gemini-cli-teardown

- 内容：content/2026-07-11/gemini-cli-teardown/
- 出审时间：2026-07-11（工作日定时 agent 自动产出）
- 审核卡：经 feishu-notify 推飞书，等人点「过 / 打回」。

## 待审物料
- 成片：assets/gemini-cli-teardown.mp4（1920×1080 H.264，212.9s/3:32，~11.5MB，带字幕）
- 封面：assets/cover.png（9:16，1536×2752）
- 口播稿：2-script.md（含逐条溯源，锚 gemini-cli 源码 file:line）
- 发布物料：4-publish.md

## 出审前终检闸（AI 自检，A–G 全过）
- A 声画一致：音频从 audio-segments.json 全量重合成（=narrations.ts，同源）；字幕 ?subs=1 取同一 narration；抽帧 7 点各章画面与文本一致（coldopen/skeleton/confirm/diff/ending 均验，见下）。
- B 音频自然度：dubbing-reviewer R1 PASS（4 硬门槛全绿）；depause 后 12 段 silencedetect(-30dB,0.45s) 内部死气复扫全 0。
- C 钩子冷开：coldopen/1 首句「一个能钻进你终端、自己读代码、自己改文件、自己跑命令的 AI 编程 agent，Google 把它整份源码开源了」自成立、不依赖前情（非系列）。
- D 事实合规：全片溯源 google-gemini/gemini-cli 公开仓 Apache-2.0（2-script.md 文末逐条锚 file:line：turn.ts:240 / client.ts:79 MAX_TURNS=100 / tools/ 目录 / snippets.ts:192 / ToolConfirmationOutcome tools.ts:1094 / core-cli 分包 / localLiteRtLmClient.ts）；全片不报任何 benchmark 跑分；「抄」为修辞、正文用趋同/收敛表述；对 Claude Code 描述均公开可核实事实，非引其源码；无绝对化/导流。
- E 封面：baoyu-image-gen 生成 9:16 竖版（1536×2752），双色对照原创视觉（暖橙 Claude Code 闭源+锁+混淆 hex / 靛紫 Gemini CLI 开源+可读源码），代码卡仅结构性标识符（class Turn/MAX_TURNS=100/shouldConfirmExecute/packages）无臆造跑分，非系列吉祥物/非 EPxx 徽章/非视频截帧。
- F 音画同步：npm run record 确定性渲染，视频 212.86s vs 音频(210.5s+12×0.2s buffer=212.9s)，factor≈0.9998，无拉伸（重录带字幕后复核）。
- G 发布物料：4-publish.md 已产，5 字段键名匹配解析器，无可解析「建议发布时段」。

## 人审重点（建议）
- 事实：全部技术结论来自 gemini-cli 公开仓，file:line 可溯源（2-script.md 文末）；对 Claude Code 的对照均公开事实。
- 观感：封面双色对照/字幕分句闪现达标。
- 多音字：已逐段注音 correct-by-construction（转/调/落/行/得/长/只/差）；reviewer 判默认读音正确，若有耳可抽听 skeleton/2「一个没落」确认 là、skeleton/1「一直转」确认 zhuàn。
- 「抄了什么改了什么」标题为对比钩子，视频/正文均已澄清是行业趋同设计非实证抄袭，请人审确认此框定无越界。

## 审核人结论（人填）
- 审核人：
- 结论：（过 / 小改 / 拒绝）
- 意见：
- 时间：
