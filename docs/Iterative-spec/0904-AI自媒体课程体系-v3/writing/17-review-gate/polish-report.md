# 润色报告：第 17 课「人审闸口」

## 一、diagnosis.md 逐项处理

1. 读不懂（闸口位置一节自我指涉句、自愈回路对比段）：删掉"这句话听着像是同义反复""这张表看着有点反直觉"两处猜心句式的自我评价，改成直接陈述判断；自愈回路对比段保留（诊断认为该段内容本身有价值，只是需要先给结论），调整为先给"两条不同维度"这个结论，再展开两条各自解释。
2. 太啰嗦（三张表都是"正文全讲一遍加表格再列一遍"）：判据一节、闸口位置一节的表格前正文大幅精简，具体命令名、错误码等细节从正文挪进表格单元格里只出现一次，正文只留判断和推理；闸口位置一节删掉了对"三条出边都可逆代价小"这个结论的第二次重复论证，合并成一处。
3. 逻辑断裂（Prompt 出现在答案已经讲完之后，沦为复述）：判据一节、闸口位置一节都改成先给判断和推理（不带具体命令名的细节），再给 Prompt，再把表格标注为"参考流水线跑这条 Prompt 整理出的样子"，表格不再是对正文的第二次重复，是 Prompt 的产出示例。
4. AI 味（"不是……是……"翻转句、工整对仗句、节标题模板感）：删掉收尾一节"不是这一课漏了，是这一课的判据够不到这一层"这句，改成直接说判据够不到这一层；判据一节开头"能撤回的……不能撤回的……"对仗句改写为不对称的白话表述。节标题维持任务卡「2.1 大纲」原定的四个标题，不改（大纲已锁定，不属于本轮可调整范围）。
5. 装（导游腔四处、猜心句变形两处）：四节结尾"接下来要/定/是……"全部删除或改写成内容驱动的自然承接（例："四类判据定完，这些动作各自落在状态机的哪条出边上，是下一步要查的事"）；猜心句变形两处已在第 1 条处理。
6. Prompt 输入错位（本课特有，最关键的一项）：
   - 判据一节的 1008 错误码细节，原文没有区分这是参考流水线 `pipeline/2-create.md` 里的真实值还是读者自己文件里已有的内容。final.md 加了"参考流水线的"限定语，并在表格后新增一段：读者自己的 `pipeline/2-create.md` 如果没有这个细节，不代表写错了，判据看的是花钱这件事本身，不是这一个具体错误码；Prompt 本身也加了一句"你的文件里没写到的地方就留空，不要替我猜"。
   - 闸口位置一节的 dry-run 铁律措辞同样加了"参考流水线的"限定语；Prompt 里把 `pipeline/3-review.md`、`pipeline/4-publish.md` 改成"我自己的"，并加一句"我自己的阶段契约文件如果还没写到这个细节，留空或标注待补，不要替我编"，避免暗示读者文件里已经有这些内容。
   - `state.ts` 的三条出边判定为读者第 12 到 16 课走 SPEC 六步亲手写出的状态机，属于读者自己应有的东西，不算材料越界，未加限定语，与诊断结论一致。
   - 卡片一节的 Prompt（补六项判据进 `pipeline/3-review.md`）诊断认为是全文唯一处理正确的示范，未改动。

## 二、终检五遍法的主要修改

1. 结构遍：标题、四节顺序和数目与 outline.md、任务卡「2.1 大纲」一致，未调整；开头承接第 16 课结尾原句复述，结尾抛出的问题与 outline.md、handoff-ledger.md 第 17 行一致。
2. 论证遍：四类不可逆判据、三条状态出边、六项人审判据均有真实文件路径或代码出处支撑，未发现无支撑论点。
3. 句子遍：处理 check_style.py 报的 7 处长句警告中的 6 处（在语义断点切成句号），剩余 1 处（判据一节"如果 AI 把某个只改了一个字段……"）保留，因为冒号加分号的结构已经把三层意思断清楚，硬切反而破坏对照关系。
4. 温度遍：全文正文（代码块外）"我"出现 0 次、"咱们"出现 0 次，未超配额；卡点拦截（"多半是"）2 处，达到实操篇最低要求；未做额外补温度手法，避免为凑配额硬加。
5. 符号遍：`check_style.py` 硬禁令 0 命中，警告 1 处（已在句子遍说明保留理由）。

