---
illustration_id: 01
type: gate-chain
style: cartoon-ops
aspect: 1536x1024
---

装备上手：四道最小检查门 — Sequential checkpoints

HEADLINE: 装备上手，先把干活的东西配齐
SUBHEAD: 每过一道门，方法论就多一层可复用的落点

GATES (left → right, each stricter than the last):
- Gate 1 标题：Claude Code 可用｜清单：claude --version／能对话｜画面：AI 机器人从终端窗口走出
- Gate 2 标题：第一个 skill｜清单：daily-note／notes/<今天日期>.md／时间戳｜画面：工程师把一张方法论卡装进机器人
- Gate 3 标题：项目宪法｜清单：CLAUDE.md／文档全中文／写入前先说明｜画面：质检员在规则门旁举绿牌
- Gate 4 标题：课程仓体检｜清单：npm run build／media check／01-setup／my-loop｜画面：机器人和工程师一起查看通过报告
栏头硬约束：画面中不要出现「Gate 1」「Gate 2」「Gate 3」「Gate 4」或半角冒号。四个栏头只显示「1 Claude Code 可用」「2 第一个 skill」「3 项目宪法」「4 课程仓体检」。
PASSING ARTIFACT: 你的最小 AI 工作环境，从一张空白工作卡逐门变成完整工具箱
AXIS: 越往右，方法论越能长期复用
FOOTER BAR: 方法论沉淀成文件，让 AI 每次开工读得到、机器每天跑得动
LABELS: claude --version；daily-note；notes/<今天日期>.md；CLAUDE.md；npm run build；media check；01-setup；my-loop
ASPECT: 1536x1024

VISIBLE TEXT RULE:
Render as visible text ONLY what follows HEADLINE / SUBHEAD / 标题 / 副标题 / 清单 / 拦截牌 / FOOTER / LABELS.
Anything after 画面 describes what to draw and must never appear as visible text.

