# 开源 skill 实现盘点与派工

`.claude/skills/` 下 12 个 skill，10 个自研、2 个第三方（`jianying-editor`、`web-video-presentation`）。
`baoyu-image-gen` 不在这个仓里，是仓外全局 skill，**讲实现时不许选它**，讲不出可复现的细节。3.1 现在把它当「生产线依赖了仓外能力」的例子提了一句，保持原样。

## 一、值得展开讲实现的五个，以及各自归谁

按「实现深度」减去「课程已覆盖深度」的落差排序。

### 1. feishu-notify → 落 7.3，部分素材可给 6.3

**落差最大的一个。** SKILL.md 205 行，是 12 个里唯一系统处理了并发、超时窗口、幂等的。课程目前只用了它的卡片文案。

要讲的：

- **3 秒响应窗口逼出的同步异步切分**。飞书卡片回调超时报 `-356`，所以 handler 只在窗口内 return（`resp.card` 是响应体原子更新卡片，零额外 HTTP），`build_payload`、`claude -p`、乃至冗余的 `update_card` PATCH 全甩 threading 异步。要讲清楚为什么 PATCH 不能塞进同步路径（新建 client 取 token 加 PATCH 是两次串行网络调用）。
- **两套幂等锁的取舍**。默认路径靠 console job runner 的 `409 JOB_DUPLICATE` 拒重复提交；回滚路径靠 `server.py` 自己的 `_publishing` set 加 lock。风险 SKILL.md 自己点破了：飞书会重投回调、人也可能连点，无锁则同条并发双发，而这是不可逆外发。
- **`REWORK_LIMIT(2)` 护栏**。理由是内容打回属主观反馈、没有客观收敛判据，所以不做无限重做。**7.2 讲重试还是该停时只用了 MiniMax 余额和抖音 cookie 两个例子，没用到这个**，正好补上第三种形态。
- **命名空间冲突那段诚实记录**。同一飞书应用被两条业务线复用，`card.action.trigger` 在多条长连接间负载均衡投递而非广播，导致互相截胡点击，解法是给 value 加 `ns` 字段过滤，并留了「长期 TODO：给抖音建独立飞书应用」。**临时省事方案与终态方案并存且写明了的记录，教学上很难得**，别改成好像一开始就设计对了。
- 顺带：子进程必须清掉 `ANTHROPIC_API_KEY`，否则 OAuth token 被当 API key 用导致静默失败。

**这个 skill 目录很薄，真身在仓库 `tools/feishu-bot/`。** 这种「skill 只做资产索引和闭环说明、代码住别处」的组织方式本身值得点一句。

### 2. dubbing-check → 落 7.1，`check-source-sync.mjs` 可分给 6.3

课程标题点了 Check，但目前唯一引用在 9.2，只用了 7 个检查点里的 1 个。

要讲的：

- **判断标准怎么从真实事故反推出来**。每条检查都配了具体阈值：`check-silence.mjs` 判段内超 0.45 秒的非句读静音；`check-pace.mjs` 明确区分真假离群，含英文词的段字面语速偏慢是统计假象不是真拖沓；`check-source-sync.mjs` 直接解析 `narrations.ts` 的字符串数组与 `audio-segments.json` 逐段比对。
- **exit code 即契约，但只有一部分脚本用**。**这条我原先写错了，已按源码更正**：真正用结果相关退出码的只有三个，`check-completeness.mjs`、`check-silence.mjs`、`check-source-sync.mjs`，写法都是 `process.exit(bad ? 1 : 0)`；`check-av-consistency.mjs` 和 `list-voices.mjs` 里的 `process.exit(1)` 是环境或前置条件失败，跟内容判断无关；`check-pace.mjs` 和 `check-pronunciation.mjs` 压根没有 `process.exit`。全场也没有任何一处 `exit(2)`。

  **这个分裂本身比「全都有退出码」更有教学价值**：哪条判断有资格翻转退出码替读者拍板，取决于这条判断的答案有没有商量余地。语速偏慢、读音存疑这类要人看一眼才能定，就不该硬退出。这正是 2.2 §2 那条判据往代码里再下一层。7.1 已按这个角度写了。
- **EP02 那个最贵的坑**：改了 narration 没重跑 extract-narrations，合成的是旧文案音频，连过两轮交审都没抓到，因为只验了画面没验声音。这是「具体事故变成具体检查项」最好的素材。
- SKILL.md 结尾那张贴工位的流程图，含返工代价说明（逐项返工录了 7 次以上）。

