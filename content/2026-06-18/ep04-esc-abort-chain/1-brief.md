---
episode: 4
season: 1
slug: ep04-esc-abort-chain
title: "你按下 Esc 的那 0.1 秒，Claude Code 内部发生了什么"
hook_type: 微观链路
priority: P1
status: planned
duration: 2-3min
platforms: [douyin, xiaohongshu, wechat]
source_repo: /Users/yedi/yedi-study/claude-code-main
key_files:
  - src/utils/abortController.ts
  - src/services/tools/StreamingToolExecutor.ts
---

# EP04 · 你按下 Esc 的那 0.1 秒，Claude Code 内部发生了什么

## 开场钩子（前 3 秒）

> "AI 正在同时跑 8 个任务，你按了一下 Esc——0.1 秒内全停了，而且一个文件都没写坏。这背后是一棵'中止树'。"

## 内容大纲

1. **场景代入**：AI 正在并行读文件、跑命令、调子 Agent，你突然想叫停。
2. **机制一：中止树**——每个任务挂在一棵 AbortController 树上，按 Esc 等于砍树根，信号沿树往下传，所有子孙任务连锁停止。
3. **机制二：不是所有任务都能停**——每个工具自己声明"被中止时的行为"：读文件可以立刻停（cancel），但写文件写到一半**必须写完**（block），否则文件就废了。
4. **机制三：防泄漏的细节**——树上的父子关系用 WeakRef（弱引用）连接，子任务结束后自动从父节点摘除监听器。否则聊一晚上，内存里挂满"僵尸监听器"。
5. **升华**：一个按键的体验，背后是三层工程设计。好软件的"丝滑"都是这么抠出来的。
6. **结尾钩**："说到并行跑 8 个任务——它怎么保证 8 个工具不打架不抢文件？下集拆并发调度。"

## 源码导读（制作 Agent 用）

| 文件 | 定位锚点 | 看什么 |
|---|---|---|
| `src/utils/abortController.ts` | `createChildAbortController` | WeakRef 父子关联、abort 单向传播、监听器自动清理 |
| `src/services/tools/StreamingToolExecutor.ts` | `getAbortReason` | 中止原因分类（sibling_error / user_interrupted / streaming_fallback） |
| `src/Tool.ts` | `interruptBehavior` | 工具声明 cancel / block 的接口 |

## 视觉建议

- 主视觉：一棵树的动画——根节点被剪断，红色信号波沿枝干传到所有叶子，叶子逐个熄灭。
- "写文件必须写完"用快递员比喻：可以取消还没发的快递，但不能让正在过独木桥的快递员立刻消失。

## 评论区开放问题

> "你被哪个软件的'点了取消却停不下来'坑过？评论区曝光它。"

## 平台适配

- 抖音：完整版。
- 小红书：树形动画截帧做主图。
- 公众号：可展开讲 WeakRef/GC 知识点，技术含量更足。
