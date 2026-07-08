---
name: benchmark-refresher
description: 熵增治理线任务——定期重新抓料,验证账号大脑 brain/benchmarks.md 里的「对标账号 / 有效打法 / 爆款拆解」是否还成立(AI 圈变化快,旧打法/旧对标会悄悄过时)。用 agent-reach 抓当前证据,逐条判成立/存疑/失效/建议新增,产出「执行记录报告 + 变更提议」交人审,人审后才改 benchmarks.md。铁律:绝不自动改 brain。属治理线(automation/harness/),非生产流水线。触发:刷新对标、验证打法、benchmarks 过时没、对标账号还活跃吗、benchmark-refresher。
---

# benchmark-refresher · 对标/打法时效巡检

> 治理线第 2 个任务(第 1 个是复盘 `douyin-retro`)。两个都"养大脑":复盘**沉淀**新打法,
> 本任务**复核**旧打法/对标有没有过时。逆的是账号大脑的熵——放着不管,benchmarks.md 越来越不准。

## 干活前必读
1. `automation/harness/README.md`(治理线宪法 + **铁律:只产报告,改大脑人审**)。
2. `automation/harness/report-template.md`(产物格式)。
3. `brain/benchmarks.md`(要复核的对象)、`brain/positioning.md`(账号定位,判"还贴不贴"的尺子)。
4. `brain/sources.md`(agent-reach 抓哪些源/关键词)。

## 诚实的能力边界(先说清,免得假装)
- **能验**(agent-reach 覆盖 X/Reddit/HN/GitHub/YouTube/**Bilibili**/XHS):打法底层假设是否过时、所蹭的技术/模型是否还 current、从 B站/YouTube 发现新的 AI 技术对标候选、选题方向是否还热。
- **不能直接验**:抖音账号的活跃度/方向(无抖音读取通道,反爬)。纯抖音对标只能标「需人工核」,或交给 `douyin-retro` 用自有数据侧面印证。**报告里如实标盲区,不编。**

## 流程
1. **读现状**:列出 benchmarks.md 的全部条目——对标账号、有效打法、爆款拆解,各自带"为什么当初收录"。
2. **抓当前证据**(agent-reach):
   - **打法**:每条打法的底层假设还成立吗?尤其**绑定具体技术/模型**的(如"蹭某模型实测")——那模型是否已过气?搜 X/HN/Bilibili 看当前热度与共识。
   - **对标**:有跨平台露出的账号核近况;纯抖音的标「人工核」。顺手从 B站/YouTube 捞**正在涨的 AI 技术创作者**作新对标候选(带数据)。
   - **爆款拆解**:那些"为什么火"的模式,在当下还出现在热内容里吗?还是已被新形式取代?
3. **逐条判定**:✅成立 / ⚠存疑 / ❌失效 / ➕建议新增,每条**必须带证据(链接+日期)**,无证据不下结论。
4. **产报告**:按 `report-template.md` 写到 `automation/harness/logs/<date>-benchmark-refresher.md`,变更提议列成可勾选项。
5. **交人审**:停在这。**绝不自动改 `brain/benchmarks.md`**——人勾选哪些提议,才由人(或经授权的 AI)应用,并回填"落地记录"。

> 红线:只用真抓到的证据,不臆造数据/不外推;时效结论标来源与日期(与内容红线一致)。

## 频率
治理线定时,**比复盘低频**(打法/对标变化慢)——建议每月一次或按需。手动随时可跑。
dispatcher(`automation/harness/`,待建)落地后由它按权重调度;现在手动触发。

## 顺手会发现的(本任务边界内)
benchmarks.md 当前还有几处与现架构矛盾的旧话(如表头"自动回写""技能自动发现高赞账号")——
那是**文档与现状脱节**,归 `sop-doc-sync`(TODO)管;本任务只在变更提议里**提一句**,不越界去改。

## 依赖
| 依赖 | 用途 | 必须 |
|---|---|---|
| agent-reach | 抓当前证据(X/Reddit/HN/GitHub/YouTube/Bilibili) | 是 |
| brain/* | benchmarks(对象)、positioning(尺子)、sources(抓哪) | 是 |
| douyin-retro | 抖音侧自有数据,侧面印证打法(盲区兜底) | 否 |
