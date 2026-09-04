---
plan: fixed-from-card
length: standard
figures: none
sections: 5
---

大纲照任务卡「2.1 大纲」块原样展开，节的数目、顺序、每节的核心判断和交付物均未改动。唯一的局部调整：任务卡第 5 节标题「真发或 dry-run 到底」在结构上对应本课的收尾小节（同第 19 课「5. 收尾」的位置和写法），故本大纲把它列为「5. 收尾」，内容仍是任务卡原文的「做到了什么 / 还看不到什么 / 结尾问题」三件事，不新增判断，不删减信息。

记忆锚点：发布前最后一次确认，不是走流程，是把要发的东西原样摆给人看一遍。

开篇契约：接第 19 课成稿结尾原句「人点头这一关通了。点头之后真发出去这一步，怎么做才不会误发？」；本课输入是学员自己第 2 课的 `docs/00-toolchain.md`（social-auto-upload 那条安装记录+全绿自检）、第 3 课立的 `pipeline/4-publish.md` 骨架、第 19 课的确认发布卡（人点确认带的授权信号）、第 14-16 课交付的全量 `media` 命令（含 `publish-done`）；本课产出一个 `douyin-publish` skill + 一次真发或 dry-run 到底。

## 1. 登录抖音：环境已经装好，这一课只做账号绑定
核心判断: social-auto-upload 第 2 课已装好环境（uv + Python 虚拟环境 + 浏览器内核），这一课不重装，只做账号相关的事——cookie 存哪、扫码登录、登录态验证，这些是每个账号各自的动作，不是通用工具安装。
支撑材料: `.claude/skills/douyin-publish/references/sau-setup.md`（登录/校验命令原文）、`courses/02-*.md` 第 3.1 节（学员自己的装机记录、cookie 落在项目目录下 cookies/）
交付物: 登录与验证命令清单（`sau douyin login --account main --headed` 扫码登录 → `sau douyin check --account main` 验证 valid）
二级标题: none
收尾交接: 账号登录验证过了，接下来把发布这件事封装成一个能被飞书服务调用的 skill。

## 2. douyin-publish 封装：一张规格表定映射
核心判断: 这是 L2 的活，先让学员填一张规格表（content 条目字段怎么映射成 sau 参数），再用两三条 Prompt 让 AI 按表实现 skill。
支撑材料: `.claude/skills/douyin-publish/references/field-mapping.md`（sau 参数/来源字段/说明完整映射）、`pipeline/4-publish.md`（发布物料字段定义）
交付物: 字段映射规格表（sau 参数 / 来源字段 / 说明）+ 两条 Prompt（照 4-publish.md 物料字段实现读取与校验逻辑；把校验结果拼成完整 sau 命令与物料摘要）
二级标题: none
收尾交接: skill 能拼命令了，命令拼完之后能不能直接执行，是这一课真正的红线。

## 3. dry-run 铁律：先摆出来，人点头才发
核心判断: 发布不可逆，默认就是 dry-run——不带发布信号只拼完整命令和物料摘要给人看、绝不执行；只有带上发布信号（人已在飞书确认发布卡点过头）才真发，不是「先 dry-run 再问一遍」，这一个信号本身就代表已拿到授权。
支撑材料: `.claude/skills/douyin-publish/SKILL.md` 铁律 2（dry-run/`--publish` 单信号）+ Step 3/4 工作流、第 19 课确认发布卡（授权信号来源）
交付物: dry-run / 真发两条路径的判据表 + 一条 Prompt（验证 dry-run 路径只拼命令不执行）
二级标题: none
收尾交接: 命令能安全拼出来、安全发出去了，最后要把这次发布记进真相源。

## 4. 记账收口：发布成功之后喊 media publish-done
核心判断: 发布收尾是全流水线状态记账的唯一位置，不再手改 meta.yaml 或 backlog.yaml——发布成功后直接喊 `media publish-done <slug>`，第 12-16 课造的这个入口第一次真正派上用场；失败原样重试一次（L7、L8 两次真实失败都是重跑一次就过），仍失败才转人工，且不调用 publish-done。
支撑材料: `pipeline/lessons.md` L5-L8、`tools/console/packages/cli/src/commands/publishDone.ts`（真实源码三种模式）、`pipeline/4-publish.md` 发布收尾三件记账
交付物: `pipeline/4-publish.md` 模板字段全文 + `media publish-done` 用法（含 `--scheduled`、`--url`）
二级标题: none
收尾交接: 安全发布的技术条件都齐了，剩下是真的按下去。

## 5. 收尾
本课做到了什么、还看不到什么、下一课补什么: 有真实抖音号的学员这里可以走完一次真发，看着 media publish-done 把状态和链接一次记完；没有号的 dry-run 走到底，停在完整命令和物料摘要这一步，同样算完成这一课。生产线从取题到发布整条通了，但它现在只会消费资产。
结尾抛出的问题（逐字照台账第 20 行）: 生产线从取题到发布整条通了，可它只会消费资产：选题池会空，大脑不会自己长。谁来保养这些资产，按什么纪律改？
