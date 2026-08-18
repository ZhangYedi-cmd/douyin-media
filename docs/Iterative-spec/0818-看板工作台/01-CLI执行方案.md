# 01-CLI执行方案

> 上游拍板：`2026-08-18-流水线CLI技术方案.md`（v0.2 全文，尤其 §4 注释保留、§5 状态机与命令、§6 skill 融合、§9 迁移顺序、§11 增补）；共享契约见 `00-执行版总览.md` §「部分边界」1-3、8。
> 范围：packages/core + packages/cli（`media` 命令行）。server/cc-stream 见 02，ui 见 03。
> 本文只做两件事：把拍板拆成天级步骤（§1），把每条命令与 core 模块写到可照抄实现的粒度（§2）。决策理由一律回指拍板章节，不复述。

---

## 1. 实施步骤

对齐总览 M1/M2 里程碑；第 11 步属总览 M5，排在 M3/M4 之后执行（见 CLI 方案 §9 第 5 条）。每步一天以内。

| 步骤 | 里程碑 | 做什么 | 产出物 | 验收标准（可判真伪） | 依赖 |
|---|---|---|---|---|---|
| 第 1 步 仓奠基 | M1 | `tools/console/` git init；npm workspaces + tsconfig 项目引用；建 core/cli 两包骨架（cc-stream/server/ui 目录由 02/03 方案自建）；主仓 `.gitignore` 追加 `tools/console/` 与 `.media.lock`；测试跑通（vitest）。**2026-08-18 注：本步骨架与测试基建已由实施计划预置（05 §7），A 接手时只需补 cli bin 与构建链后过验收标准** | `tools/console/{package.json,tsconfig.base.json}`、`packages/{core,cli}/` 骨架、可跑的 `npm test` | `npm install && npm run build` 零报错；`node packages/cli/dist/index.js --version` 有输出；主仓 `git status` 看不到 tools/console 内文件 | 无 |
| 第 2 步 parsers + snapshot | M1 | 实现 types.ts + parsers 四件（meta/backlog/harness/metrics）+ `buildSnapshot(root)`；解析失败降级返回 parseError 不抛穿（拍板 §3） | `packages/core/src/{types.ts,parsers/*.ts,snapshot.ts}` + 真实文件 fixtures | 对主仓实跑：24+ 个 meta.yaml 与 1038 行 backlog.yaml 全量解析，parseErrors 为空（或逐条列出且不崩）；`harness/logs/index.jsonl` 全行入快照 | 第 1 步 |
| 第 3 步 state + alerts + 读命令 | M1 | 实现 state.ts 双层迁移表 + alerts.ts 规则 CHK-01~08；CLI 出 `st` `next` `backlog ls` `check` 四条读命令 | `packages/core/src/{state.ts,alerts.ts}`、`packages/cli/src/commands/{st,next,backlogLs,check}.ts` | 主仓实跑 `media check`：至少命中 EP04/open-weight-5 的 CHK-03（scheduled 超时）与 ≥8 条 CHK-05（链接待补），与 dashboard「待人确认」表人工结论一致；`media next --json` 输出 id=`2026-07-19-001`（与 dashboard 07-19 人工判断一致） | 第 2 步 |
| 第 4 步 writer 事务引擎 | M1 | 实现 lock/atomic/audit/事务框架 + dashboard 机器区渲染；对 `dashboard.md` 做一次性人工改造：插入 `<!-- auto:*:begin/end -->` 三区标记、划定人写区 | `packages/core/src/{writer.ts,lock.ts,atomic.ts,audit.ts,dashboard.ts}`；改造后的 `dashboard.md` | 往返测试全绿：全部真实 meta + backlog 无改动 parse→toString 字节级一致；单字段改动的 diff 只含白名单行（§2.15）；`media dashboard rebuild --dry-run` 输出与现 dashboard 机器区内容语义一致 | 第 3 步 |
| 第 5 步 首批写命令 | M1 | 实装 `promote` + `publish-done`（拍板 §9 第 2 条：历史事故集中地先切）；三个历史事故 fixture 回归（EP04 scheduled 超时、双层不同步、published 无链接） | `commands/{promote,publishDone}.ts` + 事故 fixtures + 事务测试 | 在 fixture 副本仓完整走 `promote --auto --slug x` → `flip`（mock）→ `publish-done`：git diff 仅预期行、audit.jsonl 各 append 一行、dashboard 机器区同步刷新；非法输入（id 非 idea、状态非 approved）零写入 + 非零退出 | 第 4 步 |
| — M1 出口 | M1 | — | — | 真实仓 `media check` 通过；YAML 注释零丢失（往返测试全绿）——总览 M1 出口条件原文 | 第 1~5 步 |
| 第 6 步 flip / next-up / rebuild | M2 | 实装 `flip`（迁移表 + `--help` 打印活文档）、`next-up set/clear`、`dashboard rebuild` | `commands/{flip,nextUp,dashboardRebuild}.ts` | 迁移表测试穷举 8×8 组合与 §2.14 表逐格一致；`media flip x published` 被拒并提示走 publish-done；`media flip --help` 输出迁移表 | 第 5 步 |
| 第 7 步 backlog 三命令 + metrics | M2 | 实装 `backlog add/sweep/apply` + `metrics record`；backlog add 输入 schema 定稿（§2.8，回应拍板 §10.2） | `commands/{backlogAdd,backlogSweep,backlogApply,metricsRecord}.ts` + schema 校验 | fixture 上：add 撞车条目默认拒收且非撞车照常入池、自动编号正确续位；sweep --dry-run 与 --apply 输出一致且留痕注释落在 status 行；metrics record 7d 窗回填 backlog.metrics | 第 6 步 |
| 第 8 步 切 publish-done + promote 写点 | M2 | `douyin-publish` SKILL.md Step 5 整段替换为 `media publish-done` 一行；`pipeline/daily-run.md` 步骤 2 替换为 `media next --json` + `media promote`，**步骤 4 出审段替换为 `media flip <slug> review`**（2026-08-18 实施期补漏：拍板 §6 六入口之一，本行原文漏派，E 包上报后由编排方补齐）；`npm link` + SKILL.md 写绝对路径兜底（拍板 §6.1） | 两处 SKILL/SOP 改动 + 全局 `media` 可执行 | 下一次真实 daily-run / 发布收尾的 meta/backlog/dashboard 变更在 audit.jsonl 有对应行；`which media` 有输出且定时 agent 环境绝对路径可跑 | 第 7 步 |
| 第 9 步 切 feishu server | M2 | server.py 4 处 `meta.set_status()`（approved/drafting/rejected×2）改为 subprocess 调 `media flip`，注入 `MEDIA_ACTOR=feishu-server`；`meta.py` 删除 `set_status`，读函数保留（拍板 §6 表第 4 行） | server.py 改动；meta.py 只剩读函数 | 全仓 `grep -rn "set_status"` 为零命中；飞书审核卡实测一次「通过/打回/拒绝」，meta 翻转由 audit.jsonl 记账且回调 3 秒窗内完成 | 第 8 步 |
| 第 10 步 切 ideate / retro / sweep 写点 | M2 | `douyin-ideate` SKILL.md：入池段改 `media backlog add`、Step 2.0 清扫改 `media backlog sweep --apply`、删「更新 dashboard 选题池小节」；`douyin-retro` SKILL.md：收口改 `media flip <slug> retro_done`、**每窗拉数段加 `media metrics record <slug> --window <窗>` 调用**（data 建议键表落其 SKILL.md——Q9 拍板；冲突 #7 的链路接线）、dashboard 数据汇总仍人写；backlog-gardener 提议落地改 `media backlog apply` | 三处 SKILL.md 改动 | 治理线跑一轮后：backlog/dashboard 机器区变更全部有 audit 行；skill 侧无任何直接编辑 backlog.yaml/dashboard 机器区的指令残留（grep SKILL.md 验证） | 第 9 步 |
| — M2 出口 | M2 | — | — | 全仓状态写路径唯一：连续 7 天内 meta/backlog/dashboard 机器区的每次 git 变更均能在 audit.jsonl 找到对应行（总览 M2 出口条件） | 第 6~10 步 |
| 第 11 步 文档降级 + 日巡注册（属 M5，排 M3/M4 后） | M5 | `pipeline/*.md` 状态翻转描述、backlog.yaml 头注释状态机文档、CLAUDE.md「状态记账唯一位置」统一降级为「见 `media` 对应命令」（拍板 §6.1 第 2 条）；`harness/tasks.md` 加一行注册 `media check` 日巡（拍板 §9 第 5 条） | 文档改动 + tasks.md 新任务卡 | 状态机规则全仓 grep 只在 `core/state.ts` 有定义原文；dispatcher 次日日志出现 check 任务执行记录 | M2 完成 + 02 方案 M3 落地 |

