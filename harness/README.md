# 账号熵增治理线（account-harness）

> 宪法：**只逆账号存量资产的熵增,不造新内容(那是 `pipeline/`),不追增长。**
> 判据:**没人催、但放着会烂的**,才进这条线。
> 完整设计见 `docs/2026-06-14-账号熵增治理流水线规划.md`。

## 它和生产线的边界
- 生产线 `pipeline/`：前向造新内容,选题→创作→审核→**发布为止**。有人催、有时效。
- 治理线 `account-harness`（本目录）：后向治理已发布资产 + 账号大脑。没人催、可延迟、定时巡检。

**复盘和巡检都属本线**——它们作用于「已经存在的资产」,不是造新内容。

## 铁律:只产报告,不自动改
本线**所有任务**（含复盘）只产出**执行记录报告 + 变更提议**(现状/诊断/建议改什么)。
**改 `brain/` 账号大脑、改已发布线上资产,一律人审通过后才应用**——与发布铁律一致,不可逆操作不自动化。
状态机记账(如 `meta.yaml` 置 `retro_done`)、写治理日志不算"改大脑",可自动。

## 任务现状
当前只接两个「养大脑」任务（都构成数据反哺闭环），其余记 TODO，按需再接。

| 任务 | 干什么 | 状态 |
|---|---|---|
| **复盘**（`retro.md`） | 拉已发布作品后台数据→漏斗归因→产**大脑变更提议**(人审后应用) | ✅ 执行 skill `douyin-retro` 已建可用 |
| **benchmark-refresher** | 重新抓料验证 `brain/benchmarks.md` 对标账号/打法是否还成立 | ✅ 执行 skill `benchmark-refresher` 已建（手动触发，agent-reach） |

#### TODO（治理债登记，暂不接）
link-rot-checker · sop-doc-sync · backlog-gardener · retro-debt-collector · stale-fact-auditor · cover-style-normalizer
（说明见 `docs/2026-06-14-账号熵增治理流水线规划.md` 第 4.1 节 TODO 表）

> 统一产物格式见 `report-template.md`（治理执行记录报告：现状/发现/变更提议/盲区/落地记录）。
> 报告落 `logs/<date>-<task>.md`，dispatcher 落地后摘要进 `logs/index.jsonl`。

## 骨架现状
- ✅ `harness-dispatcher`（调度,**触发感知**非纯加权随机）、`tasks.md` 注册表、`logs/` —— 已落地。
- ✅ 执行 skill：`douyin-retro`(复盘)、`benchmark-refresher`(对标/打法复核)。
- 📋 TODO `account-audit` 元层(读 index.jsonl 调治理线自身配置)——设计已议(触发感知调参 + 自动/人审分级，自调边界待定，见 `tasks.md` 注释)；现 logs 为空，攒够数据再建。
- 📋 其余执行 skill（link-rot / sop-sync / …）见 TODO，dispatcher 跑顺后按需接。

> dispatcher 为何不用纯加权随机:复盘是**事件触发**、benchmark 是**周期**,都不是同质随机债;加权池预留给未来 per-item 任务。详见 `tasks.md` 与规划文档第四节。

## 触发
时间驱动,不随选题跑。复盘当前手动 `/douyin-retro [slug|all]`；定时 cron 待验稳后加。
