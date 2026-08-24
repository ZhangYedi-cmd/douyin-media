import { useEffect, useMemo, useRef, useState } from 'react'
import type { Job } from '@console/server/api-types'
import { ApiError, getJobHistory } from '../../lib/api'
import type { JobHistoryParams } from '../../lib/api'
import { useJobs } from '../../lib/store'

export interface UseJobHistoryResult {
  jobs: Job[] | undefined // 首拉前 undefined（调用方渲染加载态）
  error: ApiError | null
}

/**
 * 拉取「某条内容 / 某个治理任务」的历史任务列表——GET /api/jobs/history（K 号数据侧契约，
 * 详见 lib/api.ts getJobHistory 头注释）。JobHistoryTab（详情页）与 TaskRunHistory（治理线）
 * 两处共用（满足「跨页复用满 2 处才升 components/」门槛，见 packages/ui/CLAUDE.md 约定 1）。
 *
 * 不用 usePageData：那个 hook 只在全局 revision 前进时自动重拉，但 revision 不会因为某个 job
 * 状态变化而前进（`job:<id>` 广播是独立通道，与 revision 无关，见 lib/store.tsx mergeJob 头注释）
 * ——所以这里额外从 useJobs()（SSE 实时驱动的全局 jobs 态）里取出匹配 slug/task 的那批 job 的
 * 「id:state」签名当**触发器**：签名变化（新任务出现、或已知任务状态翻转）就重新拉一次权威列表。
 * 注意签名只当触发信号，不当数据源本身直接拼列表——那条路已知是错的（GET /api/jobs 的 recent
 * 只兜底近 24h 内存表，会让一周前的历史永久不可见，这正是本端点存在的原因）。
 */
export function useJobHistory(params: JobHistoryParams): UseJobHistoryResult {
  const { slug, task } = params
  const allJobs = useJobs()
  const liveSignature = useMemo(() => {
    const matched = allJobs.filter((j) => (slug ? j.slug === slug : j.task === task))
    return matched
      .map((j) => `${j.id}:${j.state}`)
      .sort()
      .join(',')
  }, [allJobs, slug, task])

  const [jobs, setJobs] = useState<Job[] | undefined>(undefined)
  const [error, setError] = useState<ApiError | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    getJobHistory({ slug, task })
      .then((list) => {
        if (requestIdRef.current !== requestId) return // 已有更新的请求在途/完成，丢弃过期响应
        setJobs(list)
        setError(null)
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) return
        setError(err instanceof ApiError ? err : new ApiError(err instanceof Error ? err.message : String(err), 0))
      })
    // 不在请求发起时把 jobs 清成 undefined：liveSignature 触发的重拉是后台刷新，旧列表原地保留，
    // 成功后原地替换，避免每次有任务状态翻转就让整个列表闪一次「加载中」（usePageData 同款纪律）。
  }, [slug, task, liveSignature])

  return { jobs, error }
}
