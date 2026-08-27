---
illustration_id: 03
type: decision-flow
style: cartoon-ops
aspect: 1536x1024
---

无人系统先回答三问 — Decision flow

HEADLINE: 无人系统先回答三问
SUBHEAD: 知道得快、定位得准、停得下来，才配叫无人值守

ENTRY: 一个紫色怪兽触发异常，AI 机器人把异常卡交给戴帽质检员
DECISION 1: 质检员举牌「它挂了你多久知道」 → PASS：分钟级推送 / FAIL：六天后翻日志
DECISION 2: 质检员举牌「能定位根因吗」 → PASS：命令名或字段名 / FAIL：可能开头的猜测
DECISION 3: 质检员举牌「知道停还是重试吗」 → 三个出口

OUTCOMES:
- 绿色出口：原样重试一次 — 机器人自己收尾
- 琥珀出口：停在 status=drafting — 工程师回来从断点继续
- 红色出口：最多 3 轮／重做上限 2 次 — 超限转人工

FOOTER: 自动循环必须有出口，出口通向人
LABELS: 它挂了你多久知道；能定位根因吗；知道停还是重试吗；分钟级；命令名或字段名；原样重试一次；status=drafting；最多 3 轮；重做上限 2 次；超限转人工
ASPECT: 1536x1024

VISIBLE TEXT RULE:
Render as visible text ONLY what follows HEADLINE / SUBHEAD / 标题 / 副标题 / 清单 / 拦截牌 / FOOTER / LABELS. Anything after 画面 describes what to draw and must never appear as visible text.

STYLE (fixed, do not deviate):
Cartoon infographic illustration, flat fills with soft shading and gentle highlights, semi-3D sticker quality. Outlines 2–3px deep navy #1B2A5E, never black. Light background #FFFFFF–#F7F8FC only, airy, low-contrast, mostly white.

CAST: white-blue AI robot; black-haired engineer with glasses; cap-wearing inspector; one purple horned monster for the anomaly.

SEMANTIC COLORS: blue #2B5CE0/#E8EFFD main flow; violet #6B4FD0/#F0EBFB human; green #22A45D/#E4F5EC pass; red #E2483C/#FDEBE9 failure/escalation; amber #F5A21E/#FDF3E2 stop and human confirmation; purple #8B5FC9/#F2EBFA risk. Never swap.

INK & CHROMA BUDGET:
- Saturated fill ≤5%, absolute ≤8%; large nodes/cards use white or tint. At least 60% near-white, dark areas under 5%.
- Footer inset and ≤7% height. Decision points are inspectors with red/green cards, not naked diamonds.

TYPOGRAPHY: heavy headline #1B2A5E; body #3C4766; captions #6B7490; white only on capsules/footer.

HARD CONSTRAINTS:
- Visible text only from named text fields and LABELS; never print instructions or invent labels.
- Text only on flat front-facing planes. No Chinese on dark panels. Minimum Chinese size 2% canvas height.
- Simplified Chinese only; no traditional or malformed glyphs. Exact Latin spellings and exact digits: status=drafting, 3, 2.
- Full-width punctuation/colon “：”; repeated phrases identical; sibling labels equal size.
- 3% safe margin; complete figures with feet/shadows; no cropping, overlaps or arrows through text. Arrows 40px clear.
- Vary poses; no character repeated identically over 3 times. Props blank except named decision cards.
- No watermark, no logo, no extra caption.
