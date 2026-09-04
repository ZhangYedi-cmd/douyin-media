---
topic: 第15课 执行M2：全量命令与存量迁移
audience: 会用 Claude Code、没做过自动化流水线、手上没有参考仓库、只有前十四课自己做出来的东西
mode: new
series_context: 模块3 SPEC与状态中枢，第5课（11-16课）；六步法「执行」步的第二个里程碑，承接第14课 M1
---

## 核心问题

十四条命令里，读命令和两条历史事故最集中的写命令（M1）已经跑起来了；剩下七条写命令、check 的八条规则、以及前十四课散落的手改写点，怎么在这一课里全部收敛到 media 一个入口，并且能拿审计记录证明写路径唯一。

## 材料清单

1. [上一课产出，承接第一真相源] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/14-*.md` 及等价物 `writing/14-*/final.md`：**均不存在**（find/ls 确认，14 课与本课同批并发写）。按背景包与任务卡规则，承接改按 `plan/handoff-ledger.md` 第 15 行，并在交付回复里标注「承接按台账」。可支撑：开篇契约、上一课产出复述。

2. [执行方案/命令清单] `docs/spec/media/02-执行方案.md` 尚未在本仓生成（学员自己的文件，本课不能直接读它，只能引用第13课成稿里定死的十四条命令四件套格式和 M1/M2 切法）；第13课成稿 `courses/13-media写SPEC.md` 全文已读：十四条命令清单（读5写9）、flip 四件套示例表、check 八条规则表（CHK-01～CHK-08，逐条判定什么/级别）、状态迁移表写法、M1/M2 里程碑切法与出口条件写法（"全仓状态写路径唯一，连续七天……在审计记录里找到对应行"）。可支撑：第2、3节的命令清单与规则清单、开篇的"上一课交接点"复述。

3. [参考流水线源码：写命令] `tools/console/packages/cli/src/commands/` 逐个实读：`flip.ts`（状态翻转+时间戳，事务写；对已有值不覆盖、按 META_STATUS_ORDER 找锚点插时间戳）、`backlogAdd.ts`（撞车判定：tags 交集≥2 或标题子串+links 完全重合退化规则；`--force <n...>` 放行指定条目）、`backlogApply.ts`（落地人审提议，merge/archive 两种 action）、`backlogSweep.ts`（机械清扫，缺省 dry-run，`--apply` 才真落盘，两条规则 R1/R2）、`nextUp.ts`（set/clear 人钦点指针，校验目标必须是 idea 状态）、`dashboardRebuild.ts`（全量重生成机器区）、`metricsRecord.ts`（append `harness/logs/metrics.jsonl`，仅 7d 窗回填 backlog.metrics）、`check.ts`（只读，调 `computeAlerts`，errors>0 时 `process.exitCode=1`）。可支撑：第2节剩余写命令的验收标准示例（backlogAdd 撞车拒收/正常入池）、第3节 check 命令的实现骨架。

4. [参考流水线源码：8 条规则实现] `tools/console/packages/core/src/alerts.ts` 全文实读：`computeAlerts` 里 CHK-01 到 CHK-08 逐条判定逻辑与阈值（`AlertCfg` 默认值：scheduledTimeoutHours=24、reviewStalledHours=48、nearExpiryDays=2、expireTodayDays=2、expireTimelinessDays=7、emptyRunThresholdHour=21），grep 确认 8 个 rule 标签逐一出现，行号对应 error/warn/info 三级。可支撑：第3节规则清单的判定逻辑细节、"规则从真实字段里问出来"的论证。

5. [参考流水线源码：退出码与锁] `tools/console/packages/core/src/errors.ts`（`MediaError` 统一错误形状，`EXIT_CODE_BY_CODE` 表：0 隐含成功、1 规则拒绝类共 10 个错误码、`E_LOCKED`=3、`E_PARSE`=4）、`tools/console/packages/cli/src/envelope.ts`（`emitErr` 按错误码 `process.exit(exitCode)`）、`tools/console/packages/core/src/lock.ts`（咨询锁，`.media.lock` 文件，30 秒陈旧阈值，抢占陈旧锁要写一笔提醒）。可支撑：第3节退出码表（与任务卡给定的 0/1/2/3/4 完全对应）。

6. [参考流水线源码：事务与审计] `tools/console/packages/core/src/writer.ts` 头注（落盘顺序：拿锁→buildSnapshot→plan→dry-run 提前退出→原子落盘→重生成 dashboard→append audit→释放锁）、`atomic.ts`（temp-then-rename）、`audit.ts`（`appendAudit` 写 `tools/console/logs/audit.jsonl`，读全量+拼接+整体原子重写）。可支撑：第4节"存量写点迁移之后为什么能被证明"的机制铺垫（audit.jsonl 是唯一性的证据源，为下一课埋伏笔）。

7. [参考流水线：真实的存量写点，treat as 迁移范例而非学员现有文件] `tools/feishu-bot/server.py` 第 79-91 行 `_flip` 函数：subprocess 调 `media flip`，注入 `MEDIA_ACTOR=feishu-server`，替代"原 meta.py 里那套正则改行的第二套实现"；`meta.py` 现在只剩 `find_slug_dir`/`load_meta`/`read_publish_material`/`parse_tags`/`find_assets` 五个读函数（grep 确认零写函数）。**这是参考流水线迁移完成后的例子，不是学员要迁移的对象**——学员此时（17-19 课之前）没有飞书闸口，这段材料只用来说明"迁移长什么样"，不布置成学员的任务。

8. [参考流水线：M2 步骤与出口条件原文] `docs/Iterative-spec/0818-看板工作台/01-CLI执行方案.md`：第6-10 步逐条对应 flip/next-up/rebuild、backlog 三命令+metrics、切 publish-done+promote 写点、切 feishu server（同材料7）、切 ideate/retro/sweep 写点；"M2 出口"行原文："全仓状态写路径唯一：连续 7 天内 meta/backlog/dashboard 机器区的每次 git 变更均能在 audit.jsonl 找到对应行"。可支撑：第4节迁移动作分类（命令实现、pipeline 文档降级、skill 内写点替换、人手改的习惯）、开篇与收尾的出口条件表述。

9. [学员自己的真实存量写点] `pipeline/2-create.md` 第 31 行："上限 3 轮：第 3 轮仍 FAIL → 停，升级人审（reviewer 报告写进 `3-review.md`，`meta.yaml` 挂起），不强行往下录"——这是学员第10课自己写进契约、第10课起就在用的真实手改点，状态本身不翻转（仍是 drafting），但有人会打开 meta.yaml 添加"挂起"信息，这一类"没有对应写命令、只是标记"的写点是本课迁移练习里最容易漏扫的一种。同一文件第 75 行："全部过 → 状态与 dashboard 记账见 `media flip --help`"，是"审核通过"这条边已经预留了 flip 的调用点（学员十三课的 ADR/执行方案已经把它写进契约，但真正调用要等这一课全量命令做完才能落地）。可支撑：第4节存量迁移的核心例子（人拿编辑器改也算一个写入者）。

10. [学员自己的真相源模板] `content/_template/meta.yaml`：`status` 字段行内注释目前（参考仓库当前状态，即"迁移完成后"的版本）写的是"合法状态与迁移见 `media flip --help`（唯一定义 = tools/console/packages/core/src/state.ts）／状态只经 media 命令翻转，不手编"；`content/_backlog/backlog.yaml` 头部注释同样写"合法状态值与迁移规则唯一定义 = tools/console/packages/core/src/state.ts……backlog 只在两个时点翻动：promote(置 picked) 与 发布完成(置 published)，均经 media 命令记账"。**这两份文件是学员第03课自己建的模板**，第03课时 media 还不存在，注释里大概率写的是"手动维护"一类的话；这一课要让 AI 把注释改成上面这句话，这本身就是一处要迁移的写点（连"怎么改状态"这句话的写法也要收口，不能留着两套说法）。可支撑：第4节迁移清单第一行的具体范例（可以直接照抄改后的措辞，因为它在仓库里真实存在、grep 得到）。

11. [学员自己的验收纪律] `CLAUDE.md`「状态记账唯一入口 = media」一节原文："状态记账唯一入口 = media（发布收尾见 media publish-done --help；合法状态值唯一定义 = tools/console/packages/core/src/state.ts），其它环节不代翻"；以及「文档架构约定」里"dashboard.md 是派生视图非真相源；状态真相源 = 各 meta.yaml + backlog.yaml"。学员第03课写过这份文件的骨架版本，这一课的 Prompt 之一就是把这条规则正式写进（或更新进）学员自己的 CLAUDE.md。可支撑：第4节"迁移清单"要覆盖到的第三类地方（学员自己的项目规则文档）。

12. [测试佐证：验收标准非空话] `tools/console/packages/cli/src/__test__/commands/` 目录逐命令都有测试文件（backlogAdd.test.ts、backlogApply.test.ts、backlogSweep.test.ts、nextUp.test.ts、dashboardRebuild.test.ts、metricsRecord.test.ts、check.test.ts）；`backlogAdd.ts` 第 147 行注释"撞车判定：tags 交集≥2；候选无 tags 命中时退化为标题子串 + links 完全重合"与第 194 行 `--force <n...>` 选项，直接对应任务卡给的验收例子"backlog add 撞车条目要被拒收，非撞车要正常入池"。可支撑：第2节"验收标准要具体到行为，不是跑起来不报错"的论证。

13. [状态机唯一定义] `tools/console/packages/core/src/state.ts`：`META_TRANSITIONS`、`BACKLOG_TRANSITIONS` 两张表，`renderTransitionTable` 是 `flip --help` 的活文档唯一渲染点；`retro_done` 终态旁注"人工恢复可见性翻回 published 属人工例外，不进迁移表"——这是状态机里唯一被正式认定为"允许人工编辑"的例外，其余状态一律经命令。可支撑：第4节"迁移要迁到什么程度"的边界讨论（不是消灭一切人手操作，是消灭掉没被认领的手改）。

## 材料缺口

无实质缺口。第14课成稿全文缺失（属并发写正常情况，已按规则改走台账，见"承接"部分说明，不影响本课正文材料）。飞书闸口相关材料（server.py _flip）按背景包规则严格限定为"参考流水线的例子"角色，正文不会把它写成学员要执行的迁移动作，只作为"迁移长什么样"的旁证，Prompt 输入不依赖它。
