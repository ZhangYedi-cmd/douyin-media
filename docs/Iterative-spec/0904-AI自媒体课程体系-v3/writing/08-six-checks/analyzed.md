---
topic: 把第 07 课定案的六项检查点表，逐条造成能跑的检测脚本，打包成 dubbing-check skill
audience: 会用 Claude Code、没做过自动化流水线、手上没有参考仓库，只有前几课自己做出来的东西
mode: new
series_context: 《AI 自媒体流水线》v3 第 08 课，模块 2（质检闭环）第二课，L1 教法档
---

## 核心问题
第 07 课定案的六项检查点表（量什么/怎么量/阈值/谁来判），怎么变成能跑出数字的脚本，并且哪三项能自动下 PASS/FAIL、哪三项只能列风险点给人看，这条界线该在写代码之前定死，不该等到写某一个脚本时才现拍。

## 材料清单
- [出处] 第 07 课成稿全文 `docs/Iterative-spec/0904-AI自媒体课程体系-v3/courses/07-反馈信号从哪来.md`：开篇「上一课交付了一张填完第 4 列的验证信号去向表……本课产出一件东西：一张配音批次检查点表」，结尾「下一课把这六项逐条造成脚本。表还只是表，怎么变成能跑出数字的脚本？」。第 3.1 节六行四列检查点表（真相源不同步/合成不全/段内死气三项归机器判，语速离群/多音字读错/组件大字与口播不一致三项归人判）是本课 Prompt 的直接输入，可支撑第 1、2 节的分类依据。
- [案例] `.claude/skills/dubbing-check/scripts/` 六个脚本全文（`check-completeness.mjs`、`check-silence.mjs`、`check-source-sync.mjs`、`check-pace.mjs`、`check-pronunciation.mjs`、`check-av-consistency.mjs`）：真实核对过退出码分布——`check-completeness.mjs`、`check-silence.mjs`、`check-source-sync.mjs` 三个脚本结尾都是 `process.exit(bad ? 1 : 0)`，是硬门槛；`check-pace.mjs`、`check-pronunciation.mjs` 全程没有 `process.exit` 调用、脚本跑完直接正常退出，`check-av-consistency.mjs` 只在找不到 `src/chapters` 目录这种环境错误时 `exit(1)`，判断本身跑完没有显式 exit，三者都是恒 0 的候选类。可支撑第 2 节样板与批量复制的退出码依据。
- [案例] `.claude/skills/dubbing-check/SKILL.md`：全文读过，是学员本课要产出的同名文件的形状参考，不是学员自己的文件——它写的是 4 个检查点（开工前/合成后/录屏前/录屏后）、`rec/segment-overrides.json`、克隆音色 UUID 这类参考仓库细节，课文引用时要标成「参考流水线里……」，不能让读者以为自己也有这份文件。可支撑第 3 节打包 SKILL.md 一节怎么写。
- [案例] `content/2026-08-23/claude/build/rec/depause.mjs` 全文：唯一真实存在的 depause 实现，用 `--dir --cap --minact` 命令行参数、按目录批处理（不是位置参数、不是单文件），文件头注释明写三条铁律：只切静音区中段不切词、绝不原地写（`in==out` 时 ffmpeg 截断输入静默成功）、跑完必须用 silencedetect 复扫验证违规数为 0。可支撑第 2 节 depause 三条约束不断言具体命令行格式。
- [出处] `pipeline/2-create.md` 步骤 3（配音）：明确写了 overrides 落点是「build 内的 `tts.config.json`」（多音字/单段语速问题加 build 内 config 的 `overrides`，沉淀性读法规则回写 `brain/tts.config.json` 模板），死气检查阈值 0.45 秒、`rec/depause.mjs` 参数示例 `cap 0.25 / minact 0.45`，以及第 4 步「配音审批（subagent 闸口）」提到 dubbing-check 的合成后检查点。可支撑 overrides 口径统一、承接第 09 课裁判闸口的伏笔。
- [出处] `pipeline/lessons.md` L16、L17、L18：L16 是 kimi-k3 案例，depause 原地写导致静默失败（17 段跑完不报错、死气全留着），对应 `2-create.md` 步骤 3 的「必须写临时文件再 move、跑完必复扫」；L17 是同段两读冲突无解案例；L18 是删段后 overrides 键未重排导致注错段的案例。三条都统一用 `tts.config.json` 的 `overrides` 措辞，没有一处提 `segment-overrides.json`，可确认课程口径以 `tts.config.json` 为准，与 SKILL.md/`check-pace.mjs` 里的 `rec/segment-overrides.json` 不一致，写作时要点破这处不一致。
- [出处] `plan/inventory.md` 第 07 课结束时一节：确认学员在本课开始前，`skill与子代理` 一栏只有 `tts-dub` skill，没有任何 `dubbing-check` 相关文件——本课六个脚本和 `depause.mjs`、`SKILL.md` 全部是新造，不是「补齐旧 04 课已有的 check-silence」。任务卡第 2 节第 1 条「现在只有 check-silence 一条」的措辞与 inventory 不一致，本课按 inventory 写：六项全部从零造。可支撑开篇「本课产出一件东西」的措辞和材料缺口判断。
- [出处] `plan/handoff-ledger.md` 第 08 行：计划交付「一个全量的 dubbing-check skill（六个检测脚本 + depause.mjs + SKILL.md）」，本课开头接的点「表要变成能跑出数字的东西。这一课把六项逐条造成脚本」，结尾抛出的问题「六个脚本能出数字了，可下判断的还是你。让写稿的那个 AI 自己判自己的活，行不行？」。写完拿成稿结尾核对这三行，供交付时判断台账要不要改。

## 材料缺口
- `check-pronunciation.mjs`、`check-av-consistency.mjs`、`check-pace.mjs` 三个候选类脚本没有真实的"人核对之后怎么记录结论"的落点样例，课文里只讲清楚它们只列风险点、退出码恒 0，不展开候选类脚本判完之后结论记在哪（那是第 09 课裁判要处理的事，本课不越界）。
- `SKILL.md` 打包一节没有真实的"一页流程"贴工位清单案例可直接复用（参考仓库那份是 4 个检查点，本课是按 07 课定案的合成前/合成后/录屏前三个时点重新组织），写作时按 07 课的三条判据（机器判三项、人判三项）自己组织清单顺序，不照抄参考仓库那份。
- 材料清单已有 8 条，超过阈值 5 条，不需要检索或问用户，直接进 Step 2。
