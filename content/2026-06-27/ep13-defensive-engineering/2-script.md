# EP13 口播稿 · Anthropic 工程师的防御性编程，变态到什么程度

> 唯一真相源（字幕 / 配音 / 画面三方以此为准）。
> 系列：claude-code-source-series s3e13 ｜ backlog: 2026-06-10-013
> 源码仓：/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main
> 结构：盘点（5 → 1 倒数）。每句技术结论的出处见文末「逐条溯源」。结尾钩对齐 EP14（缓存失效检测）。

---

## 章节与分段（与 build/src/chapters 一一对应）

### coldopen · 什么叫生产级代码

1. 什么叫生产级代码？我把 Claude Code 源码里专门"防自己出错"的那些代码翻了一遍，密到让我有点意外。

2. 今天就盘点五个最变态的防御设计，从第五名倒着数。每一条，都是工程师在跟"万一"死磕。

### ranking · 盘点 5 → 1

1. 第五名，守护进程的三重保险。后台进程崩了它会自动重启，但既不傻等也不疯抢：间隔从 2 秒起步，每崩一次翻一倍，最高封到 2 分钟。

2. 更狠的是它会判断崩得正不正常：10 秒内就崩的算猝死，连续猝死 5 次直接放弃、不再重启；要是收到退出码 78 这个暗号，意思是"配置错了，重启也没用"，它当场停手。

3. 第四名，断线重连的一本密码本。WebSocket 每个断开码它都当暗号读：4003 是"永久拒绝"，直接不重连了，省得白费劲。

4. 4001 是压缩上下文时的临时抽风，给三次线性退避的重试机会；其它情况固定两秒一次、最多五次。同样是断线，它分三种情况区别对待。

5. 第三名，令牌续命的防穿越。它在令牌过期前 5 分钟就提前去换新的，而且每次换都盖一个"代数"编号上去。

6. 万一某个慢请求带着旧编号回来了，它一对比发现代数不是最新的，直接作废，绝不让旧令牌把新令牌覆盖掉。连换三次都失败，就彻底放弃、不再死磕。

7. 第二名，动手删东西之前的先验。它要把隔离任务的工作目录拼成一个路径，下手之前先死死盯着这个名字看。

8. 带"点点"想跳出目录的、夹了非法字符的、超过 64 个字符的，全部当场抛错、根本不往下走一步。原则就一句：名字有一丝可疑，宁可报错也绝不动手，免得手一滑删错地方。

9. 第一名，也是我最服的：省钱系统给自己上的熔断。它自动压缩上下文来帮你省钱，可万一压缩它自己连续失败呢？

10. 连续失败三次，它直接停止再试。源码注释里还附了真实数据：曾经有一千多个会话连续失败 50 次以上，最狠的一个崩了三千多次。一个为省钱而生的系统，绝不能自己变成烧钱的黑洞。

### ending · demo 和产品的距离

1. 盘到这你会发现，业余代码处理的是"正常情况"，生产代码处理的全是"万一"。demo 和真正产品之间的距离，就藏在这些你几乎永远跑不到的分支里。

2. 防御做到这份上其实还没完。下一集更精细：缓存崩了，它甚至能精确告诉你是哪个工具干的。评论区也出个题，你写过最"过度防御"的代码，是什么样的？

---

## 逐条溯源（fact check，全核于 source_repo，行号会漂移以锚点为准）

