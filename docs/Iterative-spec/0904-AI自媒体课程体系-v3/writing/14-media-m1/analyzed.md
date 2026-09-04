---
topic: 执行 M1：core 与首批命令——学员从定判据切到验收出口条件
audience: 会用 Claude Code、没做过自动化流水线、手上没有参考仓库，只有前 13 课自己做出来的东西
mode: new
series_context: 《AI 自媒体流水线》v3 第 14 课，模块 3（SPEC 与状态中枢）第三课，L3 六步法的第五步「执行」
---

## 核心问题

第 13 课把决策拆成了 `docs/spec/media/02-执行方案.md` 里能施工的规格，本课要回答：这份规格怎么变成一批真正能跑的代码，学员在这个过程里具体做什么。

## 材料清单

- [执行方案] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/13-media写SPEC.md` 全文，尤其第 3 节「里程碑怎么切」——参考流水线把 M1 定成读命令 + 事务写入引擎 + 两条历史事故最集中的写命令，M1 出口条件原文「真实仓库里跑 media check 能通过，YAML 文件里原有的注释一处都没丢」。可支撑本课开篇承接与全篇的出口条件写法。
- [方法出处] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/11-SPEC方法-从调研到验证的六步.md` 第 6 节「执行：照 SPEC 交付里程碑」——执行不是一次性实现完，是切里程碑，每个里程碑给一个能验证真假的出口条件；反例「六个检测脚本基本写完了」，正例给出具体验证动作。可支撑第 1 节的验收纪律和贯穿全篇的出口条件写法。
- [代码原型] `tools/console/packages/core/src/writer.ts` 第 1-6 行头注 + `runTransaction` 函数体（第 105-258 行）——事务写入引擎的真实实现，落盘顺序写在头注里：拿锁 → buildSnapshot → plan(snap) 构建写计划（全部校验在此完成，任一失败即零写入）→ dry-run 则打印计划退出 → 内存中算出全部新内容 → 逐文件 temp-then-rename 原子落盘 → 重生成 dashboard 机器区（同一把锁内）→ append audit.jsonl → 释放锁。可支撑第 2 节讲事务写入顺序为什么是这样，是「参考流水线」的具体形状，不能当成学员自己文件里的内容照抄。
- [代码原型 / 踩坑] `tools/console/packages/core/src/yaml-edit.ts` 第 1-12 行头注——R1 风险实测：对全仓 25 个真实 meta.yaml + backlog.yaml 用 `parseDocument(raw).toString()` 做零改动往返测试，全部不一致，根因是 yaml 库在 parse 阶段就把行内注释前的对齐空格丢了，toString 吐出来统一压成一个空格，不是选项能调回来的信息损失；解法是用 Document API 只做定位，落盘走原始字符串区间替换，不调用 `doc.toString()`。可支撑第 2 节「为什么往返测试是这一段的验收标准」——这是真实踩过的坑，不是编出来的理由。
- [代码原型 / 结构] `tools/console/packages/core/src/lock.ts`、`atomic.ts`、`audit.ts` 全文——分别是文件锁（`.media.lock`，30 秒陈旧阈值，抢占记一笔审计）、原子落盘（temp-then-rename）、审计账本（读全量+拼接+整体原子重写）三个独立小文件，各自单一职责。可支撑第 2 节讲 core 三件里 writer 依赖的几个小模块分工，不需要展开代码，只需要点出各自管一件事。
- [真实测试] `tools/console/packages/core/src/__test__/yaml-edit.test.ts` 第 31-39 行：`describe('applyEdits：零改动往返（R1 核心防线）')`，直接对真实 fixture 里的 meta.yaml 跑 `expect(applyEdits(raw, [])).toBe(raw)`，字节级恒等。可支撑第 2 节往返测试的验收动作要长什么样，给出可对照的测试骨架。
- [施工记录] `docs/Iterative-spec/0818-看板工作台/06-施工记录.md` 第二节「各包验收结论」里 A 包（core+CLI）一行：PASS，关键发现①「yaml 库 doc.toString() 实测对全部 25 个真实文件丢注释对齐，实现改『Document API 定位 + 原始字节区间替换』，判为忠于红线精神的主动声明偏离，认可」。可支撑第 2 节讲这条踩坑教训是参考流水线真实发生过的事，不是假设。
- [执行方案模板] `docs/Iterative-spec/0818-看板工作台/01-CLI执行方案.md` 第 15-20 行，M1 五步表格：仓奠基 → parsers+snapshot → state+alerts+读命令 → writer 事务引擎 → 首批写命令（promote + publish-done），第 19 行写明理由「拍板 §9 第 2 条：历史事故集中地先切」，M1 出口条件原文「真实仓 media check 通过；YAML 注释零丢失（往返测试全绿）」。可支撑第 3、4 节讲读命令批次划分和 M1 出口条件的具体来处，作为「参考流水线」引用，不当成学员自己的执行方案。
- [代码原型 / 读命令] `tools/console/packages/cli/src/commands/st.ts`、`next.ts`、`backlogLs.ts`、`doctor.ts` 全文——四条读命令的真实实现：st 分总览/单条两种模式且带 `legalNext` 字段、next 复用 `pickNext` 做模拟取题、backlog ls 带 `--status/--track/--sort/--expiring/--limit` 五个过滤项、doctor 分工是验产物格式不验账本一致性（和留到第 15 课的 check 分工互不重叠，doctor.ts 头注写明）。可支撑第 3 节讲四条读命令各自验收什么。
- [代码原型 / 写命令] `tools/console/packages/cli/src/commands/promote.ts`、`publishDone.ts` 全文——promote 一次写三处（backlog 状态、content_path 回填、meta.yaml 五个字段）加建目录；publishDone 按当前状态分三种模式（scheduled 收尾、approved 直接发布或转 scheduled、已发布补链接），失败态用 `MediaError` 各类错误码报出。可支撑第 4 节讲两条写命令各自的读写范围和失败怎么报，对应第 13 课定的四件套。
- [状态机真相源] `tools/console/packages/core/src/state.ts` 全文——`META_TRANSITIONS`、`BACKLOG_TRANSITIONS` 两张迁移表，meta 八个状态（ideated/drafting/review/approved/scheduled/published/rejected/retro_done），backlog 六个状态（idea/picked/published/expired/rejected/archived），`assertMetaTransition`/`assertBacklogTransition` 校验非法迁移即报错并列出合法出边。可支撑第 4 节讲状态值必须来自这张表，也是 `check-lesson.sh` 状态值核对的判据源。
- [真实样例] 学员自己仓库 `content/2026-06-19/ep05-permission-pipeline/meta.yaml`——真实文件，26 处 `#` 注释，含多行状态变更记录、终检闸判据说明等大段注释，是往返测试要保对象的真实样本，不是参考仓库的例子。可支撑第 2 节讲往返测试要拿谁的文件跑。
- [错误码表] `tools/console/packages/core/src/errors.ts` 全文——`MediaError` 统一错误形状，退出码表：0 成功、1 规则拒绝、2 用法错误、3 锁冲突、4 解析损坏。可支撑第 4 节讲失败怎么报和验收时看退出码。

## 材料缺口

无。以上 13 条材料逐条打开读过，覆盖开篇承接、core 三件的实现与踩坑证据、读命令批次、写命令批次、状态机真相源、失败码表，超过 5 条硬门槛。任务卡「2.1 大纲」已把大纲钉死（frontmatter `plan: fixed-from-card`），Step 2、3 不再产出新方案，直接进 Step 4。
