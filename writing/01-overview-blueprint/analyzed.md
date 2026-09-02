---
topic: 全景蓝图：从一篇文章到全自动视频成片
audience: 习惯与 AI 单次对话、苦于反复手动复制粘贴修改的开发者与内容创作者
mode: new
series_context: AI 自媒体全流程实战课程 模块 1 第 1 课
---

## 核心问题
如何从单步 Prompt 搬运工跃迁为架构师，用双线闭环和确定性工具打造从一篇文章到最终发布视频的无人自媒体流水线？

## 材料清单
- [数据] METR 2024 开发者对照试验：资深开发者在缺乏确定性验证与流水线闭环时，单次交互和反复修复反而让整体耗时增加 19%（https://metr.org/blog/2024-developer-study/）。可支撑第 1 节「为什么要做自动化流水线」。
- [出处] 控制论（Cybernetics）创始人 Norbert Wiener 的「反馈与监督控制」理论（Supervisory Control）：人类不该盯每一个执行细节，只需定义目标边界与持续接收偏差反馈。可支撑第 2 节「人机分工矩阵」。
- [案例] douyin-media 真实生产线与治理线：`pipeline/daily-run.md`（日更编排）、`pipeline/2-create.md`（口播四件套与终检闸门）、`harness/tasks.md`（定时巡检注册表）。可支撑第 2 节和第 3 节「10 步链路」与「双线架构」。
- [案例] 裁判与选手分离实践：`.claude/agents/dubbing-reviewer.md` 质检子代理只判不改，无写文件权限，配合 `tools/dubbing-check` 输出结构化 FAIL 报告。可支撑第 3 节「三大核心亮点」。
- [案例] CLI 统一写入收敛：`tools/console/packages/cli` 的 `media promote` 与 `media flip` 命令行工具，单点驱动状态流转，杜绝多端状态漂移。可支撑第 3 节「三大核心亮点」。
- [反例] 传统单步搬运的翻车路径：在 ChatGPT 生成脚本后手动复制到剪映，再手动调语音，发现多音字读错又回聊天框重问，前后折腾两个小时，结果改了文案忘了改音频，最终成片声画不同步。可支撑第 1 节「为什么要做」。
- [反例] 选手自兼裁判的死循环：让同一个生成代码的 Agent 检查自己的产物，由于注意力偏置和上下文惯性，每次都回答「检查通过，没有发现问题」，或者陷入反复自我解释的无意义修改。可支撑第 3 节「亮点 2」。
- [案例] 工业级 5 大痛点与实战解法：
  1. 抖音冷开头 3 秒完播：第一句必须自成立，禁止「在上一期视频中」等依赖上文的句式（`pipeline/2-create.md` 规则 C）。
  2. TTS 内部死气与多音字：ffmpeg `silencedetect` 扫描超过 0.45 秒的内部停顿并用 `depause.mjs` 切除；多音字逐段 overrides 配置（`pipeline/2-create.md` 规则 B）。
  3. 无头录屏音画同步：Playwright headless 录制时用确定性时钟推进页面，避免受机器负载影响产生时间膨胀（`web-video-presentation` 录制架构）。
  4. 质检 3 轮硬熔断：`dubbing-reviewer` 连续打回 3 轮后强制挂起推飞书人审，防止 token 空耗。
  5. 选题枯竭：`douyin-ideate` 定时结合 `agent-reach` 扫描 X、GitHub、Reddit 前沿技术信息，结合受众复盘数据反哺 `brain/benchmarks.md`。

## 材料缺口
无。所有核心论点均有真实工程代码、规范文档与工业级数据支撑。
