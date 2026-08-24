import { describe, expect, it, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { computeAlerts } from '@console/core'
import { copyFixtureRepoToTemp } from '../../__test__/fixtures.js'
import { Store } from '../store.js'

const tempDirs: string[] = []
afterEach(() => {
  while (tempDirs.length > 0) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true })
})

describe('Store', () => {
  it('init() 是首次 rebuild：revision=1，首拍不去抖直接全量（R2 修复：避免冷启动 alerts 与 media check 不一致）', () => {
    // 旧行为（已修复前）：首拍套用「连续两次快照都在才算 active」的去抖规则，空的 prevAlertKeys 把
    // 全部警报当噪声滤掉，alerts 冷启动恒为 []，直到下一次 rebuild 才回正——这里改为断言首拍就等于
    // 直接一次性 computeAlerts 的全量结果（不再硬编码期望空数组，那正是本次要修的 bug）。
    const store = new Store(copyFixtureRepoToTemp())
    store.init()
    expect(store.revision).toBe(1)
    const direct = computeAlerts(store.snapshot, new Date())
    expect(store.alerts.map((a) => a.key).sort()).toEqual(direct.map((a) => a.key).sort())
    expect(store.snapshot.contents.length).toBe(2)
  })

  it('冷启动 alerts 非空回归（R2 报告）：进程刚起、watcher 尚无事件，init() 后 alerts 就该有内容，不必等下一次 rebuild', () => {
    // 专用 fixture：backlog 一条 picked 条目但 content_path 为空，触发 CHK-02（断链）——纯结构性判据，
    // 不依赖真实墙钟当前日期/星期几，跑测试的任意时刻都稳定命中，不会像时间型规则那样偶发假阴性。
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'console-server-store-cold-'))
    tempDirs.push(root)
    fs.mkdirSync(path.join(root, 'content/_backlog'), { recursive: true })
    fs.writeFileSync(
      path.join(root, 'content/_backlog/backlog.yaml'),
      [
        'next_up: null',
        '',
        'topics:',
        '  - id: 2030-08-01-001',
        '    title: "CHK-02 冷启动回归"',
        '    alt_titles: []',
        '    track: depth',
        '    format: kouban',
        '    status: picked',
        '    content_path:',
        '    score: 4.00',
        '    tier: S',
        '    scores: {}',
        '    urgency: queue',
        '    reason: "断链复现：picked 但 content_path 为空"',
        '    links: []',
        '    tags: []',
        '    created: 2030-08-01',
        '    metrics: {}',
        '',
      ].join('\n'),
    )

    const store = new Store(root)
    store.init()
    expect(store.revision).toBe(1)
    expect(store.alerts.length).toBeGreaterThan(0)
    expect(store.alerts.map((a) => a.key)).toContain('CHK-02:2030-08-01-001')

    // 与「不去抖直接跑 media check 同款算法」的结果一致，证明首拍不是碰巧非空，而是真的全量透传
    const direct = computeAlerts(store.snapshot, new Date())
    expect(store.alerts.map((a) => a.key).sort()).toEqual(direct.map((a) => a.key).sort())
  })

  it('连续两次 rebuild 后，两次快照都在的警报才转正（同一时刻数据不变，稳定警报应等于原始警报全集）', () => {
    const store = new Store(copyFixtureRepoToTemp())
    store.init()
    store.rebuild('tick')
    expect(store.revision).toBe(2)
    // 两次 rebuild 数据完全相同（fixture 不变）→ 第二次的稳定 alerts 应等于直接一次性 computeAlerts 的结果
    // （时间型规则以「年」为阈值单位，两次调用间的毫秒级窗口不足以跨阈值翻转任何一条）
    const direct = computeAlerts(store.snapshot, new Date())
    expect(store.alerts.map((a) => a.key).sort()).toEqual(direct.map((a) => a.key).sort())
  })

  it('rebuild() 每次调用 revision 严格递增，且 dailyRun/harnessTasks 同步刷新', () => {
    const store = new Store(copyFixtureRepoToTemp())
    store.init()
    const r1 = store.revision
    store.rebuild('fs')
    expect(store.revision).toBe(r1 + 1)
    expect(store.dailyRun).toBeDefined()
    expect(store.harnessTasks.length).toBeGreaterThan(0)
  })

  it('attachSse 后 rebuild 会广播 refresh；init() 不广播（尚无客户端）', () => {
    const store = new Store(copyFixtureRepoToTemp())
    const broadcasts: { event: string; data: unknown }[] = []
    store.attachSse({ broadcast: (event, data) => broadcasts.push({ event, data }) } as never)
    store.init()
    expect(broadcasts.length).toBe(0)
    store.rebuild('fs')
    expect(broadcasts.length).toBe(1)
    expect(broadcasts[0]!.event).toBe('refresh')
  })
})
