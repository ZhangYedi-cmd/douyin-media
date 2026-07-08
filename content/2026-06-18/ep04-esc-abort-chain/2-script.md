# 成稿 · 口播稿（EP04 · 你按下 Esc 的那 0.1 秒，Claude Code 内部发生了什么）

> 系列：Claude Code 源码解读 S1E4 ｜ 结构：微观链路（一次按键的破案）｜ 目标时长 2.5–3min
> 这是口播稿**唯一真相源**；web-video-presentation 里的 script.md 是它的派生件。
> 所有技术结论溯源见文末「事实核对」，逐条指到 source_repo 行号。
> ★ 纠偏：plan 大纲把机制二写成「读文件 cancel / 写文件 block」——**这不是源码事实**。
>   源码里默认是 block，全仓只有 SleepTool 主动声明 cancel；且 cancel/block 只在「软打断」生效。
>   本稿按源码据实改写，保留「不是所有任务都能立刻停」的精神，但不臆造工具配置。

---

## 钩子（前 3 秒 · 冷开，不依赖上下文）
你按一下 Esc，AI 手里七八个任务"啪"地一下全停了——关键是，你那些文件，一个都没被写坏。
这事儿听着简单，源码里全是讲究。我扒了 Claude Code，这背后是一棵"中止树"，加一个特别贼的防漏细节。

## 场景代入
想象一下：AI 正并行读着好几个文件、跑着命令，还派出两个子 Agent 去查资料，七八个任务同时在飞。
你突然发现方向不对，想立刻喊停。
问题来了——怎么让这七八个还在跑的任务，干净利落地一起停下，还不留烂摊子？
源码里靠三层设计：一棵树、一套规矩、一个防漏的细节。一个一个来。

## 机制一：中止树
第一层，中止树。
每开一个子任务，Claude Code 就给它配一个"中止开关"；子任务的开关，挂在父任务的开关底下。
一层套一层，整个任务就长成了一棵树。你按 Esc，等于一刀剪断树根。
> 视觉：一棵树，根节点被剪断，红色信号波沿枝干往下传，叶子逐个熄灭。
信号顺着树枝往下传：父开关一响，子开关、孙开关连锁触发，叶子上的任务挨个停。
注意是**单向**的：剪树根，整棵树停；但你单独关掉一根树枝，父节点毫发无伤——上游不会被下游连累。
而且"为什么停"这个原因也跟着往下传：是用户喊的停，还是某个兄弟任务出错带崩的，每个子任务都拿得到。

## 机制二：不是所有任务都能立刻停
第二层有意思了。其实"打断"有两种，源码区别对待。
一种是硬的——你按 Esc，那就是真·全停，没得商量，整棵树立刻砍掉。
> 视觉：两条分叉，硬打断=红色闪电劈下全黑；软打断=黄色问号逐个问。
另一种是软的——它还在干活，你又敲了一句新指令。这时候它不粗暴打断，而是挨个问每个工具一句话：你现在，能停吗？
每个工具自己回答两个词之一：cancel，还是 block。
cancel 是"立刻丢下、结果不要了"；block 是"让我先干完，你的新指令排队等一下"。
默认是 block，保守——因为停在半道上，活可能就废了，宁可让它干完。
只有那种"停了也毫无损失"的工具，才会主动声明 cancel——比如源码里那个 Sleep 工具，它本来就是在干等，半路杀掉它一点不亏。

## 机制三：防泄漏的弱引用
第三层，是我最服气的一个细节。
前面说子开关挂在父开关底下——可子任务结束之后呢？
要是父节点死死攥着子节点不放，你跟它聊一晚上，几千个早就结束的任务还挂在树上，
内存里全是"僵尸监听器"，越积越多，迟早把内存吃穿。
> 视觉：一堆灰色"僵尸"监听器挂满树枝 → WeakRef 一摆，结束的自动掉落、被回收。
源码用了 WeakRef，弱引用：父子之间只是"弱弱地"牵着，子任务一旦没用了，垃圾回收能直接把它收走，父节点手里只剩一个空壳。
更绝的是：子任务一旦真被中止，它挂在父亲身上的那个监听器，会**自动摘掉**——触发一次就走，不留痕迹。
外加一道保险：每个开关最多挂 50 个监听器，超了直接告警，生怕你哪天真把这棵树挂爆。

