---
topic: 架构抉择：AI 时代 CLI 为什么比 MCP 更好用
audience: 正在构建 AI Agent 或工程自动化系统的开发者与架构师
mode: new
series_context: AI 自媒体全流程实战课程第 10 课
---

## 核心问题
在 AI Agent 和自动化生产流水线中，工具集成方案应该如何在 MCP（Model Context Protocol）与 CLI（命令行界面）之间做技术选型，如何通过上下文经济学与懒加载机制避免 Token 浪费与模型智能退化。

## 材料清单
- [数据] MCP 工具 schema 上下文开销实测：一个典型的 GitHub 或 Notion MCP Server 包含 15 到 30 个 Tool 定义，JSONSchema 占用 1200 到 2500 Token；同时挂载 5 个常用 MCP Server 会导致 System Prompt 静态常驻 4000 到 8000 Token，在 20 轮对话中累计消耗超过 10 万 Token 的无效传输。
- [出处] Anthropic 官方 MCP Specification 文档中关于 tools/list 协议握手机制与 JSONSchema 注入规范。
- [案例] douyin-media 真实架构实践：状态变更统一收敛至 tools/console 的 media CLI（如 media status、media promote、media publish-done 等子命令），只读检索使用 agent-reach 命令行或专职查询工具。
- [反例] 把媒体发布、视频合成等写操作做成 MCP 工具导致模型在多轮对话中因参数混乱误调危险写接口，且宿主进程崩溃后 stdio 连接失效导致整条会话挂起。
- [数据] 命令行懒加载（Lazy Discovery）机制：平时注入 0 Token，按需执行 command --help 只消耗 150 到 300 Token，使用完毕后不驻留上下文。

## 材料缺口
无，材料充足，涵盖协议原理、实测 Token 消耗、架构对比表格、真实仓库代码案例与决策树。
