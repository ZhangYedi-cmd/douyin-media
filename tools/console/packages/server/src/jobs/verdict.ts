// 终局裁决：复读 meta.status / git diff 抓取（02-后端执行方案.md §2.6 verdict.ts）。
// cc-stream 的 `result.is_error` 只是第一道信号，文件状态才是唯一裁决（上游拍板 §7.4 信任分级），
// 故本模块现场 fs.readFile 单个 meta.yaml（可能落后 debounce 半秒的 Snapshot 不够新鲜）——读操作不破零写铁律。
import fs from 'node:fs'
import path from 'node:path'
import { execFile as execFileCb } from 'node:child_process'
import { findContentDirBySlug, harnessIndexPath, parseYamlValue } from '@console/core'
import type { HarnessRun } from '@console/core'
import { normalizeHarnessReportPath } from '../util/harnessPath.js'
import type { JobVerdict } from '../api-types.js'

function execFileP(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    execFileCb(cmd, args, { cwd, maxBuffer: 16 * 1024 * 1024 }, (err, stdout) => {
      resolve(err ? '' : stdout)
    })
  })
}

/** 现场读 meta.yaml 的 status 单字段；不走 core/writer（禁 import），只用只读 parseYamlValue。 */
export function readMetaStatus(root: string, slug: string): string | null {
  const dir = findContentDirBySlug(root, slug)
  if (!dir) return null
  try {
    const raw = fs.readFileSync(path.join(dir, 'meta.yaml'), 'utf8')
    const obj = parseYamlValue(raw) as Record<string, unknown> | undefined
    return typeof obj?.status === 'string' ? obj.status : null
  } catch {
    return null
  }
}

export async function verdictPublish(root: string, slug: string, runOk: boolean): Promise<JobVerdict> {
  const metaStatus = readMetaStatus(root, slug) ?? undefined
  const ok = runOk && (metaStatus === 'published' || metaStatus === 'scheduled')
  return {
    ok,
    metaStatus,
    expect: ['published', 'scheduled'],
    note: ok ? undefined : `子进程${runOk ? '声称成功但' : '报告失败且'}meta.status=${metaStatus ?? '(未知)'}`,
  }
}

/** 沿 feishu `_async_rework` 语义：不假装成功——未回到 review 就如实报未完成。 */
export async function verdictRework(root: string, slug: string, _runOk: boolean): Promise<JobVerdict> {
  const metaStatus = readMetaStatus(root, slug) ?? undefined
  const ok = metaStatus === 'review'
  return {
    ok,
    metaStatus,
    expect: ['review'],
    note: ok ? undefined : `未回到 review（当前 meta.status=${metaStatus ?? '(未知)'}），可能卡在人工节点，见 3-review.md`,
  }
}

export async function verdictApplyProposal(root: string): Promise<JobVerdict> {
  const status = await execFileP('git', ['status', '--porcelain', '--', 'brain/'], root)
  const diff = await execFileP('git', ['diff', '--', 'brain/'], root)
  const ok = status.trim().length > 0
  return { ok, diff, note: ok ? undefined : 'git status --porcelain -- brain/ 为空，未检测到 brain/ 改动' }
}

// -----------------------------------------------------------------------------
// 2026-08-19 增补两型（H 号执行；02-后端执行方案.md 未覆盖，契约由总指挥在 api-types.ts/defs.ts 落地）。
// -----------------------------------------------------------------------------

/** 现场读 harness/logs/index.jsonl 全量；不经 Snapshot（可能落后 debounce 半秒~10min tick），
 * 也不复用 core 内部 parseIndexJsonl（core/src/parsers/harness.ts 未把它列进包对外导出面，
 * 属包边界内部实现——见 core/src/index.ts 导出清单，只有 harnessIndexPath 这类路径 helper 对外），
 * 故按同一坏行跳过规则本地重写一份，逻辑极简，重复成本可接受。 */
function readHarnessIndex(root: string): HarnessRun[] {
  let raw = ''
  try {
    raw = fs.readFileSync(harnessIndexPath(root), 'utf8')
  } catch {
    return []
  }
  const runs: HarnessRun[] = []
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue
    try {
      runs.push(JSON.parse(line) as HarnessRun)
    } catch {
      /* 坏行跳过，与 core 同一容错口径 */
    }
  }
  return runs
}

/**
 * 本地墙钟、无时区格式（YYYY-MM-DDTHH:mm:ss）——与 harness/logs/index.jsonl 里 ts 字段同款
 * （治理线各 skill 记账普遍是 Python `datetime.now().isoformat(timespec='seconds')`，无时区后缀）。
 *
 * 时区处理方式（任务卡明确点名的坑）：绝不把 index.jsonl 里那种无时区字符串喂给 `new Date()` 反解析——
 * ES 规范对「无时区后缀的日期时间字符串」按**本地时间**解读，如果 server 进程与 index.jsonl 写入方
 * 恰好不在同一时区（比如以后换成 UTC 容器部署），两边对同一字面字符串的理解就会不一致。
 * 反过来做则完全没有这个风险：`job.startedAt` 本身是 `new Date().toISOString()` 产出的、带 `Z`
 * 后缀的无歧义 UTC 时刻，先用它构造 `Date` 对象（这一步没有解读歧义），再用 `getFullYear()` 等
 * **本地日历字段** 取值拼回同款无时区格式——只要 server 进程与 index.jsonl 写入方跑在同一台机器/
 * 同一时区（当前部署形态确是如此），拼出来的字符串就与 ts 字段同一时区语境，剩下全程只做
 * ISO 8601 格式天然具备的字符串字典序比较，不再经过一次 Date 解析，避免了误差。
 */
function localNoTzStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** harness-run 终局裁决：治理账本（文件）是唯一真相源，不信子进程自述「跑完了」。 */
export async function verdictHarnessRun(root: string, task: string, startedAt: string): Promise<JobVerdict> {
  const startMarker = localNoTzStamp(new Date(startedAt))
  const hits = readHarnessIndex(root)
    .filter((r) => r.task === task && typeof r.ts === 'string' && r.ts >= startMarker)
    .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0))
  const latest = hits.at(-1)
  if (!latest) {
    return { ok: false, note: '子进程声称成功但治理账本没有新增运行记录' }
  }
  const reportPath = typeof latest.report === 'string' ? normalizeHarnessReportPath(latest.report, root) : '(该行未记 report 字段)'
  return { ok: true, note: `已记账，report=${reportPath}` }
}

/** create 终局裁决：复读 meta.status，只认「翻回 review（出审）」，参考 verdictPublish 的形状。 */
export async function verdictCreate(root: string, slug: string): Promise<JobVerdict> {
  const metaStatus = readMetaStatus(root, slug) ?? undefined
  const ok = metaStatus === 'review'
  return {
    ok,
    metaStatus,
    expect: ['review'],
    note: ok
      ? undefined
      : metaStatus === 'drafting'
        ? '创作未完成，停在 drafting'
        : `未回到 review（当前 meta.status=${metaStatus ?? '(未知)'}），创作流程未正常完成`,
  }
}
