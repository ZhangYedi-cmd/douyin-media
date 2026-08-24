// 4 条快写动作（02-后端执行方案.md §2.2）：execFile media，响应信封见 §2.0。
import { Hono } from 'hono'
import type { Alert } from '@console/core'
import { execMedia } from '../actions/execMedia.js'
import { backlogApplyArgs, isValidBacklogId, isValidSlug, nextUpArgs, promoteArgs, reviewArgs } from '../actions/whitelist.js'
import type { ActionOkResponse, ApiErrorBody } from '../api-types.js'
import type { Config } from '../config.js'
import type { Store } from '../store.js'

export interface ActionRouteDeps {
  config: Config
  store: Store
}

function badParam(message: string): ApiErrorBody {
  return { error: { code: 'BAD_PARAM', message } }
}

function computeCheck(alerts: unknown): ActionOkResponse['check'] {
  if (!Array.isArray(alerts)) return null
  const list = alerts as Alert[]
  return {
    errors: list.filter((a) => a.level === 'error').length,
    warns: list.filter((a) => a.level === 'warn').length,
    infos: list.filter((a) => a.level === 'info').length,
  }
}

interface RouteResult {
  status: number
  body: unknown
}

async function runAction(config: Config, args: string[], dryRun: boolean): Promise<RouteResult> {
  const result = await execMedia(config, args)
  if (result.httpStatus !== 200) return { status: result.httpStatus, body: result.body }
  const mediaBody = result.body as { ok: true; cmd: string; data: unknown; writes?: unknown; alerts?: unknown }
  const okBody: ActionOkResponse = {
    ok: true,
    dryRun,
    result: mediaBody,
    check: dryRun ? null : computeCheck(mediaBody.alerts),
  }
  return { status: 200, body: okBody }
}

// eslint 风格的小工具：Hono 的 c.json 第二参要求字面量 StatusCode 联合类型，这里状态码是运行时算出的
// 动态值（400/409/500/502/200 视分支而定），cast 是唯一合理选法——路由层薄封装，不值得为此重新建模。
function respond(c: import('hono').Context, r: RouteResult) {
  return c.json(r.body as object, r.status as never)
}

export function createActionRoutes(deps: ActionRouteDeps): Hono {
  const { config } = deps
  const app = new Hono()

  app.post('/api/actions/review', async (c) => {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') return c.json(badParam('请求体须为 JSON 对象'), 400)
    const { slug, decision, reason, dryRun } = body as { slug?: unknown; decision?: unknown; reason?: unknown; dryRun?: unknown }
    if (!isValidSlug(slug)) return c.json(badParam('slug 格式非法或缺失'), 400)
    if (decision !== 'approved' && decision !== 'rework' && decision !== 'rejected') {
      return c.json(badParam('decision 须为 approved|rework|rejected'), 400)
    }
    if ((decision === 'rework' || decision === 'rejected') && (typeof reason !== 'string' || reason.trim() === '')) {
      return c.json(badParam(`decision=${decision} 时 reason 必填`), 400)
    }
    const args = reviewArgs(slug, decision, typeof reason === 'string' ? reason : undefined, !!dryRun)
    return respond(c, await runAction(config, args, !!dryRun))
  })

  app.post('/api/actions/backlog-apply', async (c) => {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') return c.json(badParam('请求体须为 JSON 对象'), 400)
    const { id, action, proposal, into, dryRun } = body as {
      id?: unknown
      action?: unknown
      proposal?: unknown
      into?: unknown
      dryRun?: unknown
    }
    if (!isValidBacklogId(id)) return c.json(badParam('id 格式非法或缺失（须 YYYY-MM-DD-NNN）'), 400)
    if (action !== 'merge' && action !== 'archive') return c.json(badParam('action 须为 merge|archive'), 400)
    if (typeof proposal !== 'string' || !proposal.startsWith('harness/logs/')) {
      return c.json(badParam('proposal 须为 harness/logs/ 下的报告相对路径'), 400)
    }
    if (action === 'merge' && !isValidBacklogId(into)) return c.json(badParam('merge 须带合法 into id'), 400)
    const args = backlogApplyArgs(id, action, proposal, typeof into === 'string' ? into : undefined, !!dryRun)
    return respond(c, await runAction(config, args, !!dryRun))
  })

  app.post('/api/actions/promote', async (c) => {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') return c.json(badParam('请求体须为 JSON 对象'), 400)
    const { id, auto, slug, date, dryRun } = body as { id?: unknown; auto?: unknown; slug?: unknown; date?: unknown; dryRun?: unknown }
    if (!id && !auto) return c.json(badParam('需要 id 或 auto:true 二选一'), 400)
    if (id && auto) return c.json(badParam('id 与 auto 二选一，不可同时给'), 400)
    if (id !== undefined && !isValidBacklogId(id)) return c.json(badParam('id 格式非法'), 400)
    if (!isValidSlug(slug)) {
      return c.json(
        badParam(
          'slug 必填且须 kebab-case（02 §2.2 表未列此字段但 media promote 实际要求 --slug，见服务端已知偏差记录）',
        ),
        400,
      )
    }
    if (date !== undefined && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      return c.json(badParam('date 格式非法（须 YYYY-MM-DD）'), 400)
    }
    const args = promoteArgs(
      { id: typeof id === 'string' ? id : undefined, auto: !!auto, slug, date: typeof date === 'string' ? date : undefined },
      !!dryRun,
    )
    return respond(c, await runAction(config, args, !!dryRun))
  })

  app.post('/api/actions/next-up', async (c) => {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') return c.json(badParam('请求体须为 JSON 对象'), 400)
    const { id, clear, dryRun } = body as { id?: unknown; clear?: unknown; dryRun?: unknown }
    if (!id && !clear) return c.json(badParam('需要 id 或 clear:true 二选一'), 400)
    if (id && clear) return c.json(badParam('id 与 clear 二选一，不可同时给'), 400)
    if (id !== undefined && !isValidBacklogId(id)) return c.json(badParam('id 格式非法'), 400)
    const args = nextUpArgs({ id: typeof id === 'string' ? id : undefined, clear: !!clear }, !!dryRun)
    return respond(c, await runAction(config, args, !!dryRun))
  })

  return app
}
