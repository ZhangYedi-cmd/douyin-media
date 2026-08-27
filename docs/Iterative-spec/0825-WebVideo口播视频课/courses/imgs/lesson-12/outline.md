---
style: cartoon-ops
density: balanced
image_count: 3
language: zh
aspect: 1536x1024
watermark: false
---

## Illustration 1

**Position**: 第二节“把跑谁收进一个调度器”末尾
**Purpose**: 对比每任务一个 cron 与注册表加单一 dispatcher 的一致性成本，立住解耦判断。
**Type**: split-compare
**Visual Content**: 左侧五个 cron 各自带判据、报告和账本，线缆散乱；右侧所有任务进 tasks.md，dispatcher 统一评估、派活、收报告、记账。
**Key Labels**: `每任务一个 cron`、`注册表 + 单一 dispatcher`、`配置散落`、`判据不统一`、`tasks.md`、`改任务只动本文件`、`不改 dispatcher`
**Filename**: 01-split-compare-cron-dispatcher.png

## Illustration 2

**Position**: 第三节“dispatcher 的六步”末尾
**Purpose**: 把调度器六步工作流压成一张横向流水线，明确它只调度不治理。
**Type**: pipeline
**Visual Content**: AI 机器人沿六个工位处理注册表、trigger、派活、报告、账本和汇报；紫色怪兽试图让 dispatcher 越界改 brain，被红色门禁拦住。
**Key Labels**: `读注册表`、`评估 trigger`、`派活`、`收报告`、`append 一行`、`汇报`、`enabled: true`、`logs/<date>-<task>.md`、`logs/index.jsonl`、`只调度不治理`
**Filename**: 02-pipeline-dispatcher-six-steps.png

## Illustration 3

**Position**: 第六节“任务卡，五件事撑一张卡”末尾
**Purpose**: 将任务卡五件事做成可检查的角色阵列，帮助读者写卡时不漏契约项、不把操作细节抄进来。
**Type**: role-lineup
**Visual Content**: 五个不同姿态的角色分别举起五张白卡，旁边 inspector 检查“契约级判据”，把“操作步骤”退回 skill。
**Key Labels**: `为什么存在`、`目标怎么选`、`干什么`、`产物与记账`、`人审关注点`、`契约级判据`、`操作步骤住 skill`、`任务卡即接入规格`
**Filename**: 03-role-lineup-task-card-five-parts.png
