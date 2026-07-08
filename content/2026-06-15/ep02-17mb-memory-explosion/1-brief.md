# 选题 Brief（系列剧集 · 等价物见 plan_file）

- **标题方向**：一个 17MB 的 JS 文件，让内存从 35MB 暴涨到 1GB
- **支柱**：depth（源码解读 · claude-code-source-series S1E2）
- **形式**：口播（16:9 横屏）
- **目标人群**：一线工程师 / 技术深度爱好者
- **核心钩子**（3s）：`claude --version` 看个版本号，内存吃掉 966MB ≈ 1 个 G
- **要讲清的点**：
  1. 真凶是引擎差异——JSC 全量解析 vs V8 懒解析（自助餐比喻）
  2. 解法是代码分割成 600+ chunk，按需加载，966→35MB（÷27）
  3. 彩蛋：构建后替换 import.meta.require 让产物 Bun/Node 通用
- **takeaway / 互动**：性能问题常在你没注意的引擎层 ｜ 你打包产物多大？超 5MB 评论区报数
- **信息来源**（可溯源）：源码仓 CLAUDE.md:83 + build.ts:23/45 + scripts/post-build.ts:17
- **brief 真相源**：`plan_file` = `/Users/yedi/yedi-medias/plan/claude-code-source-series/episodes/ep02-17mb-memory-explosion.md`（系列剧集以 plan_file 为 1-brief 等价物，本文件仅摘要）
