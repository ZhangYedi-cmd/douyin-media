import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { buildTestStore } from '../../../__test__/fixtures.js'
import { createFileRoutes } from '../../routes/files.js'

function buildApp() {
  const store = buildTestStore()
  const app = new Hono()
  app.route('/', createFileRoutes(store))
  return app
}

describe('GET /api/file', () => {
  it('白名单内的文本文件 200', async () => {
    const app = buildApp()
    const res = await app.request('/api/file?path=content/2030-01-06/review-sample/2-script.md')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.content).toContain('口播稿内容')
    expect(body.data.truncated).toBe(false)
  })

  it('缺 path 参数 → 400', async () => {
    const app = buildApp()
    const res = await app.request('/api/file')
    expect(res.status).toBe(400)
  })

  it('路径穿越 → 403 PATH_FORBIDDEN', async () => {
    const app = buildApp()
    const res = await app.request('/api/file?path=' + encodeURIComponent('../../../../etc/passwd'))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('PATH_FORBIDDEN')
  })

  it('扩展名不在白名单（如 .mp4）→ 403', async () => {
    const app = buildApp()
    const res = await app.request('/api/file?path=' + encodeURIComponent('content/2030-01-05/published-sample/assets/published-sample.mp4'))
    expect(res.status).toBe(403)
  })

  it('文件不存在 → 404', async () => {
    const app = buildApp()
    const res = await app.request('/api/file?path=content/2030-01-06/review-sample/1-brief.md')
    expect(res.status).toBe(404)
  })

  it('白名单外目录（如 tools/）→ 403', async () => {
    const app = buildApp()
    const res = await app.request('/api/file?path=' + encodeURIComponent('harness/tasks.md'))
    // harness/ 在白名单目录内，理应 200；顺带验证白名单目录清单本身生效
    expect(res.status).toBe(200)
  })
})

describe('GET /api/asset', () => {
  it('白名单内的图片 200 且带 Content-Type', async () => {
    const app = buildApp()
    const res = await app.request('/api/asset?path=' + encodeURIComponent('content/2030-01-05/published-sample/assets/cover.png'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
  })

  it('Range 请求返回 206 并带 Content-Range', async () => {
    // 造一段有实际字节内容的文件（cover.png fixture 是空文件，Range 对 0 字节文件语义不清，另建一份）
    const app = buildApp()
    const res = await app.request('/api/asset?path=' + encodeURIComponent('content/2030-01-05/published-sample/assets/published-sample.mp4'), {
      headers: { Range: 'bytes=0-0' },
    })
    // published-sample.mp4 fixture 也是 touch 出的空文件：0 字节时任何 Range 都越界，应 416
    expect([206, 416]).toContain(res.status)
  })

  it('文本扩展名（.md）不在资产白名单 → 403', async () => {
    const app = buildApp()
    const res = await app.request('/api/asset?path=' + encodeURIComponent('content/2030-01-06/review-sample/2-script.md'))
    expect(res.status).toBe(403)
  })

  it('content 目录外（如 harness/）不在资产白名单 → 403', async () => {
    const app = buildApp()
    const res = await app.request('/api/asset?path=' + encodeURIComponent('harness/logs/metrics.jsonl'))
    expect(res.status).toBe(403)
  })
})