---

## 2. 命令 × 功能 × 详细设计

### 2.0 通用约定（全部命令共享）

一句话：读命令 `--json`、写命令 `--dry-run` + 事务 + 写后自动体检，全部由同一段框架代码实现（拍板 §5.2）。

**全局参数**：

| 参数 | 适用 | 说明 |
|---|---|---|
| `--root <path>` | 全部 | 主仓根目录；缺省读 env `PIPELINE_REPO_ROOT`（与 server 同名，ADR 沿用），再缺省从 cwd 向上找 `content/_backlog/backlog.yaml` 定位 |
| `--json` | 全部 | 结构化输出（统一信封，见下）；缺省人读表格 |
| `--dry-run` | 写命令 | 打印将发生的全部文件变更（含 yaml 逐文件 unified diff），零落盘 |
| env `MEDIA_ACTOR` | 写命令 | 写入 audit.jsonl 的 actor 字段；缺省 `os.userInfo().username`。调用方注入：feishu server=`feishu-server`、job runner=`console-job:<id>`、定时 agent=`daily-run`/`harness` |

**JSON 信封**（所有命令统一）：

```json
{"ok":true,"cmd":"flip","data":{},"writes":[{"path":"content/.../meta.yaml","fields":["status","timestamps.approved"]}],"alerts":[{"rule":"CHK-05","level":"warn","subject":"grok-build-teardown","message":"published 无作品链接"}]}
{"ok":false,"cmd":"flip","error":{"code":"E_ILLEGAL_TRANSITION","message":"review → published 非法：发布记账必须走 media publish-done","rule":"state:meta"}}
```

读命令无 `writes`；写命令的 `alerts` = 写后自动跑 check 的结果附尾（拍板 §5.2 第 4 条）。

**退出码**：

| 码 | 含义 |
|---|---|
| 0 | 成功（`check`：无 error 级警报） |
| 1 | 规则拒绝 / 校验失败（`check`：存在 error 级警报，供治理线日巡判红） |
| 2 | 用法错误（commander 产生） |
| 3 | 锁冲突 `E_LOCKED`（拍板 §11.1：不排队，直接报错退出） |
| 4 | 真相源解析损坏 `E_PARSE`（目标文件降级都救不回，写命令绝不带伤落盘） |

**错误码表**（`MediaError.code`）：`E_NOT_FOUND` `E_BAD_STATUS` `E_ILLEGAL_TRANSITION` `E_MISSING_REASON` `E_DIR_EXISTS` `E_NO_TEMPLATE` `E_DUPLICATE` `E_SCHEMA` `E_BAD_ARG` `E_ALREADY_PUBLISHED` `E_NO_MARKERS` `E_LOCKED` `E_PARSE`。报错信息必须写明「哪条规则拦的你」（拍板 §5.2）。

**写命令事务序**（writer.ts 唯一实现，全命令过闸）：拿锁 → buildSnapshot → 构建写计划（全部校验在此完成，任一失败 = 零写入）→ `--dry-run` 则打印计划退出 → 内存中生成全部新文件内容 → 逐文件 temp-then-rename 原子落盘 → 重生成 dashboard 机器区（同一事务同一锁内）→ append audit.jsonl → 释放锁 → 跑 check 附尾输出。

---

### 2.1 `media st [slug]`

在制总览 / 单条全量（拍板 §5.3）。只读。

| 参数 | 必填 | 说明 |
|---|---|---|
| `slug` | 否 | 缺省=在制总览；给定=单条全量 |
| `--all` | 否 | 总览含 published/retro_done（缺省只列在制 + rejected） |

- **读**：全部 `content/*/*/meta.yaml`（经 buildSnapshot）+ backlog.yaml（反向指针核对）。**写**：无。
- **在制定义**：status ∈ {ideated, drafting, review, approved, scheduled}；rejected 单独列出（待人决定重做）。
- **校验**：slug 给定但不存在 → `E_NOT_FOUND`；meta 解析损坏 → 该条标 parseError 照常列出（读命令降级不拒）。
- **失败行为**：仅 slug 不存在时 exit 1；解析损坏不影响其它条目输出。
- **单条输出内容**：meta 全字段 + timestamps 时间轴 + deliverables 存在性探测（video/cover/script/publish 四件，探 `assets/*.mp4`、`assets/cover.*`、`2-script.md`、`4-publish.md`）+ blocker + **合法下一步**（`legalNext(status)`，来自 state.ts）+ 双向指针核对结果。

```json
{"ok":true,"cmd":"st","data":{"slug":"grok-build-teardown","dir":"content/2026-07-18/grok-build-teardown","status":"published","title":"xAI 把旗舰 coding agent 源码全开了…","type":"kouban","pillar":"depth","source":"2026-07-17-002","publish_url":null,"schedule":null,"timestamps":{"ideated":"2026-07-17","published":"2026-07-19 19:30"},"blocker":{},"deliverables":{"video":true,"cover":true,"script":true,"publish":true},"legalNext":["retro_done"],"backlogStatus":"published","pointerOk":true}}
```

### 2.2 `media next`

模拟取题：会取谁、为什么（拍板 §5.3；规则=daily-run 现行规则原样机器化）。只读。

| 参数 | 必填 | 说明 |
|---|---|---|
| `--json` | 否 | — |

- **读**：backlog.yaml。**写**：无。
- **决策规则**（与 `promote --auto` 共用同一函数 `pickNext`）：① `next_up` 非空且该 id 为 idea → 取它（decision=`next_up`）；② 否则 status=idea 中按 score 降序取最高，同分先 depth；再同分按 created 早者、再按 id 字典序（次级排序为工程预设，见 §4 待定项 Q3）。expired/picked/published/archived/rejected 天然排除。
- **校验**：`next_up` 指向的 id 不存在或非 idea → 输出 warning 并按 ② 继续（指针脏了不阻塞取题，warning 提醒人清指针）。
- **失败行为**：池中无 idea → `{"decision":"empty"}`，exit 0（空池不是错误）。

