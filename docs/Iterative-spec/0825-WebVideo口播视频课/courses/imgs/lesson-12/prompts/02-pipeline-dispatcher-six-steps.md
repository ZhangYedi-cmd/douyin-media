---
illustration_id: 02
type: pipeline
style: cartoon-ops
aspect: 1536x1024
---

dispatcher 只做六步 — Assembly-line panorama

HEADLINE: dispatcher 只做六步
SUBHEAD: 读注册表、判到点、派活、收报告、记账、汇报

CONVEYOR (left → right)，六个工位，角色姿态各异：
1. 标题：读注册表｜副标题：只取 enabled: true｜画面：AI 机器人读取 tasks.md 白卡｜清单：task／skill／enabled／trigger
2. 标题：评估 trigger｜副标题：到点才跑｜画面：质检员对照时钟和历史记录举绿牌｜清单：事件窗口／周期／加权池
3. 标题：派活｜副标题：目标传给执行 skill｜画面：机器人把无字包裹送向不同工具台｜清单：任务／目标／执行 skill
4. 标题：收报告｜副标题：统一 report-template｜画面：工程师接收白色报告卡｜清单：logs/<date>-<task>.md
5. 标题：记账｜副标题：每个任务目标对一行｜画面：机器人把一行记录追加到透明账本盒｜清单：logs/index.jsonl／append
6. 标题：汇报｜副标题：跑了什么、跳过什么、待审什么｜画面：工程师查看三张摘要白卡｜清单：已运行／已跳过／报告待审

ENTRY: /harness-dispatcher
EXIT: 本轮调度摘要
BLOCKER: 一只紫色怪兽试图从 dispatcher 伸手改 brain/，红色拦截牌写「只调度不治理」
FOOTER BAR: 新增改任务只改 tasks.md；没到触发条件就跳过
LABELS: 读注册表；评估 trigger；派活；收报告；记账；汇报；enabled: true；tasks.md；执行 skill；logs/<date>-<task>.md；logs/index.jsonl；append；只调度不治理；brain/
ASPECT: 1536x1024

VISIBLE TEXT RULE:
Render as visible text ONLY what follows HEADLINE / SUBHEAD / 标题 / 副标题 / 清单 / 拦截牌 / FOOTER / LABELS. Anything after 画面 describes what to draw and must never appear as visible text.

STYLE (fixed, do not deviate):
Cartoon infographic, flat fills, soft shading, semi-3D sticker quality, 2–3px deep navy #1B2A5E outlines, light #FFFFFF–#F7F8FC background, airy and low-contrast.

CAST: white-blue AI robot, black-haired engineer with glasses, cap-wearing inspector, one purple horned monster. Do not clone full characters at all six stations; reuse no pose more than 3 times and use tool stations/icons for remaining steps.

SEMANTIC COLORS: blue #2B5CE0/#E8EFFD main flow; violet #6B4FD0/#F0EBFB human; green #22A45D/#E4F5EC pass; red #E2483C/#FDEBE9 blocked; amber #F5A21E/#FDF3E2 caution; purple #8B5FC9/#F2EBFA risk. Never swap.

INK & CHROMA BUDGET: saturated fill ≤5%, absolute ≤8%; conveyor and cards white/tint; ≥60% near-white; dark areas <5%; footer inset ≤7% height.

TYPOGRAPHY: headline/section #1B2A5E heavy; body #3C4766; captions #6B7490; white only on capsules/footer; monospace only where a filename appears.

HARD CONSTRAINTS:
- Only named text fields and LABELS visible; no stage directions or extra labels.
- Text flat/front-facing; no Chinese on dark panels; minimum Chinese 2% height; all readable at 800px.
- Simplified Chinese only. Exact Latin and punctuation: enabled: true, tasks.md, trigger, skill, logs/<date>-<task>.md, logs/index.jsonl, append, brain/.
- Full-width Chinese punctuation and colon “：” for Chinese labels; repeated terms identical; sibling labels same size.
- 3% safe margin; complete figures, no crop or overlap. Arrows 40px clear of text/cards and point only to station structures.
- Props blank except explicit cards. No watermark/logo.
