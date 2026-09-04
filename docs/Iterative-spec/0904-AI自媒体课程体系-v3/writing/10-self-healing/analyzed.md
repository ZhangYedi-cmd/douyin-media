---
topic: 自愈回路怎么接、熔断线画在哪、满轮之后怎么落地和上报
audience: 会用 Claude Code、没做过自动化流水线的学员；手上没有参考仓库，只有前几课自己做出来的东西
mode: new
series_context: 模块 2（质检闭环）第 4 课，全书第 10 课。上一课（09·裁判与选手分离）把判断权交给了独立的 dubbing-reviewer 子代理；本课把判、修、复判接成一个能自己转起来又能停下来的回路，是模块 2 的收口课，也是全书第一个从头到尾走完的完整 Loop。
---

## 核心问题

自愈回路的判、修、复判三步该怎么交棒，三轮熔断线为什么定在这，满轮之后状态怎么落、人怎么接手——一句话：回路要有客观出口，出口不是判得准不准，是有没有一条谁都认的停止线。

## 材料清单

- [事实/契约] `pipeline/2-create.md` 步骤 3-4 全文：配音合成、死气检查、多音字与同段两读的处理规则，以及步骤 4「配音审批（subagent 闸口，最多 3 轮 loop）」的完整流程描述（PASS 进步骤 5、FAIL 按改法修、上限 3 轮后停并升级人审）。是本课判、修、复判三步交棒和三轮熔断的第一真相源，可支撑第 1、2、3 节。
- [子代理定义] `.claude/agents/dubbing-reviewer.md`：裁判的边界（只判不改，Bash/Read/Grep/Glob 无 Edit/Write）、裁决口径表（六项检查点对应的裁决逻辑）、输出格式（VERDICT/ROUND/BLOCKING/NON-BLOCKING/SUMMARY）、以及「若 ROUND 已是 3，在 SUMMARY 明确写已达 3 轮上限，建议升级人审，勿强行往下」这条原文。可支撑第 1、2 节，是三轮上限这条工程约定的直接出处。
- [教训] `pipeline/lessons.md` L10、L16、L17、L18 四条：L10 多音字漏注音（háng→xíng）走 R1 FAIL 重合成；L16 depause 原地写导致 ffmpeg 静默截断、17 段死气全留着；L17 同段两读（děi/de）逐段注音无解，只能改文案；L18 增删段后 overrides 键位错位。四条都是真实发生过的坑，可支撑第 4 节「三类真实缺陷」的具体案例，也是排障句「多半是」的素材来源。
- [反例/口径参考] 旧稿 `docs/Iterative-spec/0904-AI自媒体课程体系-v3/plan/old-courses/v1-07-自愈机制与3轮熔断.md`：只当口径素材看，不能照搬其结论——里面的「单轮修复成功率 75%/18%/4%」统计表和「60% 到 70%」首轮直通率是编造数字（本仓库找不到出处，属于铁律 3 禁止的编造），`drafting_blocked` 也不是 `state.ts` 里的合法状态值，两处都不采用。有用的是它的三个自愈动作分类（死气/多音字/同段两读）思路，本课改成用真实教训 L10/L16/L17/L18 重写。
- [阶段契约] `pipeline/daily-run.md`「阻塞即上报」一节：凡导致当日无产出或流程挂起的事件，一律推文本通知给人（事件/根因/需要人做什么），只写本地日志不算上报；有一条真实教训做旁证（2026-06-30~07-05 连续 6 天空跑没人看见）。可支撑第 3 节熔断落地的上报动作。
- [状态定义] `tools/console/packages/core/src/state.ts`：`MetaStatus` 合法值只有 `ideated / drafting / review / approved / scheduled / published / rejected / retro_done`，没有「blocked」这个状态。本课熔断后 meta.yaml 停在 `drafting`，不新造状态值，也不能用「blocked」「pending」「failed」这类词描述状态（会被验收脚本判非法状态值）。
- [任务卡口径] 第 10 课任务卡「2. 本课要讲什么」第 5 条：`pipeline/2-create.md` 写的是 build 内 `tts.config.json` 的 `overrides`，`.claude/agents/dubbing-reviewer.md` 写的是 `rec/segment-overrides.json`，两处不一致，课程统一以 `tts.config.json` 的 `overrides` 为准，正文要点破这处不一致并给出取舍理由。
- [承接] `plan/handoff-ledger.md` 第 09、10 行：第 09 课第 09 课的成稿 `courses/09-裁判与选手分离.md` 和等价物 `writing/09-judge-player/final.md` 此刻都不存在（09 课与本课同批并发写），故本课开篇按台账第 09 行复述——第 09 课交付了 `dubbing-reviewer.md` 和一份判决，裁判独立了；结尾按台账第 10 行对表。

材料共 7 条，超过 5 条的门槛，进入下一步。

## 材料缺口

第 09 课「成稿里的裁决口径表」这份材料按任务卡第 4 块要求应该读，但第 09 课尚未成稿（并发写作，`writing/09-judge-player/` 目录此刻是空的）。缺口用两样东西补：一是 `.claude/agents/dubbing-reviewer.md` 本身就带着完整的六项裁决口径表（本课材料清单第二条），能替代这份材料撑住判、修、复判和熔断线两节；二是承接改按 `plan/handoff-ledger.md` 第 09、10 行走（任务卡第 5 块本就允许在成稿缺失时这样处理）。这处缺口和处理方式写进最终回复的未核实项清单。

三类真实缺陷（死气/多音字/同段两读）的修法本课不新编，直接用 `pipeline/lessons.md` 已登记的 L10/L16/L17/L18 四条教训，材料充分，不需要额外检索。
