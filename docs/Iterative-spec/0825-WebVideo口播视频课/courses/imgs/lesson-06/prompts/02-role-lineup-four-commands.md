---
illustration_id: 02
type: role-lineup
style: cartoon-ops
aspect: 1536x1024
---

四个命令，各管一件 — Role lineup

HEADLINE: 四个命令，各管一件
SUBHEAD: 取题、开工、流转、体检都有统一入口

CHARACTERS (4 个并排站立，姿态各异，所有道具纯色无字):
- 标题：media next｜副标题：只读预演｜清单：next_up 优先／否则按 score／不翻账｜画面：AI 机器人拿放大镜观察下一张选题卡
- 标题：media promote <slug>｜副标题：提题开工｜清单：idea → picked／五处一次改齐／建目录写 meta｜画面：工程师推动一个开工闸杆
- 标题：media flip <slug> <目标状态>｜副标题：合法流转｜清单：查迁移表／改 status／补 timestamps｜画面：机器人操作一只状态扳手
- 标题：media check --json｜副标题：全仓体检｜清单：只读／error／warn／同一个裁判｜画面：戴帽质检员举放大镜检查整齐账卡

TOP LABELS: 标题：next／promote／flip／check
BOTTOM BAR: 一套 media CLI，把记性变成契约
LABELS: media next；media promote <slug>；media flip <slug> <目标状态>；media check --json；只读；五处一次改齐；迁移表；error；warn
ASPECT: 1536x1024

VISIBLE TEXT RULE: Render as visible text ONLY what follows HEADLINE / SUBHEAD / 标题 / 副标题 / 清单 / 拦截牌 / FOOTER / LABELS. Anything after 画面 is drawing instruction and must never appear as text.

STYLE (fixed, do not deviate): Cartoon infographic, flat fills, soft shading, gentle highlights, semi-3D sticker quality, 2–3px deep navy #1B2A5E outlines, no pure black, light #FFFFFF–#F7F8FC background only, airy low contrast and mostly white.
CAST: white-blue round-head AI robot with antenna and “AI” badge; black-haired black-glasses engineer in blue/violet hoodie; capped inspector with magnifier and blank clipboard; purple horned monster only for defects.
SEMANTIC COLORS: blue #2B5CE0/#E8EFFD main flow; violet #6B4FD0/#F0EBFB human; green #22A45D/#E4F5EC success; red #E2483C/#FDEBE9 blocked; amber #F5A21E/#FDF3E2 confirm; purple #8B5FC9/#F2EBFA risk. Never swap.
INK & CHROMA BUDGET: saturated fill ≤5%, absolute ≤8%, only capsules/footer/icons/progress/arrows/clothing; all area-bearing shapes white or tint; near-white ≥60%; dark areas <5%; footer ≤7% height and inset; no saturated panel fields.
TYPOGRAPHY: heavy #1B2A5E titles, medium #3C4766 labels, regular #6B7490 captions, white only on saturated capsules/footer, monospace only in code windows.
HARD CONSTRAINTS:
- Text only on flat front-facing unrotated planes; never curve, rotate, wrap or foreshorten.
- No Chinese on dark surfaces; use white chips. Minimum Chinese type 2% canvas height.
- Each of the four characters has a visibly different pose and prop; never clone.
- No overlap; arrows stay 40px clear of text and cards. 3% edge safe margin; full body, feet and ground shadow.
- Full-width punctuation and “：”, one space between Chinese and Latin. All labels legible at 800px.
- Exact Simplified Chinese and exact Latin spellings. Do not mutate next, promote, flip, check, slug, status, timestamps, error, warn or JSON.
- Person identity on adjacent white callout only. All props blank, no invented text, logos or symbols.
- Simplified Chinese only, never Traditional variants. Repeated phrases identical; sibling labels same type size.
- Visible text only from named text fields; never print drawing instructions.
