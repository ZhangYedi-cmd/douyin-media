# 05-实施计划（Codex 多 agent 分工）

> 日期：2026-08-18｜前提：方案包 v0.2 零悬案（01-04 已裁决销账）
> 本文角色：**只管分工、依赖、交接、验收与红线**。「怎么做」的全部细节住 01/02/03 执行方案，本文一律引用步骤号不复述（防漂移铁律）。执行 agent 若发现文档间冲突：**停下报告，不自行变通**。

## 1. 分工总表（五个工作包）

| 包 | 职责一句话 | 契约（唯一真相源） | 目录白名单（只准动这些） | 上游依赖 |
|---|---|---|---|---|
| **A｜core + media CLI** | tools/console 仓奠基 + core 全部 + `media` 13 命令 + 测试 | 01 执行方案 **第 1-7 步** + §2/§3 | `tools/console/`（根 + packages/core + packages/cli）；主仓仅 `.gitignore` 追加与 `dashboard.md` 三区标记手术（见 §5A 人审闸） | 无（关键路径起点） |
| **B｜cc-stream** | 无头 CC 观察器零依赖叶子包 | 02 执行方案 **S1-S2** + 后端拍板 §7 | `tools/console/packages/cc-stream/` | A 第 1 步（workspaces 骨架，仅目录） |
| **C｜server** | 读 API + SSE + 动作层 + job runner + 运行时 | 02 执行方案 **S3-S7** + §2 | `tools/console/packages/server/` + `tools/console/start.sh` + launchd plist | A 第 1-4 步（S3 起）；A 第 7 步（S4 起）；B 全部（S5 起） |
| **D｜ui** | 六页看板前端 | 03 执行方案 **S1-S11** + §2/§3 | `tools/console/packages/ui/` | A 第 1 步（S1/S3 即可开工）；C S3-S5（S2、S4 起）；C S7（S11） |
| **E｜存量迁移与收口** | 主仓 6 个写入口切 `media`、飞书回调切 :5170、文档降级 | 01 执行方案 **第 8-11 步** + 02 执行方案 **S8** + CLI 拍板 §6/§9 | 主仓：`.claude/skills/*/SKILL.md`、`pipeline/*.md`、`tools/feishu-bot/`、`harness/tasks.md`、`CLAUDE.md`、`content/_backlog/backlog.yaml` 头注释 | A 全部（第 8 步起）；C S5+S7 跑稳（S8 起） |

包与包互不越界：**tools/console 内一包一主**；主仓文件全归 E（A 的两处例外见白名单）。同文件的跨包改动（如 `tools/feishu-bot/server.py` 被 E 第 9 步和 S8 两轮改）由波次串行化解，绝不并行。

契约文档优先级（2026-08-18 B 包验收补记）：同一事实在「执行方案（怎么做）」与「拍板（为什么）」表述不一致时，**执行方案优先**——拍板是决策记录不做文件级切分，执行方案是其落位精化；仅当二者语义真矛盾（非精化关系）才算冲突，停下上报。

## 2. 波次与合流闸口

```
W1  ┌ A：第 1 步（骨架与测试基建已预置，见 §7——只剩 cli bin 与 tsc 构建链）→ 第 2-7 步
    ├ B：S1-S2                    （骨架已就绪，立即可开工）
    └ D：S1、S3                   （同上，可选提前量）
G1  A 验收（M1 出口 + 第 6/7 步测试全绿）＋ B 验收
W2  ┌ C：S3 → S4 → S5/S6 → S7
    ├ E：01 第 8 → 9 → 10 步     （切 SKILL 与 feishu set_status）
    └ D：S2（等 C S3）
G2  C 各步验收标准全过 ＋ E 的 M2 出口（audit.jsonl 可证写路径唯一）
W3  ┌ D：S4-S11（逐页，顺序 P1→P3→P4→P5→P2/P6）
    └ E：02 S8（飞书回调切 :5170，含回滚演练）→ 01 第 11 步（文档降级 + check 日巡注册）
G3  终验（见下）
```

**G1**：01 表「M1 出口」原文 + 第 6/7 步验收；`media check` 在真实仓通过、YAML 往返测试字节级全绿。
**G2**：02 S3-S7 各行验收标准逐条过（含 kill -9 重启降级回答、并发双击 409）；01 「M2 出口」（7 天窗每次状态变更均有 audit 行——此项为持续观察，闸口时点验一次抽查即可）。
**G3 终验**：① 03 S11 的 M4 出口（关 vite dev，单端口 5170 出整站六页）；② 用 `content/_test` 条目在浏览器走一遍「审核打回 → rework job → SSE 里程碑 → meta 复核」全链路；③ S8 回滚演练做过一次；④ `media check` 绿；⑤ 01 第 11 步验收（状态机规则 grep 全仓仅 `core/state.ts` 有定义原文）；⑥ `e2e/` midscene 用例池取消 skip 且全绿（六页各至少一条自然语言断言用例，前置见 `tools/console/e2e/README.md`）。

