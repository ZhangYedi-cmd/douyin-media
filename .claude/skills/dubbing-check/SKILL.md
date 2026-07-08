---
name: dubbing-check
description: 口播视频「配音 + 成片」的自动化校验清单，把 TTS 合成、录屏、音画对齐里反复踩的坑变成开工前/合成后/录屏前/录屏后四个检查点。用于 web-video-presentation 工程：配音生成后、录屏前后跑一遍，避免「多音字读错、念法别扭、语速忽快忽慢、停顿死气拖沓、漏合成、配音用了旧文案、音画文案不一致、headless 录屏被拉伸」这些只能靠重录才发现的问题。触发场景：用 MiniMax/TTS 给口播视频配音、要校验配音质量、排查「读音不对/某段太快太慢/画面字幕对不上音频」、或想在录屏前做一次体检。
---

# 配音 / 成片校验（dubbing-check）

口播视频从「文案 → 配音 → 录屏 → 成片」每一步都有**只能靠重录才暴露**的坑。
这个 skill 把它们前移成 4 个检查点，能脚本化的都给了脚本（`scripts/`）。

> 适配 `web-video-presentation` 标准工程结构：
> `audio-segments.json`（合成输入，含 chapter/step/text）、`public/audio/<ch>/<step>.mp3`、
> `src/chapters/<NN>-<id>/narrations.ts`（字幕/配音源）+ `<Chapter>.tsx`（视觉组件）、
> `rec/durations.json`（每段实测时长）。脚本默认在 `presentation/` 目录下跑。

## 核心认知（先记这条）

**每次音频改动都触发全链路返工**：改文案/音色/语速 → 重合成 → 重建 master → 重录 → 去拉伸 mux → 抽帧验证。
所以**所有改动攒成一批、跑完下面四个检查点再录**，不要改一处录一次。今天就是逐项返工录了 7+ 次。

---

## 检查点 1 · 开工前（文案侧静态检查）

### 1.1 音色确认 —— `scripts/list-voices.mjs`
- 克隆音色可能有多条同日录的，**肉眼分不出新旧**。按 UUID v1 时间位排序确认「最新」那条，别用错。
- 选定后**焊进** `minimax.sh` / 合成脚本的默认 voice，别每次手填。
- 坑：`get_voice` 偶有最终一致性延迟，删完音色复查可能冒出/漏掉一条 —— 复查两次。

### 1.2 多音字 + 念法扫描 —— `scripts/check-pronunciation.mjs`
扫 `audio-segments.json` 每段文案，列出风险点：
- **多音字**（最容易翻车）：`行 重 长 分 还 差 数 调 为 得 着 卷 属 划 难 中` 等。
  - **致命教训**：`pronunciation_dict` 是**全局字替换**，无法区分同字多音。本集「执行(xíng)」和「N 行(háng)」并存，全局 `行→háng` 把「执行」也读错了。
  - **正解**：按语境**动态注音** —— 「行」前是数字/数词才注 `háng`，「执行」交给模型读 `xíng`。先确认全片**没有任一段同时含两种读音**，才能用「按段加字典」。
- **文件名/扩展名**：`query.ts` 要念「query 点 ts」，不是「query dot ts」→ 文本 normalize。
- **大数字**：`2043` 可能被念成英文串 → normalize 成「两千零四十三」。
- **单位口径**：`17MB / 35兆 / 1个G` 三种口径听着乱 → 统一念法。
- **解耦原则**：念法只改**配音输入**（合成时 normalize），**字幕/源文案保留原文**（query.ts、2043 显示更好看）。

---

## 检查点 2 · 合成后（音频侧检查）

### 2.1 合成完整性 —— `scripts/check-completeness.mjs`
- 串行批量合成会**偶发 API 限流失败**，失败段若旧 mp3 还在会被静默保留 → **旧音色混进成片**。
- 检查：每段 mp3 都存在、非 0 字节、时长 > 0、段数与 `audio-segments.json` 一致。
- 预防：合成脚本对每段加**重试**（指数退避）。

### 2.2 语速离群 —— `scripts/check-pace.mjs`
- 算每段「音节/秒」，标过快/过慢。**关键**：要算**剔除停顿后的纯发音语速**（每个标点≈0.3s），否则会被停顿数量误导。
- **区分真假离群**：含 `query.ts / Anthropic / QueryEngine` 这类英文词的段，字面语速偏慢是**统计假象**（英文念得长），不是真拖沓，别误去提速。
- 离群段的处理：**偏快** → 文案拆句加字（同时改善措辞）；**偏慢** → 单独提 `speed`（per-段 override，见下）。
- **per-段调速/调音**：用 `rec/segment-overrides.json`（`{"chapter/step":{"speed":1.2,"pitch":-1}}`），合成时按段覆盖。注意 `pitch/speed` 在 MiniMax 是**整段统一**参数、**没有行内标记**，要单独调某段就得分段合成。

