---
style: cartoon-ops
density: balanced
image_count: 3
language: zh
aspect: 1536x1024
---

# 第 17 课配图大纲

内容类型：前端架构、数据契约、SDD 工程实践。

既有视觉：正文已有 revision 推送时序图和读写路径 Mermaid。新增插图不重复数据刷新流程，分别解释升级判断、面板接口表面和给 AI 的三类规格门禁。

## Illustration 1

**Position**: “什么时候值得升级”方案 A、方案 B 与裁决标准之后
**Purpose**: 把 markdown 看板和 Web UI 的适用边界变成一眼可判的对照
**Type**: split-compare
**Visual Content**: 左侧只读低频场景继续用 dashboard.md，右侧高频裁决场景升级为 Web UI，但两侧都不拥有状态
**Key Labels**: markdown 看板、Web UI、只读、裁决、dashboard.md、CLI、快照、自动刷新、动作按钮、面板不记状态
**Filename**: 01-split-compare-markdown-webui.png

## Illustration 2

**Position**: “面板这层暴露什么”健康灯介绍之后
**Purpose**: 用三层结构概括面板的对外契约：六页读投影、两条写通道、一盏健康灯
**Type**: layered-stack
**Visual Content**: 底层六个 GET 页面接口，中层快写与慢作业两条 POST 通道，顶层 health 与 SSE 状态灯
**Key Labels**: 六页、两条写通道、一盏健康灯、GET /api/overview、GET /api/contents、GET /api/content/:slug、GET /api/backlog、GET /api/harness、GET /api/metrics、快写、慢作业、GET /api/health、/api/events、revision
**Filename**: 02-layered-stack-interface-surface.png

## Illustration 3

**Position**: “给 AI 的 spec 钉三样”三样与四条约定解释之后
**Purpose**: 把 SDD 输入和可 grep 验收压成三道施工门禁
**Type**: gate-chain
**Visual Content**: AI 机器人依次通过页面清单、数据契约、视觉 token 三道门，旁边四张验收卡约束目录、fetch、token、依赖
**Key Labels**: 页面清单、数据契约、视觉 token、一页一目录、组件不裸 fetch、视觉只引 token、依赖先登记、usePageData、useJob、ConfigProvider
**Filename**: 03-gate-chain-spec-contract.png
