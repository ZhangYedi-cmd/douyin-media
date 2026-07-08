---
name: tts-dub
description: 把「分段文案 + 一份配置」合成为「每段一个配音 mp3」的 TTS 引擎层 skill。provider-agnostic（MiniMax 直调 HTTP / OpenAI），内置今天反复踩坑后的解法：绕开坏掉的 mmx CLI、多音字逐段注音、念法 normalize（配音/字幕解耦）、per-段 speed/pitch 覆盖、批量重试。音色 ID / 语速 / 多音字规则全在工程级 tts.config.json 里，换工程只填配置、不动代码。适用：给口播视频/播客/有声书配音、批量 TTS、需要精确控制多音字和单段语速。与 web-video-presentation（产出分段文案）和 dubbing-check（合成后校验）配套：web-video-presentation → tts-dub → dubbing-check。触发场景：合成配音、批量 TTS、调多音字/单段语速、换音色。
---

# tts-dub —— 配音生成引擎

输入 `segments`（分段文案）+ `tts.config.json`（配置）→ 输出每段一个 mp3。
机制在脚本里，**所有工程特定的值（音色/语速/多音字）都在 config**，换工程只改 config。

## 在三件套里的位置
```
web-video-presentation  → 产出分段文案（audio-segments.json）
        ▼
   tts-dub（本 skill）   → 分段文案 + config → 每段 mp3
        ▼
   dubbing-check         → 合成后体检（完整性/语速/多音字/音画一致）
```

## 输入格式

**segments**：`[{ "id": "...", "text": "..." }]`
- 兼容 web-video-presentation 的 `audio-segments.json`（`{chapter,step,text}` 自动映射 `id = "chapter/step"`）。
- 输出写 `<outDir>/<id>.mp3`（id 里的 `/` 当目录）。

**tts.config.json**（见 `tts.config.example.json`）：
| 字段 | 说明 |
|---|---|
| `provider` | `minimax`（默认）/ `openai` |
| `voice_id` | 音色 ID。**跑 list-voices 看账户音色后填**（账户级共享，工程级选用）|
| `speed` / `pitch` | 全局语速 / 音高（MiniMax 是整段参数，无行内标记）|
| `normalize` | `[[from,to],…]` 念法规整，**只改配音、不碰字幕源** |
| `pronunciation` | 全局多音字 `tone`；同字多音并存时**留空**，改用 overrides |
| `overrides` | 逐段覆盖 `speed/pitch/pronunciation/voice_id`，键=segment id |

## 用法
```bash
# 1. 选音色：列账户克隆音色（按时间排，标最新）
node <skill>/scripts/list-voices.mjs        # 或用 dubbing-check 的同名脚本

# 2. 复制 tts.config.example.json → 工程根 tts.config.json，填 voice_id + 规则

# 3. 合成（在工程目录跑）
node <skill>/scripts/synthesize.mjs --config tts.config.json --segments audio-segments.json
node <skill>/scripts/synthesize.mjs --force            # 全部重合成
node <skill>/scripts/synthesize.mjs --only real-source/2,skeleton/1   # 只补指定段
```
鉴权：MiniMax 读 `~/.mmx/config.json` 的 `api_key`（或 env `MINIMAX_API_KEY`）；OpenAI 用 `OPENAI_API_KEY`。

## 内置的坑解法（为什么这么设计）

1. **绕开 mmx CLI**：mmx 的 `--pronunciation` 拼成 `{"tone":"hang2"}` 字符串（API 要数组），多音字校正失效 → 本 skill 直调 T2A HTTP。
2. **多音字逐段注音**：`pronunciation_dict` 是全局字替换，**同字多音并存会误伤**（「执行 xíng」被 `行→háng` 读错）。解法：分段合成天然支持**每段独立 pronunciation** —— 只给行数段加 `行/(hang2)`，执行段不加，自然读 xíng。**不需要语境判断逻辑**，纯 config。
3. **念法 / 字幕解耦**：`query.ts`→「query 点 ts」、`2043`→「两千零四十三」只在合成时 `normalize`，**字幕/源文案保留原文**（显示更好看）。
4. **per-段语速**：某段偏慢→ overrides 单独提 speed（如 `skeleton/1: {speed:1.2}`）；偏快→ 文案拆句。pitch 同理。
5. **批量重试**：串行合成偶发限流 → 每段重试 3 次（指数退避），避免失败段残留旧音色。

## provider 差异
- **minimax**：支持 pronunciation_dict / pitch / speed，中文多音字可精确控制。首选。
- **openai**：**不支持** pronunciation_dict / pitch（忽略），多音字只能靠 normalize 改文本；speed 支持 0.25–4.0。

## 合成完，下一步
跑 `dubbing-check`（完整性 / 语速离群 / 音画一致），再录屏 / 去拉伸 mux。
配音环境（mmx-cli / 余额 / 克隆音色）：memory `minimax-tts-setup`。
