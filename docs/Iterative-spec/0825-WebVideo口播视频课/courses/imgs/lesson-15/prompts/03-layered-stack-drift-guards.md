---
illustration_id: 03
type: layered-stack
style: cartoon-ops
aspect: 1536x1024
---

HEADLINE: 文档架构的四道防漂移约定
SUBHEAD: 每类文档身份定死，知识才不会在多处各长各的

COMPOSITION:
Draw a four-level staircase from bottom-left to top-right. Each slab uses a pale tint body and 2px semantic outline, with a small saturated capsule at its left front edge. Do not fill entire slabs with saturated colour. The AI robot checks source files at the bottom; the engineer links the upper documentation layers.

LAYER 1 CAPSULE:
真相源唯一
LAYER 1 CARDS:
- meta.yaml
- backlog.yaml

LAYER 2 CAPSULE:
派生视图标注
LAYER 2 CARDS:
- dashboard.md
- 非真相源

LAYER 3 CAPSULE:
同一规则只写一处
LAYER 3 CARDS:
- lessons.md
- SOP
- Lx 回指

LAYER 4 CAPSULE:
历史存档只读
LAYER 4 CARDS:
- docs/
- 现行规则不只住这里

LEFT AXIS:
越往上，文档身份越明确

FOOTER:
防漂移不是少写文档，是给每份文档定身份

LABELS:
真相源唯一；meta.yaml；backlog.yaml；派生视图标注；dashboard.md；非真相源；同一规则只写一处；lessons.md；SOP；Lx 回指；历史存档只读；docs/；现行规则不只住这里；越往上，文档身份越明确；防漂移不是少写文档，是给每份文档定身份

VISIBLE TEXT RULE:
Render as visible text ONLY the exact strings listed under HEADLINE, SUBHEAD, labels, cards, gates, footer and LABELS. Anything under SCENE, ACTION, CHARACTER POSE, STAGING or COMPOSITION is drawing instruction and must never appear as text.

STYLE (fixed, do not deviate):
Cartoon infographic illustration, flat fills with soft shading and gentle highlights, semi-3D sticker quality. Outlines are 2–3px deep navy #1B2A5E, never pure black and never heavier than 3px. Light background only, white to cool near-white #FFFFFF–#F7F8FC. The page must feel airy, low-contrast and mostly white, never like a saturated poster.

CAST:
- AI robot: white-and-blue round head, small antenna ball, dark faceplate with bright blue eyes, AI badge on chest.
- Engineer: black hair, black-framed glasses, blue or violet hoodie.
- Inspector: engineer wearing a cap, holding a magnifier and a blank clipboard.
- Monster: purple horned creature representing defects, risk or polluted signals.
At least one character must be actively doing something. Do not repeat an identical character pose more than three times.

SEMANTIC COLORS:
- blue #2B5CE0, tint #E8EFFD: main flow, automation and AI.
- violet #6B4FD0, tint #F0EBFB: human involvement, hidden cost and second track.
- green #22A45D, tint #E4F5EC: pass and success.
- red #E2483C, tint #FDEBE9: blocked, failed and alert.
- amber #F5A21E, tint #FDF3E2: human confirmation and caution.
- purple #8B5FC9, tint #F2EBFA: monster, defect and risk.
Never swap these meanings across panels.

INK AND CHROMA BUDGET:
Saturated fill covers at most 5% of the canvas and never over 8%. Saturated fill is allowed only on capsule headers, footer strip, status icons, short progress fills, arrows and character clothing. Card bodies, panel fields, large shapes, containers, conveyors and layer slabs use white, near-white or matching tints. At least 60% of the canvas remains white or near-white. Dark areas stay under 5%. Separate zones with a thin #C8D0E4 line and capsule headers, not large saturated fields. Footer is inset from both sides and no taller than 7% of canvas height.

TYPOGRAPHY:
Headline and section titles use heavy sans-serif #1B2A5E. Body labels use #3C4766. Units and secondary notes use #6B7490. White text appears only on small saturated capsules or the footer. Chinese is Simplified Chinese only. Use full-width Chinese punctuation. Put one space between Chinese and Latin terms. Use standard unmodified Latin letterforms and spell every Latin technical term exactly.

HARD CONSTRAINTS:
- Output exactly 1536x1024, landscape 3:2.
- Keep a 3% safe margin on all four edges. Draw complete figures with feet and ground shadows; no cropping.
- Every Chinese label is at least 2% of canvas height and legible at 800px display width. Drop secondary text instead of shrinking.
- Text sits only on flat, front-facing, unrotated planes. Never bend, rotate or foreshorten text.
- No Chinese on dark screens or low-contrast surfaces. Put Chinese labels on white chips.
- Arrows run through empty space, stay at least 40px clear of cards and labels, and point only to structural elements.
- Speech bubbles never overlap heads. Cards never cover character outlines. No overlapping labels.
- Identify people with white callout cards beside them, never text on caps, clothes or badges.
- Props such as folders, books, boxes, clipboards, mugs and signs are blank, plain solid colour with no text or logo.
- Do not invent any caption, number, label or watermark. No watermark.
- Use Simplified Chinese only: 视觉 not 視覺, 装 not 裝, 区 not 區, 图 not 圖, 页 not 頁, 组 not 組, 报 not 報, 数 not 數, 检 not 檢, 测 not 測, 断 not 斷, 级 not 級.
- A repeated phrase must use exactly the same characters every time. Sibling labels share one type size.
