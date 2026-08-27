---
illustration_id: 01
type: layered-stack
style: cartoon-ops
aspect: 1536x1024
---

daily-run.md 是机器接口 — Layered hierarchy

HEADLINE: daily-run.md 是机器接口
SUBHEAD: 五个固定节决定定时 agent 今天怎么跑、何时停、交什么

LAYERS (bottom → top, 底层最宽):
1. 参数 — 触发与依赖 — 工作日定时 agent — prompt 指向 daily-run.md
2. 产出 — content 目录 — status=review — dashboard.md 与运行日志
3. 阻塞即上报 — 取题空／TTS 余额尽／录制失败超重试 — 停下来推飞书
4. 执行步骤 — 取题→创作→出审 — media 命令管账，agent 管判断
5. 当前模式 — 每天产出 1 条 — next_up 优先，无则按 score

层板画法：板身用白色或对应 tint，描边 2px；层名只写在满色胶囊上。右侧画白蓝 AI 机器人从下到上读取；左侧黑框眼镜工程师只修改最上层“当前模式”，道具纯色无字。
LEFT AXIS: 越往上越接近当天行为
RIGHT AXIS: 改文件就是改程序
FOOTER PILL: 入口只钉契约，定时 agent 读文档执行，流程停在人审
LABELS: daily-run.md；当前模式；执行步骤；阻塞即上报；产出；参数；取题→创作→出审；status=review；dashboard.md；next_up；score；停在人审
ASPECT: 1536x1024

VISIBLE TEXT RULE:
Render as visible text ONLY what follows HEADLINE / SUBHEAD / 标题 / 副标题 / 清单 / 拦截牌 / FOOTER / LABELS. Anything after 画面 describes what to draw and must never appear as visible text.

STYLE (fixed, do not deviate):
Cartoon infographic illustration, flat fills with soft shading and gentle highlights, semi-3D sticker quality. Outlines are 2–3px deep navy #1B2A5E, never pure black. Light background only, #FFFFFF–#F7F8FC. Airy, low-contrast, mostly white, never a dark background or saturated poster.

CAST (must appear):
- AI robot: white-and-blue round head, antenna ball, dark faceplate with bright blue eyes, AI badge.
- Engineer: black hair, black-framed glasses, blue or violet hoodie.
- Monster for drift/risk only: purple horned creature, exaggerated expression.

SEMANTIC COLORS (never swap): blue #2B5CE0 / #E8EFFD = main flow and AI; violet #6B4FD0 / #F0EBFB = human and hidden cost; green #22A45D / #E4F5EC = pass; red #E2483C / #FDEBE9 = blocked; amber #F5A21E / #FDF3E2 = human confirmation; purple #8B5FC9 / #F2EBFA = risk monster.

INK & CHROMA BUDGET:
- Saturated fill at most 5%, absolute ceiling 8%; only capsule headers, footer, status icons, progress fills, arrows, character clothing.
- Card bodies, layers, panels and containers use white, near-white or tint. At least 60% near-white; dark areas under 5%.
- Footer no taller than 7% and inset from both sides. Use thin #C8D0E4 dividers, not coloured background fields.

TYPOGRAPHY:
- Headline and section titles: heavy sans-serif #1B2A5E. Body labels #3C4766. Captions #6B7490. White text only on saturated capsules/footer. Monospace only for code.

HARD CONSTRAINTS:
- Render visible text only from named text fields and LABELS; never print drawing instructions.
- Text only on flat, front-facing, unrotated planes; never bend, rotate or foreshorten text.
- No Chinese on dark screens; use white chips. Minimum Chinese type size 2% of canvas height; all labels readable at 800px width.
- Use Simplified Chinese only; no traditional variants, malformed glyphs or invented text. Latin terms must match exactly and use standard letterforms.
- Full-width Chinese punctuation and full-width colon “：”; one space between Chinese and Latin. Repeated phrases must be identical; sibling labels use the same size.
- Keep 3% safe margin on all sides. Complete figures with feet and shadows, at least 40px from edges. No cropping.
- No overlap: bubbles clear heads, cards clear characters, arrows at least 40px from text/cards and point only to structural elements.
- Same character pose no more than 3 times; vary posture, expression and props.
- Props including books, folders, boxes, clipboards, mugs and signs are blank solid colours with no text or symbols.
- Saturated area and dark area budgets are strict. No watermark, no logo, no invented captions.
