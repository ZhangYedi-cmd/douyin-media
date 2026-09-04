---
plan: fixed-from-card
length: standard
figures: none
sections: 3
---

大纲照任务卡「2.1 大纲」块原样展开，节的数目（3 节）和顺序未动。局部调整两处，均在任务卡允许的范围内：

1. 任务卡第 2 节第 1 条写「旧 04 课下半 + 补 5 条 prompt（现在只有 check-silence 一条）」，但 `plan/inventory.md` 第 07 课结束时一节「skill与子代理」只有 `tts-dub` skill，没有任何 `dubbing-check` 相关文件；任务卡「2.1 大纲」的交付物段落本身也写的是「Prompt A（造样板）」造 `check-completeness.mjs`、「Prompt B（批量复制）」照样板造剩下五个（含 `check-silence.mjs`），六个脚本合计走完，跟 inventory 对得上。本课按 inventory 和 2.1 大纲的实际 Prompt 设计写：六个脚本 + `depause.mjs` 全部是本课新造，不引用一个学员此刻还没有的旧 `check-silence.mjs`。这一处不是改大纲，是两处材料打架时选了 inventory 和大纲交付物一致的那个读法，已在交付回复的未核实项里注明。
2. 任务卡「2.1 大纲」第 4 块「数字有了，判断还没交出去」不是一个带 Prompt 交付物的内容节，是本课的收尾段（本课做到了什么/还看不到什么/下一课补什么/结尾抛出的问题），按 00-写作背景包第 5 节「每课形状」的收尾体例处理，不算第 4 个编号节，因此 `sections: 3`。

## 1. 六个脚本的共同契约：先定形状，再动手写
核心判断: 一项检查能不能自动下 PASS/FAIL，不是写脚本那一刻才发现的，第 07 课那三条判据已经把六项检查点分成了两类——能断言的三项该是硬门槛，退出码非 0 即 1；只能候选的三项该是建议，只列风险点不下结论，退出码恒为 0；这条边界要写进六个脚本共同的契约，不留给每个脚本自己决定。
支撑材料: 第 07 课成稿第 3.1 节六行检查点表（真相源不同步/合成不全/段内死气三项机器判，语速离群/多音字读错/组件大字与口播不一致三项人判）；`.claude/skills/dubbing-check/scripts/` 六个脚本的真实退出码分布（三个 `process.exit(bad?1:0)`，三个全程无 `process.exit` 恒 0）核对了分类边界站得住。
交付物: 一条 Prompt，产出一张六行表：脚本名 / 检查点 / 属于哪一类 / 退出码策略。
二级标题:
  1.1 输入统一：都读 build/ 里的 audio-segments.json，用同一个"工程目录"当命令行参数
  1.2 输出统一：每段一行 ✗/✓，末尾一句汇总结论
  1.3 退出码分两类：完整性/死气/真相源同步判 FAIL 直接 exit 1；语速离群/多音字/音画一致只列候选，恒 exit 0
收尾交接: 契约定完，六个同构的脚本谁先写、剩下的怎么批量出，需要一个样板。

## 2. 造一个样板，照样板批量复制剩下五个
核心判断: 六个脚本结构同构，不该写六条 Prompt 一个个造，该写一条钉死样板、一条照样板批量复制——Prompt 数量跟着脚本数量线性增长，就是没用上契约已经定死这件事。
支撑材料: `check-completeness.mjs` 全文（读 audio-segments.json、逐段核对 mp3 存在/非 0 字节/时长、段数一致、`process.exit(bad?1:0)`）当样板案例；`content/2026-08-23/claude/build/rec/depause.mjs` 头部注释三条铁律（只切静音区中段不切词、绝不原地写、跑完必复扫）当 depause 的参数契约来源，不照抄它的 `--dir --cap --minact` 命令行签名。
交付物: 两条 Prompt——Prompt A 造样板 `check-completeness.mjs`；Prompt B 照样板批量复制剩下五个脚本（`check-silence.mjs`、`check-source-sync.mjs`、`check-pace.mjs`、`check-pronunciation.mjs`、`check-av-consistency.mjs`）与 `rec/depause.mjs`（按三条约束定参数契约，不钉死具体命令行格式）。
二级标题:
  2.1 挑一个硬门槛类先造样板（完整性检查最简单：文件存在、非 0 字节、时长大于 0）
  2.2 照样板批量复制剩下五个，含 depause.mjs
收尾交接: 六个脚本 + depause.mjs 都能跑了，但各自为政，还没打包成一个可复用的整体。

## 3. 打包成 skill：一份 SKILL.md 把脚本变成检查清单
核心判断: 脚本单独能跑不等于能被下一课的裁判直接复用，裁判要知道该按什么顺序跑、每项检查点对应哪个脚本、跑出的结果怎么读，这层说明书是 SKILL.md 的活，不是脚本自己的活。
支撑材料: `.claude/skills/dubbing-check/SKILL.md` 全文当形状参考（正文按「参考流水线里……」引用，不当学员自己已有的文件）；`pipeline/2-create.md` 步骤 3 与 `pipeline/lessons.md` L16/L17/L18 确认 overrides 口径统一按 `tts.config.json`，与参考 SKILL.md、`check-pace.mjs` 里的 `rec/segment-overrides.json` 不一致，正文点破这处不一致并统一口径。
交付物: 一条 Prompt，产出 dubbing-check 的 SKILL.md，按检查点编号列出每个脚本对应哪个检查点、怎么调用、退出码怎么读，末尾给一条按合成前/合成后/录屏前顺序串起来的一页流程清单。
二级标题: 不分
收尾交接: 全量 dubbing-check skill 交付完成，六项检查点从表变成了能跑的脚本，退出码按能断言/只能候选分成了两类，打包进了一份 dubbing-check skill；脚本只负责吐数字和候选清单，PASS 还是 FAIL 现在还是学员自己拍板；下一课把判断这件事从学员手上交给一个独立的裁判角色；结尾抛出的问题：六个脚本能出数字了，可下判断的还是你。让写稿的那个 AI 自己判自己的活，行不行？
