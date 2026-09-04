---
topic: 飞书审核闸口的实现——出站发卡、按钮回流成状态、同步与异步边界
audience: 会用 Claude Code、没做过自动化流水线的学员，手上没有参考仓库，只有前几课自己做出的东西
mode: new
series_context: 《AI 自媒体流水线》v3 第 19 课，模块 4 交付闸口，L3 六步法的第 5、6 步（执行、验证），前接第 18 课飞书通道 SPEC，后接第 20 课发布 Skill 与 dry-run
---

## 核心问题

SPEC 里定死的四个决策点（长连接、三张卡分步两按钮、3 秒回调窗口只做内存操作、命名空间隔离）怎么变成一个真正能推卡、收按钮、把结果落成状态的服务，并且这个服务不能偷偷依赖一个第 26 到 28 课才会造出来的控制台。

## 材料清单

- [承接] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/handoff-ledger.md` 第 18、19 行：第 18 课成稿在本课动笔时尚未产出（`writing/` 与 `courses/` 目录下都没有 18 课文件，与第 19 课同批并发写），按规则改用台账做承接第一真相源。第 18 行给出第 18 课产出（`docs/spec/feishu-gate/` 三份，四个决策点定死）；第 19 行给出本课开头要接的点（SPEC 定完就施工，按钮点下去要能变成状态）和结尾要抛出的问题（人点头这一关通了，点头之后真发出去这一步怎么做才不会误发）。可支撑开篇契约与收尾。
- [代码] `tools/feishu-bot/notify.py` 全文（94 行）：出站发卡的真实实现。发送顺序写在模块 docstring 里，三步走——`2-script.md`（回退 `copy.txt`）文本消息、`upload_image` 传封面（图文推全部图）、`review_card` 卡片。`--no-content` 只发卡片兜底。可支撑第 1 节「出站发卡」。
- [代码] `tools/feishu-bot/cards.py` 全文（160 行）：四类卡片模板，`NS = "douyin"` 常量与 `_v()` 统一注入 `ns`；`review_card` 两按钮 value 分别是 `action="approve"` 和 `action="reject"`；`reject_reason_card` 用 `form` 容器带一个输入框 + 两个 `form_submit` 按钮（`reject_rework` / `reject_todo`），docstring 里记了「form 内 input 与 button 不能再嵌 action 容器」的坑；`rework_limit_card` 是达上限转人工的终态卡。可支撑第 1、2 节。
- [代码] `tools/feishu-bot/server.py` 全文（514 行）：长连接常驻服务，回调入口 `handle_card_action`。命名空间过滤在最前面（`value.get("ns") != NS` 直接静默忽略并打日志）；`REWORK_LIMIT = 2` 写在第 62 行，注释「主观反馈无客观判据，不无限自愈」；`_count_rework` 靠数 `3-review.md` 里「打回·重做」出现的次数（不是另开计数器）；`_flip` 函数是状态写入的唯一路径，subprocess 调 `media flip`，`MEDIA_ENV` 里叠加 `MEDIA_ACTOR: "feishu-server"`；`_resp` 里明确写了「同步路径零 HTTP：只组装 resp，3 秒窗口绝对安全」；`CONSOLE_API = CONFIG.get("console_api", True)` 默认走 console job runner（`_console_post_action`、`_console_poll_job` 整段都在打 HTTP），`console_api:false` 时才落到「旧路径」——`_async_rework` 函数体里明确写着两条分支，旧路径直接 `_flip` + `_append_review` + `_run_rework`（`subprocess.run(["claude", "-p", ...])` 同步等）+ 读 `meta.status` 判断是否回到 `review`。可支撑第 1、2、3、4 节，也是「本课锁定旧路径」这条约束的直接证据。
- [代码] `tools/feishu-bot/meta.py` 全文（85 行）：`find_slug_dir`、`load_meta`、`find_assets` 等纯读函数，docstring 明写「只做确定性的文件读写，不依赖 LLM」；状态写入不在这个文件里，印证「server 自己不直接改文件，状态写入必须经 media」这条约束不是写在注释里说说，是真的没有第二套改状态的代码路径。可支撑第 3 节。
- [文档] `.claude/skills/feishu-notify/SKILL.md`：把两个闸口、三条按钮闭环、`console_api` 两条路径分叉用人话写了一遍，「能力二：审核处置闭环」一节的线框图和「打回 → 两个出口」的分叉描述与 server.py 代码一一对应。可支撑第 2、3 节的路径说明。
- [代码] `tools/console/packages/core/src/state.ts` 第 22 到 26 行 `review` 的三条出边：`drafting`（打回重做，`requiresReason: false`）、`approved`（通过，`requiresReason: false`）、`rejected`（打回挂待办，`requiresReason: true`），均 `viaCommand: 'flip'`。可支撑第 2 节的映射表与第 4 节的状态值核对。
- [真实留痕] `content/2026-06-15/ep02-17mb-memory-explosion/3-review.md`、`content/2026-06-18/ep04-esc-abort-chain/3-review.md`、`content/2026-06-20/ep06-concurrent-tools/3-review.md`：真实的 `_append_review` 留痕行，格式为 `- [时间戳] 飞书审核：<结论>`，实际出现过的结论有「打回·重做(第 1 次) — 理由」「打回·待办 — 理由」。核对下来 `server.py` 里 `_append_review` 只有三处调用点（打回重做、打回重做达上限转人工、打回挂待办），「通过」这一分支不写 `3-review.md`，只走 `_flip`。可支撑第 3、4 节，也用来纠正「四条按钮都留痕」这类想当然的说法。
- [方法] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/16-验证与收敛.md` 全文：第 15 课收敛出的「状态记账唯一入口收敛为 media」的具体形状（写命令带 `--dry-run`、`audit.jsonl` 六字段、`media check` 八条规则），本课第 3 节要接上「这个入口第一次被别的服务真正遵守」这句判断，需要引这一课定下的判据当参照系。
- [方法] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/15-执行M2-全量命令与存量迁移.md` 4.3 节：明确写了参考流水线把飞书回调里直接改文件的正则代码换成调用 `media flip` 并带身份参数的迁移案例，且写明「这一课不布置这个任务，因为学员现在手上还没有飞书闸口」，第 19 课正是接这句话的下文，本课要把这件事真正实现出来。可支撑第 3 节，是「media flip 带调用者身份」这条要求的直接出处。
- [规范] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/spec-lesson-standard.md`：六步节名固定、里程碑出口条件写法（一句能跑的验证动作，反例「基本完成」，正例「真实仓 media check 通过」）。可支撑第 4 节验证动作的写法。
- [任务卡] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/cards/19.md` 第 2、2.1、7 节：本课要讲什么、四节大纲、验收脚本参数「实操」。是全篇结构与判据的直接依据。

材料共 12 条，超过 5 条的门槛，进入 Step 2/3（本课按流程约定，大纲不重新生成，直接展开任务卡「2.1 大纲」块）。

## 材料缺口

- 第 18 课成稿不存在，用 handoff-ledger 第 18、19 行替代作为承接第一真相源，回复里会标「承接按台账」。
- `docs/spec/feishu-gate/` 在本仓库不存在（这是学员应该在第 18 课自己产出的东西，参考流水线本身没有配套 SPEC 文档，`tools/feishu-bot/` 是先造出来的历史实现）。正文里但凡要引用 SPEC 骨架的具体条款，一律改写成「按你自己第 18 课的 02-执行方案.md」这种指向学员自己文件的措辞，不假装这份文件在参考仓库里能读到。
- 第 11 课成稿只做了标题结构层面的核对（六步节名固定用词），不逐段精读全文，因为本课只用第 5、6 两步，不重新定义前四步。
