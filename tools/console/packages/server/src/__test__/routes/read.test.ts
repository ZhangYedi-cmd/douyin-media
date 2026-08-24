import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { buildTestStore } from '../../../__test__/fixtures.js'
import { createReadRoutes } from '../../routes/read.js'
import type { WatcherHandle } from '../../watcher.js'

function fakeWatcher(watching = true): WatcherHandle {
  return {
    watcher: {} as WatcherHandle['watcher'],
    isWatching: () => watching,
    lastEventAt: () => (watching ? '2030-01-10T00:00:00.000Z' : null),
    close: async () => {},
  }
}

function buildApp(watching = true) {
  const store = buildTestStore()
  const app = new Hono()
  app.route(
    '/',
    createReadRoutes({ store, watcherHandle: fakeWatcher(watching), startedAt: Date.now() - 1000, getJobRunner: () => null }),
  )
  return { app, store }
}

describe('GET /api/overview', () => {
  it('响应信封含 revision/now/data', async () => {
    const { app, store } = buildApp()
    const res = await app.request('/api/overview')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.revision).toBe(store.revision)
    expect(typeof body.now).toBe('string')
    expect(body.data.wip).toBeDefined()
  })
})

describe('GET /api/contents', () => {
  it('无参数 200，含 total/items', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/contents')
    const body = await res.json()
    expect(body.data.total).toBe(2)
  })

  it('status 非法值 → 400 BAD_PARAM', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/contents?status=not-a-real-status')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('BAD_PARAM')
  })

  it('status 合法值逗号分隔过滤', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/contents?status=published,review')
    const body = await res.json()
    expect(body.data.total).toBe(2)
  })

  it('limit 非法值 → 400', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/contents?limit=0')
    expect(res.status).toBe(400)
  })
})

describe('GET /api/content/:slug', () => {
  it('存在的 slug → 200', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/content/review-sample')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.dir).toBe('content/2030-01-06/review-sample')
  })

  it('不存在的 slug → 404 NOT_FOUND', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/content/does-not-exist')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

describe('GET /api/backlog', () => {
  it('200，stats 四态计数', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/backlog')
    const body = await res.json()
    expect(body.data.stats.idea).toBe(2)
  })
})

describe('GET /api/harness', () => {
  it('days 非法值 → 400', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/harness?days=-1')
    expect(res.status).toBe(400)
  })

  it('默认 30 天窗口 200', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/harness')
    expect(res.status).toBe(200)
  })
})

describe('GET /api/metrics', () => {
  it('200，available 为 bool', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/metrics')
    const body = await res.json()
    expect(typeof body.data.available).toBe('boolean')
  })
})

describe('GET /api/health', () => {
  it('watcher 就绪时灯为 ok', async () => {
    const { app } = buildApp(true)
    const res = await app.request('/api/health')
    const body = await res.json()
    expect(body.lights.find((l: { id: string }) => l.id === 'watcher').level).toBe('ok')
  })

  it('watcher 未就绪时灯为 bad', async () => {
    const { app } = buildApp(false)
    const res = await app.request('/api/health')
    const body = await res.json()
    expect(body.lights.find((l: { id: string }) => l.id === 'watcher').level).toBe('bad')
  })

  it('jobs 灯在无 runner 时提示未启用', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/health')
    const body = await res.json()
    expect(body.jobs).toEqual({ active: null, queued: 0 })
  })
})
