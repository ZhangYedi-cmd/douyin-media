---
illustration_id: 03
type: decision-flow
style: cartoon-ops
aspect: 1536x1024
---

发布失败，先原样重试一次 — Decision flow

HEADLINE: 发布失败，先原样重试一次
SUBHEAD: 用一次便宜重试，分开瞬态抖动与确定性故障

ENTRY: 标题：首次发布失败｜副标题：状态保持不动
DECISION 1: 标题：原样重试一次｜清单：同一命令／同一物料／不改参数
- YES PATH 标题：第二次成功｜清单：平台慢渲染／临时网络抖动／进入留痕
- NO PATH 标题：仍然失败｜清单：停止自动重试／进入定向排查
DECISION 2: 标题：故障属于哪一类
- PATH A 标题：cookie invalid｜清单：停下／人工 login 扫码
- PATH B 标题：UI 浮层｜清单：人工清掉遮挡／再跑同命令
- PATH C 标题：平台改版｜清单：优先升级 sau／包装层不打补丁
OUTCOMES: 标题：成功｜清单：4-publish.md／media publish-done；标题：失败｜清单：记录原因／状态保持不动
CHARACTERS: 画面：戴帽质检员在中央举一次重试的琥珀牌，AI 机器人走绿色成功路，黑框眼镜工程师在红色失败路指向一张独立白色“平台改版”卡；不要画书、手册、文件夹或任何带字道具，人物完整且姿态不同
FOOTER: 一次重试是分诊，不是无限重跑
LABELS: 原样重试一次；cookie invalid；UI 浮层；平台慢渲染；升级 sau；状态保持不动；4-publish.md；media publish-done
ASPECT: 1536x1024

VISIBLE TEXT RULE: Visible text only from HEADLINE / SUBHEAD / 标题 / 副标题 / 清单 / 拦截牌 / FOOTER / LABELS; never print drawing instructions.
STYLE: fixed cartoon-ops, flat fills, soft shading and gentle highlights, semi-3D sticker quality, 2–3px deep navy outlines, light background only, airy mostly white page.
CAST: white-blue AI robot with round head, antenna and “AI” badge; black-haired black-glasses engineer; capped inspector with magnifier and blank clipboard; purple horned monster for failure.
SEMANTIC COLORS: blue #2B5CE0/#E8EFFD automation; violet #6B4FD0/#F0EBFB human; green #22A45D/#E4F5EC success; red #E2483C/#FDEBE9 failure; amber #F5A21E/#FDF3E2 caution; purple #8B5FC9/#F2EBFA risk. Never swap.
INK & CHROMA: saturated ≤5%, absolute ≤8%, only headers/footer/status/arrows/clothing; large branches/cards white or tint; near-white ≥60%, dark <5%, footer ≤7% and inset.
TYPOGRAPHY: heavy #1B2A5E headline, medium #3C4766 body, #6B7490 captions, white only on saturated capsules/footer.
HARD CONSTRAINTS:
- Decision points are inspectors holding red/green/amber signs, not bare diamonds.
- Text only on flat front-facing unrotated planes; no Chinese on dark surfaces; minimum Chinese type 2% height.
- No overlaps; arrows through empty space at least 40px from text/cards and point only to nodes.
- 3% safe margin; full-body figures with feet and shadows; different poses.
- Full-width punctuation and “：”; one space Chinese/Latin; legible at 800px.
- Exact Simplified Chinese and exact Latin spelling of cookie invalid, UI, sau, 4-publish.md, media publish-done.
- All props blank except explicitly named decision signs. Do not draw any book, manual, folder, clipboard cover, sign spine or tool surface with text. “升级 sau” may appear only as a flat bullet inside the standalone white “平台改版” card, never on a carried object. No invented captions, logos or symbols.
- Simplified Chinese only, never Traditional variants. Repeated phrases identical; sibling labels same type size.
- Visible text only from named fields; never print drawing instructions.
