import { describe, it, expect, vi, beforeEach } from 'vitest'
import { connectSse } from '../../lib/sse'
import * as apiModule from '../../lib/api'

// lib/sse.ts 的验收基础（03 §2.10 原文：「React 无关，可单测」）。真实浏览器 EventSource 需要网络，
// 这里手撸一个最小可控的 fake 实现，覆盖 connectSse 状态机的全部分支：connecting/open/error→closed 或
// error→connecting、refresh 解析、job:<id> 动态订阅与幂等、close() 的监听器清理。
// 之所以不接真实 server 走端到端：本沙箱的浏览器自动化工具（claude-in-chrome / playwright）与
// Bash 工具运行在不同网络命名空间，均无法连到本机起的 vite dev（已实测：playwright 直接
// ERR_CONNECTION_REFUSED；claude-in-chrome 驱动的是用户侧浏览器，压根不在同一台机器），
// 这一层的行为改用本文件的确定性单测代偿，验收报告里会如实记录这个环境限制。

class FakeEventSource {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2

  readyState = FakeEventSource.CONNECTING
  url: string
  listeners = new Map<string, Set<(ev: { data: string }) => void>>()
  addListenerCalls = 0
  removeListenerCalls = 0
  closeCalls = 0

  constructor(url: string) {
    this.url = url
    instances.push(this)
  }

  addEventListener(type: string, cb: (ev: { data: string }) => void): void {
    this.addListenerCalls++
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(cb)
  }

  removeEventListener(type: string, cb: (ev: { data: string }) => void): void {
    this.removeListenerCalls++
    this.listeners.get(type)?.delete(cb)
  }

  close(): void {
    this.readyState = FakeEventSource.CLOSED
    this.closeCalls++
  }

  /** 测试专用：模拟 server 广播一个事件。 */
  emit(type: string, data: unknown): void {
    const payload = typeof data === 'string' ? data : JSON.stringify(data)
    for (const cb of this.listeners.get(type) ?? []) cb({ data: payload })
  }
}

let instances: FakeEventSource[] = []

beforeEach(() => {
  instances = []
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.restoreAllMocks()
})

describe('connectSse', () => {
  it('连接时同步 onState("connecting")，URL 带 token query（02 §2.0：EventSource 设不了自定义头）', () => {
    vi.spyOn(apiModule, 'getToken').mockReturnValue('tkn-abc')
    const states: string[] = []
    connectSse({ onRefresh: () => {}, onJob: () => {}, onState: (s) => states.push(s) })

    expect(states).toEqual(['connecting'])
    expect(instances).toHaveLength(1)
    expect(instances[0]!.url).toBe('/api/events?token=tkn-abc')
  })

  it("'open' 事件 → onState('open') + 探测一次 /api/health，用其 revision 调 onRefresh（B2 丢事件保险）", async () => {
    vi.spyOn(apiModule, 'getToken').mockReturnValue('')
    const healthSpy = vi.spyOn(apiModule, 'apiGet').mockResolvedValue({ revision: 7 } as never)
    const states: string[] = []
    const revisions: number[] = []
    connectSse({ onRefresh: (r) => revisions.push(r), onJob: () => {}, onState: (s) => states.push(s) })

    instances[0]!.emit('open', '')
    await vi.waitFor(() => expect(revisions).toEqual([7]))

    expect(states).toEqual(['connecting', 'open'])
    expect(healthSpy).toHaveBeenCalledWith('/api/health')
  })

  it("'refresh' 事件：合法 payload 触发 onRefresh；畸形 payload 静默跳过、不抛异常", () => {
    vi.spyOn(apiModule, 'getToken').mockReturnValue('')
    const revisions: number[] = []
    connectSse({ onRefresh: (r) => revisions.push(r), onJob: () => {}, onState: () => {} })

    instances[0]!.emit('refresh', { revision: 3, reason: 'fs' })
    expect(() => instances[0]!.emit('refresh', '{not json')).not.toThrow()

    expect(revisions).toEqual([3])
  })

  it("'error' 事件：readyState=CLOSED → onState('closed')；readyState=CONNECTING（自动重连中）→ onState('connecting')", () => {
    vi.spyOn(apiModule, 'getToken').mockReturnValue('')
    const states: string[] = []
    connectSse({ onRefresh: () => {}, onJob: () => {}, onState: (s) => states.push(s) })
    const es = instances[0]!

    es.readyState = FakeEventSource.CLOSED
    es.emit('error', '')
    es.readyState = FakeEventSource.CONNECTING
    es.emit('error', '')

    expect(states).toEqual(['connecting', 'closed', 'connecting'])
  })

  it('watchJob(id) 注册 job:<id> 监听；收到全量快照转发给 onJob；重复 watchJob 同一 id 幂等（不重复注册）', () => {
    vi.spyOn(apiModule, 'getToken').mockReturnValue('')
    const jobs: unknown[] = []
    const conn = connectSse({ onRefresh: () => {}, onJob: (j) => jobs.push(j), onState: () => {} })
    const es = instances[0]!
    const baseline = es.addListenerCalls // connectSse 内部固定注册 open/error/refresh 三个监听，与 watchJob 无关

    conn.watchJob('publish-001')
    conn.watchJob('publish-001') // 幂等：第二次调用不应再 addEventListener
    expect(es.addListenerCalls).toBe(baseline + 1)

    const job = { id: 'publish-001', type: 'publish', state: 'running', milestones: [], narration: [], stalling: false, logPath: 'x' }
    es.emit('job:publish-001', job)
    expect(jobs).toEqual([job])

    // 未订阅的 job id 不会触发（未注册的具名事件天然收不到）。
    es.emit('job:other-999', { id: 'other-999' })
    expect(jobs).toEqual([job])
  })

  it('job:<id> 畸形 payload 静默跳过，不抛异常也不误触发 onJob', () => {
    vi.spyOn(apiModule, 'getToken').mockReturnValue('')
    const jobs: unknown[] = []
    const conn = connectSse({ onRefresh: () => {}, onJob: (j) => jobs.push(j), onState: () => {} })
    conn.watchJob('rework-1')

    expect(() => instances[0]!.emit('job:rework-1', 'not-json{')).not.toThrow()
    expect(jobs).toEqual([])
  })

  it('close() 解绑全部 job 监听、调用底层 es.close()、上报 onState("closed")', () => {
    vi.spyOn(apiModule, 'getToken').mockReturnValue('')
    const states: string[] = []
    const conn = connectSse({ onRefresh: () => {}, onJob: () => {}, onState: (s) => states.push(s) })
    conn.watchJob('a')
    conn.watchJob('b')

    conn.close()

    const es = instances[0]!
    expect(es.closeCalls).toBe(1)
    expect(es.removeListenerCalls).toBe(2) // job:a、job:b 各解绑一次
    expect(states.at(-1)).toBe('closed')
  })
})