STYLE (fixed, do not deviate):
Cartoon infographic illustration, flat fills with soft shading and gentle
highlights, semi-3D sticker quality. Outlines are 2–3px deep navy #1B2A5E —
never pure black, never heavier than 3px. Light background only — white to cool
near-white (#FFFFFF–#F7F8FC). Never a dark background.
The overall impression must be airy and low-contrast: a mostly white page with
small, deliberate patches of colour. Not a poster of saturated blocks.

CAST (must appear, these carry the story):
- AI robot: white-and-blue round head, small antenna ball, dark faceplate with
  bright blue eyes, "AI" badge on chest.
- Engineer: black hair, black-framed glasses, blue or violet hoodie.
- Inspector (when a checkpoint exists): engineer wearing a cap, holding a
  magnifier and a clipboard.
- Monster (when defects/risk/debt appear): purple horned creature, exaggerated
  angry or smug expression.

SEMANTIC COLORS (never swap these). Each has a SATURATED tone and a TINT.
Saturated tone is for small accents only; tint is for anything with area:
- blue    #2B5CE0 / tint #E8EFFD = main flow, automation, the AI side
- violet  #6B4FD0 / tint #F0EBFB = human involvement, hidden cost, second track
- green   #22A45D / tint #E4F5EC = pass / success
- red     #E2483C / tint #FDEBE9 = blocked / failed / alert
- amber   #F5A21E / tint #FDF3E2 = needs human confirmation / caution
- purple  #8B5FC9 / tint #F2EBFA = the monster (defects, risk, tech debt)

INK & CHROMA BUDGET (this is what makes the image comfortable to read):
- Saturated fill must cover at most 5% of the canvas, 8% absolute ceiling.
  Saturated fill is allowed ONLY on: capsule section headers, the footer summary
  bar, status icons (check / cross / warning), progress-bar fills, arrows, and
  character clothing. Everything else that has area — card bodies, panel fields,
  zone backgrounds, large shapes, containers, funnels, layer slabs, conveyor
  decks — uses white, near-white, or the matching TINT.
- Never fill a large shape with a saturated colour and then put a saturated
  border on it too. Pick one: tinted body + saturated 2px border, or saturated
  body with no border.
- Do not use a coloured background field to separate zones. Separate them with a
  thin #C8D0E4 divider line plus a capsule header. A whole panel tinted is
  acceptable; a whole panel saturated is not.
- At least 60% of the canvas must remain white or near-white (#FFFFFF–#F7F8FC).
- Dark areas (anything darker than #303030) must stay under 5% of the canvas.
- The footer summary bar is no taller than 7% of the canvas height, and is inset
  from the left and right edges rather than bleeding to them. A tall full-bleed
  bar alone can blow the whole saturated-fill budget.

TYPOGRAPHY (three ink levels — do not set every word at full strength):
- Headline and section titles: bold heavy sans-serif, #1B2A5E
- Body labels and data inside cards: medium weight, #3C4766
- Units, captions, parentheticals, axis notes: regular weight, #6B7490
- White text only on saturated capsules and the footer bar
- Monospace only inside code windows

HARD CONSTRAINTS:
- Text may sit on any surface drawn as a flat, front-facing, unrotated plane —
  cards, capsules, plain background, or the flat front face of a solid object.
  Text must NEVER wrap, bend, rotate, or foreshorten to follow a surface: no
  text on cloth folds, cylinder sides, spheres, curved banners, hat brims, or
  any side face turned away from the viewer. Render every label as flat 2D type.
- No Chinese text on dark screens, dark panels, or any low-contrast surface.
  Put such labels on small white chips with #1B2A5E text laid over the screen.
  Only Latin letters and digits may sit directly on a dark surface.
- Minimum type size: no Chinese label smaller than 2% of canvas height (about
  20px at 1024px tall). Drop the text before shrinking it — omit parenthetical
  asides rather than setting them at an unreadable size.
- Do not repeat an identical character pose more than 3 times; vary posture,
  expression, and props. This applies to monsters and background workers too.
- Speech bubbles must not overlap heads; arrows must not cross text; cards must
  not cover any character's outline.
- Keep a 3% safe margin on all four edges — no building, wall, conveyor, rubble
  pile, or figure may touch or cross the canvas edge.
- Chinese text uses full-width punctuation throughout, including inside footer
  bars and summary strips; put one space between Chinese and Latin characters.
- Every label must be legible when the image is displayed 800px wide.
- All Chinese characters must be correctly formed. No garbled, malformed, or
  invented glyphs. Latin technical terms must be spelled character-for-character
  as given.
- Latin words use standard, unmodified letterforms — no reversed, mirrored, or
  decorated glyphs, no stray tails or extra strokes. A word repeated across the
  image must be drawn identically every time.
- Arrows and connectors run through empty space. Keep every arrow at least 40px
  clear of any card, capsule, or bubble, and point it at the next structural
  element — never at a text label.
- Identify people with a small white callout card beside them (with a pointer
  tail), never with text on a badge, cap, or uniform.
- Every column heading and label colon must be the full-width "：". Never mix in
  a half-width ":" — pick one and use it everywhere in the image.
- Draw every character as a complete figure including feet and ground shadow,
  with at least 40px of clearance from the canvas edge. Do not crop a character
  at the waist against an edge while other characters are shown in full.
- Props held or carried by characters — books, folders, boxes, clipboards,
  binders, crates, envelopes, mugs, signs — are BLANK. Plain solid colour, no
  title, no logo, no spine text, no symbols. Distinguish them by colour and
  shape only. Text appears ONLY where the prompt names it under 标题 / 副标题 /
  清单 / 拦截牌 / FOOTER / LABELS. Do not invent a caption for anything.
- Use Simplified Chinese only. Never render a Traditional Chinese variant:
  视觉 not 視覺, 装 not 裝, 区 not 區, 图 not 圖, 页 not 頁, 组 not 組,
  报 not 報, 数 not 數, 检 not 檢, 测 not 測, 断 not 斷, 级 not 級.
- A Chinese phrase that appears more than once in the image must be written with
  exactly the same characters every time. Never substitute a similar-looking
  character (e.g. 效 must never become 数).
- All sibling labels at the same level must share one type size. Never shrink one
  column's text to make it fit — widen the column or shorten the label instead.