## 3. 全局红线（每个 agent 的提示词必须附带）

1. YAML 写入只准 `yaml` 包 Document API 点位编辑；禁 js-yaml、禁整文件重序列化（CLI 拍板 §4）。
2. 状态写入唯一入口 = `media`。除 core/writer.ts 本体外，任何代码、任何 agent 不得直接编辑 `content/**/meta.yaml`、`backlog.yaml` 状态字段、`dashboard.md` 机器区；测试一律用 fixture 副本仓。
3. **禁真发抖音**：sau 只许 `--dry-run`；发布 job 的验收只走拒绝路径（非 approved → 409）。
4. spawn `claude -p` 的子进程环境必须剔除 `ANTHROPIC_API_KEY`（后端拍板 §6 坑 1）。
5. 文件落盘一律 temp-then-rename 原子写。适用对象是状态/配置类「读-改-写」整文件；契约明文 append-only 的日志流（audit.jsonl、logs/jobs/*.jsonl、原始事件落盘）按 append 语义，不在此列（2026-08-18 B 包验收裁断）。
6. 新增 npm 依赖必须先回对应执行方案的依赖表登记理由，再安装。
7. server 及其测试禁 import `@console/core/writer`（深路径同禁）；ui 对 core/server 仅 type-only import。
8. 只 commit 自己白名单内的文件，小步提交；tools/console 是独立 git 仓（已 init），主仓提交信息统一前缀 `migrate:`。
9. **入库关键词安全闸（信息安全，违者删仓重建）**：主仓与 `tools/console` **都有 GitHub remote**，两仓入库内容（代码、注释、文档、commit message、git 作者身份）**禁出现公司内部标识**——封禁清单不在任何入库文件落全字，唯一权威定义 = `tools/console/scripts/guard-keywords.mjs` 的拆片构造（覆盖：公司两大主品牌词、点评品牌词、内部模型网关服务名、内部前端 npm scope）。内部域名、密钥、内部项目路径一律只住 gitignored 的 `e2e/.env.e2e`。console 仓 `npm test` 前置 guard 强制扫描（含 git 身份检查）；两仓推送前都须以同一脚本扫一遍；git 身份用 GitHub 邮箱，勿用 corp 邮箱。**一旦发现敏感词已进 commit：删 .git 重建历史（或未推送时 rebase 掉），不做已推送后的 commit 整改**（安全扫描不认改写）。

## 4. 交接物（跨包接口的物理形态）

| 交接物 | 产出方 → 消费方 | 时点 |
|---|---|---|
| workspaces 骨架（5 包目录 + tsconfig.base + npm test 可跑） | A → B/C/D | A 第 1 步完成即通报 |
| core 只读面导出清单（`@console/core` 的类型名 + 函数签名，Snapshot/Alert/MetaStatus/BacklogTopic/buildSnapshot/computeAlerts…） | A → C/D | G1 时随验收报告给出 |
| `media` bin（npm link + 绝对路径 `node tools/console/packages/cli/dist/index.js`） | A → C/E | G1 |
| cc-stream 导出面（runHeadlessCC/parseStream/createNormalizer/createMilestoneEngine + NormEvent 6 型） | B → C | G1 |
| `packages/server/src/api-types.ts`（Job 等 API 层类型宿主） | C → D | **C 开工第一件事，单独 commit 即通报**（D 的 S2 等它） |
| server 起在 5170 + `.runtime/token` | C → D/E | S3 后（D 联调）；S7 后（E 的 S8） |
| 测试型 job（无害 prompt 全链路样例） | C → D | S5 后（D 的 S5 验收要用） |

## 5. 各包特别注意（执行方案之外的编排级事项）

**A**：
- 第 4 步的 `dashboard.md` 三区标记改造是**唯一人审闸**（2026-08-18 裁决 Q8）：先产出「逐行归区清单」（哪些行进 auto:wip/backlog/alerts 机器区、哪些留人写区）**停下交用户过目**，批准后才动 dashboard.md。
- 第 1 步的骨架、测试基建、主仓 .gitignore 均已预置（§7，含首个 commit）；你只需补 cli bin 链接与 `tsc -b` 构建链，然后过第 1 步验收标准。五包的占位 `src/index.ts` 与冒烟测试由各包负责 agent 替换。

**B**：
- 首个 fixture 直接取现成探测产物：`/Users/yedizhang/.claude/projects/-Users-yedizhang-yedi-study-douyin-media/2753f5fd-3b0b-4426-9427-b37540a84fd2/tool-results/b9a25f4kh.txt`（2026-08-18 实测，Claude Code 2.1.234，31KB），拷入 `fixtures/2026-08-18-claude-2.1.234.jsonl`。文件若已不存在或环境跑不了 `claude -p`（S2 的 capture 实跑验收项），标记「待人工」上报，不阻塞其余测试。

**C**：
- `api-types.ts` 先行（见 §4）。
- S5 验收的 rework 全链路用 `content/_test` 条目（不存在则从 `content/_template` 复制自建，用完删除）；publish 只验 precheck 拒绝。
- S8 不归你，归 E（你提供联调支持）；S7 的 launchd 常驻在 S5 验收后再切。

**D**：
- S1/S3 可在 W1 提前做（只依赖骨架）；S2 起必须有 C 的 S3。
- 视觉对照物 = `docs/design/` v2 原型六页（README 已划范围：review.html / harness-task-detail.html 是下一期，**不做**）。
- **W2（S2）开工首项 = 销账 lib/types.ts 临时镜像**（2026-08-18 D 验收交接）：删本地 MetaStatus/Alert 定义 → package.json 补 `@console/core` devDependencies → 改 type-only import → 立跑 `npm run typecheck -w @console/ui` 过闸（两边若已分叉让编译期报错而非继续掩盖）；同时把 FileTextResolverContext.Provider 在 ConsoleProvider/main.tsx 接上真实 apiGetText（忘接只在运行时抛错，列为 S2 检查项）。
- S11 落 ui CLAUDE.md 时补记两条豁免：moduleResolution:Bundler 的理由（vite 浏览器目标，verbatimModuleSyntax 仍继承生效，勿"纠正"回 NodeNext）；11px/10px 微排版是原型既有未 token 化特征（提议 --text-2xs 或明确豁免）。

**E**：
- `tools/feishu-bot/server.py` 你要改两轮：第 9 步（set_status → `media flip`，M2）与 S8（spawn → POST :5170，M3）——必须串行、各自独立 commit、各带回滚说明。
- 第 8 步验收依赖「下一次真实 daily-run」，属持续观察项：改完即报，验收在次个工作日回看 audit.jsonl。
- 第 11 步（文档降级）必须最后做：降级前确认 M3 已落地（依赖注记在 01 表内）。

## 6. 开工提示词（可直接粘贴给各 Codex agent）

> 通用头（每条提示词前都加）：
> 仓库根 `/Users/yedizhang/yedi-study/douyin-media`。方案包在 `docs/Iterative-spec/0818-看板工作台/`，先读 `00-执行版总览.md` 与 `05-实施计划-Codex分工.md`（分工、红线 §3、交接 §4、注意 §5、测试基建 §7、验收机制 §8），再读你的契约文档。文档是唯一契约；发现文档间冲突或契约未覆盖的决策点，停下报告，不自行变通。测试一律写 vitest（`npm test` 全仓可跑，§7）。完成后回报：做了什么 / 验收结果逐条 / 交接物位置 / 未决项——你的申报会交给独立验收 agent 逐条复核（§8），报喜藏忧只会在复验时暴露。

**→ Agent A**
```
你负责工作包 A（core + media CLI）。契约：01-CLI执行方案.md 第 1-7 步 + §2 §3 全文，
上游拍板 2026-08-18-流水线CLI技术方案.md。grounding 实物：content/2026-07-18/grok-build-teardown/meta.yaml、
content/_backlog/backlog.yaml、dashboard.md、tools/feishu-bot/meta.py。
只准动 tools/console/。仓骨架、vitest 基建、主仓 .gitignore 均已预置（05 §7），第 1 步只剩
cli bin 与 tsc -b 构建链。dashboard.md 改造前必须先产出逐行归区清单交人审（05 §5A）。
逐步走，每步验收标准过了再进下一步。
```

**→ Agent B**
```
你负责工作包 B（cc-stream）。契约：02-后端执行方案.md S1-S2 + 该文 cc-stream 章节，
上游拍板 2026-08-18-看板后端与CC进程调度技术方案.md §7。只准动 tools/console/packages/cc-stream/。
前置：A 的骨架已就绪。首个 fixture 来源与不可得时的处理见 05 §5B。
包内不得出现任何领域词（media/meta.yaml/发布）；零 npm 依赖，只用 node 内建。
```

**→ Agent C**
```
你负责工作包 C（server）。契约：02-后端执行方案.md S3-S7 + §2 全文（API 出参形状已是契约终稿，
逐字段照实现），上游拍板同文档。只准动 tools/console/packages/server/、tools/console/start.sh、
launchd plist。第一件事：落 api-types.ts 单独 commit 并通报（D 在等）。
S5 验收用 content/_test 条目走 rework 链路；publish 只验 precheck 拒绝路径，禁真发。
S8 不归你。红线 §3 全部适用，尤其 2/3/4/7。
```

**→ Agent D**
```
你负责工作包 D（ui）。契约：03-前端执行方案.md S1-S11 + §2 §3 全文，上游拍板
2026-08-18-看板前端技术方案.md。只准动 tools/console/packages/ui/。
视觉对照 docs/design/ v2 原型（六页范围，README 已标注 review/harness-task-detail 属下一期，不做）。
S1/S3 现在就能做；S2 起需要 C 的 server 起在 5170。依赖只装拍板 §1 清单四件；
数据获取只走 usePageData/useJob/useJobs，禁裸 fetch；色值只引 token。
```

**→ Agent E**
```
你负责工作包 E（存量迁移与收口）。契约：01-CLI执行方案.md 第 8-11 步 + 02-后端执行方案.md S8 +
CLI 拍板 §6 §9。只准动主仓迁移面（清单见 05 §1 白名单），不碰 tools/console 代码。
顺序铁律：第 8→9→10 步（需 A 完成）→ S8（需 C 的 S5+S7 跑稳）→ 第 11 步（最后做）。
server.py 两轮改动串行、各自独立 commit、各带回滚说明；S8 要做一次回滚演练。
每切一个入口跑一次 media check。
```

## 7. 测试与验收基建（2026-08-18 已预置，首两个 commit）

| 层 | 是什么 | 状态 |
|---|---|---|
| 单元/集成 | **vitest 4**（用户拍板，推翻 01 原定 node:test + tsx，已回记 01 §测试）。根 `vitest.config.ts` 以 `projects: ['packages/*']` 自动发现各包 `*.test.ts`；仓根 `npm test` 一条命令全仓可判 | ✅ 5 包冒烟全绿 |
| 验收 e2e | **Playwright 1.62 + @midscene/web 1.10**（`tools/console/e2e/` 工作区，chromium 已装）。AI 断言对照 v2 原型；报告落 `e2e/midscene_run/report/`（可回放 HTML） | ✅ 骨架可跑（用例池 skip 待 G3 启用） |
| 模型配置 | 内部 OpenAI 兼容网关——域名、密钥、蓝本项目出处**全部只住** `tools/console/e2e/.env.e2e`（gitignored 本地文件，本机已配好并实测无缺失；新环境照 `.env.e2e.example` 填）。三条实战教训已固化进 env.ts/README：FAMILY 必填防定位偏移 / 请求级超时 60s 防挂死 / midscene 不支持 Claude 系模型 | ✅ 实测无缺失 |

约定：各包占位 `src/index.ts` + 冒烟测试由负责 agent 以真实实现替换；e2e 用例按闸口/页面拆文件（详见 `e2e/README.md`）；`.env.e2e` 含密钥永不入库。

## 8. 完成即验收：每包独立验收 subagent

每个工作包申报完成后，**派发一个全新上下文的验收 agent**（非原实现者）做逐条复核；闸口 G1-G3 以对应验收报告齐备为开闸条件。

**验收动作四步**：① 跑 `npm test`（+ 该包契约里的验收命令，逐条执行取真实输出）；② 对照执行方案该包每一步的「验收标准」栏逐条判 PASS/FAIL；③ 功能×文档对照——契约 §2 详细设计逐条在代码里找到落点（缺=FAIL，多出未登记的=记偏差）；④ 红线抽查（§3 第 1/2/6/7 条均为 grep 可判项）。

**裁决规则**：输出 = PASS / FAIL + 逐条差异表。FAIL → 打回原实现 agent 修复 → 复验，**至多 2 轮**，仍 FAIL 上报用户裁决。验收 agent 只判不改（无写权限更佳）。D 的页级验收另需在 `e2e/` 为该页补一条 midscene 用例并跑绿（server 未起时标注「待 G3」）。

**验收 agent 通用提示词**（按包参数化）：

```
你是工作包 <X> 的独立验收员，只判不改。仓库根 /Users/yedizhang/yedi-study/douyin-media。
先读 docs/Iterative-spec/0818-看板工作台/05-实施计划-Codex分工.md（§3 红线、§7 基建、本 §8），
再精读 <X> 的契约：<契约文档与章节>。被验对象：<目录白名单> 下的代码与实现者的完成申报。
逐条执行：契约中该包每一步的「验收标准」栏（命令真跑、输出留证）；契约 §2 详细设计逐条在代码
中找落点；红线 §3 第 1/2/6/7 条 grep 抽查。产出验收报告：总判 PASS/FAIL + 表格（契约条目 /
预期 / 实测 / 判定），偏差处引用文档章节号与代码行号。不修任何代码；发现契约本身的矛盾单独列出。
```
