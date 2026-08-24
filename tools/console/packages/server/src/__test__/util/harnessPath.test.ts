import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeHarnessReportPath } from '../../util/harnessPath.js'

describe('normalizeHarnessReportPath', () => {
  it('harness/ 相对路径（真实 index.jsonl 历史格式）补齐为仓相对路径', () => {
    expect(normalizeHarnessReportPath('logs/2026-07-18-retro.md')).toBe('harness/logs/2026-07-18-retro.md')
  })

  it('已经是仓相对路径时幂等，不重复加前缀', () => {
    expect(normalizeHarnessReportPath('harness/logs/2026-07-18-retro.md')).toBe('harness/logs/2026-07-18-retro.md')
  })

  it('content/_research/ 下的 ideate 报告同样按 harness/ 相对处理（真实数据里 ideate 任务的 report 就长这样）', () => {
    // 这条按现有真实数据是「content/_research/research-2026-07-19.md」——不以 harness/ 开头，
    // 归一函数会补成 harness/content/_research/...，这其实是错的（该报告本就住 content/ 下，不归 harness/ 管）。
    // 记录为已知局限：归一化只解决「harness/logs/」这一类主流场景，ideate 的 report 落在 content/_research/
    // 是另一种历史格式，08 §4 风险项另记，不在本函数职责内（该值目前也不会进 apply-proposal 的比对路径，
    // 因为 ideate 类任务的 findings 字段现网数据均为 0，不会被 deriveProposals 选中）。
    expect(normalizeHarnessReportPath('content/_research/research-2026-07-19.md')).toBe(
      'harness/content/_research/research-2026-07-19.md',
    )
  })
})

// 2026-08-19 修正：一律补 harness/ 前缀会打断 ideate 写到 content/_research/ 的研究稿链接
// （真实账本 35 条里有 5 条是这种仓根相对路径，用户点开报告时报「文件不存在」实锤）。
describe('normalizeHarnessReportPath 带仓根时按文件实际位置判定', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-path-'))
  fs.mkdirSync(path.join(root, 'harness/logs'), { recursive: true })
  fs.mkdirSync(path.join(root, 'content/_research'), { recursive: true })
  fs.writeFileSync(path.join(root, 'harness/logs/2026-07-19-retro.md'), '# retro')
  fs.writeFileSync(path.join(root, 'content/_research/research-2026-07-19.md'), '# research')

  it('harness/ 下存在 → 补前缀（30/35 条的老形状）', () => {
    expect(normalizeHarnessReportPath('logs/2026-07-19-retro.md', root)).toBe('harness/logs/2026-07-19-retro.md')
  })

  it('仓根下存在 → 原样返回，不再误加前缀（5/35 条的 ideate 研究稿）', () => {
    expect(normalizeHarnessReportPath('content/_research/research-2026-07-19.md', root)).toBe(
      'content/_research/research-2026-07-19.md',
    )
  })

  it('两处都不存在 → 回退旧行为补前缀，让上层照常报「文件不存在」而不是静默改写', () => {
    expect(normalizeHarnessReportPath('logs/查无此文件.md', root)).toBe('harness/logs/查无此文件.md')
  })

  it('已带 harness/ 前缀的原样返回，不重复拼接', () => {
    expect(normalizeHarnessReportPath('harness/logs/2026-07-19-retro.md', root)).toBe('harness/logs/2026-07-19-retro.md')
  })

  it('不传仓根时退化为纯函数旧行为（无磁盘依赖）', () => {
    expect(normalizeHarnessReportPath('content/_research/x.md')).toBe('harness/content/_research/x.md')
  })
})