- **#5 守护进程三重保险**：`src/daemon/main.ts`。`BACKOFF_INITIAL_MS = 2_000`、`BACKOFF_MULTIPLIER = 2`、`BACKOFF_CAP_MS = 120_000`（main.ts:20-22）→ 退避「2 秒起步、翻倍、封顶 2 分钟」属实；指数退避 `backoffMs = Math.min(backoffMs * BACKOFF_MULTIPLIER, BACKOFF_CAP_MS)`（main.ts:423-426）。猝死判定 `runDuration = Date.now() - worker.lastStartTime; if (runDuration < 10_000)`（main.ts:393-394）→「10 秒内崩算猝死」属实；`MAX_RAPID_FAILURES = 5`，`failureCount >= MAX_RAPID_FAILURES` 则 `worker.parked = true`（main.ts:23,397-401）→「连续猝死 5 次放弃」属实。退出码 `EXIT_CODE_PERMANENT = 78`（main.ts:15；`workerRegistry.ts:15` 注「EX_CONFIG from sysexits.h」），`if (code === EXIT_CODE_PERMANENT) { … parking }`（main.ts:385-390）→「退出码 78 = 配置错、重启没用、当场停手」属实。跑够 10 秒会重置计数 `failureCount = 0`（main.ts:404-407）。
- **#4 断线重连密码本**：`src/remote/SessionsWebSocket.ts`。`PERMANENT_CLOSE_CODES = new Set([4003 /* unauthorized */])`，命中即 `Permanent close code … not reconnecting`（SessionsWebSocket.ts:34-36,247-251）→「4003 永久拒绝、不重连」属实。`4001`（session not found）注释「can be transient during compaction」，`MAX_SESSION_NOT_FOUND_RETRIES = 3`，重连延迟 `RECONNECT_DELAY_MS * this.sessionNotFoundRetries`（线性，SessionsWebSocket.ts:21-26,255-269）→「4001 压缩时临时抽风、线性退避重试 3 次」属实。其它断线：`RECONNECT_DELAY_MS = 2000` 固定、`MAX_RECONNECT_ATTEMPTS = 5`（SessionsWebSocket.ts:17-18,276-282）→「固定两秒一次、最多五次」属实。**注**：plan 原写「其它指数退避」，源码实为**固定 2 秒**（非指数），口播已据源码改为「固定两秒一次、最多五次」。
- **#3 令牌防穿越**：`src/bridge/jwtUtils.ts` `createTokenRefreshScheduler`。`TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000`（jwtUtils.ts:52）→「过期前 5 分钟提前换」属实。每会话一个代数计数 `nextGeneration()`（jwtUtils.ts:91-99），`doRefresh` 内 `if (generations.get(sessionId) !== gen) { … stale … return }`（jwtUtils.ts:177-182）→「带旧编号回来、代数不是最新就作废、防旧令牌覆盖新令牌」属实（注释「Bump generation to invalidate any in-flight async doRefresh」jwtUtils.ts:121,233）。`MAX_REFRESH_FAILURES = 3`，`if (failures < MAX_REFRESH_FAILURES)` 才重试、否则放弃（jwtUtils.ts:58,186-205）→「连换三次都失败就彻底放弃」属实。
- **#2 删东西前先验**：`src/utils/worktree.ts` `validateWorktreeSlug`。注释「Validates a worktree slug to prevent path traversal and directory escape … joined into `.claude/worktrees/<slug>` via path.join … Throws synchronously — callers rely on this running before any side effects」（worktree.ts:52-66）→「下手前先校验名字、副作用前同步抛错（fail-closed）」属实。`'.'`/`'..'` 段拒绝（worktree.ts:75-80），允许集 `VALID_WORKTREE_SLUG_SEGMENT = /^[a-zA-Z0-9._-]+$/`、不合规段抛错（worktree.ts:48,81-84），`MAX_WORKTREE_SLUG_LENGTH = 64`、超长抛错（worktree.ts:49,67-72）→「带点点跳目录的、夹非法字符的、超 64 字符的全部当场抛错」属实。「免得手一滑删错地方」=对应「path traversal/directory escape」的口语化（工作目录清理走 `git worktree remove --force <worktreePath>`，worktreePath 由该 slug 拼成，worktree.ts:843-846；slug 不校验则路径可越界），属合理类比、非臆造。**注**：plan 原写「30 天清理 + 查 git 状态」，本仓 worktree.ts 未见该逻辑，已**剔除不编造**，#2 改写为已核实的 slug 同步校验 / fail-closed。
- **#1 省钱系统熔断**：`src/services/compact/autoCompact.ts`。`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3`（autoCompact.ts:99），字段注释「Consecutive autocompact failures. Reset on success. Used as a circuit breaker to stop retrying」（autoCompact.ts:56-59）→「连续失败 3 次直接停止再试、成功则归零」属实。真实数据来自源码注释「BQ 2026-03-10: 1,279 sessions had 50+ consecutive failures (up to 3,272)」（autoCompact.ts:97-98）→「一千多个会话连续失败 50 次以上、最狠崩了三千多次」属实（3272 口语化为「三千多次」）。autocompact 自动压缩上下文以守住上下文窗口、降低 token 用量 →「省钱系统」是对其降本作用的口语化框定，非营销承诺/非跑分。
- **结尾钩对齐 EP14**：日更按 episode 升序，下一集 EP14「Prompt 缓存崩了，它能告诉你是哪个工具干的」（backlog 2026-06-10-014）。结尾钩「缓存崩了它能精确告诉你是哪个工具干的」对齐 EP14 主题，不剧透实现、不依赖本集上文。
- **冷开自成立**：首句「什么叫生产级代码？」自带完整语境（设问钩），第一次刷到的人 3 秒站得住，不依赖「上一集」。
- **合规**：源码仓为社区反编译/重建版（措辞已注意，未声称官方原始仓）；所有数字（2 秒/2 分钟/10 秒/5 次/退出码 78/4003/4001/3 次/2 秒/5 次/5 分钟/64 字符/50 次/3272 次）均来自源码常量或源码注释，无臆造跑分；「最变态/最服/更狠」是口语态度词非数据；无违禁词、无绝对化（「最」用于盘点名次/态度，非「最/第一/100%」式商品化绝对承诺）、无口播导流。
