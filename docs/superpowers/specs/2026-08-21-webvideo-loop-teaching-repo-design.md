# webvideo-loop 教学仓设计（第一阶段：抽干净项目）

> 日期：2026-08-21 ｜ 状态：已过口头人审，待按本 spec 出实施计划
> 背景：把 douyin-media 仓改造为面向 AI 新手的教学项目。整体分两阶段：
> **① 抽一个干净、脱敏、可跑的教学仓（本 spec）**；② 写教学文档（Agent → Harness → Loop Engineering 三幕教程，另立 spec）。
> 教学总目标（供第二阶段承接）：1. 认知突破——AI 可以自驱做任务，掌握这套心法可搭任意自驱工作流；2. AI 如何提效日常工作。核心是心法；飞书/看板/后端 console 属锦上添花，不进教学仓。

## 一、定位与形态

- 新建独立 git 仓库：`~/yedi-study/webvideo-loop`（公开传播预期，零泄露）。
- 原仓的**同构缩小版**：双线架构（生产线 pipeline + 治理线 harness）、`brain/` 账号大脑、`content/` 状态机、人闸设计一一对应；题材虚构、数据全新。
- 学员基线：混合受众（会编程/用过 Claude Code/非技术都有）。仓库本体可跑部分面向会装 Node/Python 的读者；纯读也能理解结构。
- **可跑边界：双线可跑，含模拟复盘**。生产线：取题→写稿→配音→录屏→本地出审；治理线：模拟数据复盘→变更提议→人审→改 brain。发布、复盘一律不接抖音真实数据。

## 二、虚构账号「效率工具测评号」

- 定位一句话：每天 1 个提效小工具的口播测评号。
- 双赛道对位原仓：**深度实测 : 热点速评 ≈ 6:4**。
- `brain/` 五件全部重写（positioning / persona / style-guide / benchmarks / sources）+ `tts.config.json` 模板。
  - benchmarks.md：虚构对标账号与打法表，但**保留证据纪律的示范**（数据点计数、"候选勿当定论"标注、报告出处占位）。
  - sources.md：用真实可公开信息源（GitHub Trending、Product Hunt、少数派等），学员 ideate 能真抓到料。
- 与作者真实账号（AI 源码深度）题材不撞车。

## 三、可跑链路替代方案（心法不变，实现降级）

| 原仓 | 教学仓 | 保留的心法 |
|---|---|---|
| MiniMax 付费 TTS（克隆音色） | **edge-tts**（免费、无 key、中文音色） | 配音自动化 + overrides 多音字修正概念 |
| web-video-presentation（Vite 工程 + 外部 skill） | 极简原生 HTML 演示页模板 + playwright 录屏脚本 | 稿→页→配音→无人录屏出 mp4 |
| 飞书审核卡 + server 长连接 | **本地人闸**：出审即停线，学员在 `3-review.md` 写「通过/打回」后手动续跑 | 全自动停在人审 |
| douyin-publish（sau 真发） | 模拟发布：保留 `--dry-run`/`--publish` 两档 + 二次确认交互；`--publish` 只写本地发布记录 | 不可逆操作双闸（过审 ≠ 发布授权） |
| 创作者中心真实数据 | **mock-metrics 生成器**：仿真播放/完播/评论数据，**故意埋规律**（如强 CTA→评论显著高、知识点堆砌→完播低） | 完整大环：复盘→归因→提议→人审→改 brain；学员复盘能真「挖出打法」（教学彩蛋） |
| dubbing-reviewer（配音质检子代理） | **script-reviewer 子代理**：审口播稿（冷开/钩子/口语化），只判不改（无写权限）、限 3 轮、超限升级人审 | AI 审 AI + 职责分离 + 有限重试 |
| media CLI（TS monorepo 六包） | **单文件 `tools/media.mjs`**（几百行）：next / promote / flip / publish-done / check 五命令 | 状态唯一记账 + 确定性交代码、判断交 AI；源码本身即教学材料 |

## 四、目录结构

```
webvideo-loop/
├── README.md                    # 教学仓导览（指路，不是教程正文）
├── CLAUDE.md                    # 虚构账号版项目规则（内容红线/流程纪律照搬心法）
├── brain/                       # 五件 + tts.config.json（edge-tts 模板）
├── pipeline/
│   ├── daily-run.md             # 编排入口（无飞书；出审停线→本地人闸）
│   ├── 1-ideate.md ~ 4-publish.md   # 阶段契约（发布=模拟）
│   └── lessons.md               # 教学版教训登记簿（见 §五）
├── harness/
│   ├── README.md                # 治理线宪法（只产报告不自动改、人审后应用）
│   ├── tasks.md                 # 注册表+任务卡，精简 4 任务：retro / ideate / backlog-gardener / audit
│   ├── report-template.md
│   └── logs/
├── content/
│   ├── _template/               # 五件套模板（1-brief…5-retro + meta.yaml）
│   ├── _backlog/backlog.yaml    # 预置 8 条已打分选题（效率工具题材），开箱即可 next/promote
│   └── <date>/<示例slug>/       # 1 条走完全程的示例：文本产物齐全（稿/审/发布物料/模拟复盘报告）
│                                #   音视频产物不入 git（不塞二进制），由学员亲手跑出
├── tools/
│   ├── media.mjs                # 单文件记账 CLI
│   └── mock-metrics.mjs         # 仿真数据生成器（埋规律）
├── dashboard.md                 # 派生视图（真相源 = meta.yaml + backlog.yaml，约定照搬）
└── .claude/
    ├── skills/                  # 四个精简 skill：ideate / create-video / retro / harness-dispatcher
    └── agents/script-reviewer.md
```

## 五、lessons.md 处理

- 预置 4~5 条**改编泛化版**真实坑（去账号叙事）：静默失败必复扫验证（源 L16）、阻塞必须推人不能只写日志（源 L14）、真相源不同步致音画不符（源 L2）、封面拿视频帧充数（源 L1）、分轮反应式修补应一次性前置终检（源 L4）。
- 保留「故事只写这里、规则住 SOP 标 Lx 回指」的登记约定；表尾留白——学员自己的坑长进去，本身就是 Loop 心法。

## 六、安全与边界

- 不含原仓任何真实数据/个人路径/API key/克隆音色 ID/飞书配置/运营数字。
- 遵守 GitHub 推仓红线（禁 corp 关键词/邮箱；见全局 memory）。
- 不含 console monorepo、不含 sau/social-auto-upload。
- 触发以**手动跑 daily-run 为主**；定时任务只作文档进阶提示。

## 七、验收标准（第一阶段完成的定义）

1. 学员环境：Node ≥18 + Python(edge-tts) + Claude Code，`git clone` 后按 README 一次配齐。
2. **生产线跑通**：`media next` 取题 → promote → Claude Code 按 daily-run 创作（写稿→script-reviewer 质检→edge-tts 配音→录屏出 mp4）→ `media flip review` 停线，`3-review.md` 出现待审记录。
3. **人闸闭环**：学员写「通过」→ 模拟发布二次确认 → `media publish-done` 三处记账（meta/backlog/dashboard）。
4. **治理线跑通**：mock-metrics 生成数据 → retro skill 产出含「大脑变更提议」的报告 → 学员人审后手动应用到 benchmarks.md；埋入的规律可被归因发现。
5. `media check` 全绿；仓内无任何脱敏黑名单词（corp 关键词/邮箱/key/音色 ID）。
6. 示例内容条目完整呈现五件套终态，可当「标准答案」对照。

## 未决项

无——命名（webvideo-loop）、题材、可跑边界、数据策略、记账工具形态均已人审拍板。
