---
name: douyin-retro
description: 抖音作品复盘引擎。复用 social-auto-upload 的 cookie 免扫码拉创作者中心后台数据,用传播漏斗定位每条作品"漏在哪一环",产出归因报告 + 大脑变更提议(brain/benchmarks.md 等),人审后应用,不自动改 brain。属熵增治理线(harness/retro.md),不是生产流水线阶段。当用户说"复盘""拉数据""这条为什么火/不火""作品数据分析",或发布后 24h/72h/7d 跟踪时使用。触发:复盘、retro、作品数据、为什么火、完播率、涨粉分析。
---

# douyin-retro · 抖音作品复盘

> 用数据回答「这条为什么火/不火」,把结论沉淀回账号大脑。
> 触发方式:**手动**(`/douyin-retro [slug|all]`)。定时 cron 待手动验稳后再加。

## 干活前必读
1. `brain/benchmarks.md`(历史均值基线、已知有效打法)、`brain/positioning.md`(支柱定位)。
2. `harness/retro.md`(治理任务约束)、`harness/README.md`(治理线宪法)。
3. 本 skill 的 `references/funnel-attribution.md`(归因模型,核心)。

## 流程

### 1. 采集(已实测可用)
```bash
cd tools/social-auto-upload
.venv/bin/python <skill>/scripts/fetch.py --out /tmp/retro.json --keep-xlsx content/_research/
```
- 免扫码,复用 `cookies/douyin_main.json`。
- 退出码 2 = cookie 失效 → 提示用户跑 `sau douyin login` 刷新,**停止,不要拿空数据硬分析**。
- 产出 JSON:`{account:{peer_benchmark:[...]}, works:[{16字段}]}`。
- 字段映射 + 通道细节见 `references/data-channel.md`。

### 2. 分析(逐条 + 横切)
对每条目标作品(指定 slug 则该条;`all` 则全部 `status=published`):
1. 算互动率 = (likes+collects+comments+shares)/plays。
2. **漏斗定位**:每一环(ctr→bounce_2s→finish_5s→finish_rate→互动率→fans_delta)对比三基线(同类百分位 / 历史均值 / 同支柱均值),找**最先低于基线的环 = 主漏点**。
3. **归因**:查 `funnel-attribution.md` 症状→病因→动作表,给具体动作。
4. **横切**:按支柱/体裁/时长/来源分组比均值,找系统性规律。
> 红线:只用真实拉到的数,不臆造、不外推。缺的指标(如流量来源 v2 未采)就标"未采",不编。

### 3. 产出
- 每条:写该内容目录的 `5-retro.md`(用 `content/_template/5-retro.md`):数据快照 + 漏斗诊断 + 主漏点 + 归因 + 动作清单。
- `meta.yaml`:status → `retro_done`,填 timestamps.retro_done。
- `dashboard.md`:更新「数据汇总」表。
- 原始 xlsx 留 `content/_research/`(可追溯)。

### 4. 产「大脑变更提议」给人审(治理线铁律:不自动改 brain)
按 `funnel-attribution.md` 第四节,把建议的大脑变更**列进执行记录报告**,每条注明"依据哪次复盘、哪条数据",**人审通过后才由人(或经授权的 AI)应用**:
- 有效打法 + 刷新历史均值基线 → 建议改 `brain/benchmarks.md`。
- 高表现信息源 → 建议给 `brain/sources.md` 打标。
- 评论热词/衍生线索 → 建议进 `content/_backlog/`。
- 画像/涨粉系统性异常 → 建议动 `positioning.md`/`persona.md`,附依据。
> **铁律**:复盘只产报告与变更提议,**绝不自动改 `brain/` 或线上资产**——与治理线宪法、发布铁律一致(`harness/README.md`)。

## 时机(对齐 harness/retro.md)
发布后 **24h / 72h / 7d** 各跑一次,看衰减与长尾。手动随时可跑。

## 待扩展(v2)
作品详情深钻:流量来源占比、留存曲线、观众画像、评论热词(见 `data-channel.md` 末)。需单条 awemeId,DOM 抓兜底。补上后归因表的 v2 行(搜索流量、画像)才能用。