```json
{"ok":true,"cmd":"next","data":{"decision":"score","id":"2026-07-19-001","title":"Claude Code AskUserQuestion 翻车/权限模型","score":4.15,"track":"depth","format":"kouban","reason":"…★可诚实自动做完…","runnerUp":[{"id":"2026-07-13-001","score":3.9},{"id":"2026-07-15-002","score":3.85}],"warnings":[]}}
```

### 2.3 `media backlog ls`

选题池查询，替代通读 1000+ 行（拍板 §5.3）。只读。

| 参数 | 必填 | 说明 |
|---|---|---|
| `--status <s...>` | 否 | 可多值；缺省 `idea` |
| `--track <depth\|traffic>` | 否 | 赛道过滤 |
| `--sort <score\|created>` | 否 | 缺省 score 降序 |
| `--expiring` | 否 | 只列临近机械过期条目（复用 sweep 同一规则引擎做预演，输出剩余天数） |
| `--limit <n>` | 否 | 缺省不限 |

- **读**：backlog.yaml。**写**：无。
- **校验**：status/track 枚举非法 → exit 2。
- **失败行为**：backlog 解析损坏 → `E_PARSE` exit 4（选题池是单文件真相源，损坏必须炸出来）。

```json
{"ok":true,"cmd":"backlog.ls","data":{"nextUp":null,"count":{"idea":21,"picked":3,"published":22,"expired":9},"topics":[{"id":"2026-07-19-001","title":"…","track":"depth","format":"kouban","status":"idea","score":4.15,"tier":"S","urgency":"queue","created":"2026-07-19","tags":["claude-code","permission"],"expiresIn":null}]}}
```

`--expiring` 时每条附 `expiresIn`（天）与 `expireRule`（`today>2d` / `timeliness4>7d`）。

### 2.4 `media check`

一致性体检（拍板 §5.3）；规则代码 = core/alerts.ts，与看板 P1 同一份（总览契约 2）。只读。

| 参数 | 必填 | 说明 |
|---|---|---|
| `--json` | 否 | — |

- **读**：buildSnapshot 全量（contents + backlog + harness logs）。**写**：无。
- **规则表**（alerts.ts 唯一实现；阈值集中在 `DEFAULT_ALERT_CFG` 常量，默认值见 §4 待定项 Q6）：

| 规则 | 级别 | 判定 | 对应历史事故 |
|---|---|---|---|
| CHK-01 双层不同步 | error | meta=published/retro_done 而 backlog(source)≠published；或 backlog=published 而 meta 未达 published | 双层不同步事故 |
| CHK-02 picked 断链 | error | backlog=picked 且（content_path 空 / 目录不存在 / meta.yaml 缺失） | — |
| CHK-03 scheduled 超时 | error | meta=scheduled 且 now > schedule + 24h 仍无人回填 | EP04 / open-weight-5 |
| CHK-04 review 积压 | warn | meta=review 且 timestamps.review 距今 > 48h | — |
| CHK-05 链接待补 | warn | meta=published 且 publish_url 空 | 现 dashboard 8+ 条待补 |
| CHK-06 指针断裂 | warn | meta.source 空 / backlog 查无此 id / backlog.content_path 与 meta 目录不一致 | — |
| CHK-07 临近过期 | info | sweep 规则预演 ≤2 天内将命中 | — |
| CHK-08 疑似空跑 | warn | 工作日阈值时点后无当日 content 目录且无飞书阻塞上报（后端方案 §9 配套规则，服务端 tick 复用同函数） | 6 天空跑事故 |

- **失败行为**：exit 0=无 error 级；exit 1=有 error 级（治理线日巡以退出码判红）。

```json
{"ok":true,"cmd":"check","data":{"errors":2,"warns":9,"infos":2,"alerts":[{"rule":"CHK-03","level":"error","subject":"ep04-slug","message":"scheduled(2026-06-19 20:00) 超时 60 天未回填","since":"2026-06-19"}]}}
```

### 2.5 `media promote <id>` / `--auto`

取题记账五处一次改齐（拍板 §5.4 第 1 行）。写事务。

| 参数 | 必填 | 说明 |
|---|---|---|
| `id` | 与 `--auto` 二选一 | backlog 条目 id |
| `--auto` | 同上 | id 由 `pickNext`（§2.2 同一函数）决定 |
| `--slug <slug>` | 是 | 目录名/内容 slug；命名是判断活归 agent，CLI 只校验 kebab-case 格式 |
| `--date <YYYY-MM-DD>` | 否 | 目录日期，缺省今天 |
| `--dry-run` | 否 | — |

- **读**：backlog.yaml、`content/_template/`。**写（五处）**：① backlog 条目 `status: idea→picked` + status 行注释追加 `# <date> promote (media)`；② 同条目回填 `content_path: content/<date>/<slug>`；③ `next_up` 若等于该 id → 置 null；④ 建目录 `content/<date>/<slug>/` 并复制 `_template` 全部骨架文件（含空白 1-brief.md——brief 内容仍归 agent 写，拍板 §6 表第 1 行）；⑤ 新目录 meta.yaml 填字段：`slug`、`title`（backlog title）、`type`←format、`pillar`←track、`source: <id>`、`status: ideated` 不动、`timestamps.ideated`←backlog created（对齐 grok 实例「入池日」惯例）。外加 dashboard 机器区重生成（事务自动）。
- **校验**：id 存在且 status=idea（否则 `E_BAD_STATUS`）；目标目录不存在（否则 `E_DIR_EXISTS`）；`_template` 存在（否则 `E_NO_TEMPLATE`）；slug 格式 `^[a-z0-9]+(-[a-z0-9]+)*$`（否则 `E_BAD_ARG`）；`--auto` 且池空 → `E_NOT_FOUND`。
- **失败行为**：任一校验失败零写入（含不建目录），exit 1。

```json
{"ok":true,"cmd":"promote","data":{"id":"2026-07-19-001","slug":"askuserquestion-teardown","dir":"content/2026-08-18/askuserquestion-teardown","decision":"score","nextUpCleared":false},"writes":[{"path":"content/_backlog/backlog.yaml","fields":["topics[2026-07-19-001].status","topics[2026-07-19-001].content_path"]},{"path":"content/2026-08-18/askuserquestion-teardown/meta.yaml","fields":["slug","title","type","pillar","source","timestamps.ideated"]},{"path":"dashboard.md","fields":["auto:wip","auto:backlog"]}],"alerts":[]}
```

### 2.6 `media flip <slug> <status> [--reason <text>]`

meta 状态翻转 + 时间戳（拍板 §5.4 第 2 行；迁移表 §5.1）。写事务。

| 参数 | 必填 | 说明 |
|---|---|---|
| `slug` | 是 | content 条目 |
| `status` | 是 | 目标状态；合法值 = drafting / review / approved / rejected / retro_done（published/scheduled 被拒，见校验） |
| `--reason <text>` | rejected 必填 | 写入 status 行行尾注释 `# <date> <reason>`；其余迁移可选 |
| `--dry-run` | 否 | — |

