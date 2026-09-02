---
topic: 状态机思维：为什么自媒体流水线总在半途崩溃与如何构建自愈回路
audience: 尝试用大模型搭建自动化内容生产流、但饱受流程中断和反复返工困扰的工程师与创作者
mode: new
series_context: AI自媒体全流程实战课程第02课
---

## 核心问题
为什么单靠加长提示词无法保证复杂生产流水线的稳定性，以及如何用状态机思维和确定性验证信号把非结构化生成变成自愈闭环。

## 材料清单
1. [数据/理论] 控制论中的监督控制理论（Sheridan, 1974）与 OODA 环模型（Boyd, 1976），说明人类不应盯死每个微观动作，自动化成熟度取决于反馈回路流向机器还是流向人类。
2. [案例] 真实项目 `tools/console/packages/core/src/state.ts` 中的双层状态迁移表（`META_TRANSITIONS` 与 `BACKLOG_TRANSITIONS`），用 TypeScript 代码把生产状态（`ideated` -> `drafting` -> `review` -> `approved` -> `scheduled` -> `published`）进行守卫式校验，非法流转直接抛出 `E_ILLEGAL_TRANSITION`。
3. [案例] 真实流水线 `pipeline/2-create.md` 中的 `dubbing-reviewer` 配音审批闸口：主流程负责生成与修复，独立裁判子代理负责质检，输出带具体注音覆盖参数（`tts.config.json` 中的 `overrides`）的结构化报告，限制 3 轮上限，熔断后转人工。
4. [反例] 把「写文案、做演示网页、合成配音、录制成片、质检纠错」塞进单一长 Prompt 的连续模糊流，单点微小幻觉或音频停顿超标会在下游产生雪崩式级联失败，导致整个会话上下文污染死锁。
5. [反例] 自然语言模糊报错（例如「第3段读得不太好，有点奇怪」）引发大模型对抗性解释或无意义微调，与结构化 JSON/YAML 报错信封（包含段落序号、错误类别、实测数值、精准覆盖参数）形成对照。
6. [案例] 真实工具链中的客观测量：`silencedetect` 探测音频静音停顿毫秒数、`ffmpeg` 退出码检查、`audio-segments.json` 抽取校验，展示确定性工具如何承担 Observe 职责。

## 材料缺口
无明显缺口，工程实测数据与代码链路完整。
