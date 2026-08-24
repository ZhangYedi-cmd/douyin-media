#!/usr/bin/env node
// 入口：loadConfig → new Store → startWatcher → Hono 组装 → serve(5170) → serveStatic(ui/dist)
// （02-后端执行方案.md §2.4）。
import path from 'node:path'
import fs from 'node:fs'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { loadConfig, loadOrCreateToken } from './config.js'
import { Store } from './store.js'
import { startWatcher } from './watcher.js'
import { SseHub } from './sse.js'
import { createAuthMiddleware } from './auth.js'
import { createReadRoutes } from './routes/read.js'
import { createFileRoutes } from './routes/files.js'
import { createActionRoutes } from './routes/actions.js'
import { createJobRoutes } from './routes/jobs.js'
import { JobRunner } from './jobs/runner.js'

export function createApp() {
  const config = loadConfig()
  const token = loadOrCreateToken(config.tokenPath)
  const store = new Store(config.repoRoot)
  const sse = new SseHub()
  store.attachSse(sse)
  store.init()

  const watcherHandle = startWatcher(config.repoRoot, store)
  store.startTick()
  sse.startPing()

  const runner = new JobRunner({ config, store, sse })

  const app = new Hono()
  const startedAt = Date.now()

  app.use('/api/*', createAuthMiddleware(() => token))

  app.route('/', createReadRoutes({ store, watcherHandle, startedAt, getJobRunner: () => runner }))
  app.route('/', createFileRoutes(store))
  app.route('/', createActionRoutes({ config, store }))
  app.route('/', createJobRoutes({ runner, logsDir: path.join(config.consoleRoot, 'logs/jobs') }))

  app.get('/api/events', sse.handler(() => ({ revision: store.revision })))

  const uiDist = path.join(config.consoleRoot, 'packages/ui/dist')
  if (fs.existsSync(path.join(uiDist, 'index.html'))) {
    // serveStatic 的 root/path 都是相对语义拼接，直接给绝对路径同样安全（path.join 遇绝对首段不受 cwd 影响）；
    // 非 /api/* 且静态文件未命中时回退 index.html（SPA history 路由，02 §2.8）。
    app.use('/*', serveStatic({ root: uiDist }))
    app.get('/*', serveStatic({ path: 'index.html', root: uiDist }))
  } else {
    app.get('/', (c) =>
      c.html(
        `<!doctype html><meta charset="utf-8"><title>看板工作台</title>` +
          `<p>packages/ui/dist 尚未构建（M3 期间 UI 未建属预期）。API 已就绪：` +
          `<a href="/api/health?token=${token}">/api/health</a></p>`,
      ),
    )
  }

  return { app, config, token, store, watcherHandle, sse, runner }
}

function realFileUrl(p: string): string {
  try {
    return `file://${fs.realpathSync(p)}`
  } catch {
    return `file://${p}`
  }
}
const isMain = process.argv[1] !== undefined && import.meta.url === realFileUrl(process.argv[1])

if (isMain) {
  const { app, config, token } = createApp()
  serve({ fetch: app.fetch, port: config.port, hostname: '127.0.0.1' }, (info) => {
    // eslint-disable-next-line no-console
    console.log(`[console-server] listening on http://127.0.0.1:${info.port}/#token=${token}`)
    // eslint-disable-next-line no-console
    console.log(`[console-server] repoRoot=${config.repoRoot}`)
  })
}