## 三、验收结果

- `check_style.py`：硬禁令清零。
- `check-lesson.sh <final.md> 实操`：`RESULT: PASS`。汉字 4298（上限 10000，仅报数不卡）；代码行 24（上限 200）；围栏块 3；排障句 2；状态值 approved/drafting/rejected/review 全部在 `state.ts`；命令 `media check`/`media flip`/`media publish-done`/`state.ts` 均在仓库找到。
- 材料可溯：文中出现的路径、命令、脚本名（`pipeline/2-create.md`、`pipeline/3-review.md`、`pipeline/4-publish.md`、`tools/console/packages/core/src/state.ts`、`sau douyin upload-video`、`douyin-publish`、`tts-dub`、`feishu-notify`、`MiniMax`、`requiresReason`、`audit.jsonl`、`backlog.yaml`、`dashboard.md`、`brain/positioning.md`）逐条 grep 确认存在；`docs/spec/media/03-施工记录.md` 是第 16 课交付物的名字，不在参考仓库里，只在课程规划文档（inventory.md、handoff-ledger.md、任务卡 16/17）里出现，属于正常的课程产物引用，不算材料缺失。

## 四、第二轮修改：state.ts 路径误当成读者自己的文件

主回话验收后指出一处材料越界：全文四处把参考仓库的 `tools/console/packages/core/src/state.ts` 当成了读者自己的文件路径直接引用（开篇输入、第 1 节 Prompt、第 2 节开头、第 2 节 Prompt），第 13、14 课从没给读者定过这个具体路径，读者手上有的是第 14 课造的 core 包里的 state 模块，路径由自己的 SPEC 定。逐处改法：

1. 开篇「输入」一句：`tools/console/packages/core/src/state.ts` 改成「你第 14 课造的 core 包里 state 模块的 review 状态三条出边（路径按你自己 SPEC 里定的来）」。
2. 第 1 节 Prompt：`tools/console/packages/core/src/state.ts` 改成「我 core 包里的 state 模块」，前面几个 `pipeline/*.md` 也统一加了「我的」。
3. 第 2 节开头段：`tools/console/packages/core/src/state.ts` 改成「你第 13 课 SPEC 里定的状态机」；`state.ts` 里 `requiresReason: true` 这个字段名改成描述行为本身（`media flip` 要求 `rejected` 这条边必须带 `--reason` 参数）而不点具体字段名；2026-08-18 增补的那条注释明确改成「参考流水线的 state 模块里」的注释，并补一句：读者自己的 SPEC 如果没留 `approved` 退回 `drafting` 这条边，`approved` 就是单向的，不影响这一课的判据，真正不可逆的边始终在 `approved` 之后，两种情况下结论都成立。
4. 第 2 节 Prompt：`读 tools/console/packages/core/src/state.ts` 改成「读我 core 包里的 state 模块」；表格前加一句框定「参考流水线跑出来的表大致是这样，如果你自己的 SPEC 没留 approved 退回 drafting 这条边，把对应那一行删掉」，避免表格里 approved→drafting 那一行被误当成读者必然拥有的边。
5. 第 3 节「`state.ts` 里 `review` 其实还有第三条出边」改成「你自己的状态机里 `review` 其实还有第三条出边」。

三条边的存在、`media flip`/`media publish-done` 命令名、`rejected` 需要 `--reason` 这个行为本身，保留为读者自己的东西不改——这些是第 12 到 16 课 SPEC 六步方法实际教出来、且课程目标就是 1:1 复刻参考仓库的部分，`--reason` 参数在仓库真实代码（`tools/console/packages/cli/dist/commands/flip.js`、`server/src/actions/whitelist.ts`）里核实过。只有具体文件路径、TypeScript 字段名、代码注释这几样参考仓库特有的实现细节改成了限定语气。

改完重跑三关：`check_style.py` 硬禁令清零（警告 1 处，与第一轮相同，未新增）；`check-lesson.sh <final.md> 实操` 输出 `RESULT: PASS`，命令核对新增 `media flip` 与 `media publish-done` 均 `ok`（`state.ts` 字符串已不在正文出现，脚本按原样跳过，不影响判定）；材料可溯逐条复核，无新增未核实项。
