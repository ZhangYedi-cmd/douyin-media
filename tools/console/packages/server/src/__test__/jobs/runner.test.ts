// JobRunner 单测范围声明：本文件只测「precheck 提前拒绝」路径（PRECONDITION_FAILED/REWORK_LIMIT），
// 因为一旦 precheck 通过，submit* 会立即入队并在后台 fire-and-forget 调 execCcJob → runHeadlessCC，
// 真的 spawn `claude -p` 子进程——这在 CI/单测环境里既危险（红线2：禁止意外触发真实 CC 调用）又不确定
// （依赖 claude 二进制与网络）。happy-path（spawn→里程碑→verdict）改走 S5 验收要求的
// content/_test 真实仓端到端手动验证，不进本文件。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { SseHub } from '../../sse.js'
import { copyFixtureRepoToTemp, buildTestStore } from '../../../__test__/fixtures.js'
import { JobRunner } from '../../jobs/runner.js'
import type { Config } from '../../config.js'
import type { HarnessTaskRow } from '../../api-types.js'

const consoleRootTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'job-runner-console-'))
afterAll(() => fs.rmSync(consoleRootTmp, { recursive: true, force: true }))

const noopSse = { broadcast: () => {}, jobUpdate: () => {}, clientCount: () => 0, startPing: () => {}, stopPing: () => {} } as unknown as SseHub

function buildRunner(repoRoot: string): JobRunner {
  const store = buildTestStore(repoRoot)
  const config: Config = { consoleRoot: consoleRootTmp, repoRoot, port: 5170, mediaBin: 'media', tokenPath: '/dev/null' }
  return new JobRunner({ config, store, sse: noopSse })
}

