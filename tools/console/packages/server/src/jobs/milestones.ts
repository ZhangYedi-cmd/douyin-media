// 三张里程碑表（02-后端执行方案.md §2.6）：领域知识留 server，引擎在 cc-stream（上游拍板 §7.3）。
// 正则以 fixture/skill 命令形态推定，未经真实任务流校验（§4 风险#11）——S5 用 content/_test 真跑一轮后校准，
// 表在 server 侧改动零成本，不需要碰 cc-stream。
import type { MilestoneTable } from '@console/cc-stream'

export const PUBLISH_MILESTONES: MilestoneTable = [
  { id: 'payload', label: '物料拼装 / dry-run', match: { tool: 'Bash', input: { command: /sau\b.*--dry-run/ } }, once: true },
  { id: 'upload', label: '上传 / 真发', match: { tool: 'Bash', input: { command: /sau\b(?!.*--dry-run)/ } }, once: true },
  { id: 'bookkeep', label: '记账 publish-done', match: { tool: 'Bash', input: { command: /media publish-done/ } }, once: true },
  { id: 'notify', label: '飞书通知', match: { tool: 'Bash', input: { command: /feishu|notify/ } }, once: true },
]

export const REWORK_MILESTONES: MilestoneTable = [
  { id: 'script', label: '改稿', match: { tool: /^(Write|Edit)$/, input: { file_path: /2-script\.md$/ } }, once: true },
  { id: 'dub', label: '重配音', match: { tool: 'Bash', input: { command: /tts|dub/i } }, once: true },
  { id: 'record', label: '重录屏', match: { tool: 'Bash', input: { command: /npm run record/ } }, once: true },
  { id: 'back', label: '回审 + 出卡', match: { tool: 'Bash', input: { command: /media flip \S+ review/ } }, once: true },
]

export const APPLY_MILESTONES: MilestoneTable = [
  { id: 'read', label: '读报告', match: { tool: 'Read', input: { file_path: /harness\/logs\// } }, once: true },
  { id: 'brain', label: '改 brain', match: { tool: /^(Edit|Write)$/, input: { file_path: /brain\// } }, once: true },
  { id: 'diff', label: '产 diff', match: { tool: 'Bash', input: { command: /git diff/ } }, once: true },
]

// 2026-08-19 增补两张表（用户走查提的手动触发能力，H 号执行；三条既有表照抄写法与粒度，
// 02-后端执行方案.md 未覆盖此二型，契约由总指挥直接在 api-types.ts/defs.ts 落地，见那两处头注）。

export const HARNESS_RUN_MILESTONES: MilestoneTable = [
  { id: 'task-card', label: '读任务卡', match: { tool: 'Read', input: { file_path: /harness\/tasks\.md$/ } }, once: true },
  { id: 'skill', label: '执行技能', match: { tool: 'Skill' }, once: true },
  { id: 'report', label: '产报告', match: { tool: /^(Write|Edit)$/, input: { file_path: /harness\/logs\/|content\/_research\// } }, once: true },
  { id: 'bookkeep', label: '记账', match: { tool: 'Bash', input: { command: /index\.jsonl/ } }, once: true },
]

export const CREATE_MILESTONES: MilestoneTable = [
  { id: 'script', label: '写稿', match: { tool: /^(Write|Edit)$/, input: { file_path: /2-script\.md$/ } }, once: true },
  { id: 'dub', label: '配音', match: { tool: 'Bash', input: { command: /tts|dub/i } }, once: true },
  { id: 'record', label: '录屏', match: { tool: 'Bash', input: { command: /npm run record/ } }, once: true },
  // 封面产物形态未定死（Write 图片文件 / Edit 元数据 / Bash 调用生成脚本都可能），
  // 两条规则共享同一 id：MilestoneEngine 的 once 去重按 id 记忆（cc-stream/src/milestones.ts），
  // 单次工具事件至多命中其一，天然构成「或」语义，不需要 match 支持跨字段的 OR。
  { id: 'cover', label: '封面', match: { tool: /^(Write|Edit)$/, input: { file_path: /cover/i } }, once: true },
  { id: 'cover', label: '封面', match: { tool: 'Bash', input: { command: /cover/i } }, once: true },
  { id: 'review', label: '出审', match: { tool: 'Bash', input: { command: /media flip \S+ review/ } }, once: true },
]
