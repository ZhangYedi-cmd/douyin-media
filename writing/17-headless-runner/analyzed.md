# 第 17 课素材与大纲盘点分析

## 1. 核心需求与边界界定

本课核心解决自动化流水线中长耗时 AI 任务的异步执行与观察问题。

目标受众是需要在前端控制台或自动化后台触发耗时数分钟的创作、重做、视频录制与治理任务的开发者。

核心痛点有两个：
1. 长耗时作业如果在 HTTP 同步请求中保持连接，会导致网关超时与页面假死。
2. 无头终端进程的原始输出充满杂乱的控制字符与非结构化文本，前端无法解析进度，也无法可靠捕获异常。

核心交付成果：
1. 异步 Job 架构：202 Accepted 响应与任务唯一 ID 派发。
2. 无头 Claude Code 子进程管控：spawn claude -p 启动、环境变量净化、超时熔断与进程清理。
3. 零依赖流式归一化包 cc-stream：原始 stream-json 解析、7 种标准事件归一化、声明式里程碑进度计算。
4. 提示词引导三步法：驱动自主执行、规范流式日志输出、异常自愈与熔断报警。
5. 前端 SSE 实时双通道订阅与模拟终端可视化组件。

## 2. 真实工程代码映射

代码库真实实现位置：
1. 任务调度器核心：tools/console/packages/server/src/jobs/runner.ts:89
2. 任务提示词单一真相源：tools/console/packages/server/src/jobs/prompts.ts:4
3. 任务超时与重做阈值定义：tools/console/packages/server/src/jobs/defs.ts:1
4. 任务终局裁决逻辑：tools/console/packages/server/src/jobs/verdict.ts:1
5. 无头子进程启动器：tools/console/packages/cc-stream/src/spawn.ts:15
6. 流式输出解析器：tools/console/packages/cc-stream/src/transport.ts:1
7. 标准事件归一层：tools/console/packages/cc-stream/src/normalize.ts:73
8. 里程碑进度计算引擎：tools/console/packages/cc-stream/src/milestones.ts:1
9. 公共类型定义：tools/console/packages/cc-stream/src/types.ts:24
10. 前端 Job 订阅 Hook 与终端组件：tools/console/packages/ui/src/hooks/useJob.ts

## 3. 提示词引导设计

1. 第一步：驱动无头 Claude Code 自主加载 SOP 提示词。
明确授权来源、限制工具白名单、严格按照 SOP 步骤执行、收尾必须更新状态并推审核卡、严禁假装完成。

2. 第二步：引导无头 Agent 执行结构化进度输出与日志归一。
通过工具调用触发明确的阶段动作，配合 stream-json 捕获每一次工具调用的输入、输出和耗时，映射为百分比进度。

3. 第三步：异常阻塞时的自愈引导与调度器防护。
重做次数超过 3 次触发物理熔断；子进程超时自动发送 SIGTERM 并在 10 秒宽限期后补发 SIGKILL；遇到无法自主解决的卡点时停止执行并将待办写入条目文件，同时通过飞书通道报警。

## 4. 章节结构与字数规划

预计总字数：6500 到 7500 字。

第一节：长耗时 AI 作业的交互困境与架构解法（约 1500 字）
第二节：后台执行器设计：JobRunner 与无头 Claude（约 1800 字）
第三节：进程输出归一化：打造零依赖叶子包 cc-stream（约 1800 字）
第四节：提示词引导全流程与异常自愈实战（约 1400 字）
第五节：前端实时订阅与日志渲染实战（约 800 字）
第六节：验收标准与避坑指南（约 400 字）
