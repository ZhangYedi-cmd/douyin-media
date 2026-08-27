---
style: cartoon-ops
density: balanced
image_count: 3
---

## Illustration 1

**Position**: §二“裸工具的三个缺口”之后
**Purpose**: 对比直接调用 sau 与经过 publish skill 包装后，系统契约是否完整。
**Type**: split-compare
**Visual Content**: 左侧 sau 只负责上传且看不见状态、授权和留痕，右侧包装层补上三道契约但不重写上传逻辑。
**Key Labels**: social-auto-upload、sau、publish skill、status=approved、授权、留痕、meta.yaml、4-publish.md
**Filename**: 01-split-compare-wrapper-contract.png

## Illustration 2

**Position**: §三“五步工作流”规格之后
**Purpose**: 把发布包装层的校验、cookie、映射、分岔、留痕串成完整执行链。
**Type**: pipeline
**Visual Content**: approved 内容依次经过物料校验、cookie valid、字段映射、dry-run/--publish 分岔、publish-done 留痕收口。
**Key Labels**: status=approved、cookie valid、upload-video、upload-note、dry-run、--publish、4-publish.md、media publish-done、三翻齐
**Filename**: 02-pipeline-publish-wrapper.png

## Illustration 3

**Position**: §五“发布失败先原样重试一次”之后
**Purpose**: 把瞬态故障与确定性故障的低成本分诊逻辑画成可复用决策流。
**Type**: decision-flow
**Visual Content**: 首次失败先原样重试一次；第二次成功即收口，仍失败则分到 cookie、平台改版、UI 浮层等排查路径。
**Key Labels**: 原样重试一次、cookie invalid、UI 浮层、平台慢渲染、升级 sau、状态保持不动、4-publish.md
**Filename**: 03-decision-flow-retry-once.png
