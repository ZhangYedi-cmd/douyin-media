// execFile("media", args) 封装：唯一允许 server 触碰 media 二进制的地方（02-后端执行方案.md §2.2）。
// 退出码→错误码映射（契约原文见 02 §2.2 首段）：
//   exit 0 ⇒ 200 透传 --json stdout
//   exit 1/3（规则拒绝/锁冲突）⇒ 409 MEDIA_REJECTED（detail 带 CLI 报的规则名）
//   exit 4（E_PARSE 真相源损坏）⇒ 500 INTERNAL 并触发告警
//   exit 2（用法错误 = server 侧白名单拼参 bug）⇒ 500 INTERNAL
//   spawn 失败/超时 ⇒ 502 MEDIA_UNAVAILABLE
// 已知偏差（见最终报告）：commander 4（当前依赖版本）对「未知命令」「缺失必填参数」两类用法错误实测
// 都退出码 1（与 MediaError 规则拒绝的 1 同码，未见文档所称的独立退出码 2），故本实现不按裸退出码数字
// 分支，而是按"stdout 能否解析成 media 的 JSON 错误信封"来分类：能解析且 code 属于 MediaErrorCode 表 ⇒
// 走规则拒绝/E_PARSE 分支；解析不出来的失败（commander 直接把用法错误写 stderr、不产 JSON）⇒ 判定为
// server 侧参数拼装 bug，同样落 500 INTERNAL——与契约的"该分支=server bug"意图一致，只是判据换了更稳的信号。
import { execFile as execFileCb } from 'node:child_process'
import { mediaBinFallback } from '../config.js'
import type { Config } from '../config.js'
import type { ApiErrorBody } from '../api-types.js'

export interface ExecMediaResult {
  httpStatus: number
  body: unknown
}

interface ExecErrorLike extends Error {
  code?: string | number
  killed?: boolean
  signal?: string | null
}

const MEDIA_ERROR_CODES = new Set([
  'E_NOT_FOUND',
  'E_BAD_STATUS',
  'E_ILLEGAL_TRANSITION',
  'E_MISSING_REASON',
  'E_DIR_EXISTS',
  'E_NO_TEMPLATE',
  'E_DUPLICATE',
  'E_SCHEMA',
  'E_BAD_ARG',
  'E_ALREADY_PUBLISHED',
  'E_NO_MARKERS',
  'E_LOCKED',
  'E_PARSE',
])

function tryParseJson(text: string): { ok: boolean; [k: string]: unknown } | null {
  try {
    const v = JSON.parse(text)
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

function errBody(code: ApiErrorBody['error']['code'], message: string, detail?: string): ApiErrorBody {
  return { error: { code, message, detail } }
}

function runOnce(
  bin: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; err: ExecErrorLike | null }> {
  return new Promise((resolve) => {
    execFileCb(bin, args, { cwd, timeout: timeoutMs, env, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ stdout: stdout ?? '', stderr: stderr ?? '', err: err as ExecErrorLike | null })
    })
  })
}

export async function execMedia(
  config: Config,
  args: string[],
  opts: { actor?: string; timeoutMs?: number } = {},
): Promise<ExecMediaResult> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    MEDIA_ACTOR: opts.actor ?? 'console',
    PIPELINE_REPO_ROOT: config.repoRoot,
  }
  const timeoutMs = opts.timeoutMs ?? 30_000

  let { stdout, stderr, err } = await runOnce(config.mediaBin, args, config.repoRoot, env, timeoutMs)

  // spawn 层面失败（还没跑到 media 自身的逻辑）：Node 把这类错误的 .code 设成字符串错误码
  // （区别于「进程真的跑了、退出码非零」时 .code 是数字）。02 §2.8 原文只提 ENOENT（PATH 里没有 `media`，
  // 未 npm link）；真实起服务验证时还实测到 EACCES 场景——`tsc -b` 重新编译 cli/dist/index.js 后
  // 不保留可执行位，导致全局 npm link 出的 `media` 符号链接指向一个不可执行文件，spawn 报 EACCES 而非
  // ENOENT。两种失败对策相同（绝对路径走 `node <path>` 直接解释执行，不依赖可执行位/PATH），故统一按
  // 「err.code 是字符串」判定为 spawn 级失败，一律走兜底，而不是只匹配 ENOENT 这一个错误码。
  if (err && typeof err.code === 'string') {
    const fallback = mediaBinFallback(config.consoleRoot)
    ;({ stdout, stderr, err } = await runOnce(process.execPath, [fallback, ...args], config.repoRoot, env, timeoutMs))
    if (err && typeof err.code === 'string') {
      return {
        httpStatus: 502,
        body: errBody('MEDIA_UNAVAILABLE', 'media 命令不可用：PATH 里的 `media` 与绝对路径兜底均无法启动', err.message),
      }
    }
  }

  if (!err) {
    const parsed = tryParseJson(stdout)
    if (parsed && parsed.ok === true) {
      return { httpStatus: 200, body: parsed }
    }
    return {
      httpStatus: 500,
      body: errBody('INTERNAL', 'media 命令退出成功但输出不是预期 JSON 信封', stdout.slice(0, 2000)),
    }
  }

  if (err.killed || err.signal === 'SIGTERM' || /timed out/i.test(err.message)) {
    return { httpStatus: 502, body: errBody('MEDIA_UNAVAILABLE', 'media 命令执行超时', (stderr || err.message).slice(0, 2000)) }
  }

  const parsed = tryParseJson(stdout)
  const errorField = parsed && typeof parsed.error === 'object' ? (parsed.error as Record<string, unknown>) : null
  if (parsed && parsed.ok === false && errorField && typeof errorField.code === 'string' && MEDIA_ERROR_CODES.has(errorField.code)) {
    const message = typeof errorField.message === 'string' ? errorField.message : 'media 拒绝该操作'
    const rule = typeof errorField.rule === 'string' ? errorField.rule : undefined
    if (errorField.code === 'E_PARSE') {
      // eslint-disable-next-line no-console
      console.error(`[ALERT] media E_PARSE：真相源文件损坏 args=${JSON.stringify(args)} message=${message}`)
      return { httpStatus: 500, body: errBody('INTERNAL', message, 'E_PARSE：真相源文件损坏，需人工介入') }
    }
    return { httpStatus: 409, body: errBody('MEDIA_REJECTED', message, rule ? `rule=${rule}` : undefined) }
  }

  return {
    httpStatus: 500,
    body: errBody('INTERNAL', 'media 命令执行失败且输出非预期错误信封（疑为 server 参数拼装问题）', (stderr || stdout).slice(0, 2000)),
  }
}