## 升华 + 结尾钩 + 互动
你看，按一下 Esc 这么个小动作，背后是三层设计：一棵传播中止的树，一套"能不能停"的规矩，外加防内存泄漏的弱引用。
好软件的那种"丝滑"，从来不是天生的，是这么一点一点抠出来的。
能随时一键叫停，只是你敢放手让 AI 干活的前提之一。另一个前提是——它凭什么敢在你电脑上，直接跑命令？
下一集，咱们拆 Claude Code 的权限管线。
互动留个问题：**你被哪个软件的"点了取消却停不下来"坑过？评论区曝光它。**

---

## 分镜 / 高亮速记（给 web-video-presentation 对齐）
| 段落 | 关键画面 | 高亮数字/词 |
|---|---|---|
| 钩子 | 七八任务全停、文件没坏 | **一下全停 / 一个都没写坏** |
| 场景 | 并行读文件/跑命令/子 Agent | **七八个任务同时在飞** |
| 机制一 | 树根被剪、红波下传、叶子熄灭 | **中止树 / 单向传播 / reason 下传** |
| 机制二 | 硬打断 vs 软打断；逐工具问 cancel/block | **默认 block / 只有 Sleep 声明 cancel** |
| 机制三 | 僵尸监听器 → WeakRef 回收 / 自动摘 / 50 上限 | **WeakRef / 自动摘监听器 / 50** |
| 结尾 | 三层叠合 + EP05 权限预告 | **EP05 预告：凭什么敢跑命令** |

## 事实核对（交审用，逐条可溯源）
> source_repo: `/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main`
- **中止树 / 父子单向传播 / reason 下传** ← `src/utils/abortController.ts:67-99`（`createChildAbortController`：parent abort → child abort；注释明写 "Aborting the child does NOT affect the parent"；`propagateAbort` 把 `parent.signal.reason` 传给子）。
- **硬 Esc = 全停** ← `src/hooks/useCancelRequest.ts`（`chat:cancel` → `handleCancel`，Priority 1：有活跃任务就 `onCancel()` 砍当前 abortController，analytics source `'escape'`）。硬打断 reason 非 `'interrupt'`，`getAbortReason` 对所有工具一律返回 `user_interrupted`（全砍）。
- **两种打断 + cancel/block 接口** ← `src/Tool.ts:428-437`（`interruptBehavior?(): 'cancel' | 'block'`；cancel='stop the tool and discard its result'，block='keep running; the new message waits'；**注释明写 "Defaults to 'block' when not implemented"**，line 435）。
- **软打断（敲新指令）只砍 cancel 工具** ← `src/services/tools/StreamingToolExecutor.ts:237-255`（`getAbortReason`：`signal.reason === 'interrupt'` 时，仅 `interruptBehavior()==='cancel'` 的工具返回 `user_interrupted`，block 工具返回 `null`=不动）+ `getToolInterruptBehavior:260-266`（未声明/抛错→`'block'`）+ `src/utils/handlePromptSubmit.ts:330,341`（`abort('interrupt')`，注释 "all executing tools have interruptBehavior 'cancel' (e.g. SleepTool)"）。
- **全仓唯一声明 cancel 的工具 = SleepTool** ← `packages/builtin-tools/src/tools/SleepTool/SleepTool.ts:78`（`interruptBehavior() { return 'cancel' }`，且 `isReadOnly`=true，纯等待）。grep 全仓仅此一处 opt-in cancel。
- **WeakRef 双向弱引用 + 不阻止 GC** ← `abortController.ts:84-85,57-65`（`new WeakRef(child)`/`new WeakRef(parent)`；注释 "parent doesn't retain abandoned children"、"child can still be GC'd"）。
- **子 abort 自动摘父监听器** ← `abortController.ts:88-97`（child.signal `addEventListener('abort', removeAbortHandler…, { once: true })`；父侧 handler 也是 `{ once: true }`）。
- **50 监听器上限（防 MaxListenersExceededWarning）** ← `abortController.ts:6,15-21`（`DEFAULT_MAX_LISTENERS = 50` + `setMaxListeners(50, controller.signal)`）。
- **★ 纠偏**：plan 大纲「读文件 cancel / 写文件 block」不成立——源码默认 block、仅 SleepTool opt-in cancel，且该机制只作用于软打断。本稿改述为「默认 block＋仅无损工具声明 cancel」，不臆造。
- **结尾钩对齐 EP05**：日更按 episode 升序，下一集是 EP05（权限管线「凭什么敢让 AI 在你电脑上跑命令」），非 plan 随手写的并发(EP06)。承接钩据实改指 EP05。
