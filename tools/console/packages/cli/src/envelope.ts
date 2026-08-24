// JSON 信封 + 错误退出码统一实现（01-CLI执行方案.md §2.0 通用约定）。
import { MediaError } from '@console/core'
import type { Alert } from '@console/core'

export interface WriteRecord {
  path: string
  fields: string[]
  diff?: string
}

export interface OkPayload {
  ok: true
  cmd: string
  data: unknown
  writes?: WriteRecord[]
  alerts?: Alert[]
}

export interface ErrPayload {
  ok: false
  cmd: string
  error: { code: string; message: string; rule?: string }
}

/** 成功输出：--json 给结构化信封；否则跑 human() 渲染人读文本。 */
export function emitOk(
  cmd: string,
  json: boolean | undefined,
  data: unknown,
  human: () => void,
  extra?: { writes?: WriteRecord[]; alerts?: Alert[] },
): void {
  if (json) {
    const payload: OkPayload = { ok: true, cmd, data }
    if (extra?.writes) payload.writes = extra.writes
    if (extra?.alerts) payload.alerts = extra.alerts
    process.stdout.write(JSON.stringify(payload) + '\n')
  } else {
    human()
  }
}

/** 失败输出 + 按错误码退出（§2.0 退出码表）。永不返回。 */
export function emitErr(cmd: string, json: boolean | undefined, err: unknown): never {
  const isMedia = err instanceof MediaError
  const code = isMedia ? err.code : 'E_UNKNOWN'
  const rule = isMedia ? err.rule : undefined
  const exitCode = isMedia ? err.exitCode : 1
  const message = err instanceof Error ? err.message : String(err)

  if (json) {
    const payload: ErrPayload = { ok: false, cmd, error: { code, message, rule } }
    process.stdout.write(JSON.stringify(payload) + '\n')
  } else {
    process.stderr.write(`✗ ${cmd} 失败 [${code}]: ${message}\n`)
  }
  process.exit(exitCode)
}
