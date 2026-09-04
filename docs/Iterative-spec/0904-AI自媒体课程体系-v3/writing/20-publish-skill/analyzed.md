---
topic: 发布 Skill 与 dry-run（第 20 课）
audience: 用 Claude Code / Cursor、没做过自动化流水线、认知停在单轮对话的学员；本课手上已有第 19 课交付的飞书审核服务
mode: new
series_context: 模块 4「交付闸口」第 4 课（17 闸设在哪 → 18 飞书通道 SPEC → 19 飞书实现与按钮回流 → 20 本课）；教法档 L2
---

## 核心问题
怎么把「已审核内容 → 抖音真实发布」这个不可逆动作，封装成一个默认只拼命令不执行、只有拿到人授权信号才真发的 skill，并且发布成功后把状态记账收口到一个命令。

## 材料清单

- [出处/文档] `pipeline/4-publish.md` 全文（本仓库现行版）：发布流程三步（人点通过→server 拼命令推确认发布卡→人点确认才真发 `--publish`）+ 发布收尾三件记账（meta.yaml 终态、backlog.yaml 同步、dashboard.md 移出在制表）+ 用到的 skill 段落（douyin-publish 薄封装、字段映射、登录见 sau-setup.md）。可支撑第 2、3、4 节的判据表和 Prompt。
- [出处/文档] `.claude/skills/douyin-publish/SKILL.md`：铁律四条（只发 approved / dry-run 与 `--publish` 单信号决定 / 不假装成功 / cookie 失效不自动登录）、Step 0-5 工作流、用法三行命令。可支撑第 2、3 节的规格表和 dry-run 判据表。
- [出处/文档] `.claude/skills/douyin-publish/references/field-mapping.md`：sau 参数 / 来源字段 / 说明的完整映射表（`--title`/`--tags`/`--schedule`/`--file`/`--thumbnail`/`--images`/`--note`），含话题标签「逗号分隔不带 #」这个具体转换规则和视频/图文两条命令示例。可支撑第 2 节的规格表。
- [出处/文档] `.claude/skills/douyin-publish/references/sau-setup.md`：登录/校验/多账号三个命令的准确写法（`sau douyin check --account main` 返回 valid/invalid；`sau douyin login --account main --headed` 扫码）、cookie 存放规则、已知行为（上传成功日志关键词、sau 不一定带作品链接）。可支撑第 1 节的命令清单。
- [出处/文档] `pipeline/lessons.md` L5-L8 四条真实教训：L5（出审时没产 4-publish.md，确认发布卡报「缺标题」）、L6（发布时段写成可解析 bullet 被原样传给 `--schedule`）、L7（首发慢渲染超时，重试一次即过）、L8（UI 浮层挡住选择封面按钮，EXIT=1，清浮层重跑一次过）。可支撑第 3、4 节的排障句。
- [出处/文档] `tools/console/packages/cli/src/commands/publishDone.ts`：`media publish-done` 真实源码，三种模式（approved→published/scheduled 正常、scheduled→published 到点收尾、published 状态下仅补 `--url`），`--url` 校验 http(s) 前缀，`--scheduled` 时间必须晚于当前时间。可支撑第 4 节的用法说明。
- [出处/文档] `tools/console/packages/core/src/state.ts` 合法状态表：review 三条出边（drafting/approved/rejected）、approved 两条出边（scheduled/published，均走 publish-done）、picked→published（backlog 侧）。可支撑全文状态值核对，避免编造状态名。
- [出处/文档] GitHub `dreammis/social-auto-upload` 官方 README（WebFetch 读取）：抖音是「当前主线重构最完整」平台，CLI/Skill 均已接入；「为什么不自己写脚本」一段原文态度：把上传这种高频重复无聊的工作交给脚本和程序去执行。可支撑第 1 节交接句的立场，但不作为本课的安装素材（第 2 课已装完，不重装）。
- [出处/文档] 旧稿 `plan/old-courses/v1-09-包装social-auto-upload发布Skill.md`：只取口径不取结论。可用的口径——「发布不可逆」「dry-run 是在不可逆操作前建立一道强制的反射面」这类判断的表述角度；不可用的结论——它写的是 tools/social-auto-upload 固定路径、NODE_OPTIONS 环境变量、sessionid 弱探针失效这类本仓库现有材料里查不到出处的细节，本课一律不采纳。
- [出处/文档] 第 19 课成稿 `courses/19-飞书实现与按钮回流.md` 开篇与结尾：开篇复述「第 18 课把飞书闸口的四个决策点定死了……」；结尾原句「人点头这一关通了。点头之后真发出去这一步，怎么做才不会误发？」——这是本课开篇必须原样接的第一句。
- [出处/文档] `plan/inventory.md`「第 19 课结束时」一行：本课每条 Prompt 的输入必须落在这张清单里，尤其是五份阶段契约（含 `pipeline/4-publish.md`）、`media`（全量命令，含 publish-done）、飞书出站发卡+长连接收按钮闭环、`docs/00-toolchain.md`。
- [出处/文档] `courses/02-*.md` 第 3.1 节（social-auto-upload 装机）：学员自己第 2 课的实际操作是 `git clone` 到本机某目录（课文没有指定固定挂在 `tools/` 下）、`uv venv` 建虚拟环境、`uv pip install -e .` 注册 `sau` 命令、`sau douyin login --account main` 扫码、cookie 落在「项目目录下的 `cookies/`」。这条材料决定第 1 节不能照抄参考仓库 SKILL.md 里 `SAU_DIR=/Users/yedi/douyin-media/tools/social-auto-upload` 这个硬编码路径，只能说「你第 2 课装的那个目录」。

## 材料缺口
- 参考仓库 SKILL.md/sau-setup.md 里的固定安装路径 `tools/social-auto-upload`、`SAU_DIR` 变量名，是参考仓库自己的约定，学员没有；正文一律改写成「你第 2 课装的 social-auto-upload 目录」，不点名具体路径。
- 旧稿 v1-09 里 NODE_OPTIONS 污染、sessionid 弱探针这两处细节在本仓库现有材料（SKILL.md/sau-setup.md/lessons.md）里查不到出处，判定为不采纳，不写进正文。
- 抖音定时发布窗口「约 2 小时至 14 天」只在 field-mapping.md 和旧稿里出现，没有平台官方数字来源，写成「field-mapping.md 里记的起步值」而非普适规律。
