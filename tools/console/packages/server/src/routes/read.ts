// 6 快照读接口 + /api/health（02-后端执行方案.md §2.1）。
import { Hono } from 'hono'
import type { ApiEnvelope, HealthData, HealthLight, Job } from '../api-types.js'
import type { Store } from '../store.js'
import type { WatcherHandle } from '../watcher.js'
import {
  projectBacklog,
  projectContentDetail,
  projectContents,
  projectHarness,
  projectMetrics,
  projectOverview,
} from './projections.js'

/** job runner 的最小读面（避免 S3 阶段对尚未存在的 jobs/runner.ts 产生编译期硬依赖；S5 的 JobRunner 结构兼容本接口）。 */
export interface JobRunnerReadPort {
  getActive(): Job | null
  getQueued(): Job[]
}

export interface ReadRouteDeps {
  store: Store
  watcherHandle: WatcherHandle
  startedAt: number
  getJobRunner: () => JobRunnerReadPort | null
}

function envelope<T>(store: Store, data: T): ApiEnvelope<T> {
  return { revision: store.revision, now: new Date().toISOString(), data }
}

export function createReadRoutes(deps: ReadRouteDeps): Hono {
  const { store, watcherHandle, startedAt, getJobRunner } = deps
  const app = new Hono()

  app.get('/api/overview', (c) => c.json(envelope(store, projectOverview(store))))

  app.get('/api/contents', (c) => {
    const statusParam = c.req.query('status')
    const limitParam = c.req.query('limit')
    const status = statusParam ? statusParam.split(',').filter(Boolean) : undefined
    if (status) {
      const known = new Set(['ideated', 'drafting', 'review', 'approved', 'scheduled', 'published', 'retro_done', 'rejected'])
      for (const s of status) {
        if (!known.has(s)) {
          return c.json({ error: { code: 'BAD_PARAM', message: `未知 status 值：${s}` } }, 400)
        }
      }
    }
    const limit = limitParam ? Number(limitParam) : undefined
    if (limitParam !== undefined && (!Number.isFinite(limit) || (limit as number) <= 0)) {
      return c.json({ error: { code: 'BAD_PARAM', message: `limit 非法：${limitParam}` } }, 400)
    }
    return c.json(envelope(store, projectContents(store, { status, limit })))
  })

  app.get('/api/content/:slug', (c) => {
    const slug = c.req.param('slug')
    const data = projectContentDetail(store, slug)
    if (!data) return c.json({ error: { code: 'NOT_FOUND', message: `内容条目不存在：${slug}` } }, 404)
    return c.json(envelope(store, data))
  })

  app.get('/api/backlog', (c) => {
    const status = c.req.query('status')
    const sort = c.req.query('sort')
    const expiring = c.req.query('expiring') === '1'
    return c.json(envelope(store, projectBacklog(store, { status, sort, expiring })))
  })

  app.get('/api/harness', (c) => {
    const daysParam = c.req.query('days')
    const days = daysParam ? Number(daysParam) : 30
    if (!Number.isFinite(days) || days <= 0) {
      return c.json({ error: { code: 'BAD_PARAM', message: `days 非法：${daysParam}` } }, 400)
    }
    return c.json(envelope(store, projectHarness(store, days)))
  })

  app.get('/api/metrics', (c) => {
    const slug = c.req.query('slug')
    return c.json(envelope(store, projectMetrics(store, slug)))
  })

  app.get('/api/health', (c) => {
    const lights: HealthLight[] = [
      {
        id: 'snapshot',
        label: '快照',
        level: store.snapshot.parseErrors.length > 0 ? 'warn' : 'ok',
        tip:
          store.snapshot.parseErrors.length > 0
            ? `${store.snapshot.parseErrors.length} 个文件解析失败`
            : `最近构建于 ${store.builtAt}，耗时 ${store.buildMs.toFixed(1)}ms`,
      },
      {
        id: 'watcher',
        label: '文件监听',
        level: watcherHandle.isWatching() ? 'ok' : 'bad',
        tip: watcherHandle.isWatching()
          ? `监听中，最近事件 ${watcherHandle.lastEventAt() ?? '（无）'}`
          : '监听未就绪',
      },
      {
        id: 'jobs',
        label: '任务队列',
        level: 'ok',
        tip: (() => {
          const runner = getJobRunner()
          if (!runner) return '任务系统未启用'
          const active = runner.getActive()
          const queued = runner.getQueued()
          return active ? `进行中：${active.id}（队列 ${queued.length}）` : `空闲（队列 ${queued.length}）`
        })(),
      },
      { id: 'tick', label: '定时体检', level: 'ok', tip: '10 分钟周期性重建已启用' },
    ]

    const runner = getJobRunner()
    const data: HealthData = {
      ok: true,
      revision: store.revision,
      now: new Date().toISOString(),
      lights,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      snapshot: { builtAt: store.builtAt, buildMs: store.buildMs, parseErrors: store.snapshot.parseErrors.length },
      watcher: { watching: watcherHandle.isWatching(), lastEventAt: watcherHandle.lastEventAt() },
      jobs: { active: runner?.getActive()?.id ?? null, queued: runner?.getQueued().length ?? 0 },
      tick: { lastAt: store.builtAt },
    }
    return c.json(data)
  })

  return app
}
