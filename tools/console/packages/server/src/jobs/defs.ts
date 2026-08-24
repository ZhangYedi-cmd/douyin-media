// 三个 JobDef 的静态参数聚合（02-后端执行方案.md §2.3 表格逐列，timeout 按实测经验放宽）。
// precheck/lockKey/before/verdict 的具体逻辑就地写在 jobs/runner.ts 的三个 submit* 方法里
// （每型逻辑形状差异大到几乎无重复，抽成通用接口反而增加一层间接——这里只留跨模块共享的静态常量）。
import type { JobType } from '../api-types.js'

export const JOB_TIMEOUT_MS: Record<JobType, number> = {
  publish: 20 * 60_000, // 20min（sau 上传含视频体积，§9 实测 3~15min，放宽）
  rework: 45 * 60_000, // 45min（§9 实测 10~30min，feishu 的 900s=15min 偏紧，放宽）
  'apply-proposal': 10 * 60_000, // 10min
  'harness-run': 30 * 60_000, // 30min（retro 拉后台数据、ideate 多路检索，均为长任务）
  create: 60 * 60_000, // 60min（口播四件套：写稿→配音→录屏→封面，录屏最长）
}

export const JOB_LABEL: Record<JobType, string> = {
  publish: '确认发布',
  rework: '打回重做',
  'apply-proposal': '治理提议入库',
  'harness-run': '运行治理任务',
  create: '开始创作',
}

/** 同一 slug 自动重做上限：与飞书路径共享同一 3-review.md 计数口径，两路合计上限 2（02 §2.3 #2）。 */
export const REWORK_LIMIT = 2