- **读**：该条 meta.yaml。**写**：meta.yaml `status` 点位 + `timestamps.<status>` 补时间戳（格式 `YYYY-MM-DD HH:mm`；键不存在则 Document API 新增；**已有值不覆盖**——首次时间为准，重入历史靠 audit.jsonl）+ dashboard 机器区。
- **校验**：迁移合法性查 `META_TRANSITIONS`（§2.14 表），非法 → `E_ILLEGAL_TRANSITION` 并在报错里打印当前状态的合法出边；`rejected` 无 `--reason` → `E_MISSING_REASON`；**目标为 published/scheduled 一律拒绝**并提示走 `media publish-done`——发布是三翻齐事务，单翻 meta 必造双层不同步，这是对拍板「Step 5 唯一记账」铁律的机械保护（CLAUDE.md 流程纪律）；`published→retro_done` 是唯一治理线迁移（拍板 §5.1），audit 行标 `line:"harness"`。
- **失败行为**：零写入 exit 1；slug 不存在 `E_NOT_FOUND`。
- **活文档**：`media flip --help` 打印 `renderTransitionTable()` 输出的迁移表（拍板 §6.1 第 2 条）。

```json
{"ok":true,"cmd":"flip","data":{"slug":"grok-build-teardown","from":"review","to":"approved","stamped":"2026-08-18 21:07"},"writes":[{"path":"content/2026-07-18/grok-build-teardown/meta.yaml","fields":["status","timestamps.approved"]},{"path":"dashboard.md","fields":["auto:wip"]}],"alerts":[{"rule":"CHK-05","level":"warn","subject":"karpathy-autoresearch","message":"published 无作品链接"}]}
```

### 2.7 `media publish-done <slug> [--scheduled <time>] [--url <url>]`

Step 5 三翻齐 + v0.2 补填语义（拍板 §5.4 第 3 行、§11.4）。写事务。

| 参数 | 必填 | 说明 |
|---|---|---|
| `slug` | 是 | — |
| `--scheduled <YYYY-MM-DD HH:mm>` | 否 | 定时发布：meta→scheduled 并写 `schedule` 字段 |
| `--url <url>` | 否 | 作品链接回填 `publish_url`；缺省则 check 挂 CHK-05「链接待补」 |
| `--dry-run` | 否 | — |

- **读**：meta.yaml + backlog.yaml。**写**：按当前状态分三种语义：

| 当前状态 | 语义 | 写点 |
|---|---|---|
| approved | 正常发布 | meta `status→published`（或带 `--scheduled` 时 `→scheduled` + `schedule` 字段）+ `timestamps.published/scheduled` + `publish_url`（若有）；**status=published 时**同步 backlog `picked→published`；status=scheduled 时 backlog 保持 picked（对齐 open-weight-5 现状惯例），回填靠 CHK-03 盯守 |
| scheduled | 定时到点收尾 | meta `scheduled→published` + `timestamps.published` + `publish_url`（若有）+ backlog `picked→published`——EP04 类欠账的正规回填通道 |
| published | **补填**（v0.2 §11.4） | 仅回填 `publish_url`（须带 `--url`，否则 `E_ALREADY_PUBLISHED` 拒绝）；不动状态、不动 backlog |

  外加 dashboard 机器区（在制表移出该条）。
- **校验**：当前状态 ∉ {approved, scheduled, published} → `E_BAD_STATUS`（承接「只发 approved」铁律）；`--scheduled` 时间格式合法且晚于 now；`--url` 须 `https?://` 前缀；backlog 无 source 对应条目 → `E_NOT_FOUND`（三翻齐缺一即拒，不做两翻）。
- **失败行为**：零写入 exit 1。

```json
{"ok":true,"cmd":"publish-done","data":{"slug":"grok-build-teardown","mode":"normal","metaStatus":"published","backlogId":"2026-07-17-002","backlogStatus":"published","url":null},"writes":[{"path":"content/2026-07-18/grok-build-teardown/meta.yaml","fields":["status","timestamps.published"]},{"path":"content/_backlog/backlog.yaml","fields":["topics[2026-07-17-002].status"]},{"path":"dashboard.md","fields":["auto:wip","auto:backlog"]}],"alerts":[{"rule":"CHK-05","level":"warn","subject":"grok-build-teardown","message":"published 无作品链接"}]}
```

### 2.8 `media backlog add <file.yaml>`

批量入池：schema 校验 + 自动编号 + 30 天去重（拍板 §5.4 第 4 行）。写事务。

**输入 schema 定稿**（回应拍板 §10.2；douyin-ideate 产出候选文件的字段契约）：

```yaml
# candidates.yaml —— douyin-ideate 调研评分后的产出物
candidates:
  - title: "…"                      # 必填
    alt_titles: ["…"]               # 选填，缺省 []
    track: depth                    # 必填：depth|traffic
    format: kouban                  # 必填：kouban|tuwen
    score: 4.15                     # 必填（评分是判断，skill 算好带进来；系列题免打分可 null）
    tier: S                         # 必填：S|A|B|C|D（score 为 null 时可 null）
    scores: {practical: 5, social: 4, emotion: 3, hook: 4, timeliness: 4, trigger: 5}
                                    # 必填：6 键齐全，整数 1-5（score 为 null 时可 null）
    urgency: queue                  # 必填：queue|today
    reason: "…"                     # 必填（沿用「★可诚实自动做完」标注惯例）
    links: ["https://…"]            # 必填 ≥1
    tags: [claude-code, agent]      # 必填 ≥1（去重比对键）
    created: 2026-08-18             # 选填，缺省今天
```

| 参数 | 必填 | 说明 |
|---|---|---|
| `file.yaml` | 是 | 候选文件路径 |
| `--force <n...>` | 否 | 放行候选文件中第 n 条（1-based）撞车条目，可多次 |
| `--dry-run` | 否 | — |

- **读**：候选文件 + backlog.yaml。**写**：backlog.yaml `topics` 序列尾部 append 新条目（`status: idea`、`content_path` 留空、`metrics: {}`）+ dashboard 机器区。
- **自动编号**：`id = <created>-NNN`，NNN = 该日期已有最大序号 +1，三位零填充。
- **去重规则**：候选 tags 与「created 距今 ≤30 天且 status ∉ {archived}」的既有条目（backlog 全状态 + 已发历史都在 backlog 里，一处查齐）比对：tags 交集 ≥2 判撞车；候选无匹配 tags 时退化为标题子串 + links 完全重合比对（对齐 douyin-ideate SKILL.md 现行退化规则）。阈值默认值见 §4 待定项 Q4。
- **撞车处置**：撞车条目**默认拒收**并在输出列出对照（撞谁、交集 tags）；非撞车条目照常入池——skill 判断后删掉重提或 `--force` 单条放行（拍板 §5.4 原文）。
- **校验**：schema 逐条校验（枚举、scores 6 键、links/tags 非空），任一条不合格 → **整文件拒收** `E_SCHEMA`（半批入池会造成候选文件与池子对不上账）。
- **失败行为**：schema 失败零写入 exit 1；仅撞车拒收（其余入池成功）exit 0，拒收清单在 data 里。

