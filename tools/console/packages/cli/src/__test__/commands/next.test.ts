import { describe, it, expect } from 'vitest'
import { runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

describe('media next（fixture 仓，backlog.yaml 是全量真实拷贝）', () => {
  it('next_up 为空时按 score 取最高分，与主仓实跑结论一致：2026-07-19-001', () => {
    const { result, json } = runCliJson<{
      data: { decision: string; id: string; runnerUp: { id: string }[] }
    }>(['next', '--json', '--root', FIXTURE_REPO_ROOT])
    expect(result.status).toBe(0)
    expect(json.data.decision).toBe('score')
    expect(json.data.id).toBe('2026-07-19-001')
  })
})
