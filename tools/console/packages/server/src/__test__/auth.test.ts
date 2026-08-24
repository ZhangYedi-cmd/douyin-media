import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { createAuthMiddleware } from '../auth.js'

function buildApp(token: string) {
  const app = new Hono()
  app.use('/api/*', createAuthMiddleware(() => token))
  app.get('/api/ping', (c) => c.json({ pong: true }))
  app.get('/', (c) => c.text('static, no auth'))
  return app
}

describe('createAuthMiddleware', () => {
  it('无 token → 401 AUTH_BAD_TOKEN', async () => {
    const app = buildApp('secret')
    const res = await app.request('/api/ping')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_BAD_TOKEN')
  })

  it('错误 token（Authorization header）→ 401', async () => {
    const app = buildApp('secret')
    const res = await app.request('/api/ping', { headers: { Authorization: 'Bearer wrong' } })
    expect(res.status).toBe(401)
  })

  it('正确 token（Authorization: Bearer）→ 放行', async () => {
    const app = buildApp('secret')
    const res = await app.request('/api/ping', { headers: { Authorization: 'Bearer secret' } })
    expect(res.status).toBe(200)
  })

  it('正确 token（?token= query，EventSource/asset 场景）→ 放行', async () => {
    const app = buildApp('secret')
    const res = await app.request('/api/ping?token=secret')
    expect(res.status).toBe(200)
  })

  it('静态路径（非 /api/*）不校验 token', async () => {
    const app = buildApp('secret')
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('static, no auth')
  })
})
