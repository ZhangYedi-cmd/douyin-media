# EP11 口播稿 · claude --version 为什么 0 毫秒出结果

> 唯一真相源（字幕 / 配音 / 画面三方以此为准）。
> 系列：claude-code-source-series s2e11 ｜ backlog: 2026-06-10-011
> 源码仓：/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main
> 每句技术结论的出处见文末「逐条溯源」。结尾钩对齐 EP12（JS 直调操作系统底层 / FFI native）。

---

## 章节与分段（与 build/src/chapters 一一对应）

### coldopen · 查个版本号的差距

1. 同样是查个版本号，有的命令行工具卡你一秒，Claude Code 几乎是瞬间出结果。差距到底在哪？

2. 很多工具慢，是因为它一启动就把全部模块加载完，才回头看你要干嘛。活还没干，全家桶先搬上了桌。

3. Claude Code 反过来：入口的第一件事，是先看你要干嘛，再决定花多少力气去加载。

### layers · 三档快速通道

1. 你要的只是版本号？它直接打印、然后退出，一个多余的模块都不加载。源码里，这就是入口函数的第一个分支。

2. 你要跑 MCP server、后台 daemon 这种特殊模式？它只动态加载那一小块，用到啥才加载啥。整个入口，铺了十几条这样的快速通道。

3. 只有你真要进完整的交互界面，它才把全家桶搬出来。就像去便利店买瓶水，犯不着先把整个商场的灯全打开。

### details · 两个极致细节

1. 就算真要加载全家桶，它也不傻等。入口一启动，就并行去读配置、连系统钥匙串，跟模块加载同时进行，谁也不挡谁的路。

2. 还有个彩蛋：连遥测系统、那约 400KB 的依赖，都要拖到真正需要上报时才加载。初始化还包了一层记忆，调过一次就直接返回，绝不做第二遍。

### ending · 启动速度是架构出来的

1. 所以你看，启动快不是后期优化挤出来的，是架构里就定好的——快速路径，必须在第一行代码就分岔。先看需求，再花钱。

2. 软件层面抠到极致了，下集往下钻一层：JavaScript 凭什么能直接调用操作系统的底层接口。评论区也聊聊——哪个软件的启动速度，让你忍无可忍？点名它。

---

## 逐条溯源（fact check，全核于 source_repo）

- **--version 零模块快速路径**：`src/entrypoints/cli.tsx` `async function main()`（约 76 行起）第一个快速分支即 `--version`/`-v`/`-V`：注释 `// Fast-path for --version/-v: zero module loading needed`，命中后 `console.log(\`${MACRO.VERSION} (Claude Code)\`)` 直接 `return`，`MACRO.VERSION` 构建期内联，**该路径无任何额外 import**（cli.tsx:79-84）。脚本「直接打印退出、一个多余模块都不加载、是入口函数第一个分支」属实。
- **「卡你一秒 vs 瞬间」**：对其它工具「慢」是日常体感框架，**不引任何具体跑分数字**（红线：不臆造 benchmark）；只断言 Claude Code 这一侧的机制（零加载快速路径）可溯源。
- **特殊模式只动态加载那一小块**：cli.tsx 里大量子命令/模式走 `await import(...)` 懒加载，例：`--claude-in-chrome-mcp` → `await import('../utils/claudeInChrome/mcpServer.js')`（cli.tsx:108-109）；`daemon` → `await import('../daemon/main.js')`（cli.tsx:239-240）。整文件约 46 处 `await import`。脚本「MCP server / daemon 只动态加载那一小块、用到啥才加载啥」属实。
- **「十几条快速通道」**：★ 据实校正——plan 原文「30 多条逃生通道」**夸大**。源码实际是 **14-16 条**明确标注的快速路径/向后兼容分支（--version、--dump-system-prompt、--claude-in-chrome-mcp、--chrome-native-host、--computer-use-mcp、--acp、weixin、--daemon-worker、remote/rc/sync/bridge、daemon、autonomy、--bg、job、environment-runner、self-hosted-runner、--worktree --tmux 等）。脚本写「十几条」，不写「30 多条」。
- **完整界面才加载全家桶**：只有走到完整交互入口才进 `src/main.tsx` 拉起全套；前述快速路径在 cli.tsx 内早退，不进 main.tsx。便利店买水类比是说明性比喻，非技术断言。
- **并行预热**：`src/main.tsx` 文件头部（约 1-22 行）在模块继续加载前就立即触发并行任务：`startMdmRawRead()`（MDM 策略子进程读取）、`startKeychainPrefetch()`（macOS Keychain 异步预取），均「fire-and-forget」不 await，与后续加载并行。`src/entrypoints/init.ts` 内另有 `void Promise.all([...])` / `void import(...).then()` 模式并行初始化（firstPartyEventLogger、balance poller、JetBrains 检测、git 仓库检测）。脚本「并行去读配置、连系统钥匙串，跟模块加载同时进行」属实。
- **遥测约 400KB 延迟加载**：`src/entrypoints/init.ts:50` 设计注释原文 `~400KB of OpenTelemetry + protobuf modules until telemetry is actually initialized`（次行另注 gRPC exporters ~700KB 进一步在 instrumentation.ts 内懒加载）；实际延迟点 `const { initializeTelemetry } = await import('../utils/telemetry/instrumentation.js')`（init.ts 约 345-348）。★「400KB」**有源码注释依据**（非我从 package.json 推算），可写。脚本「遥测约 400KB 依赖拖到真要上报才加载」属实。
- **memoize 防重复初始化**：`src/entrypoints/init.ts` `export const init = memoize(async () => {...})`（约 66 行，`import memoize from 'lodash-es/memoize.js'`）。脚本口语化为「包了一层记忆，调过一次就直接返回，绝不做第二遍」——对应 memoize 语义，未夸大。
- **结尾钩对齐 EP12**：日更按 episode 升序，下一集 EP12「为了检测你按没按 Shift，它直接调了 macOS 系统底层」（FFI/native，backlog 2026-06-10-012）。结尾钩「JavaScript 凭什么能直接调用操作系统的底层接口」对齐 EP12 主题，不剧透细节、不依赖本集上文。
- **冷开自成立**：首句「同样是查个版本号，有的命令行工具卡你一秒，Claude Code 几乎是瞬间出结果」自带完整语境，第一次刷到的人 3 秒站得住，不依赖「上一集」。
- **合规**：源码仓为社区反编译/重建版（措辞已注意，未声称官方原始仓）；无臆造数据/跑分；「先看需求再花钱加载」「便利店买水」是工程点评/比喻非营销承诺；无违禁词、无绝对化（「几乎瞬间」非「最/第一/100%」）、无口播导流。
