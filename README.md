# 抖音自媒体创作流水线

AI 方向的抖音账号内容工厂：**选题 → 创作 → 审核 → 发布 → 复盘** 全链路。
由 Claude Code 原生驱动（skills + 定时 agent + markdown SOP），不写传统代码。

## 怎么跑

- **工作日**：定时 agent 自动跑 `选题 → 创作 → 出审`（见 `automation/daily-run.md`），停在人审环节。
  人审通过后**手动发布抖音**（抖音暂无自动发布 skill）。
- **休息日**：不触发自动化，按需人工在 `content/` 下手建。

## 目录导览

| 路径 | 作用 |
|---|---|
| `brain/` | 账号大脑：定位/人设/风格/对标/信息源。AI 每次选题创作都读 |
| `pipeline/` | 各阶段"怎么跑"——SOP + Prompt，一阶段一文件 |
| `content/` | 内容条目：每条内容一个目录，从选题到复盘全在里面 |
| `automation/` | 定时与编排入口 |
| `dashboard.md` | 看板：在制内容的阶段 + 数据汇总（AI 自动更新） |
| `CLAUDE.md` | 项目级规则：人设语气、内容红线、skill 调用约定 |

## 核心约定

- **阶段是状态字段**（写在每条内容的 `meta.yaml`），不是目录位置。
- 新建一条内容：复制 `content/_template/` 到 `content/<日期>/<slug>/`。
- 选题池在 `content/_backlog/`，一题一文件。
