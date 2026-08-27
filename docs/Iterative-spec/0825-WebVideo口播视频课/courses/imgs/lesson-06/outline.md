---
style: cartoon-ops
density: balanced
image_count: 3
---

## Illustration 1

**Position**: §二“确定性活的正确归宿是代码”之后
**Purpose**: 对照概率模型每次重新理解规则与代码一次固化规则的差别。
**Type**: split-compare
**Visual Content**: 左侧 AI 每轮靠记忆手改三处账并漏项，右侧 CLI 按固定契约原子执行并输出一致结果。
**Key Labels**: meta.yaml、backlog.yaml、dashboard.md、timestamps、LLM、代码、确定性、概率模型
**Filename**: 01-split-compare-deterministic-work.png

## Illustration 2

**Position**: §三“四个命令各管一件”表格之后
**Purpose**: 建立 media CLI 四个命令的角色分工与读写边界。
**Type**: role-lineup
**Visual Content**: next、promote、flip、check 四个岗位并排，分别拿预演镜、开工箱、状态扳手和巡检仪。
**Key Labels**: media next、media promote <slug>、media flip <slug> <目标状态>、media check --json、只读、五处一次改齐、迁移表、error / warn
**Filename**: 02-role-lineup-four-commands.png

## Illustration 3

**Position**: §六“一条命令五处改齐”解释之后
**Purpose**: 把 promote 的多处一致性压成一条原子流水线，突出要么全成要么全不成。
**Type**: pipeline
**Visual Content**: slug 从 backlog 进入传送带，依次翻 picked、回填 content_path、清 next_up、建目录、写 meta，最后 check 收口。
**Key Labels**: backlog.yaml、idea、picked、content_path、next_up、content/<日期>/<slug>/、meta.yaml、media check
**Filename**: 03-pipeline-promote-atomic.png
