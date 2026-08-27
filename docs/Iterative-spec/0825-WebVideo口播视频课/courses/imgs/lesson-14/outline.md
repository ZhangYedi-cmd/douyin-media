---
style: cartoon-ops
density: balanced
image_count: 3
language: zh
aspect: 1536x1024
---

# 第 14 课配图大纲

内容类型：系统治理、权限设计、元层自审。

既有视觉：正文已有 account-audit 状态机与六类 AI 角色 Mermaid。新增插图不重画完整循环和角色拓扑，而聚焦权限三闸、熄火线判定、账本与报告的数据源取舍。

## Illustration 1

**Position**: “五、自动档与提议档的分界线”中范围、步长、留痕三段解释之后
**Purpose**: 把自动调参的权限边界压成三道连续门禁
**Type**: gate-chain
**Visual Content**: 配置变更依次通过范围、步长、留痕三道门，范围内可逆数值进入自动档，启停和大跳变被导向提议档
**Key Labels**: 范围、步长、留痕、自动档、提议档、可逆数值、启停、大跳变、tasks.md、git 工作区
**Filename**: 01-gate-chain-permission-table.png

## Illustration 2

**Position**: “六、熄火线，没数据就承认没数据”首段之后
**Purpose**: 直观呈现不足五条时必须停止调参的判定路径
**Type**: decision-flow
**Visual Content**: account-audit 读取 index.jsonl 后判断有效记录是否达到五条，分别流向心跳报告或产调整
**Key Labels**: index.jsonl、有效记录够五条吗、少于 5 条、心跳报告、不调参、自动档改动、提议档清单、样本不足
**Filename**: 02-decision-flow-sample-cutoff.png

## Illustration 3

**Position**: “八、为什么读账本不读报告”第一段之后
**Purpose**: 对比结构化账本与散文报告在元层统计中的职责
**Type**: split-compare
**Visual Content**: 左侧 index.jsonl 提供结构化字段和可重算统计，右侧报告用于抽样核对与解释，不能替代账本
**Key Labels**: index.jsonl、报告 md、ts、task、target、window、result、findings、applied、结构化真相源、抽样核对
**Filename**: 03-split-compare-ledger-report.png