### 2.3 死气/停顿 —— `scripts/check-silence.mjs`
- TTS（尤其 MiniMax）在 `「」`引号 / `——` / 拟声词处会塞 **0.6–1s 死气**，听感拖沓。**EP02 教训**：开头「结果内存「唰」地飙到 966 兆…」18 字硬撑 6.78s、含 1s 死气。
- 这是**客观问题，不受 2.2「英文密集=语速假象」豁免**：段内 >0.45s 的非句读静音一律算问题。
- 检查：`silencedetect` 扫各段，列出 >阈值 的内部死气（exit 1 = 有）。
- 修法：`rec/depause.mjs <in> <out> 0.25 -38 0.30 0.45` 去停顿（切静音边界**不切词**、每处留 0.25s 呼吸），去完重渲染。短停（≤0.45s）属正常语气，放行。

### 2.4 真相源同步 —— `scripts/check-source-sync.mjs`
- **EP02 最贵的坑**：synthesize 读 `audio-segments.json`（extract 的产物），**不是** `narrations.ts`。改了 narration 没重跑 `extract-narrations` → 合成的是**旧文案音频** → 成片「画面新文案、声音旧文案」，连过两轮交审没抓到（只验了画面没验声音）。
- 检查：`audio-segments.json` 各段 text == 对应 `narrations.ts`（exit 1 = 不一致）。**逻辑上应在 2.1 前先跑**。
- 修法：`npm run extract-narrations` → `rm` 改动段 mp3（否则按文件名被 skip）→ 重合成。

---

## 检查点 3 · 录屏前（音画一致）

### 3.1 组件硬编码文案 vs narration —— `scripts/check-av-consistency.mjs`
- **今天最隐蔽的坑**：章节组件 `.tsx` 里有**硬编码的大字文案**（如 ending 的 CTA「本质区别在哪？」），它**不来自 narration**。改了 narration（配音+字幕）但忘了改组件 → **音频念新文案、画面还是旧字**。
- 检查：grep 所有 `.tsx` 里的中文长句，和对应章节 narration 并排，揪出「改了一边没改另一边」。
- 记住区分：组件里的**概念标签**（如「续命点」「QueryEngine」架构图）和 narration 是「关键词 vs 整句」的关系，不算冲突；只有**整句 CTA / 标题**这种逐字呈现的才要一致。

### 3.2 章节结构一致
- 删/加 narration 段会改变章节 step 数（如 coldopen 5→4）。必须同步改 `<Chapter>.tsx` 的 `step===N` 映射，否则视觉错配或留死代码。

---

## 检查点 4 · 录屏后（对齐验证）

### 4.1 抽帧验证音画同步
- 按调度时刻在**几个分散且窄的段中点**抽帧（`ffmpeg -ss t -i mp4 -frames:v 1 -update 1`，注意 ffmpeg 8.x 必须加 `-update 1`），看画面 step 与该段口播是否对上。窄段最敏感。
- **必查 headless 录屏拉伸**：重动画下 chromium 抓帧跟不上实时，webm 时长 > 真实墙钟，固定 `trimSec` 去头只对齐开头，**尾部画面滞后约一步**（"橡皮筋"：中段错位、最后一帧又追上）。
  - 判定：record 记 timeline，若每步 cursor 都准时到位却画面滞后 → 是拉伸，不是丢键。
  - 修法：record 在 `ctx.close()` 后记 `wallMs`，mux 用 `factor=webm时长/wallMs` + `setpts=PTS/factor` 把视频压回实时再对齐。详见 memory `web-video-recording-pipeline`。

---

## 一页流程（贴在工位上）

```
改文案/音色/语速/结构（攒成一批）
  → [1.1] 音色对不对、是最新吗
  → [1.2] 多音字/念法扫一遍，确认动态注音不误伤
  → 改过 narration？→ extract-narrations → 删改动段 mp3
  → 合成（带重试）
  → [2.4] 真相源同步：audio-segments == narrations（防音频用旧文案）
  → [2.1] 全段都合成了吗（无漏、无旧音色残留）
  → [2.2] 语速离群段，偏快拆句 / 偏慢提速
  → [2.3] 死气扫描：无 >0.45s 内部死气（有则 depause）
  → [3.1] 组件硬编码文案 == narration？
  → [3.2] 改了段数就同步改组件 step 映射
  → 录屏 → 去拉伸 mux
  → [4.1] 抽帧验证对齐（尤其尾部，防拉伸）
  → 定稿
```

## 相关
- 配音环境（mmx-cli / 余额 / 克隆音色用法）：memory `minimax-tts-setup`
- 录屏对齐 / 去拉伸 mux 全套：memory `web-video-recording-pipeline`
- 直调 T2A HTTP（绕开 mmx CLI 坏掉的 `--pronunciation`）：参见各工程 `scripts/tts-providers/minimax-t2a.mjs`
