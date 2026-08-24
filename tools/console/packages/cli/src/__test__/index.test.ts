import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const distEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../dist/index.js',
)

describe('media --version', () => {
  it('构建产物可执行并打印版本号', () => {
    const out = execFileSync('node', [distEntry, '--version'], { encoding: 'utf8' })
    expect(out.trim().length).toBeGreaterThan(0)
  })
})
