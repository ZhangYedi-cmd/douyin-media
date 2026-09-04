---
topic: 飞书通道 SPEC——四个决策点走完调研到写 SPEC 的前四步
audience: 会用 Claude Code、没做过自动化流水线的学员，只有前 17 课自己做出来的东西，手上没有参考仓库
mode: new
series_context: 模块 4 交付闸口第 2 课（17 闸设在哪 → 18 飞书通道 SPEC → 19 飞书实现与按钮回流 → 20 发布 Skill）
---

## 核心问题

飞书这个人审通道要定死四件事（通道形态、卡片怎么拆、按钮回调超时怎么接、一个应用服务多条业务线怎么防串），本课要用六步 SPEC 方法的前四步（调研→讨论选型→决策→写 SPEC）把这四件事的判断和取舍钉成文档，19 课照着实现。

## 材料清单

- [承接] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/handoff-ledger.md` 第 17、18 行：第 17 课成稿 `courses/17-*.md` 与 `writing/17-review-gate/final.md` 均不存在（`writing/17-review-gate/` 下只有 `analyzed.md`、`outline.md`，与本课并发写），按台账承接：第 17 课交付了不可逆动作表和卡片字段草案；本课开头接的点是闸设在哪已定、闸怎么造未定；结尾要抛出的问题是 SPEC 定完四个决策点后，实现怎么把按钮点下去回流成状态。
- [规格] `.claude/skills/feishu-notify/SKILL.md` 全文：飞书人审闸口的完整能力描述——两个闸（内容审核闸、发布确认闸）、三张卡片、长连接 server、命名空间隔离、3 秒回调窗口的取舍理由（"为什么回调里同步只回 toast+resp.card、重活全异步"一节原文）、故障排查表（含 `-356` 超时报错和命名空间不匹配两类根因）。此文件是仓库现行实现的完整说明，含 console job runner 等后续演进内容，本课只取四个决策点本身用得上的部分，不把 job runner 那层引入 SPEC。
- [代码：配置] `tools/feishu-bot/config.example.yaml`：六步申请配置的注释原文，含 `ns` 字段的复用場景说明。
- [代码：卡片] `tools/feishu-bot/cards.py`（159 行）：三张卡片的真实实现——`review_card`（审核卡，通过/打回两按钮）、`reject_reason_card`（打回原因卡，`form` 输入框 + 打回并自动重做/打回·挂待办两个 `form_submit` 按钮）、`publish_confirm_card`（确认发布卡，确认发布/取消两按钮，物料不全时降级只剩取消按钮）；`_v()` 统一给按钮 `value` 注入 `ns` 字段；无"查看全文"按钮。
- [代码：出站] `tools/feishu-bot/notify.py`（94 行）：发卡顺序——先发口播稿全文（文本消息），再发封面图（`send_post` 富文本消息，图文类发全部配图），最后发审核卡；封面是独立消息，不是卡片自身字段。
- [代码：入站] `tools/feishu-bot/server.py`（513 行）：长连接 server 主体——命名空间过滤（`handle_card_action` 开头 `if value.get("ns") != NS: return`）、回调响应两路径（`_resp()` 同步只组装 toast+`resp.card`，`_patch_async()` 把冗余 PATCH 甩线程异步）、按钮分发（approve/reject/reject_rework/reject_todo/publish_confirm/publish_cancel）、重做上限 `REWORK_LIMIT=2`。console job runner 分支（`CONSOLE_API`）是仓库现行的后续演进，不属于本课四个决策点范围。
- [代码：客户端] `tools/feishu-bot/feishu.py`（100 行）：`FeishuClient` 封装 token 自管、`send_card`/`update_card`/`send_text`/`upload_image`/`send_post`。
- [代码：定位] `tools/feishu-bot/meta.py`（84 行）：`find_slug_dir`/`load_meta`/`read_publish_material`/`find_assets`，只读不写。
- [代码：拼物料] `tools/feishu-bot/publish.py`（159 行）：`build_payload` 确定性拼 `sau` 命令和物料摘要，不经 LLM。
- [脚本] `tools/feishu-bot/start.sh`（35 行）：server 生命周期 `start|status|stop|restart`，`pgrep -f` 按绝对路径匹配防止和别的项目的 `server.py` 撞名。
- [真实留痕] `content/2026-06-15/ep02-17mb-memory-explosion/3-review.md`、`content/2026-06-16` 附近的打回记录：`- [2026-06-16 20:58] 飞书审核：打回·重做(第1次) — 封面中间要用Claude官方的那个图，和Ep01保持一致`、`- [2026-06-16 21:23] 飞书审核：打回·待办 — （未填原因）`；另 `content/2026-06-18/ep04-esc-abort-chain/3-review.md`、`content/2026-06-20/ep06-concurrent-tools/3-review.md` 各一条打回·重做留痕。四条真实按钮留痕对应审核卡的通过/打回、原因卡的两个出口，可作为课文里"按钮点下去落地成什么"的真实例证。
- [六步模板] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/11-SPEC方法-从调研到验证的六步.md` 全文：调研表固定四列（方案/适用前提/代价/已知失败模式）、讨论选型辩护式提问四件事、ADR 固定四项（决策/理由/被否方案/反悔成本）、执行方案固定四节模板、`docs/spec/<代号>/` 目录约定。
- [同形课参照] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/12-media调研与选型讨论.md`、`13-media写SPEC.md`：四组互斥路线怎么摊成调研表、辩护式 Prompt 怎么写、ADR 怎么落、执行方案四节怎么填的真实范例，是本课"一课压两课形状"的直接参照。
- [学员已有材料，来自 `plan/inventory.md` 第 17 课一节] 学员在第 02 课已经走过飞书自建应用申请六步（App ID/App Secret/机器人拉群/长连接订阅 `card.action.trigger`/Verification Token/`chat_id`），当时明确写了"服务本身要等第 19 课才真正实现"；六步模板四件套（调研/ADR/执行方案/施工记录模板）；`docs/spec/media/` 三份文档做过一次示范；状态记账唯一入口收敛为 `media`（第 16 课结论），status 合法值只到 `ideated/drafting/review/approved/scheduled/published/rejected/retro_done` 这一档；第 17 课交付的不可逆动作表和卡片字段草案。
- [状态值真相源] `tools/console/packages/core/src/state.ts`：`review → approved`（`flip`，不需要理由）、`review → rejected`（`flip`，需要理由）、`approved → scheduled/published`（仅经 `publish-done`）。

材料合计 13 条以上（含并发核实的第 17 课承接台账），超过 5 条阈值。

## 材料缺口与处理

- 第 17 课成稿不存在：按台账承接，回复里标明"承接按台账"。
- 卡片字段草案的具体字段名（第 17 课产物）未知：正文只引用它"存在过"这一事实，不编造字段名，本课自己另起草表时只用能从 `cards.py` 真实核实到的字段。
- SKILL.md 里的 console job runner（`CONSOLE_API` 分支、`POST /api/actions/*`）是仓库现行更晚的演进，属于课程任务卡未列入的四个决策点之外的内容，本课不涉及，19 课如涉及再处理。
