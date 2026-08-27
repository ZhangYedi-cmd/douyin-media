---
illustration_id: 02
type: decision-flow
style: cartoon-ops
aspect: 1536x1024
---

HEADLINE: 熄火线：没数据就承认没数据
SUBHEAD: 单任务有效记录不足五条，直接写心跳，不进入调参

ENTRY CARD:
index.jsonl

SCENE:
The white-blue AI robot reads a stack of structured ledger rows and hands a count card to a cap-wearing inspector. The inspector holds a green and red paddle beside a large front-facing decision card.

ANATOMY CORRECTION:
The inspector has exactly two arms and two hands: left hand holds the green paddle, right hand holds the red paddle. No magnifier, no clipboard, no extra prop, no extra arm. Do not draw any monster in this diagram. Show the inspector and robot as complete figures from head to shoes.

DECISION CARD:
有效记录够五条吗

LEFT RED BRANCH LABEL:
少于 5 条
LEFT OUTCOME TITLE:
心跳报告
LEFT OUTCOME CARDS:
- 样本不足
- 不调参

RIGHT GREEN BRANCH LABEL:
至少 5 条
RIGHT OUTCOME TITLE:
产调整
RIGHT OUTCOME CARDS:
- 自动档改动
- 提议档清单

BOTTOM WARNING CARD:
熄火检查必须在产调整之前

FOOTER:
早启可以，拿噪音调参不可以

LABELS:
index.jsonl；有效记录够五条吗；少于 5 条；至少 5 条；心跳报告；样本不足；不调参；产调整；自动档改动；提议档清单；熄火检查必须在产调整之前；早启可以，拿噪音调参不可以

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
