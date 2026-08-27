---
illustration_id: 02
type: decision-flow
style: cartoon-ops
aspect: 1536x1024
---

自动化边界由可逆性划定 — Decision flow

HEADLINE: 自动化边界由可逆性划定
SUBHEAD: 先问是否可逆、规则是否钉死，再决定自动还是等人审

ENTRY: 画一位完整全身 AI 机器人递来一张“治理动作”白卡，双脚和地面阴影全部可见；不要画腰部裁切人物。
DECISION 1: 只画一位完整全身戴帽质检员，同时举一张红牌和一张绿牌，白卡标题「动作可逆吗」 → NO：只产报告 / YES：进入第二问
DECISION 2: 只画另一位姿态明显不同的完整全身戴帽质检员，同时举一张红牌和一张绿牌，白卡标题「规则已经钉死吗」 → NO：变更提议，等人审 / YES：自动记账

OUTCOMES:
- 绿色终态：自动记账 — meta.yaml／index.jsonl／入池／规则化过期清扫
- 琥珀终态：只产报告 — 现状／诊断／变更提议
- 紫色终态：人审通过后应用 — brain/／已发布线上资产／applied_note

红色拦截牌：不自动改 brain/
FOOTER: 技术能不能做到，不决定该不该自动
LABELS: 动作可逆吗；规则已经钉死吗；自动记账；meta.yaml；index.jsonl；只产报告；变更提议；人审通过后应用；brain/；applied_note；不自动改 brain/
ASPECT: 1536x1024

VISIBLE TEXT RULE:
Render as visible text ONLY what follows HEADLINE / SUBHEAD / 标题 / 副标题 / 清单 / 拦截牌 / FOOTER / LABELS. Anything after 画面 describes what to draw and must never appear as visible text.

STYLE (fixed, do not deviate):
Cartoon infographic, flat fills, soft shading, semi-3D sticker quality, 2–3px deep navy #1B2A5E outlines, light #FFFFFF–#F7F8FC background, airy and low-contrast.

CAST: white-blue AI robot; black-haired engineer with glasses for human review; cap-wearing inspector; purple monster only near irreversible risk.

SEMANTIC COLORS: blue #2B5CE0/#E8EFFD automation; violet #6B4FD0/#F0EBFB human; green #22A45D/#E4F5EC automatic/pass; red #E2483C/#FDEBE9 blocked; amber #F5A21E/#FDF3E2 waiting for human; purple #8B5FC9/#F2EBFA risk. Never swap.

INK & CHROMA BUDGET: saturated fill ≤5%, absolute ≤8%; nodes/cards white or tint; ≥60% near-white; dark areas <5%; footer inset ≤7% height.

TYPOGRAPHY: headline/section #1B2A5E heavy; body #3C4766; captions #6B7490; white only on capsules/footer.

HARD CONSTRAINTS:
- Decision points are inspectors with red/green cards, not naked diamonds. Only named text fields and LABELS visible.
- Text flat and front-facing; no Chinese on dark surfaces; Chinese minimum 2% height.
- Simplified Chinese only. Latin exact: meta.yaml, index.jsonl, brain/, applied_note.
- Full-width punctuation/colon “：”; repeated labels identical; same-level labels equal size.
- 3% safe margin; every character is a complete full-body figure with both feet and ground shadow visible, no waist-up crops. Draw exactly one inspector at each decision point, two inspectors total, with different poses; never duplicate red-side and green-side copies inside a decision card. No crop/overlap; arrows 40px clear from cards/text.
- Props blank except explicit cards. Vary poses. No watermark, logo or invented captions.
