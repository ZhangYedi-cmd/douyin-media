---
topic: 第 16 课：验证与收敛——用 audit.jsonl 和 media check 自证写路径唯一，把施工记录补上
audience: 会用 Claude Code 或 Cursor，没做过自动化流水线，认知停在单轮对话；手上没有参考仓库，只有前 15 课自己做出来的东西（骨架仓、brain、六步方法、media 的 00-调研.md / 01-ADR.md / 02-执行方案.md、全量 media 命令、存量迁移记录）
mode: new
series_context: 模块 3「SPEC 与状态中枢」第 5 课、也是最后一课（12 调研与选型讨论 → 13 写 SPEC → 14 执行 M1 → 15 执行 M2 → 16 验证与收敛）；本课是 SPEC 六步法的第 6 步「验证」，也是全书第一次完整走完六步的一轮
---

## 核心问题

代码跑起来了不等于跑对了。这一课要解决的是：怎么证明「状态只有一个地方能写」这句话是真的，而不是自己看了一遍代码觉得没问题。证明的手段是留证据——`--dry-run` 先出计划、`audit.jsonl` 记账、`media check` 拿八条规则去自己仓库跑一遍——再把这轮施工的过程写成一份施工记录，交给以后接手的人看。

## 材料清单

- [任务卡] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/cards/16.md` 的「2.1 大纲」块：五节骨架、每节核心判断与交付物、承接三行原文。本课大纲的唯一来源，Step 2/3 不重新设计，直接展开。
- [承接台账，替代第 15 课成稿] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/handoff-ledger.md` 第 15、16 行：第 15 课成稿此刻不存在（`courses/` 目录只到第 13 课，`writing/` 目录也只到第 13 课），承接按台账三行走，回复里标注「承接按台账」。第 15 行给出第 15 课的产出（全量 `media` 命令 + 存量迁移记录）；第 16 行给出本课开头要接的点（东西造完了不等于造对了，这一课收口：自证写路径唯一，把施工记录补上）和结尾要抛出的问题（状态中枢立住了，机器能自己改状态，可有些动作改错了收不回来，哪些动作不能让机器自己拍板）。
- [规范，验证方法依据] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/11-SPEC方法-从调研到验证的六步.md` 第 6、7 节：里程碑出口条件写法（一句能跑的验证动作，正反例）、验证节的方法论原文（「验证要验的东西，往往是写代码的人自己以为已经对了的地方」「验证要留下能回查的证据，不能只凭看过了、应该没问题」）、施工记录模板（里程碑 / 出口条件 / 实际结果 / 卡在哪 / 怎么绕过去）、判断标准（拿这份记录给一个没参与这次验证的人看，他能不能照着这几行判断这个里程碑是不是真的过了）。本课第 4 节直接沿用这份模板，不改字段名。
- [规范，M1/M2 出口条件出处] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/13-media写SPEC.md` 第 141 行：M1 出口条件原文「真实仓库里跑 media check 能通过，YAML 文件里原有的注释一处都没丢」，M2 出口条件原文「全仓状态写路径唯一，连续七天内元数据、选题池、看板机器区的每一次变更，都能在审计记录里找到对应的一行」。第 75-88 行：CHK-01 到 CHK-08 八条规则表（规则名、级别、判定什么），以及「拿这张表当自己 check 命令的起点没问题，如果 01-ADR.md 给某个字段起了别的名字，把规则对应到自己的字段名上再抄」这条转写规则——本课引用这八条规则时按这条规则处理，不当成学员未过一致的抄搬。
- [规范] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/spec-lesson-standard.md`：六步节名固定用词（调研/讨论选型/决策/写 SPEC/执行/验证，不许另造同义词）、执行节与验证节的出口条件写法、验证节额外产出施工记录模板的规定，与第 11 课原文一致，本课一级标题若要点名步骤只能用这六个词。
- [背景包] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/00-写作背景包.md` 第 2 节「参考仓库的文件不等于学员自己的文件」：读者手上没有参考仓库，本课每条 Prompt 的输入必须是 inventory.md 第 15 课小节里已经出现过的东西；引用参考流水线的细节（施工记录里的具体 bug、CHK 规则表、audit.jsonl 字段）要写成「参考流水线里……」并说明是形状参考或起步值，不能让学员的文件和参考仓库的同名文件划等号。
- [inventory 校验] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/inventory.md` 第 15 课小节（第 117-124 行）：学员到第 15 课结束时手上确切有什么——`check` 八条规则（跨文件漂移怎么问出来、退出码怎么返）已经实现；状态记账唯一入口收敛为 `media`，手改 `meta.yaml` 正式收敛；core 三件（parsers/state/writer，含往返测试）已经跑得起来。本课 Prompt 只能要求 AI 使用这些已经存在的东西，不能要求读一个第 15 课还没交付的文件。
- [真实证据，audit.jsonl 格式] `tools/console/logs/audit.jsonl`：3556 行真实审计记录，逐行 JSON，字段 `ts`（ISO 时间戳）、`actor`（执行者）、`cmd`（命令名，如 flip、promote、publish-done、dashboard.rebuild、backlog.sweep）、`argv`（完整参数数组）、`result`（ok 或 error）、`files`（写了哪些文件、每个文件改了哪些字段的数组）、失败时额外的 `summary`（人话原因）。已抽样核实三类真实行：一条 `flip` 因目标状态需要走 publish-done 而被拒绝的 error 行（`summary` 原文「scheduled → published 须走 media publish-done（三翻齐事务）；flip 只做单文件状态迁移」）；一条 `publish-done` 的 ok 行，`files` 里同时列出 `meta.yaml` 改了 `status`/`timestamps.published`/`publish_url` 三个字段、`backlog.yaml` 改了 `topics[].status`、`dashboard.md` 重建了三块机器区；一条 `promote` 的 ok 行，`files` 里列出新建目录和新写 `meta.yaml` 六个字段。这是本课「audit.jsonl 怎么读」一节的真实示例来源，作为参考流水线的形状范本，不当成学员自己仓库已有的行。
- [真实施工记录，形状范本] `docs/Iterative-spec/0818-看板工作台/06-施工记录.md`：参考流水线自己造控制台那套材料的真实施工记录，26KB。已读取的可用素材：施工记录不是走流程的验收通过带过，而是记「实际发生了什么」——例如 core 包验收时实测发现 yaml 库的 `doc.toString()` 对全部 25 个真实文件丢注释对齐，改用「Document API 定位 + 原始字节区间替换」的实现方式；例如裁决台账里记录 CHK-01/CHK-05 判定范围一度不一致、后来怎么裁决；例如「人工待办」一节直接写着「M2 出口『连续 7 天状态变更均有 audit 行』」等 7 天窗口过后才能验的项。这份文件的形状（时间线、各部分验收结论表、裁决台账、信息安全事件记录、人工待办、commit 台账）比它的具体内容更值得学，本课第 4 节引用时框成「参考流水线」，不照抄字段之外的具体篇幅。
- [真实代码，check 命令实现] `tools/console/packages/cli/src/commands/check.ts`：`media check` 的真实实现，只读，调用 `buildSnapshot` 建快照、`computeAlerts` 跑规则，按 `level` 分 error/warn/info 三档统计，`process.exitCode = errors > 0 ? 1 : 0`——这是「error 级零个才算过」这条判据的真实代码依据。
- [真实代码，CHK 规则实现] `tools/console/packages/core/src/alerts.ts`：CHK-01 到 CHK-08 的完整实现，已逐条读取确认判定逻辑：CHK-01（双层不同步，error）同时从内容侧和选题池侧双向核对；CHK-02（picked 断链，error）检查 `content_path` 是否真实存在；CHK-03（scheduled 超时，error）用 `hoursBetween` 和阈值比较；CHK-08（疑似空跑，warn）判定工作日某个时点后当天有没有新内容目录。八条规则的级别（error/warn/info）与判定什么，第 13 课的表已经转写过一遍，本课不重复展开规则细节，只用来核对「学员自己仓库里 media check 的规则确实是这八条」这件事的真实性。
- [真实代码，往返测试依据] `tools/console/packages/core/`（core 包的 parsers/state/writer 三件，与第 14 课交付物对应）：M1 出口条件「YAML 文件里原有的注释一处都没丢」对应的正是 06-施工记录.md 里记录的那个真实教训——直接用 `doc.toString()` 序列化会丢注释对齐，改成定位加字节区间替换才能保住原样。本课第 1 节讲往返测试时用这个真实教训做反例支撑，不编造新的失败模式。
- [旧稿，仅看口径] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/old-courses/v1-11-状态真相源与media-CLI.md` 第 5 节「验收标准与课后实战」：v1 版本的验收清单写法（唯一写路径收敛验证、状态机非法语义拦截、事务原子性验证、产物健康自检验证）。只借「验收要给出具体能跑的检查动作」这个角度，不照搬其验收项清单本身（v1 是合并课，验收项与本课六步法框架下的验证节不是同一件事，且 v1 版本命令族与本课第 12-15 课已定的十四条命令不完全对应）。
- [ADR 交叉核对] `docs/Iterative-spec/0904-AI自媒体课程体系-v3/00-ADR.md` D8：media CLI 全量 1:1，`check` 进必做，分五课（12-16），反悔成本高。确认本课是这五课里的收口课，D8 拍板范围到本课结束。
- [状态值边界核对] `tools/console/packages/core/src/state.ts`：合法状态值真相源，meta 8 态（ideated/drafting/review/approved/scheduled/published/rejected/retro_done）、backlog 6 态（idea/picked/published/expired/rejected/archived）。本课举例涉及状态翻转时只能用这些值，且要核对学员到第 15 课为止实际手改过、真正接触过的状态子集（第 10 课成稿明写学员发布过的只到 review 一档，第 13 课的 polish-report 记录过这个边界），不能默认学员已经用过全部 8 档。

