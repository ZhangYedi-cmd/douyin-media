# 踩坑教训登记簿（单一位置）

> **约定**：教训的「故事」只写这里；对应的「规则」住它该在的 SOP/skill，标 `(Lx)` 回指本表。
> 新坑踩了先登记再改 SOP。复盘沉淀的「打法」不在这（去 `brain/benchmarks.md`），这里只收「坑」。

| # | 坑（出处） | 现行规则落点 |
|---|---|---|
| L1 | EP02 封面让模型自由发挥，编出仓鼠吉祥物被打回；还试过拿横屏视频帧充数 | `2-create.md` 步骤 6 + 终检闸 E：封面必 baoyu-image-gen 竖版 9:16，系列用 EP01 `--ref` 锁吉祥物本体 |
| L2 | EP02 音画不符：改了 narration 没重抽分段文案，画面新钩子/声音旧钩子，连过两轮组件截图检查都没抓到 | `2-create.md` 步骤 3 真相源硬约束 + 终检闸 A：改 narration 必 extract → rm 旧 mp3 → 重合成；检查在最终 mp4 上做 |
| L3 | EP02 TTS 死气：18 字撑 6.78 秒、含 1 秒死气（引号/破折号/拟声词触发） | `2-create.md` 步骤 3 死气检查 + 终检闸 B：silencedetect >0.45s 即 depause |
| L4 | EP02 分轮反应式修：钩子、封面、音画、死气各炸一轮，反复重渲染，有的过审后才发现 | `2-create.md` 终检闸：所有检查一次性前置过完再交审 |
| L5 | EP03 出审时没产 `4-publish.md`，人点过审后确认发布卡立即报「缺标题·无法发布」 | `2-create.md` 终检闸 G：出审前必产 4-publish.md（含可解析 bullet 字段） |
| L6 | 「建议发布时段」写成可解析 bullet，非 datetime 文本被原样传给 sau `--schedule` | `2-create.md` 终检闸 G：不写可解析的发布时段字段，默认立即发布，定时由人在确认卡指定 |
| L7 | EP05 首发慢渲染超时失败，重试同命令一次即过 | 发布失败先原样重试一次再排查（`douyin-publish`） |
| L8 | EP10 抖音 UI 浮层挡住「选择封面」按钮，sau EXIT=1；人清浮层后重跑同命令一次过 | 同上：EXIT=1 先看截图是否浮层类环境问题 |
| L9 | EP13 MiniMax TTS 余额耗尽返 1008，卡死配音→出审链路 | `2-create.md` 步骤 3「余额探测」（1008 即停线报充值、不推审；具体状态动作见该步骤原文，不在此复述） |
| L10 | EP15 多音字「各十几行」的「行」漏注音（háng→xíng），R1 FAIL 重合成 | 多音字注音进 build 内 tts.config.json `overrides`；dubbing-reviewer 闸兜底 |
| L11 | 系列口播开头承接「上一集」，第一次刷到的人没上下文直接划走 | `2-create.md` 步骤 1 冷开硬约束：第一句自成立，系列承接放结尾钩 |
| L12 | 口语梗词（「最骚」「大冤种」）被过度规避导致重录，实际平台不禁 | 只避硬违禁（导流/夸大/真敏感词），口语词不规避不重录（人审若有异议再改） |
| L13 | 每集 build 重新 npm install，浪费且易版本漂移 | 克隆上一集 build 复用 node_modules，别重装 |
| L14 | 2026-06-30~07-05 取题空跑 6 天，停产只写本地日志没人看见 | `daily-run.md` 阻塞即上报硬约束：停产/挂起必推飞书 |
| L15 | gemini-cli-teardown 首录漏字幕：web-video-presentation 的 `auto-record.mjs` 默认导航到无 `?subs=1` 的 URL，且 `--serve` 会覆盖 `--url`，成片无字幕，抽帧对照上集才发现 | `2-create.md` 步骤 5 + 终检闸 A：录屏前确认 auto-record 用 `?subs=1`（--serve 模式需在 build 内 `auto-record.mjs` 给 URL 加 `/?subs=1`）；录后 4.1 抽帧必查字幕已烧入 |
| L16 | kimi-k3 批量去停顿**原地写**（`depause.mjs in.mp3 in.mp3`）：ffmpeg 打开输出即截断输入，**静默失败**——17 段跑完命令不报错、时长一点没变，死气全留着。只看「命令没报错」就会带着 64 处死气出审 | `2-create.md` 步骤 3 死气检查：depause **必须写临时文件再 move**，且**跑完必 silencedetect 复扫**验数为 0（别信 exit code，信复扫） |
| L17 | kimi-k3 `ending/2` 同段两读冲突：「就得打折(děi)」与「诚实得多(轻声 de)」同在一段，逐段注音无解（注 děi 会误伤轻声那个） | `2-create.md` 步骤 3：同段同字两读时**改文案解冲突**（本例「诚实得多→诚实很多」），并同步 2-script.md / narrations.ts / 组件三处真相源；注音只解决「同字在不同段不同读」，解决不了「同段两读」 |
| L18 | kimi-k3 控时长删段后，`tally` 章各段整体前移一位，但 `tts.config.json` 的 `overrides` 键仍按旧编号 → 注音会**注到错的段**上（旧键成死键、新段漏注） | `2-create.md` 步骤 3：**增删段后必重排 overrides 键**并重跑 extract；dubbing-reviewer 闸复核「override 有无死键 / 段是否错位」兜底 |