```json
{"ok":true,"cmd":"backlog.add","data":{"added":[{"index":1,"id":"2026-08-18-001","title":"…"}],"rejected":[{"index":2,"title":"…","conflictWith":"2026-07-19-001","sharedTags":["claude-code","permission"]}]},"writes":[{"path":"content/_backlog/backlog.yaml","fields":["topics[+2026-08-18-001]"]},{"path":"dashboard.md","fields":["auto:backlog"]}],"alerts":[]}
```

### 2.9 `media backlog sweep [--dry-run|--apply]`

机械规则清扫（拍板 §5.4 第 5 行；CLAUDE.md 记账例外：规则化清扫视同记账）。写事务。

| 参数 | 必填 | 说明 |
|---|---|---|
| `--apply` | 二选一 | 落盘 |
| `--dry-run` | 二选一（**缺省**） | 无 flag 默认 dry-run——清扫批量翻状态，安全默认朝只读倾斜 |

- **读**：backlog.yaml。**写**：命中条目 `status: idea→expired` + status 行注释留痕 `# <date> 过期清扫(机械规则): <规则名>` + dashboard 机器区。
- **规则**（与 `backlog ls --expiring` 共用同一引擎 `expireRules(topic, now)`）：R1 `urgency=today` 且 created 距今 >2 天；R2 `scores.timeliness ≥4` 且 created 距今 >7 天。仅作用于 status=idea；判断性剔除不归它（拍板边界）。例外机制 = 人改字段本身（对齐 2026-06-14-006「时效重标 4→2」惯例），CLI 不设豁免标记。
- **校验**：无候选命中 → 输出「0 条」exit 0（不是错误，对齐 07-19 实况）。
- **失败行为**：`--apply` 中途任一条目定位失败 → 整批零写入 exit 1。

```json
{"ok":true,"cmd":"backlog.sweep","data":{"dryRun":false,"expired":[{"id":"2026-07-13-004","title":"SWE-1.7","rule":"timeliness4>7d","created":"2026-07-13"}],"count":1},"writes":[{"path":"content/_backlog/backlog.yaml","fields":["topics[2026-07-13-004].status"]},{"path":"dashboard.md","fields":["auto:backlog"]}],"alerts":[]}
```

### 2.10 `media backlog apply <id> --action <merge|archive> --proposal <path>`

落地 backlog-gardener 人审通过的提议（拍板 §5.4 第 6 行；补上「受权会话手编」这最模糊一环）。写事务。

| 参数 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | 被处置条目 |
| `--action <merge\|archive>` | 是 | merge=并入他题；archive=归档 |
| `--into <id2>` | merge 必填 | 合并目标条目 |
| `--proposal <path>` | 是 | gardener 报告路径（`harness/logs/…`），写进条目注释可溯源 |
| `--dry-run` | 否 | — |

- **读**：backlog.yaml + proposal 文件存在性。**写**：被处置条目 `status: idea→archived` + status 行注释 `# <date> <merge 并入 <id2>|archive>(人审通过): 提议 <proposal 相对路径>` + dashboard 机器区。merge 同时把被并条目的 links/alt_titles **去重并入目标条目**（照人审通过的 proposal 照单执行——Q5 拍板「允许」，2026-08-18）；目标条目其余字段不动。
- **校验**：id 存在且 status=idea（拍板：仅 idea 条目）；proposal 路径存在（拍板原文）；merge 时 `--into` 条目存在且 status ∈ {idea, picked, published}（不能并入 expired/archived）；`--into` ≠ id。
- **失败行为**：零写入 exit 1。

```json
{"ok":true,"cmd":"backlog.apply","data":{"id":"2026-07-17-003","action":"merge","into":"2026-07-10-002","proposal":"harness/logs/2026-07-15-backlog-gardener.md","absorbed":{"links":1,"alt_titles":1}},"writes":[{"path":"content/_backlog/backlog.yaml","fields":["topics[2026-07-17-003].status","topics[2026-07-10-002].links","topics[2026-07-10-002].alt_titles"]},{"path":"dashboard.md","fields":["auto:backlog"]}],"alerts":[]}
```

### 2.11 `media next-up set <id>` / `media next-up clear`

人钦点取题指针（拍板 §5.4 第 7 行）。写事务。

| 参数 | 必填 | 说明 |
|---|---|---|
| `set <id>` / `clear` | 二选一 | — |
| `--dry-run` | 否 | — |

- **读**：backlog.yaml。**写**：顶部 `next_up` 单点位 + dashboard 机器区。
- **校验**：set 时 id 存在且 status=idea（拍板原文）；clear 无校验（幂等，已 null 也成功）。
- **失败行为**：零写入 exit 1。

```json
{"ok":true,"cmd":"next-up","data":{"nextUp":"2026-07-19-002","prev":null},"writes":[{"path":"content/_backlog/backlog.yaml","fields":["next_up"]},{"path":"dashboard.md","fields":["auto:backlog"]}],"alerts":[]}
```

### 2.12 `media dashboard rebuild`

手动全量重生成机器区（拍板 §5.4 第 8 行、§7；日常不用，写命令自带）。写事务。

| 参数 | 必填 | 说明 |
|---|---|---|
| `--dry-run` | 否 | 打印将写入的机器区全文 |

- **读**：buildSnapshot 全量 + dashboard.md。**写**：dashboard.md 三个命名机器区标记内的内容；标记外一个字节不动（人写区，拍板 §7）。
- **机器区划分**（第 4 步一次性人工改造时插入标记；命名多区因机器内容与人写叙事在文件中交错）：

| 标记 | 内容（从快照重算） | 对应现 dashboard 小节 |
|---|---|---|
| `<!-- auto:wip:begin/end -->` | 在制/待处理表：slug、status、当前停留时长、blocker | 「在制 / 待处理」 |
| `<!-- auto:backlog:begin/end -->` | 计数行（N idea/picked/expired/published）、next_up 状态与按分最高 idea 前 4、临近过期清单 | 「选题池」的机器可判定行 |
| `<!-- auto:alerts:begin/end -->` | check 警报全量（CHK-01~08 分级列出） | 「待人确认」表中可机器判定的行 |

  「最后同步」叙事线、数据汇总表、待人确认中需人工判断的行 = 人写区，CLI 永不碰。首次改造哪些行划进 alerts 区见 §4 待定项 Q8。
- **校验**：三对标记必须存在且成对嵌套正确，否则 `E_NO_MARKERS` 整体拒绝——防吃掉人写区。
- **失败行为**：零写入 exit 1。

```json
{"ok":true,"cmd":"dashboard.rebuild","data":{"zones":["wip","backlog","alerts"],"wipCount":0,"alertCount":11},"writes":[{"path":"dashboard.md","fields":["auto:wip","auto:backlog","auto:alerts"]}],"alerts":[]}
```

### 2.13 `media metrics record <slug> --window <24h|72h|7d> --json-data '<payload>'`

复盘拉数落账（拍板 §11.4 第 1 条；douyin-retro 每窗调用；记账非判断，归因叙事仍归 skill）。写事务。

| 参数 | 必填 | 说明 |
|---|---|---|
| `slug` | 是 | content 条目 |
| `--window <24h\|72h\|7d>` | 是 | 复盘窗口 |
| `--json-data '<json>'` | 是 | 创作者中心数据对象（参数名避开全局 `--json` 输出开关） |
| `--dry-run` | 否 | — |

