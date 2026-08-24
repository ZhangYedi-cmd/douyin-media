import { describe, it, expect } from 'vitest'
import * as core from '../index.js'

describe('@console/core 只读导出面', () => {
  it('导出 buildSnapshot 与 resolveRoot 等函数', () => {
    expect(typeof core.buildSnapshot).toBe('function')
    expect(typeof core.resolveRoot).toBe('function')
    expect(typeof core.MediaError).toBe('function')
  })
})
