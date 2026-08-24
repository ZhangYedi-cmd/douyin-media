// 鉴权中间件（02-后端执行方案.md §2.0）：Authorization: Bearer <token> 或 ?token=；全部 /api/* 覆盖。
import type { Context, Next } from 'hono'
import type { ApiErrorBody } from './api-types.js'

function extractToken(c: Context): string | null {
  const header = c.req.header('Authorization')
  if (header) {
    const m = /^Bearer\s+(.+)$/.exec(header.trim())
    if (m) return m[1]!
  }
  const q = c.req.query('token')
  if (q) return q
  return null
}

export function createAuthMiddleware(getToken: () => string) {
  return async (c: Context, next: Next) => {
    const token = extractToken(c)
    const expected = getToken()
    if (!token || token !== expected) {
      const body: ApiErrorBody = { error: { code: 'AUTH_BAD_TOKEN', message: '缺少或错误的 token' } }
      return c.json(body, 401)
    }
    await next()
  }
}
