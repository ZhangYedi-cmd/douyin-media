A vertical 9:16 short-video cover poster, dark cinematic "terminal / source-code" aesthetic, warm near-black background (#0d0b09) with extremely faint, heavily blurred abstract paragraph shapes (soft grey line-bars, fully illegible, no characters) drifting behind everything.

CENTER SUBJECT — reuse the EXACT same pixel-block mascot from the reference image: a warm-orange (#ff9a5c) blocky rounded-square robot face with two vertical black rectangular eyes, two small stubby side arms and four stubby legs, COMPLETELY CLEAN silhouette. CRITICAL: no hair, no tufts, no snout, no mouth, no nose — the face has ONLY the two vertical black rectangular eyes, exactly like the reference. The hand-drawn asterisk spark bursts are SEPARATE decorative elements floating in the dark background, clearly DETACHED from the mascot body (keep visible gap). Keep identity, proportions, flat vector pixel style and orange color IDENTICAL to the reference — do NOT invent a new character. The mascot is the recurring brand identity.

SCENE (topic = an invisible watermark secretly embedded in every piece of text the AI writes): the mascot stands at center holding a large flat-vector magnifying glass over a clean white-ish text panel. The panel text is GREEKED: abstract rounded horizontal grey bars / dashes standing in for text lines — ABSOLUTELY NO real or pseudo Chinese characters, no readable glyphs anywhere on the panel. INSIDE the magnifying glass lens, a few of those grey text-bars turn HOT ORANGE-RED (#ff4a2b) and glow, each with a bold glowing underline mark beneath it — the hidden watermark revealed. Outside the lens the bars stay plain grey and innocent. A faint trail of tiny glowing orange-red marks leaks off the panel edge, hinting the marks travel with copy-paste. One small flat-vector key icon (#ff4a2b) floats near the mascot, subtly connected to the glowing marks by a thin dotted line. A couple of small orange hand-drawn asterisk spark bursts (same style as the reference) floating in the empty dark background, away from the mascot silhouette.

TOP: a rounded-rectangle capsule outline badge (thin hot orange-red stroke) containing the text "AI 技术拆解 · 文本水印" in a clean sans/mono font.

BOTTOM: large bold two-line Chinese headline, high contrast, tight leading:
line 1 (white): "你让 Claude 写的每段字"
line 2 (white): "都被打上了「暗号」" — with "「暗号」" highlighted in hot orange-red (#ff4a2b)
Big, punchy, poster-weight type that carries the hook.

Overall: cinematic, high-contrast, clean flat-vector + terminal aesthetic, HOT ORANGE-RED (#ff4a2b) as this topic's identity accent (the hidden marks + key), mascot orange reserved for the brand character. No photorealism, no clutter, plenty of dark negative space. 1536×2752.

---
## 生成命令（留底）
set -a; source ~/.baoyu-skills/.env; set +a
npx -y bun ~/.claude/skills/baoyu-image-gen/scripts/main.ts \
  --promptfiles assets/cover-prompt.md --image assets/cover.png --ar 9:16 \
  --ref /Users/yedizhang/yedi-study/douyin-media/content/2026-06-15/ep02-17mb-memory-explosion/assets/cover.png \
  --provider google --model gemini-3-pro-image-preview

## 风格说明
用户未指定封面风格 → 按 2-create.md 步骤 6：非 claude-code-source-series 的独立深度题，
徽章诚实标「AI 技术拆解 · 文本水印」不冒充系列集数；吉祥物本体沿用账号品牌（--ref 用库内 EP02 封面锁身份，
2-create.md 写的 EP01 参考路径 /Users/yedi/... 在本机不存在）。
本题身份色 = 热橙红 #ff4a2b（与视频 midnight-press 主题 accent 一致）：放大镜下发光的暗号标记 + 密钥。
核心视觉锚点 = 吉祥物用放大镜照出正常文字下的隐形标记，把「看不见的暗号」一图讲透。
