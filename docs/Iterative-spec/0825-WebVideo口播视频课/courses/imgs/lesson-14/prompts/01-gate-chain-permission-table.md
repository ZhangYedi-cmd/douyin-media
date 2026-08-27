---
illustration_id: 01
type: gate-chain
style: cartoon-ops
aspect: 1536x1024
---

HEADLINE: 自动调参先过三道闸
SUBHEAD: 范围限空间，步长限速度，留痕保证可回滚

COMPOSITION:
A configuration card travels left to right through exactly three checkpoint arches. The arches use tint bodies with small saturated capsule titles. A cap-wearing inspector guards each gate. One engineer waits beside the final human-review branch.

GATE 1 TITLE:
范围
GATE 1 PASS CARD:
可逆数值
GATE 1 BLOCK CARD:
启停

GATE 2 TITLE:
步长
GATE 2 PASS CARD:
小步移动
GATE 2 BLOCK CARD:
大跳变

GATE 3 TITLE:
留痕
GATE 3 PASS CARD:
旧值→新值
GATE 3 TRACE CARD:
账本依据

GREEN OUTCOME:
自动档
GREEN OUTPUT CARD:
tasks.md 数值

AMBER OUTCOME:
提议档
AMBER OUTPUT CARD:
人审

BOTTOM TRACE CARD:
git 工作区

AXIS:
越往右，权限越收紧

FOOTER:
改速度可自动，改行为必须过人

LABELS:
范围；步长；留痕；可逆数值；启停；小步移动；大跳变；旧值→新值；账本依据；自动档；tasks.md 数值；提议档；人审；git 工作区；越往右，权限越收紧；改速度可自动，改行为必须过人

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
