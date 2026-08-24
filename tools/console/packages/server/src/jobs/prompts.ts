// prompt 单一真相源（02-后端执行方案.md §2.6；沿 tools/feishu-bot/prompts.py 纪律：改 prompt 只动这里）。
// 措辞承接 feishu-bot 实测有效版本，仅把授权来源从「飞书确认卡」改为「看板」、记账动作改为 M2 后的 media 命令。

export const ALLOWED_TOOLS = ['Bash', 'Read', 'Write', 'Edit', 'Skill']

export const publishPrompt = (slug: string): string =>
  `人已在看板工作台的发布确认对话框（含 dry-run 变更预览）点「确认发布」授权发布条目 ${slug}` +
  `（这就是 --publish=已确认）。调用 /douyin-publish ${slug} --publish 直接真发到抖音：` +
  `dry-run 照常执行并核对输出——免去的只是人工确认等待（人已在界面确认），不要再问我确认、` +
  `不要只打印命令，核对无误后直接执行 sau 命令完成发布，` +
  `再按 skill Step 5 完成记账（media publish-done）。若 cookie 失效就如实报失败、不要自动登录。`

export const reworkPrompt = (slug: string, dir: string, reason: string, nth: number): string =>
  `内容条目 ${slug}（目录 ${dir}）被人在看板打回，这是第 ${nth} 次重做，打回原因：${reason}。` +
  `请读 pipeline/2-create.md 与该条目的 1-brief.md、2-script.md、3-review.md，针对原因重做创作` +
  `（口播稿改 2-script.md，必要时重配音/重录屏），完成后用 media flip ${slug} review 翻回出审、` +
  `在 3-review.md 记一行重做说明，并按 pipeline/3-review.md 经 feishu-notify 重新推审核卡。` +
  `若遇到需要人工对齐的节点，停下并在 3-review.md 记录待办，不要假装完成。`

export const applyProposalPrompt = (report: string): string =>
  `报告 ${report} 中的大脑变更提议已由人在看板逐条人审通过（这就是应用授权）。` +
  `读该报告的「变更提议」部分，把通过的提议应用到 brain/ 对应文件；除下述账本收尾外只允许改 brain/ 下的文件；` +
  `改完运行 git diff -- brain/ 并把 diff 原样输出；随后把 harness/logs/index.jsonl 中该报告对应行的 ` +
  `applied 置 true（治理账本收尾——2026-08-18 拍板）；不要做任何发布动作或状态翻转。`

// 2026-08-19 增补两条（用户走查提的手动触发能力，H 号执行；02-后端执行方案.md 未覆盖此二型，
// 契约——JobType/Job.task/超时/label——由总指挥直接在 api-types.ts/defs.ts 落地，措辞对齐上面两条已有 prompt）。

export const harnessRunPrompt = (task: string, skill: string): string =>
  `人已在看板工作台手动触发治理任务 ${task}（执行技能 ${skill}），这就是本轮执行的授权来源。` +
  `请先用 Read 读 harness/tasks.md 里 ${task} 对应的任务卡，再用 Skill 工具调用 ${skill} 执行本轮治理。` +
  `治理线铁律：本轮只产报告，并往 harness/logs/index.jsonl 追加一行运行记录；` +
  `报告里如果有「变更提议」（例如建议改 brain/ 的内容），必须等人审通过后才应用，本轮不要直接改 brain/；` +
  `选题池入池与规则化清扫视同状态记账，是例外，可以直接写；` +
  `不做任何发布动作，也不翻转任何内容条目的 meta.status。` +
  `中途遇到需要人拍板的节点就停下，把待办写清楚记进报告里，不要假装已经跑完。`

export const createPrompt = (slug: string, dir: string): string =>
  `人已在看板工作台对已选题内容 ${slug}（目录 ${dir}）点了开始创作，这就是本轮创作的授权来源。` +
  `请读 pipeline/2-create.md 与该条目的 1-brief.md，按口播四件套执行创作：写口播稿（2-script.md）→配音→录屏→封面。` +
  `完成后用 media flip ${slug} review 把状态翻到出审，并按 pipeline/3-review.md 经 feishu-notify 推审核卡。` +
  `项目铁律：全自动只跑到「出审」为止，绝不发布、绝不把状态翻到 approved/scheduled/published；` +
  `中途遇到需要人对齐的卡点就停下，把待办记进条目对应文件里，不要假装已经完成。`
