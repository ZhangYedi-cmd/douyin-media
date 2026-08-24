// 测试 fixture 路径帮助函数（独立于 core 的 fixture——server 需要 harness/tasks.md 等 core fixture 未覆盖的文件）。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSnapshot, computeAlerts } from '@console/core'
import { deriveHarnessTasks } from '../src/derive/tasksRegistry.js'
import { deriveDailyTrace, deriveHarnessToday } from '../src/derive/trace.js'
import { Store } from '../src/store.js'

const here = path.dirname(fileURLToPath(import.meta.url))

export const FIXTURE_REPO_ROOT = path.join(here, 'fixtures/repo')

/** 「现在」对齐 fixture 数据的参照时间：本地（无 Z 后缀）构造，与 harness ts 字段同一时区语境。 */
export const FIXTURE_NOW = new Date('2030-01-10T12:00:00')

export function copyFixtureRepoToTemp(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'console-server-'))
  fs.cpSync(FIXTURE_REPO_ROOT, tmp, { recursive: true })
  return tmp
}

/**
 * 构造一个字段已就绪的 Store 实例（不走真实 rebuild()，直接赋值公开字段），
 * 供 projections/routes 测试以确定的 `now` 控制 alerts/dailyRun/harnessTasks，
 * 绕开 Store.rebuild() 里「now=真实墙钟」这个不适合单测的行为
 *（R2 修复后首拍已不再恒空，见 store.test.ts；这里仍用固定 now 是为了时间型规则可控，与该修复无关）。
 */
export function buildTestStore(root: string = FIXTURE_REPO_ROOT, now: Date = FIXTURE_NOW): Store {
  const store = new Store(root)
  const snap = buildSnapshot(root)
  store.snapshot = snap
  store.alerts = computeAlerts(snap, now)
  store.revision = 1
  store.buildMs = 1.23
  store.builtAt = now.toISOString()
  store.dailyRun = deriveDailyTrace(root, snap, now)
  store.harnessToday = deriveHarnessToday(snap, now)
  const tasksRawPath = path.join(root, 'harness/tasks.md')
  const tasksRaw = fs.existsSync(tasksRawPath) ? fs.readFileSync(tasksRawPath, 'utf8') : ''
  store.harnessTasks = deriveHarnessTasks(tasksRaw, snap.harness, now)
  return store
}