- **读**：meta.yaml（定位 + source）+ backlog.yaml（7d 回填）。**写**：① append 一行 `harness/logs/metrics.jsonl`（文件不存在则创建；append-only，多轮拉数天然多行快照——对齐 context-engineering 6 轮拉数实况）；② **仅 window=7d 时**回填 backlog 对应条目 `metrics` 字段为 payload 全量（覆盖已有值，旧值留在 audit 行）；③ dashboard 机器区。
- **jsonl 行 schema**：

```json
{"ts":"2026-08-18T21:00:00+08:00","slug":"cc-safety-net","window":"24h","actor":"harness","data":{"plays":5814,"completion_rate":"1.15%","avg_play_sec":17.67,"likes":71,"comments":2,"favorites":41,"fans_delta":1,"profile_visits":5,"audit":"公开正常分发"}}
```

  `data` 键值透传不设强 schema（创作者中心字段会漂移），仅校验为 JSON object 且非空；上表键名为 douyin-retro 侧的**建议键表**，写进其 SKILL.md 而非 CLI 硬校验。
- **校验**：slug 存在；meta.status ∈ {published, scheduled, retro_done}（未发布条目无数可记 → `E_BAD_STATUS`）；window 枚举；payload 可解析且为 object；7d 回填时 backlog 查无 source 条目 → `E_NOT_FOUND`。
- **失败行为**：零写入 exit 1（jsonl append 与 backlog 回填同事务，7d 时二者要么都落要么都不落）。

```json
{"ok":true,"cmd":"metrics.record","data":{"slug":"cc-safety-net","window":"7d","jsonlLine":42,"backlogBackfilled":"2026-07-05-001"},"writes":[{"path":"harness/logs/metrics.jsonl","fields":["+1 line"]},{"path":"content/_backlog/backlog.yaml","fields":["topics[2026-07-05-001].metrics"]},{"path":"dashboard.md","fields":["auto:backlog"]}],"alerts":[]}
```

### 2.14 core 模块拆分与函数签名

一句话：parsers 纯函数吃文本、snapshot 管 IO 聚合、state/alerts 零 IO、writer 是唯一落盘通道（总览契约 2/3）。

```
packages/core/src/
├── index.ts          # 对外导出面：types + buildSnapshot + computeAlerts + state 查询函数
│                     #（writer/lock/audit 不从 index 导出，cli 从 '@console/core/writer' 深路径 import——
│                     #  server 禁 import writer 的边界靠 exports 字段物理隔离）
├── types.ts          # Snapshot / ContentEntry / ContentMeta / BacklogTopic / Alert / AuditEntry / MetricsRecord
├── paths.ts          # resolveRoot(cliFlag?) / contentDirs(root) / backlogPath(root) / dashboardPath(root)
├── errors.ts         # MediaError { code, rule?, exitCode }
├── parsers/
│   ├── meta.ts       # parseMetaFile(raw, path): ParsedMeta
│   ├── backlog.ts    # parseBacklogFile(raw): ParsedBacklog；findTopicNode(doc, id): YAMLMap|null
│   ├── harness.ts    # parseIndexJsonl(raw): HarnessRun[]（坏行跳过并计数）
│   └── metrics.ts    # parseMetricsJsonl(raw): MetricsRecord[]
├── snapshot.ts       # buildSnapshot(root: string): Snapshot   ——总览契约 2 的规定签名
├── state.ts          # 双层迁移表 + 查询/断言函数（下表）
├── alerts.ts         # computeAlerts(snapshot, now: Date, cfg?: AlertCfg): Alert[] ——now 必须注参（后端方案 §4）
├── dashboard.ts      # renderZone(name, snapshot, alerts): string；replaceZones(mdText, zones): string
├── writer.ts         # runTransaction(...)（下详）——全仓唯一落盘实现
├── lock.ts           # acquireLock(root): Release；O_EXCL 建 <root>/.media.lock，内容 {pid,ts,cmd}
├── atomic.ts         # writeFileAtomic(path, text)：同目录 .tmp-<pid> 写入后 rename（拍板 §11.3）
└── audit.ts          # appendAudit(consoleRoot, entry: AuditEntry)：tools/console/logs/audit.jsonl（拍板 §11.2）
```

**关键类型与签名**：

```ts
// types.ts（节选）
export type MetaStatus = 'ideated'|'drafting'|'review'|'approved'|'scheduled'|'published'|'retro_done'|'rejected'
export type BacklogStatus = 'idea'|'picked'|'published'|'expired'|'rejected'|'archived'
export interface ContentMeta { slug: string; title: string; type: 'kouban'|'tuwen'; pillar: 'depth'|'traffic';
  status: MetaStatus; source: string|null; schedule: string|null; publish_url: string|null;
  timestamps: Partial<Record<MetaStatus,string>>; blocker: Record<string,unknown> }
export interface ContentEntry { slug: string; dir: string; meta: ContentMeta|null; parseError?: string;
  deliverables: { video: boolean; cover: boolean; script: boolean; publish: boolean } }
export interface BacklogTopic { id: string; title: string; alt_titles: string[]; track: 'depth'|'traffic';
  format: 'kouban'|'tuwen'; status: BacklogStatus; content_path: string|null; score: number|null; tier: string|null;
  scores: Record<string,number>|null; urgency: 'queue'|'today'; reason: string; links: string[]; tags: string[];
  created: string; metrics: Record<string,unknown> }
export interface Snapshot { generatedAt: string; root: string; contents: ContentEntry[];
  backlog: { nextUp: string|null; topics: BacklogTopic[] }; harness: HarnessRun[]; metrics: MetricsRecord[];
  parseErrors: { path: string; error: string }[] }
export interface Alert { key: string;               // `<rule>:<subject>`，去抖与列表 key（02 server / 03 AlertCard 共用）
  rule: string; level: 'error'|'warn'|'info'; subject: string; message: string; since?: string;
  count?: number;                                   // 同类合并计数（>1 时 UI 尾缀 ×N）
  evidencePath?: string;                            // 证据文件仓内相对路径（看板 FileDrawer 打开）
  action?: { label: string; to: string } }          // 建议动作跳转
// ↑ 三方唯一 Alert 定义（2026-08-18 冲突 #4 裁定）：02/03 不得另设本地形状；UI 色档由 level 映射（error→danger/warn→warn/info→默认）

// state.ts
export const META_TRANSITIONS: Record<MetaStatus, MetaStatus[]>
export const BACKLOG_TRANSITIONS: Record<BacklogStatus, BacklogStatus[]>
export interface TransitionSpec { requiresReason: boolean; line: 'production'|'harness'; viaCommand: 'flip'|'promote'|'publish-done'|'sweep'|'apply'|'add' }
export function assertMetaTransition(from: MetaStatus, to: MetaStatus): TransitionSpec  // 非法抛 MediaError(E_ILLEGAL_TRANSITION)
export function assertBacklogTransition(from: BacklogStatus, to: BacklogStatus): TransitionSpec
export function legalNext(from: MetaStatus): MetaStatus[]
export function renderTransitionTable(): string          // media flip --help 的活文档
export function pickNext(backlog: Snapshot['backlog']): PickDecision   // next 与 promote --auto 共用

// writer.ts
export interface PlannedWrite { path: string; op: 'yaml-edit'|'file-write'|'jsonl-append'|'mkdir-copy';
  describe: string;                       // dry-run 人读输出
  fields: string[];                       // 点位清单（进 audit 与 --json writes）
  mutate?: (doc: Document) => void;       // yaml-edit：拿 parseDocument 结果做点位修改
  content?: string; from?: string }       // file-write/jsonl-append 用 content；mkdir-copy 用 from
export interface TxResult { ok: true; dryRun: boolean; writes: { path: string; fields: string[]; diff?: string }[]; alerts: Alert[] }
export function runTransaction(ctx: { root: string; consoleRoot: string; cmd: string; argv: string[];
  actor: string; dryRun: boolean }, plan: (snap: Snapshot) => PlannedWrite[]): TxResult
```

