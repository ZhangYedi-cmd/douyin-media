---
plan: fixed-from-card
length: standard
figures: none
sections: 4
---

大纲直接照任务卡 `plan/cards/04.md` 的「2.1 大纲」块展开，不生成候选方案、不停下来等人选。四节的数目、顺序、每节「二级标题：不分」的限定原样保留，没有做局部调整。以下补两处不算调整大纲结构、只是把任务卡里写得简略的地方在这里落成可执行的写作决定：

1. 第 1、2 节各自把两份文件合在一节里讲，任务卡没有规定两份文件谁先谁后。按材料里的下游消费顺序定序：`pipeline/1-ideate.md` 先读 positioning 再读 sources（可是 sources 放在第 2 节），`pipeline/2-create.md` 先读 persona 再读 style-guide（这两个也分属第 1、2 节）。真正决定顺序的是任务卡给的节名「positioning 与 persona：账号是谁、对谁说话」「style-guide 与 sources：怎么说话、素材从哪来」，节内两份文件就按节名给的顺序写：第 1 节先 positioning 后 persona，第 2 节先 style-guide 后 sources。
2. 篇幅定为 standard（3000 到 6000 字量级），不是心法课也不属于 SPEC/Loop/状态收敛/反哺四块重点，但四份文件各自要给规格表、判据、正反例、Prompt 块，量下来天然超三千字，不为了凑「工具操作类课程从简」硬砍判据。

## 1. positioning 与 persona：账号是谁、对谁说话
核心判断: 定位和人设两份文件要写成能被下游用来排产的判断句，不是形容词堆砌——「技术深度和流量型六比四」能拿去排选题，「有深度又有趣」不能。
支撑材料: `brain/positioning.md` 全文（6:4 配比、不做什么三条）、`pipeline/1-ideate.md` 输入节（配比数字被选题环节直接消费的出处）、`00-ADR.md` D12（记忆锚点原句出处）、`brain/persona.md` 全文（待补充清单，反过度编造的证据）
交付物: 两份规格表（各自：这份管什么问题 / 填对的判据 / 一处反例）+ 两个 Prompt 块（先出方案让人选，再落盘 positioning.md 与 persona.md，遵守学员不写代码只出中文判据的铁律）
二级标题: none
收尾交接: 账号是谁定完了，下一节定它怎么说话、素材从哪来。

## 2. style-guide 与 sources：怎么说话、素材从哪来
核心判断: 语气规范和信息源两份文件要写成可执行的判据（禁用词表、句式范例、信息源清单 + 抓取方式），不是「口语化、有梗」这类无法照做的形容词。
支撑材料: `brain/style-guide.md` 全文（时长/结构/张数数字化，违禁词与视觉资产两节留白示例）、`brain/sources.md` 全文（三层关键词矩阵）、`pipeline/2-create.md` 输入节（persona/style-guide 被创作环节消费的出处）
交付物: 两份规格表（同结构）+ 一份「不许出现判不了的词」清单示例（正例 / 反例各一条）+ 一个 Prompt 块（落盘 sources.md 的三层词表骨架）
二级标题: none
收尾交接: 四份能填的都填完了，下一节说清楚第五份 `benchmarks` 为什么现在必须留空。

## 3. benchmarks：为什么现在留空
核心判断: `benchmarks.md` 要靠真实播放数据才写得出来，现在硬填等于编数字，留空并写清「第 22 课复盘之后才长出第一行」这句注释，比编一个假数字更诚实。
支撑材料: `brain/benchmarks.md` 的真实记录（首次落地 2026-07-17、此前空置 20 多天、`douyin-ideate` 那段时间读到空表按纯先验打分；打法证据结构：几个数据点同向、正反例、报告路径）
交付物: `benchmarks.md` 骨架（只含一句留空说明 + 待填字段名，不含数字）
二级标题: none
收尾交接: 文字判断都写完了，配音这件事还有一份需要当场定的配置——语速、音色、多音字规则。

## 4. tts.config.json：音色、语速、多音字规则住配置
核心判断: 这些规则要写进配置文件而不是写进代码或口头交代，后面模块 2 的 Loop 要靠这份配置的 `overrides` 字段接住多音字修复。
支撑材料: `brain/tts.config.json` 全文字段、`pipeline/2-create.md` 步骤 3（配置从账号级模板复制进 `build/`、沉淀性读法回写模板的流转）
交付物: 一个 Prompt 块（生成 `brain/tts.config.json`，字段含音色、语速、多音字词典占位）
二级标题: none
收尾交接（全篇收尾，衔接 `handoff-ledger.md` 第 04 行）: 账号大脑写完了，AI 知道你要什么内容了。现在真去做一条出来，从稿子到成片要走几步？
