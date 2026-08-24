// JobPanel 生命周期拆分与已读判定的纯函数（无 DOM 依赖，可单测；本包无 jsdom，同 jobSort.ts 的抽取动机）。
//
// 背景（P0 走查缺陷）：03 §2.9 原设计「无活动任务时返回 null」被 JobPanel.tsx 字面理解成
// `jobs.length === 0`，已终结任务（succeeded/failed）从不从列表移除，导致一条失败的发布任务
// 常驻挂角一整周、盖住每一页右下角约 360×285 的区域。这里把两种生命周期拆开：
// 「进行中」（queued/running/verifying）恒定可见；「已终结」默认不占屏，只留一个可复查的
// 历史入口，是否已读靠 localStorage 记忆（键 = jobSignature），刷新页面不该让已读的终结任务还魂，
// 但新到达 / 有更新的终结任务应当重新可见——本文件是这条规则的唯一判定处，JobPanel.tsx 只消费。
import type { Job, JobState } from '@console/server/api-types'

const ACTIVE_STATES: JobState[] = ['queued', 'running', 'verifying']

export function isActiveJob(job: Job): boolean {
  return ACTIVE_STATES.includes(job.state)
}

/**
 * 非「进行中」即「已终结」——穷尽二分（对齐 jobSort.ts 的 isActive/!isActive 写法），不用
 * TERMINAL_STATES 白名单精确匹配：server 崩溃降级路径（jobs.ts 单条 GET）可能回一个
 * state:'unknown' 的裁剪对象，穷尽二分能把这种防御性边界值也兜进历史桶而不是静默从面板消失。
 */
export function isTerminalJob(job: Job): boolean {
  return !isActiveJob(job)
}

/**
 * 终结任务的「版本签名」：state + endedAt（缺省退回 startedAt） + costUsd + verdict.ok。
 * 已读记录按 `jobId → 标记已读时的签名` 存；只要签名变化（哪怕 id 不变——例如标记已读时任务
 * 还没写完 endedAt，之后补上了，或裁定结果更新），就视为「有新情况」、自动重新可见，不需要
 * 用户再手动操作一遍。
 */
export function jobSignature(job: Job): string {
  return [
    job.state,
    job.endedAt ?? job.startedAt ?? '',
    typeof job.costUsd === 'number' ? String(job.costUsd) : '',
    job.verdict ? (job.verdict.ok ? '1' : '0') : '',
  ].join('|')
}

/** jobId → 标记已读时的签名。 */
export type ReadMap = Record<string, string>

export function isJobRead(job: Job, readMap: ReadMap): boolean {
  return readMap[job.id] === jobSignature(job)
}

/** 把一批任务的当前签名写入已读表（纯函数，不做 I/O；持久化落盘交给 saveReadMap）。 */
export function markJobsRead(readMap: ReadMap, jobs: Job[]): ReadMap {
  if (jobs.length === 0) return readMap
  const next = { ...readMap }
  for (const job of jobs) next[job.id] = jobSignature(job)
  return next
}

export interface PanelVisibility {
  /** 进行中任务：恒定可见，不受已读表影响（验收点「进行中必须显示」）。 */
  activeJobs: Job[]
  /** 全部已终结任务——历史留档用，不因已读而从这个数组消失（「留档不能丢」）。 */
  terminalJobs: Job[]
  /** 未读的已终结任务——决定面板是否该自动弹出/胶囊角标数字。 */
  unreadTerminalJobs: Job[]
  hasActive: boolean
  hasUnreadTerminal: boolean
  /** false = 面板整体不占位（03 §2.9 原「jobs.length===0 → return null」的推广版：
   *  推广到「没有进行中任务、也没有未读的已终结任务」——已读的历史仍在 terminalJobs 里，
   *  只是不再强制占屏，这是本波对原设计的刻意偏离，理由见上方文件头注释）。 */
  shouldRender: boolean
}

export function computePanelVisibility(jobs: Job[], readMap: ReadMap): PanelVisibility {
  const activeJobs = jobs.filter(isActiveJob)
  const terminalJobs = jobs.filter(isTerminalJob)
  const unreadTerminalJobs = terminalJobs.filter((j) => !isJobRead(j, readMap))
  return {
    activeJobs,
    terminalJobs,
    unreadTerminalJobs,
    hasActive: activeJobs.length > 0,
    hasUnreadTerminal: unreadTerminalJobs.length > 0,
    shouldRender: activeJobs.length > 0 || unreadTerminalJobs.length > 0,
  }
}

/**
 * 「关闭整个面板」的自动还魂判定用：进行中任务集合的签名（id+state 排序拼接）。用户关闭面板后，
 * 只要这个签名不变就保持关闭；一旦有新任务加入、任务 id 变化或状态迁移（queued→running 等），
 * 签名必变，面板自动重新出现——即便用户之前关过（验收点「不能因为用户之前关过就再也不提示了」）。
 * 只到 state 粒度、不含 milestones/进度细节：否则每条里程碑上报都会把关掉的面板弹回来，噪音过大。
 */
export function activeSignature(activeJobs: Job[]): string {
  return activeJobs
    .map((j) => `${j.id}:${j.state}`)
    .sort()
    .join(',')
}

// ── localStorage 读写（storage 由调用方注入，纯函数可单测；try/catch 兜底写法参考 lib/api.ts getToken）──

export const READ_MAP_STORAGE_KEY = 'console.jobPanel.readMap'

/** 最小 Storage 形状，测试里不必实现完整 window.Storage 接口（length/key/removeItem 等）。 */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * localStorage 不可用（隐私模式、配额满、未传 storage）或内容损坏时兜底返回空表——空表下
 * 任何任务都判定为「未读」，宁可多显示也不误藏（fail-open，不会因为存储层故障吞掉一条终结任务）。
 */
export function loadReadMap(storage: StorageLike | undefined, key: string = READ_MAP_STORAGE_KEY): ReadMap {
  if (!storage) return {}
  try {
    const raw = storage.getItem(key)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as ReadMap
    return {}
  } catch {
    return {}
  }
}

/** 写入失败（配额满/隐私模式）静默吞掉：本次会话内存里的 map 仍然生效，只是刷新后要重新标记已读。 */
export function saveReadMap(storage: StorageLike | undefined, map: ReadMap, key: string = READ_MAP_STORAGE_KEY): void {
  if (!storage) return
  try {
    storage.setItem(key, JSON.stringify(map))
  } catch {
    // 见上方函数注释：静默失败，不阻断交互。
  }
}
