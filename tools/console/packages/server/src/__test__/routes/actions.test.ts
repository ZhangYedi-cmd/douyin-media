import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Hono } from 'hono'
import { afterAll, describe, expect, it } from 'vitest'
import { buildTestStore } from '../../../__test__/fixtures.js'
import { createActionRoutes } from '../../routes/actions.js'
import type { Config } from '../../config.js'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'actions-route-'))
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

// 假 media：--dry-run 时回 alerts:[]（真实 writer.ts 语义）；真写时回 1 error + 1 warn 供 check 计数验证；
// slug=boom 时回 E_ILLEGAL_TRANSITION 规则拒绝（验证路由层原样透传 execMedia 的 409）。
const FAKE_MEDIA = `#!/usr/bin/env bash
args="$*"
if [[ "$args" == *"boom"* ]]; then
  echo '{"ok":false,"cmd":"flip","error":{"code":"E_ILLEGAL_TRANSITION","message":"非法迁移","rule":"state:meta"}}'
  exit 1
fi
if [[ "$args" == *"--dry-run"* ]]; then
  echo '{"ok":true,"cmd":"flip","data":{},"writes":[{"path":"x","fields":["y"],"diff":"..."}],"alerts":[]}'
else
  echo '{"ok":true,"cmd":"flip","data":{},"writes":[{"path":"x","fields":["y"]}],"alerts":[{"key":"CHK-01:x","rule":"CHK-01","level":"error","subject":"x","message":"m"},{"key":"CHK-04:y","rule":"CHK-04","level":"warn","subject":"y","message":"m"}]}'
fi
exit 0
`
const mediaBin = path.join(tmp, 'fake-media.sh')
fs.writeFileSync(mediaBin, FAKE_MEDIA)
fs.chmodSync(mediaBin, 0o755)

function buildApp() {
  const store = buildTestStore()
  const config: Config = { consoleRoot: tmp, repoRoot: store.root, port: 5170, mediaBin, tokenPath: path.join(tmp, '.runtime/token') }
  const app = new Hono()
  app.route('/', createActionRoutes({ config, store }))
  return app
}

async function post(app: Hono, url: string, body: unknown) {
  return app.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

describe('POST /api/actions/review', () => {
  it('dryRun:true → dryRun echoed, check:null', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/review', { slug: 'review-sample', decision: 'approved', dryRun: true })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.dryRun).toBe(true)
    expect(body.check).toBeNull()
  })

  it('真实写入 → check 按 alerts 统计 errors/warns', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/review', { slug: 'review-sample', decision: 'approved' })
    const body = await res.json()
    expect(body.dryRun).toBe(false)
    expect(body.check).toEqual({ errors: 1, warns: 1, infos: 0 })
  })

  it('decision=rework 缺 reason → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/review', { slug: 'review-sample', decision: 'rework' })
    expect(res.status).toBe(400)
  })

  it('slug 非法格式 → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/review', { slug: 'BAD SLUG', decision: 'approved' })
    expect(res.status).toBe(400)
  })

  it('media 规则拒绝原样透传为 409 MEDIA_REJECTED', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/review', { slug: 'boom-slug', decision: 'approved' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('MEDIA_REJECTED')
  })

  it('非 JSON 请求体 → 400', async () => {
    const app = buildApp()
    const res = await app.request('/api/actions/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'not json' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/actions/promote', () => {
  it('缺 slug → 400（服务端要求显式带 slug，见已知偏差记录）', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/promote', { auto: true })
    expect(res.status).toBe(400)
  })

  it('id 与 auto 同时给 → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/promote', { id: '2030-01-01-001', auto: true, slug: 'x' })
    expect(res.status).toBe(400)
  })

  it('合法参数走通', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/promote', { id: '2030-01-01-001', slug: 'my-new-slug', dryRun: true })
    expect(res.status).toBe(200)
  })
})

describe('POST /api/actions/backlog-apply', () => {
  it('proposal 不是 harness/logs/ 下路径 → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/backlog-apply', { id: '2030-01-01-001', action: 'archive', proposal: '/etc/passwd' })
    expect(res.status).toBe(400)
  })

  it('merge 缺 into → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/backlog-apply', { id: '2030-01-01-001', action: 'merge', proposal: 'harness/logs/x.md' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/actions/next-up', () => {
  it('id 与 clear 同时给 → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/next-up', { id: '2030-01-01-001', clear: true })
    expect(res.status).toBe(400)
  })

  it('都不给 → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/next-up', {})
    expect(res.status).toBe(400)
  })

  it('clear:true 走通', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/next-up', { clear: true, dryRun: true })
    expect(res.status).toBe(200)
  })
})
