// MediaError：全命令统一错误形状，退出码集中定义于此（01-CLI执行方案.md §2.0 错误码表 / 退出码表）。

export type MediaErrorCode =
  | 'E_NOT_FOUND'
  | 'E_BAD_STATUS'
  | 'E_ILLEGAL_TRANSITION'
  | 'E_MISSING_REASON'
  | 'E_DIR_EXISTS'
  | 'E_NO_TEMPLATE'
  | 'E_DUPLICATE'
  | 'E_SCHEMA'
  | 'E_BAD_ARG'
  | 'E_ALREADY_PUBLISHED'
  | 'E_NO_MARKERS'
  | 'E_LOCKED'
  | 'E_PARSE'

// 退出码表（§2.0）：0 成功 / 1 规则拒绝-校验失败 / 2 用法错误(commander 产生) / 3 锁冲突 / 4 解析损坏
const EXIT_CODE_BY_CODE: Record<MediaErrorCode, number> = {
  E_NOT_FOUND: 1,
  E_BAD_STATUS: 1,
  E_ILLEGAL_TRANSITION: 1,
  E_MISSING_REASON: 1,
  E_DIR_EXISTS: 1,
  E_NO_TEMPLATE: 1,
  E_DUPLICATE: 1,
  E_SCHEMA: 1,
  E_BAD_ARG: 1,
  E_ALREADY_PUBLISHED: 1,
  E_NO_MARKERS: 1,
  E_LOCKED: 3,
  E_PARSE: 4,
}

export class MediaError extends Error {
  code: MediaErrorCode
  rule?: string
  exitCode: number

  constructor(code: MediaErrorCode, message: string, opts?: { rule?: string }) {
    super(message)
    this.name = 'MediaError'
    this.code = code
    this.rule = opts?.rule
    this.exitCode = EXIT_CODE_BY_CODE[code]
  }
}

export function isMediaError(err: unknown): err is MediaError {
  return err instanceof MediaError
}