### 3. tts-dub → 落 2.2，与 7.x 的重试话题呼应

代码量小（168 行）结构完整，适合当课程里第一个「完整读一遍脚本」的素材。目前课程 0 次触及其实现。

要讲的：

- **provider 抽象**。`synthesize.mjs` 用 `await import(\`./providers/${cfg.provider}.mjs\`)` 动态加载，每个 provider 只实现同一个 `synthesize(opts)` 契约，换供应商不改主流程。SKILL.md 自己写的是「机制在脚本里，所有工程特定的值都在 config，换工程只改 config」。**这条要接 2.2 §2 已经立住的「答案有没有商量余地」判据，不许另起一套。**
- **重试焊在哪一层**。`minimax.mjs` 里三次指数退避（`800*attempt`），超限后抛汇总错误并截断到 200 字符防刷屏。关键是重试焊在 provider 脚本里，不是让 Agent 现场判断要不要重试。
- **增量执行**。主循环 `if (existsSync(out) && !force) { skip++; continue; }`，配 `--force` 全量重跑、`--only id1,id2` 精确重跑。

### 4. douyin-retro 的 `fetch.py` → 落 8.2

8.2 已是专篇但完全没碰这个脚本，补充成本最低。

要讲的：**退出码怎么表达发生了什么**。头部注释直接写「0 成功 / 2 cookie 失效 / 1 其它错误」，代码里 `sys.exit(2)` 专门区分认证失效，上游不解析文本只看退出码分流。另外零依赖手写 xlsx 解析（`zipfile` 加 `xml.etree.ElementTree`，不引 openpyxl）。

### 5. web-video-presentation → 落 2.2，`narrations.ts` 那条可给 6.2

第三方 skill（MIT，来自 `ConardLi/garden-skills`，`manifest.json` 的 homepage 可证），**讲的时候要说清楚哪部分不是自己写的**。

要讲的：

- **渐进披露落成文件的样本**。SKILL.md 451 行加 6 份 references 共 1571 行，中段一张表精确标注每份「必读 / 一次性看 / 按需查」，并写明长会话里 agent 容易遗忘原则、每次都要回看核心约束。2.2 第 15 行已经引过它当分层例子，但只列了文件名没展开这张表怎么设计的。
- **硬节点设计**。Checkpoint Plan 一次对齐五件事、Checkpoint Audio 决定是否合成音频，两处强制停，且给出总结模板骨架逼 agent 结构化汇报而不是自由发挥。
- **自检协议的降级设计**。Agent Teams → subAgent → 自检，按能力降级优先用更隔离的方式，并有铁律「直接拿原始结论汇报但不修复等于违规」。这是 2.3 那套分工判据的现成案例。
- **`narrations.ts` 是 step 数与音频合成的唯一真相源**，SKILL.md 写「这保证 5 处地方永远不会漂」。这条归 6.2。

## 二、不展开的，以及为什么

`account-audit`、`backlog-gardener`、`benchmark-refresher`、`harness-dispatcher`、`douyin-publish`、`douyin-ideate`：要么本身就是纯规则文档没有脚本可讲，要么课程已经讲够深了（`douyin-publish` 在 7.2、`account-audit` 与 `harness-dispatcher` 在 8.1 和 8.3）。继续展开边际收益低。

`jianying-editor`：182 个文件 4.9M，且与抖音口播图文这条业务线不搭，切入成本太高。**但它有一个独特价值**——它自己是 MIT 的独立开源项目，内部又 vendor 了 Apache-2.0 的 `pyJianYingDraft`，是「三方项目内部再套一层三方依赖」的复合案例。讲「怎么分清哪些代码是自己写的」时提一句即可，不展开。

## 三、一处零散但值得捡的素材

`benchmark-refresher` 的 SKILL.md 单开了一节「诚实的能力边界（先说清，免得假装）」，写明能验什么（跨平台账号、技术假设）、不能直接验什么（纯抖音账号活跃度，因反爬无读取通道），并要求报告里如实标盲区不编。

**这是「一个 skill 该怎么声明自己做不到什么」的样本**，课程目前没用过。适合放进讲内容红线或 8.2 讲复盘时的「能验 / 不能验」对照。
