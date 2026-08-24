// 乙类场景1 文件轨迹派生（02-后端执行方案.md §2.1 DailyRun / §9 场景1；S6）。
// 判据集中一处，注释回指 pipeline/2-create.md ——2-create SOP 改产物名会让这里静默失明（§4 风险#12）。
// 说明：本函数对「今日」内容目录做有界 fs 探测（audio-segments/ 目录存在性、assets/*.mp4 文件名，
// core Snapshot 当前不携带这两项）；调用点固定在 store.rebuild() 里，与 buildSnapshot 同一批 IO，
// 不在请求路径上现场读盘——仍满足「读接口零现场IO」契约的精神（02 §2.0），但严格说不是纯函数（吃 root 落盘状态）。
import fs from 'node:fs'
import path from 'node:path'
import type { Snapshot } from '@console/core'
import type { DailyRun, DailyRunEvidence, DailyRunPhase, HarnessTodaySummary } from '../api-types.js'

const PHASE_ORDER: DailyRunPhase[] = ['idle', 'picked', 'scripted', 'dubbing', 'rendered', 'review']
const PHASE_LABEL: Record<DailyRunPhase, string> = {
  idle: '空闲',
  picked: '已取题',
  scripted: '口播稿完成',
  dubbing: '配音中',
  rendered: '成片已出',
  review: '出审等人',
}

function todayStr(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function statMtimeIso(p: string): string {
  try {
    return fs.statSync(p).mtime.toISOString()
  } catch {
    return new Date(0).toISOString()
  }
}

function todayLogRelPath(root: string, date: string): string | null {
  const rel = `pipeline/logs/${date}.md`
  return fs.existsSync(path.join(root, rel)) ? rel : null
}

function readLogTail(root: string, logRel: string | null, n = 20): string[] {
  if (!logRel) return []
  try {
    const raw = fs.readFileSync(path.join(root, logRel), 'utf8')
    const lines = raw.split('\n')
    return lines.slice(Math.max(0, lines.length - n))
  } catch {
    return []
  }
}

export function deriveDailyTrace(root: string, snapshot: Snapshot, now: Date): DailyRun {
  const date = todayStr(now)
  const logPath = todayLogRelPath(root, date)
  const logTail = readLogTail(root, logPath)

  const todayEntries = snapshot.contents.filter((c) => c.dir.replace(/\\/g, '/').startsWith(`content/${date}/`))
  if (todayEntries.length === 0) {
    return {
      date,
      phase: 'idle',
      phaseLabel: PHASE_LABEL.idle,
      summary: '今日尚无已取题的内容目录（daily-run 可能未跑或仍在选题阶段）',
      logPath,
      logTail,
      evidence: [],
    }
  }

  let bestPhase: DailyRunPhase = 'idle'
  let bestEntry = todayEntries[0]!
  let bestEvidence: DailyRunEvidence[] = []

  for (const entry of todayEntries) {
    const dirAbs = path.join(root, entry.dir)
    const evidence: DailyRunEvidence[] = []
    let phase: DailyRunPhase = 'picked'
    evidence.push({ phase: 'picked', file: entry.dir, mtime: statMtimeIso(dirAbs) })

    const scriptAbs = path.join(dirAbs, '2-script.md')
    if (fs.existsSync(scriptAbs)) {
      phase = 'scripted'
      evidence.push({ phase: 'scripted', file: `${entry.dir}/2-script.md`, mtime: statMtimeIso(scriptAbs) })
    }

    const audioDir = path.join(dirAbs, 'audio-segments')
    if (fs.existsSync(audioDir)) {
      phase = 'dubbing'
      evidence.push({ phase: 'dubbing', file: `${entry.dir}/audio-segments`, mtime: statMtimeIso(audioDir) })
    }

    const assetsDir = path.join(dirAbs, 'assets')
    if (fs.existsSync(assetsDir)) {
      const mp4 = fs.readdirSync(assetsDir).find((f) => /\.mp4$/i.test(f))
      if (mp4) {
        phase = 'rendered'
        const abs = path.join(assetsDir, mp4)
        evidence.push({ phase: 'rendered', file: `${entry.dir}/assets/${mp4}`, mtime: statMtimeIso(abs) })
      }
    }

    if (entry.meta?.status === 'review') {
      phase = 'review'
      const reviewAt = entry.meta.timestamps.review
      evidence.push({
        phase: 'review',
        file: `${entry.dir}/meta.yaml`,
        mtime: reviewAt ?? statMtimeIso(path.join(dirAbs, 'meta.yaml')),
      })
    }

    if (PHASE_ORDER.indexOf(phase) > PHASE_ORDER.indexOf(bestPhase)) {
      bestPhase = phase
      bestEntry = entry
      bestEvidence = evidence
    }
  }

  return {
    date,
    phase: bestPhase,
    phaseLabel: PHASE_LABEL[bestPhase],
    summary: `${bestEntry.meta?.title ?? bestEntry.slug} —— ${PHASE_LABEL[bestPhase]}`,
    slug: bestEntry.slug,
    logPath,
    logTail,
    evidence: bestEvidence,
  }
}

/** harnessToday.pendingProposals 兼任侧栏「治理线」计数——统计口径为全量未应用提议，非今日范围（02 §2.1 原文注）。 */
export function deriveHarnessToday(snapshot: Snapshot, now: Date): HarnessTodaySummary {
  const date = todayStr(now)
  const todays = snapshot.harness.filter((r) => typeof r.ts === 'string' && r.ts.startsWith(date))
  const ran = todays.length
  const reports = todays.filter((r) => typeof r.report === 'string' && r.report.trim() !== '').length
  const pendingProposals = snapshot.harness.filter((r) => r.applied === false && (r.findings ?? 0) > 0).length
  return { ran, reports, pendingProposals }
}