describe('JobRunner.submitPublish：precheck 拒绝路径', () => {
  it('slug 不存在 → PRECONDITION_FAILED', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitPublish({ slug: 'no-such-slug' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('PRECONDITION_FAILED')
  })

  it('meta.status ≠ approved（review-sample 是 review）→ PRECONDITION_FAILED（只发 approved 铁律）', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitPublish({ slug: 'review-sample' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe('PRECONDITION_FAILED')
      expect(res.message).toContain('review')
    }
  })

  it('published-sample 已是 published，重复发布请求同样被 precondition 拒（天然幂等）', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitPublish({ slug: 'published-sample' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('PRECONDITION_FAILED')
  })
})

describe('JobRunner.submitRework：precheck 拒绝路径', () => {
  it('slug 不存在 → PRECONDITION_FAILED', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitRework({ slug: 'no-such-slug', reason: 'x' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('PRECONDITION_FAILED')
  })

  it('meta.status 不在 review/drafting/rejected（published-sample）→ PRECONDITION_FAILED', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitRework({ slug: 'published-sample', reason: 'x' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('PRECONDITION_FAILED')
  })

  it('已达重做上限（3-review.md 里 2 条「打回·重做」）→ REWORK_LIMIT', () => {
    const tmp = copyFixtureRepoToTemp()
    const reviewPath = path.join(tmp, 'content/2030-01-06/review-sample/3-review.md')
    fs.appendFileSync(reviewPath, '\n- [2030-01-08 10:00] 打回·重做(第2次) — 又一次\n')
    const runner = buildRunner(tmp)
    const res = runner.submitRework({ slug: 'review-sample', reason: '第三次打回' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('REWORK_LIMIT')
  })
})

describe('JobRunner.submitApplyProposal：precheck 拒绝路径', () => {
  it('report 不在 harness/logs/index.jsonl 中 → PRECONDITION_FAILED', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitApplyProposal({ report: 'harness/logs/not-registered.md' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('PRECONDITION_FAILED')
  })

  it('report 已 applied:true（backlog-gardener fixture）→ PRECONDITION_FAILED', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitApplyProposal({ report: 'harness/logs/2030-01-01-backlog-gardener.md' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('PRECONDITION_FAILED')
  })
})

// 2026-08-19 增补两型（用户走查提的手动触发能力，H 号执行；02-后端执行方案.md 未覆盖此二型，
// 契约由总指挥直接在 api-types.ts/defs.ts 落地）。范围声明同头注：只测 precheck 提前拒绝路径——
// 一旦 precheck 通过就会真的 spawn `claude -p`，submitHarnessRun 绝不能拿 fixture 里 enabled+有 skill
// 的任务（retro/ideate/backlog-gardener/never-run-task）去测，submitCreate 绝不能拿 status=ideated
// 的条目去测（fixture 里也确实没有这种条目，天然安全）。

/** 覆盖 store.harnessTasks 为手工构造的行，绕开 harness/tasks.md 的真实注册表，
 * 用于覆盖 fixture 未提供的形态（如「enabled=true 但无 skill」，对应真实仓的 check 任务）。 */
function buildRunnerWithHarnessTasks(rows: HarnessTaskRow[]): JobRunner {
  const repoRoot = copyFixtureRepoToTemp()
  const store = buildTestStore(repoRoot)
  store.harnessTasks = rows
  const config: Config = { consoleRoot: consoleRootTmp, repoRoot, port: 5170, mediaBin: 'media', tokenPath: '/dev/null' }
  return new JobRunner({ config, store, sse: noopSse })
}

describe('JobRunner.submitHarnessRun：precheck 拒绝路径', () => {
  it('task 不在注册表中 → PRECONDITION_FAILED', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitHarnessRun({ task: '不存在' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('PRECONDITION_FAILED')
  })

  it('task 已注册但 enabled=false（fixture disabled-task）→ PRECONDITION_FAILED，消息含"未启用"', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitHarnessRun({ task: 'disabled-task' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe('PRECONDITION_FAILED')
      expect(res.message).toContain('未启用')
    }
  })

  it('task 已注册、enabled=true 但无 skill（如真实仓的 check）→ PRECONDITION_FAILED，消息含"执行技能"', () => {
    const runner = buildRunnerWithHarnessTasks([
      { name: 'check', skill: null, enabled: true, trigger: 'periodic:1d', lastRun: null, overdue: false },
    ])
    const res = runner.submitHarnessRun({ task: 'check' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe('PRECONDITION_FAILED')
      expect(res.message).toContain('执行技能')
    }
  })

  it('enabled=false 且无 skill（真实仓 link-rot-checker 的形态）→ 优先报"未启用"（precheck 顺序：存在→enabled→skill）', () => {
    const runner = buildRunnerWithHarnessTasks([
      { name: 'link-rot-checker', skill: null, enabled: false, trigger: 'weighted-pool', lastRun: null, overdue: false },
    ])
    const res = runner.submitHarnessRun({ task: 'link-rot-checker' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe('PRECONDITION_FAILED')
      expect(res.message).toContain('未启用')
    }
  })
})

describe('JobRunner.submitCreate：precheck 拒绝路径', () => {
  it('slug 不存在 → PRECONDITION_FAILED', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitCreate({ slug: 'no-such-slug' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('PRECONDITION_FAILED')
  })

  it('meta.status ≠ ideated（published-sample 是 published）→ PRECONDITION_FAILED，消息带当前状态标签与铁律说明', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitCreate({ slug: 'published-sample' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe('PRECONDITION_FAILED')
      expect(res.message).toContain('已发布')
      expect(res.message).toContain('已选题')
    }
  })

  it('meta.status ≠ ideated（review-sample 是 review）→ PRECONDITION_FAILED，消息带"待审"', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.submitCreate({ slug: 'review-sample' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe('PRECONDITION_FAILED')
      expect(res.message).toContain('待审')
    }
  })
})

describe('JobRunner 只读面（GET /api/jobs 的数据来源）', () => {
  it('无任务时 getActive/getQueued/getRecent 均为空', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    expect(runner.getActive()).toBeNull()
    expect(runner.getQueued()).toEqual([])
    expect(runner.getRecent()).toEqual([])
  })

  it('getById 查无此 id 返回 undefined', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    expect(runner.getById('publish-nonexistent')).toBeUndefined()
  })
})
