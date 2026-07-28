A vertical 9:16 short-video cover poster, dark "ledger / audit desk" aesthetic, near-black ink background (#0b0a08) with faint warm horizontal ruled lines like an accounting ledger page, and a subtle blurred monospace texture.

CENTER SUBJECT — reuse the EXACT same pixel-block mascot from the reference image: a warm-orange (#ff9a5c) blocky square robot face with two vertical black rectangular eyes and little stubby feet. Keep its identity, proportions, flat vector pixel style and orange color IDENTICAL to the reference — do NOT invent a new character. The mascot is the recurring brand identity.

SCENE (topic = auditing an official benchmark table line by line, and finding the hype doesn't match): the orange mascot sits/leans at the left holding a glowing AMBER (#ffb545) highlighter marker pen, actively checking a tall vertical BENCHMARK TABLE that fills the center-right — render the table as clean flat-vector rows: many thin horizontal ruled rows of small abstract monospace numbers (no readable real words needed), stacked like a scoreboard. Most rows are dim grey-brown and marked with a small red (#ff5c6c) cross "✕"; only a FEW scattered rows are highlighted with an amber marker swipe and a small green (#3ddc97) check "✓". The visual read is instant and is the whole point: a long table where the vast majority of rows are NOT wins, and only a handful glow. A couple of small orange spark bursts (same hand-drawn asterisk style as the reference) around the mascot.

TOP: a rounded-rectangle capsule outline badge (thin amber stroke) containing the text "AI 新模型 · 跑分对账" in a clean sans/mono font.

BOTTOM: large bold two-line Chinese headline, high contrast, tight leading:
line 1 (white): "「击败 Fable 5」？"  — with 「击败 Fable 5」 in red
line 2 (white): "官方那张表我逐行读了"  — with "逐行读了" highlighted in amber
Big, punchy, poster-weight type that carries the hook.

Overall: cinematic, high-contrast, clean flat-vector + ledger/terminal aesthetic, AMBER as the hero accent (the auditor's highlighter — this topic's identity color), red as the "not first" accent, green used sparingly for the few wins, orange reserved for the mascot brand. No photorealism, no clutter, plenty of dark negative space. 1536×2752.

---
## 生成命令（留底）
set -a; source ~/.baoyu-skills/.env; set +a
npx -y bun ~/.claude/skills/baoyu-image-gen/scripts/main.ts \
  --promptfiles assets/cover-prompt.md --image assets/cover.png --ar 9:16 \
  --ref /Users/yedi/yedi-medias/videos/ep01-agent-while-loop/assets/cover.png \
  --provider google --model gemini-3-pro-image-preview

## 风格说明
用户未指定封面风格 → 按 2-create.md 步骤 6 走「仿 EP01 统一风格 + 复用 EP01 吉祥物本体（--ref 锁身份）」，
但本条为独立流量题（非 claude-code-source-series），故徽章写「AI 新模型 · 跑分对账」诚实标注，不冒充系列集数。
身份色随本片 tokens.css 的 ledger 主题定为琥珀（审计荧光笔），与 cc-safety-net 的绿、EP01 的橙区分开。
