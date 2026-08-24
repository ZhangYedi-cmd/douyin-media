// SseHub：SSE 客户端集合 + 广播（02-后端执行方案.md §2.5 sse.ts / 上游拍板 §3 决策3）。
import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { Job } from './api-types.js'

interface SseClient {
  id: number
  send(event: string, data: unknown): Promise<void> | void
}

const PING_INTERVAL_MS = 25_000

export class SseHub {
  private clients = new Set<SseClient>()
  private nextId = 1
  private pingTimer: ReturnType<typeof setInterval> | null = null

  /** Hono handler：注册 client、连上即推 refresh(reason=boot)，断开时清理（02 §2.1 GET /api/events）。 */
  handler(getBootPayload: () => { revision: number }) {
    return (c: Context) => {
      return streamSSE(c, async (stream) => {
        const id = this.nextId++
        let resolveClosed: () => void = () => {}
        const closed = new Promise<void>((resolve) => {
          resolveClosed = resolve
        })
        const client: SseClient = {
          id,
          send: async (event, data) => {
            try {
              await stream.writeSSE({ event, data: JSON.stringify(data) })
            } catch {
              // 客户端已断开，忽略写失败（onAbort 会负责清理）
            }
          },
        }
        this.clients.add(client)
        stream.onAbort(() => {
          this.clients.delete(client)
          resolveClosed()
        })
        await client.send('refresh', { revision: getBootPayload().revision, reason: 'boot' })
        await closed
      })
    }
  }

  broadcast(event: string, data: unknown): void {
    for (const client of this.clients) {
      void client.send(event, data)
    }
  }

  jobUpdate(job: Job): void {
    this.broadcast(`job:${job.id}`, job)
  }

  clientCount(): number {
    return this.clients.size
  }

  startPing(): void {
    if (this.pingTimer) return
    this.pingTimer = setInterval(() => this.broadcast('ping', {}), PING_INTERVAL_MS)
    this.pingTimer.unref?.()
  }

  stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer)
    this.pingTimer = null
  }
}
