---
style: cartoon-ops
density: balanced
image_count: 3
language: zh
aspect: 1536x1024
watermark: false
---

## Illustration 1

**Position**: 第一节“daily-run.md 是给定时 agent 读的入口”骨架示例之后
**Purpose**: 把 daily-run.md 五个固定节如何共同构成机器接口画成可扫读结构，补足正文只有文字骨架、没有整体接口视图的问题。
**Type**: layered-stack
**Visual Content**: 一份立起的 daily-run.md 文档分成五层：当前模式、执行步骤、阻塞即上报、产出、参数；AI 机器人逐层读取，工程师只修改“当前模式”。
**Key Labels**: `daily-run.md`、`当前模式`、`执行步骤`、`阻塞即上报`、`产出`、`参数`、`取题→创作→出审`、`停在人审`
**Filename**: 01-layered-stack-daily-run-interface.png

## Illustration 2

**Position**: 第四节“为什么是 markdown 不是脚本”末尾
**Purpose**: 直观呈现脚本与 markdown SOP 的能力边界，帮助读者理解“判断归 LLM，确定性归代码”。
**Type**: split-compare
**Visual Content**: 左侧脚本被大量 if 分支缠住，只擅长唯一答案；右侧 markdown SOP 被 AI 机器人阅读，调用 skill 与 media 命令，且可 diff、可回滚。
**Key Labels**: `脚本`、`markdown SOP`、`判断归 LLM`、`确定性归代码`、`git diff`、`git revert daily-run.md`、`可机器验的判据`
**Filename**: 02-split-compare-markdown-script.png

## Illustration 3

**Position**: 第五节“契约与操作分层”末尾
**Purpose**: 把规则唯一出处和契约、操作、记账三层职责画清，强化“两处各写一份必漂移”的主判断。
**Type**: layered-stack
**Visual Content**: 从上到下是 daily-run 入口契约、pipeline 阶段契约、skill 操作细节、media CLI 确定性记账；旁边工程师把重复规则从入口移回唯一出处，紫色怪兽代表漂移。
**Key Labels**: `输入`、`输出`、`状态翻转`、`闸口`、`操作细节住 skill`、`media CLI`、`同一规则只写一处`、`两处各写一份必漂移`
**Filename**: 03-layered-stack-contract-operation.png