**meta 迁移表**（state.ts 唯一真相源；忠实转写拍板 §5.1，实现时逐格对照）：

| from \ to | drafting | review | approved | scheduled | published | retro_done | rejected |
|---|---|---|---|---|---|---|---|
| ideated | ✓ | — | — | — | — | — | — |
| drafting | — | ✓ | — | — | — | — | — |
| review | ✓(打回) | — | ✓ | — | — | — | ✓(须 reason) |
| approved | ✓(审批后反悔，2026-08-18 增补) | — | — | ✓(publish-done) | ✓(publish-done，直达) | — | — |
| scheduled | — | — | — | — | ✓(publish-done) | — | — |
| published | — | — | — | — | — | ✓(治理线唯一迁移) | — |
| rejected | ✓(人决定重做) | — | — | — | — | — | — |
| retro_done | 终态（人工恢复可见性翻回 published 属人工例外，不进迁移表，见 §4 Q2） | | | | | | |

backlog 迁移表：`idea→picked`(promote)、`picked→published`(publish-done)、`idea→expired`(sweep)、`idea→archived`(apply)、`idea→rejected`(预留，现无命令触发)。其余全拒。

### 2.15 yaml Document API 写法约定（writer 硬纪律）

拍板 §4 的落地细则，写进 core 包 CLAUDE.md 并由往返测试强制：

1. **只走 `parseDocument`，永不 `parse`+`stringify` 整篇重写**；`doc.toString()` 统一传 `{ lineWidth: 0 }`（禁折行重排——backlog 长 URL / 长 reason 都不许动）。
2. **改值不换节点**：定位到目标 `Scalar` 后改 `node.value`，节点自身的 `comment` / `commentBefore`（终检记录、取题说明全活在这里）自动原位保留。禁用「删 Pair 再 addIn」的写法——那会丢注释。
3. **追加注释留痕**：sweep/apply/promote 的留痕 = 读出 status 值节点现有 `comment`，字符串拼接后写回同一属性；不新建注释节点。
4. **新增键**（如 `timestamps.scheduled` 不存在时）：`doc.addIn(['timestamps'], doc.createPair('scheduled', now))`，插入位置按状态机顺序放在相邻键后（保持 timestamps 块可读顺序）。
5. **backlog 条目定位**：`doc.getIn(['topics'])` 拿 `YAMLSeq`，遍历 items 按 `get('id')` 匹配——禁止按数组下标定位（条目物理位置无语义，对齐 backlog 头注释「不靠物理位置」原则）。
6. **append 新条目**：`seq.add(doc.createNode(topicObj))`，flow 风格字段（`scores: {…}`）用 `flow: true` 显式声明，与既有条目风格一致。
7. **每条写命令的白名单**：`PlannedWrite.fields` 即该命令允许改动的点位清单；round-trip 测试断言 git diff 变更行 ⊆ fields 对应行（±注释追加行）。

### 2.16 测试策略

一句话：真实文件当 fixture（拍板 §8），node 内建 test runner 跑，两类测试保两条命门（注释不丢、状态机不歪）。

| 项 | 定稿 |
|---|---|
| 跑什么 | **vitest**（2026-08-18 用户拍板，推翻本方案原定 node:test + tsx——全 monorepo 统一跑器，workspaces 多项目自动发现 + watch/覆盖率开箱，验收 subagent 一条 `npm test` 全仓可判）；根 `vitest.config.ts` 以 `projects: ['packages/*']` 发现各包 `*.test.ts`；devDeps `vitest` + `typescript`（root 统一装，基建已预置） |
| fixtures | `packages/core/test/fixtures/` = 真实文件快照拷贝：grok-build-teardown meta.yaml（注释最重的一份）、backlog.yaml 全量 1038 行、dashboard.md、index.jsonl；外加三个历史事故重演 fixture：EP04 scheduled 超时、meta 翻了 backlog 没翻（双层不同步）、published 无链接（拍板 §8 点名） |
| YAML 注释往返测试（两层） | ①「零改动往返」：全部 fixture `parseDocument(raw).toString({lineWidth:0}) === raw` 字节级断言——先探明 yaml 库对本仓真实样式的保真度（不一致即 M1 第 4 步的第一个要修的问题，见 §4 风险 R1）；②「单点改动 diff 白名单」：对每条写命令，fixture 副本上执行 → 行级 diff → 断言变更行集合 ⊆ 该命令 fields 白名单（含允许的注释追加行），diff 里出现任何白名单外的行 = 红 |
| 状态机迁移表测试 | 表驱动穷举：meta 8 状态 ×8 目标 = 64 格逐格断言 `assertMetaTransition` 通过/抛错与 §2.14 表一致；backlog 6×6 同法；另测 `requiresReason`（review→rejected）与 `line`（published→retro_done = harness）标记 |
| 事务测试 | 临时目录复制 fixture 仓 → 跑真实 CLI（`execFile(node, [dist/index.js, …])`）→ 断言：成功路径 diff 白名单 + audit 行 + dashboard 机器区更新；失败注入（非法迁移 / id 不存在 / 锁被占）→ 断言整仓零 diff + 退出码正确 |
| check 回归 | 三个事故 fixture 各自必须触发对应 CHK 规则（拍板 §8「各造一个 fixture」原文） |
| 协议样例 | `--json` 输出对 §2.1~2.13 示例做结构断言（键存在性，不断言具体值）——server 动作层（02 方案）消费的就是这个契约 |

### 2.17 仓库初始化与构建