## 材料缺口

- 第 15 课成稿不存在，也没有 `writing/15-*` 目录留下的中间产物，无法核对第 15 课实际写到的具体措辞。处理方式：按写作背景包第 6 节的规则，本课开篇复述第 15 课产出时只用 `handoff-ledger.md` 第 15 行给出的「全量 media 命令和存量迁移记录」这句概括，不编造第 15 课没写过的具体细节（比如具体迁移了几条历史记录、具体哪几个命令是 M2 才补的），写完在回复里标注「承接按台账」。
- audit.jsonl 里没有真实的 `check` 命令自身的记账行（`check` 是只读命令，不写文件，不会出现在 audit.jsonl 里）——已用 `grep -o '"cmd":"[^"]*"' audit.jsonl | sort -u` 核实真实出现的 cmd 值只有 `backlog.add`、`backlog.apply`、`backlog.sweep`、`dashboard.rebuild`、`flip`、`metrics.record`、`next-up`、`promote`、`publish-done` 九种，均为写命令，不含 check。不是缺口，是本课第 2 节要讲清楚的一个真实边界：`audit.jsonl` 记的是写路径的痕迹，`media check` 验的是读出来的现状是否自洽，两件事分工不同，不能指望在 audit.jsonl 里找到某次 check 跑没跑过。
- 七天窗口的出口条件（M2 的「连续七天内每次变更均能在 audit.jsonl 找到对应行」）在一课的篇幅内无法真实等七天验证。处理方式：正文如实交代这条出口条件需要一个观察窗口，给出「怎么在七天内持续验证」的操作方法（比如定期跑一次核对脚本或人工抽查），不假装七天已经过去、也不用「基本符合」这类含糊话糊弄过去，施工记录里这一格如实写「窗口进行中」或类似的真实状态，不写成已经通过。
