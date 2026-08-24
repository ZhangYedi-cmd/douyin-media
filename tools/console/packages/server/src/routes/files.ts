// GET /api/file /api/asset：文本/二进制白名单读（02-后端执行方案.md §2.1，唯一允许现场 IO 的两个端点）。
import fs from 'node:fs'
import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import { safeResolve } from '../util/safeResolve.js'
import type { ApiEnvelope, FileReadData } from '../api-types.js'
import type { Store } from '../store.js'

const TEXT_ALLOW_DIRS = ['content', 'harness', 'pipeline', 'brain']
const TEXT_ALLOW_FILES = ['dashboard.md']
const TEXT_ALLOW_EXT = ['.md', '.yaml', '.yml', '.jsonl', '.txt', '.json']
const MAX_TEXT_BYTES = 1024 * 1024 // 1MB

const ASSET_ALLOW_DIRS = ['content']
const ASSET_ALLOW_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.mov', '.m4v', '.mp3', '.wav']

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
}

export function createFileRoutes(store: Store): Hono {
  const app = new Hono()

  app.get('/api/file', (c) => {
    const p = c.req.query('path')
    if (!p) return c.json({ error: { code: 'BAD_PARAM', message: '缺少 path 参数' } }, 400)
    const res = safeResolve(store.root, p, { allowDirs: TEXT_ALLOW_DIRS, allowFiles: TEXT_ALLOW_FILES, allowExt: TEXT_ALLOW_EXT })
    if (!res.ok) {
      const status = res.reason === 'not_found' ? 404 : 403
      const code = res.reason === 'not_found' ? 'NOT_FOUND' : 'PATH_FORBIDDEN'
      return c.json({ error: { code, message: res.reason === 'not_found' ? '文件不存在' : '路径不在白名单内' } }, status)
    }
    const st = fs.statSync(res.abs)
    const truncated = st.size > MAX_TEXT_BYTES
    const buf = fs.readFileSync(res.abs)
    const content = truncated ? buf.subarray(0, MAX_TEXT_BYTES).toString('utf8') : buf.toString('utf8')
    const data: FileReadData = { path: p, content, size: st.size, mtime: st.mtime.toISOString(), truncated }
    const body: ApiEnvelope<FileReadData> = { revision: store.revision, now: new Date().toISOString(), data }
    return c.json(body)
  })

  app.get('/api/asset', (c) => {
    const p = c.req.query('path')
    if (!p) return c.json({ error: { code: 'BAD_PARAM', message: '缺少 path 参数' } }, 400)
    const res = safeResolve(store.root, p, { allowDirs: ASSET_ALLOW_DIRS, allowExt: ASSET_ALLOW_EXT })
    if (!res.ok) {
      const status = res.reason === 'not_found' ? 404 : 403
      const code = res.reason === 'not_found' ? 'NOT_FOUND' : 'PATH_FORBIDDEN'
      return c.json({ error: { code, message: res.reason === 'not_found' ? '文件不存在' : '路径不在白名单内' } }, status)
    }
    const ext = res.abs.slice(res.abs.lastIndexOf('.')).toLowerCase()
    const contentType = CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream'
    const st = fs.statSync(res.abs)
    const range = c.req.header('Range')

    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range)
      if (!m) return c.body(null, 416)
      const start = m[1] ? Number(m[1]) : 0
      const end = m[2] ? Number(m[2]) : st.size - 1
      if (start >= st.size || end >= st.size || start > end) {
        c.header('Content-Range', `bytes */${st.size}`)
        return c.body(null, 416)
      }
      const chunkSize = end - start + 1
      c.header('Content-Type', contentType)
      c.header('Content-Range', `bytes ${start}-${end}/${st.size}`)
      c.header('Accept-Ranges', 'bytes')
      c.header('Content-Length', String(chunkSize))
      c.status(206)
      return stream(c, async (s) => {
        const rs = fs.createReadStream(res.abs, { start, end })
        for await (const chunk of rs) {
          await s.write(chunk as Uint8Array)
        }
      })
    }

    c.header('Content-Type', contentType)
    c.header('Accept-Ranges', 'bytes')
    c.header('Content-Length', String(st.size))
    return stream(c, async (s) => {
      const rs = fs.createReadStream(res.abs)
      for await (const chunk of rs) {
        await s.write(chunk as Uint8Array)
      }
    })
  })

  return app
}
