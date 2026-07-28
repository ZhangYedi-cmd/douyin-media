A vertical 9:16 short-video cover poster, dark "source-code terminal" aesthetic, cool near-black background (#06080b) with extremely faint horizontal terminal scanlines and a subtle blurred monospace source-code texture drifting behind everything.

CENTER SUBJECT — reuse the EXACT same pixel-block mascot from the reference image: a warm-orange (#ff9a5c) blocky square robot face with two vertical black rectangular eyes and little stubby feet. Keep its identity, proportions, flat vector pixel style and orange color IDENTICAL to the reference — do NOT invent a new character. The mascot is the recurring brand identity.

SCENE (topic = reading the open-sourced source code of a flagship coding agent, and discovering its core is just a while-loop): the orange mascot stands at the center, INSIDE a single large glowing RUST-ORANGE (#ff6a2b) circular "loop" arrow — a bold rounded circular-arrow ring that clearly reads as a programming while-loop cycling around the mascot. The mascot looks up at the ring with curiosity, one stubby hand raised. The loop ring is the hero element and this topic's identity color. Around the ring, a few clean flat-vector floating source-code panels (abstract monospace lines, no readable real words needed) drift in the dark, some faintly dimmed, one small panel glows TEAL (#2dd4bf) like a discovered detail. A couple of small orange spark bursts (same hand-drawn asterisk style as the reference) near the mascot.

TOP: a rounded-rectangle capsule outline badge (thin rust-orange stroke) containing the text "AI 源码解读 · coding agent" in a clean sans/mono font.

BOTTOM: large bold two-line Chinese headline, high contrast, tight leading:
line 1 (white): "旗舰 coding agent 的源码"
line 2 (white): "拆开就是一个 while 循环"  — with "while 循环" highlighted in rust-orange (#ff6a2b)
Big, punchy, poster-weight type that carries the hook.

Overall: cinematic, high-contrast, clean flat-vector + terminal/source-code aesthetic, RUST-ORANGE as the hero accent (the loop — this topic's identity color), teal used sparingly for a single "discovered" detail, orange reserved for the mascot brand. No photorealism, no clutter, plenty of dark negative space. 1536×2752.

---
## 生成命令（留底）
set -a; source ~/.baoyu-skills/.env; set +a
npx -y bun ~/.claude/skills/baoyu-image-gen/scripts/main.ts \
  --promptfiles assets/cover-prompt.md --image assets/cover.png --ar 9:16 \
  --ref /Users/yedi/yedi-medias/videos/ep01-agent-while-loop/assets/cover.png \
  --provider google --model gemini-3-pro-image-preview

## 风格说明
用户未指定封面风格 → 按 2-create.md 步骤 6 走「仿 EP01 统一风格 + 复用 EP01 吉祥物本体（--ref 锁身份）」，
但本条为独立深度题（源码解读，非 claude-code-source-series），故徽章写「AI 源码解读 · coding agent」诚实标注，不冒充系列集数。
身份色随本片 tokens.css 的 theloop 主题定为铁锈橙（呼应 Rust + the loop），与 kimi 的琥珀、cc-safety-net 的绿区分开。
核心视觉锚点 = 吉祥物站在一个 while 循环环里，把「核心就是个 while 循环」的钩子一图讲透。