| 项 | 定稿 |
|---|---|
| git | `tools/console/` 内 `git init` 独立仓（拍板 §3）；**先**在主仓 `.gitignore` 追加 `tools/console/` 与 `.media.lock`，**再** init（防主仓意外 track）；console 仓自带 `.gitignore`：`node_modules/ dist/ logs/` |
| workspaces | 根 `package.json`：`"private": true, "workspaces": ["packages/*"]`；包名 `@console/core`、`@console/cli`（cc-stream/server/ui 由 02/03 方案自建，命名同前缀） |
| Node 基线 | `"engines": { "node": ">=20" }`（本机 v24）；ESM（`"type": "module"`） |
| tsconfig | 根 `tsconfig.base.json`：`strict: true, module/moduleResolution: NodeNext, target: ES2022, declaration: true`（ui type-only import 需要 .d.ts，总览契约 6）、`composite: true`；各包 tsconfig extends + project references（cli → core） |
| 依赖 | core: `yaml`；cli: `commander` + `@console/core`（版本写 `"*"`——2026-08-18 验收更正：`workspace:*` 是 pnpm/Yarn Berry 协议，npm workspaces 不支持，实测 EUNSUPPORTEDPROTOCOL）。到此为止（拍板 §3「依赖极简」）；新增依赖回拍板文档记录 |
| 包边界 | core `package.json` `exports`：`"."` 导出只读面（types/snapshot/alerts/state），`"./writer"` 单独导出——cli 是唯一 import `@console/core/writer` 的包，server 包 lint 规则禁该路径（02 方案落地，本文提供隔离点） |
| 构建 | `tsc -b`（项目引用增量构建）；根 scripts：`"build": "tsc -b"`、`"test": "vitest run"`；不引打包器——CLI 冷启动 ~100ms 量级已满足飞书 3 秒窗（拍板 §6.1 第 3 条），无 bundle 必要 |
| bin 链接 | cli `package.json`：`"bin": { "media": "./dist/index.js" }`（dist/index.js 首行 shebang `#!/usr/bin/env node`）；`cd packages/cli && npm link` 挂全局 PATH；各 SKILL.md 同时写死绝对路径兜底：`node /Users/yedizhang/yedi-study/douyin-media/tools/console/packages/cli/dist/index.js <args>`（拍板 §6.1 第 1 条，防定时 agent PATH 差异） |
| 运行时文件 | 锁：`<root>/.media.lock`（主仓根，已 gitignore）；审计：`tools/console/logs/audit.jsonl`；均由首次写命令自动创建 |

---

## 3. 对外契约

### 3.1 本部分提供给其他部分

| 消费方 | 契约 | 说明 |
|---|---|---|
| server（02） | `buildSnapshot(root)` / `computeAlerts(snapshot, now, cfg?)` + 全部类型 | core 只读面（`@console/core` 主导出）；server 的读 API 与 10min tick 直接调用（后端方案 §4） |
| server（02） | `media` CLI 白名单命令 + `--json` 信封 + 退出码表（§2.0） | 动作层 `execFile("media", [...])` 的全部接口；dry-run 输出即变更预览（后端方案 §5）；server 需注入 `MEDIA_ACTOR` 与 `PIPELINE_REPO_ROOT` |
| server（02） | `harness/logs/metrics.jsonl` 行 schema（§2.13） | 看板 P6 唯一数据源（拍板 §11.4）；server 只读 |
| server（02） | `tools/console/logs/audit.jsonl` 行 schema | `{ts,actor,cmd,argv,result,files:[{path,fields}],summary}`；写路径唯一性的证据源（总览 M2 出口） |
| ui（03） | `Snapshot`/`Alert` 等类型 type-only import（总览契约 6） | 靠 `declaration: true` 产出的 .d.ts |
| 全部 | dashboard.md 机器区标记协议（§2.12 三区名） | 人与 CLI 的分界线 |
| feishu-bot / 各 skill | `media` 全局 bin + 绝对路径兜底（§2.17） | 拍板 §6 融合表的替换目标 |

### 3.2 本部分依赖其他部分

| 依赖 | 内容 |
|---|---|
| 无代码依赖 | core/cli 不依赖 cc-stream/server/ui（后端方案 §4 硬边界：cli 不 spawn CC） |
| 02 方案配合 | server 包内 lint 禁 `@console/core/writer` import（隔离点本文提供，规则落在 02）；`POST /api/actions/*` 与 CLI 命令 1:1 映射表以 §2.0 白名单为准 |
| 主仓文件现状 | `content/_template/` 骨架、backlog.yaml 头部 `next_up` 字段、`4-publish.md` 物料惯例——promote/publish-done 的输入前提，第 8~10 步切写点时逐一核对 |

---

## 4. 风险与待定项

### 风险

| # | 风险 | 对策 |
|---|---|---|
| R1 | `yaml` 库对本仓真实文件的「零改动往返」可能不保字节一致（个别标量样式/缩进被规范化），动摇「diff 只含目标字段」承诺 | M1 第 4 步第一件事就是对全部真实文件跑零改动往返测试探明；有出入先调 `toString` 选项（lineWidth/缩进）压平，压不平的样式差异在首次全量重写时一次性「洗版」并人审 diff——洗版后往返即稳定。洗版需人审通过才落，不算破例 |
| R2 | 迁移期双写路径并存（第 8~10 步之间部分 skill 已切、部分未切）正是拍板 §9 点名的新事故源 | 三个切换步骤压缩在连续三天内完成；期间每天人工跑一次 `media check`；audit.jsonl 与 git log 差集 = 未切干净的入口清单 |
| R3 | dashboard.md 首次改造（插标记、划区）是一次性人工手术，切错一行即吃掉人写区历史 | 改造前 git commit 存档；`rebuild --dry-run` 先空跑对照；`E_NO_MARKERS` 校验防标记残缺时的破坏性写入 |
| R4 | 定时 agent 环境无全局 PATH，`npm link` 失效则记账全线卡死 | SKILL.md 双写（bin + 绝对路径兜底，拍板 §6.1）；`media check` 进治理线日巡后，CLI 本身跑不起来会以任务失败形式上报 |
| R5 | 陈旧锁（进程被 kill 未释放）阻塞后续全部写命令 | 锁文件带 pid+ts；超过陈旧阈值（见 Q7）且 pid 不存活即抢占并在 stderr 告警 + audit 记一笔 |

### 待定项（2026-08-18 已全部拍板，销账记录）

| # | 待定项 | 原临时处理 | 拍板结论（2026-08-18） |
|---|---|---|---|
| Q1 | `approved` 之后人反悔是否开 `approved→drafting` 迁移（拍板 §5.1 原图无此边） | 不开，反悔人工处理 | **开**。已回记拍板 §5.1 并进 §2.14 迁移表；场景 = 看板审批通过后反悔改稿 |
| Q2 | retro_done 翻回 published 重开复盘窗口是否给 CLI 开口子 | 不含此边，人工编辑 | **不开**，维持人工编辑——罕见场景不值得增加状态机复杂度 |
| Q3 | `media next` 同分同赛道次级排序 | created 早者优先→id 字典序 | **按预设** |
| Q4 | `backlog add` 撞车判定阈值 | 30 天窗 tags 交集 ≥2 默认拒收；无 tags 退化比对 | **按预设**（`DEDUP_CFG` 常量，可后调） |
| Q5 | merge 是否吸收被并条目的 links/alt_titles 进目标条目 | 只动被并条目 | **允许**：照人审通过的 proposal 照单吸收（§2.10 与 JSON 示例已改） |
| Q6 | check 时间阈值默认值（scheduled 24h / review 48h / CHK-08 时点） | 按默认实现 | **按预设**（`DEFAULT_ALERT_CFG`，可后调） |
| Q7 | 锁文件位置与陈旧锁抢占阈值 | `<root>/.media.lock`、30s | **按预设** |
| Q8 | dashboard「待人确认」表首次改造的逐行归区清单 | 逐行列清单请用户过目 | **维持流程**：M1 第 4 步实施时出逐行清单、人审通过后动手——全方案包唯一保留的人审项 |
| Q9 | `metrics record` 的 data 建议键表归属 | douyin-retro SKILL.md、CLI 只透传 | **SKILL.md**（同一规则只写一处；第 10 步已同步接线 metrics record 调用） |
