import { describe, expect, it } from 'vitest'
import { FIXTURE_REPO_ROOT } from '../../../__test__/fixtures.js'
import { countRework, readReviewLog } from '../../util/reviewLog.js'

describe('reviewLog（3-review.md 留痕，生产线详情页与 job runner 共享口径）', () => {
  it('readReviewLog 读到 fixture 的 3-review.md 全文', () => {
    const raw = readReviewLog(FIXTURE_REPO_ROOT, 'content/2030-01-06/review-sample')
    expect(raw).toContain('打回·重做(第1次)')
  })

  it('readReviewLog 文件不存在时返回空串，不抛异常', () => {
    expect(readReviewLog(FIXTURE_REPO_ROOT, 'content/2030-01-05/published-sample')).toBe('')
  })

  it('countRework 计「打回·重做」条数，沿 feishu server _count_rework 同一口径', () => {
    const raw = readReviewLog(FIXTURE_REPO_ROOT, 'content/2030-01-06/review-sample')
    expect(countRework(raw)).toBe(1)
    expect(countRework('- 打回·重做(第1次)\n- 打回·重做(第2次)\n')).toBe(2)
    expect(countRework('')).toBe(0)
  })
})
