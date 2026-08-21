# 账号熵增治理线（account-harness）

> 宪法：**只养账号的存量资产、逆其熵增,不造终端内容(那是 `pipeline/`),不追增长。**
> 判据:**没人催、但放着会烂的**,才进这条线。
> 完整设计见 `docs/Iterative-spec/00-架构历史文档/2026-06-14-账号熵增治理流水线规划.md`。

## 它和生产线的边界（2026-07-08 修订：治理线养池子，生产线消费池子）
- 生产线 `pipeline/`：**消费选题池**造新内容——promote 取题→创作→审核→**发布为止**。有人催、有时效。
- 治理线 `account-harness`（本目录）：**养资产**——选题池保鲜（调研入池/清扫/理池）、已发布资产巡检、账号大脑复核。时间驱动、独立调度。

**选题池是库存资产不是内容**：调研入池是补库存（类比 coze harness 的 add-tests 补测试库存），造内容从 promote 那一刻起算、归生产线。复盘和巡检同理，作用于「已经存在的资产」。

## 铁律:只产报告,不自动改
本线**所有任务**（含复盘）只产出**执行记录报告 + 变更提议**(现状/诊断/建议改什么)。
**改 `brain/` 账号大脑、改已发布线上资产,一律人审通过后才应用**——与发布铁律一致,不可逆操作不自动化。
状态机记账(如 `meta.yaml` 置 `retro_done`)、写治理日志不算"改大脑",可自动。
选题池的边界:**入池(status:idea)与规则化过期清扫**(douyin-ideate Step 2.0,规则已人审钉死)视同状态记账,可自动;
**撞题合并/剔除**(backlog-gardener)是判断性变更,只产提议、人审后应用。

## 任务现状
**任务清单唯一出处 = `tasks.md`**：yaml 注册表（dispatcher 读）+ 每任务一张**任务卡**（为什么存在 / 目标怎么选 / 干什么 / 产物与记账 / 人审关注点）。本文件不复述清单，防两处漂移。
- 当前启用 5 个：养大脑的 `retro`（复盘，阶段契约另见 `retro.md`）、`benchmark-refresher`；养池子的 `ideate`（2026-07-08 自生产线迁入）、`backlog-gardener`；自审元层 `account-audit`（带熄火线早启）。
- 另 5 个 TODO 登记在册（disabled），**任务卡即接入规格**：接入 = 按卡写执行 skill + 翻 `enabled`。

（设计背景与验证分级见 `docs/Iterative-spec/00-架构历史文档/2026-06-14-账号熵增治理流水线规划.md`——那是历史快照，现行以 `tasks.md` 为准）

> 统一产物格式见 `report-template.md`（治理执行记录报告：现状/发现/变更提议/盲区/落地记录）。
> 报告落 `logs/<date>-<task>.md`，dispatcher 落地后摘要进 `logs/index.jsonl`。

## 骨架现状
- ✅ `harness-dispatcher`（调度,**触发感知**非纯加权随机）、`tasks.md` 注册表、`logs/` —— 已落地。
- ✅ 执行 skill：`douyin-retro`(复盘)、`benchmark-refresher`(对标/打法复核)。
- ✅ `account-audit` 元层已建启用(读 index.jsonl 调治理线自身配置)——自调边界数值表与熄火线见 `tasks.md` 它的任务卡；样本不足时只出心跳报告。
- 📋 其余执行 skill（link-rot / sop-sync / …）见 `tasks.md` 任务卡，dispatcher 跑顺后按需接。

> dispatcher 为何不用纯加权随机:复盘是**事件触发**、benchmark 是**周期**,都不是同质随机债;加权池预留给未来 per-item 任务。详见 `tasks.md` 与规划文档第四节。

## 触发
时间驱动,独立于生产线。定时任务由**人在 Claude Code 客户端配置**（每日一次,建议排在生产线 douyin-ai 之前,让当天取题用上新鲜池子）,入口 = `/harness-dispatcher`;未配置或未到点时可手动跑。单任务也可直接手动触发（如 `/douyin-retro [slug|all]`）。
