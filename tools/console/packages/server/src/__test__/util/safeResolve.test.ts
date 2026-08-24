import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, afterAll } from 'vitest'
import { safeResolve } from '../../util/safeResolve.js'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-resolve-'))
fs.mkdirSync(path.join(root, 'content/2030-01-01/sample'), { recursive: true })
fs.writeFileSync(path.join(root, 'content/2030-01-01/sample/meta.yaml'), 'status: idea\n')
fs.writeFileSync(path.join(root, 'dashboard.md'), '# dash\n')
fs.writeFileSync(path.join(root, 'secret.env'), 'TOKEN=xxx\n')
fs.mkdirSync(path.join(root, 'harness/logs'), { recursive: true })
fs.writeFileSync(path.join(root, 'harness/logs/report.md'), '# report\n')

afterAll(() => fs.rmSync(root, { recursive: true, force: true }))

const OPTS = { allowDirs: ['content', 'harness'], allowFiles: ['dashboard.md'], allowExt: ['.md', '.yaml'] }

describe('safeResolve', () => {
  it('放行白名单目录内的合法文件', () => {
    const r = safeResolve(root, 'content/2030-01-01/sample/meta.yaml', OPTS)
    expect(r.ok).toBe(true)
  })

  it('放行显式登记的单文件', () => {
    const r = safeResolve(root, 'dashboard.md', OPTS)
    expect(r.ok).toBe(true)
  })

  it('拒绝白名单目录外的文件（扩展名合法但路径不在白名单）', () => {
    const r = safeResolve(root, 'secret.env', OPTS)
    expect(r).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('拒绝 ../ 路径穿越', () => {
    const r = safeResolve(root, '../../../../etc/passwd', OPTS)
    expect(r).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('拒绝穿越到白名单目录之外但仍在 root 内的兄弟目录', () => {
    fs.mkdirSync(path.join(root, 'notallowed'), { recursive: true })
    fs.writeFileSync(path.join(root, 'notallowed/x.md'), 'x')
    const r = safeResolve(root, 'content/../notallowed/x.md', OPTS)
    expect(r).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('拒绝绝对路径输入', () => {
    const r = safeResolve(root, path.join(root, 'dashboard.md'), OPTS)
    expect(r).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('拒绝扩展名不在白名单内', () => {
    fs.writeFileSync(path.join(root, 'content/2030-01-01/sample/video.mp4'), 'x')
    const r = safeResolve(root, 'content/2030-01-01/sample/video.mp4', OPTS)
    expect(r).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('文件不存在返回 not_found', () => {
    const r = safeResolve(root, 'content/2030-01-01/sample/missing.md', OPTS)
    expect(r).toEqual({ ok: false, reason: 'not_found' })
  })

  it('空 path 拒绝', () => {
    const r = safeResolve(root, '', OPTS)
    expect(r).toEqual({ ok: false, reason: 'forbidden' })
  })
})
