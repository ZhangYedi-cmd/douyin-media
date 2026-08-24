// buildSnapshot(root)：总览契约 2 的规定签名——唯一 IO 聚合点。
// 解析失败降级返回 parseError，不抛穿（拍板 §3）：单个 meta.yaml 坏了不拖垮整仓快照。
import fs from 'node:fs'
import path from 'node:path'
import { parseMetaFile } from './parsers/meta.js'
import { parseBacklogFile } from './parsers/backlog.js'
import { parseIndexJsonl } from './parsers/harness.js'
import { parseMetricsJsonl } from './parsers/metrics.js'
import { contentDirs, backlogPath, harnessIndexPath, metricsLogPath } from './paths.js'
import type { ContentEntry, Snapshot } from './types.js'

function probeDeliverables(dir: string): ContentEntry['deliverables'] {
  const assetsDir = path.join(dir, 'assets')
  let video = false
  let cover = false
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir)
    video = files.some((f) => /\.mp4$/i.test(f))
    cover = files.some((f) => /^cover\.[a-z0-9]+$/i.test(f))
  }
  const script = fs.existsSync(path.join(dir, '2-script.md'))
  const publish = fs.existsSync(path.join(dir, '4-publish.md'))
  return { video, cover, script, publish }
}

export function buildSnapshot(root: string): Snapshot {
  const parseErrors: Snapshot['parseErrors'] = []
  const contents: ContentEntry[] = []

  for (const dir of contentDirs(root)) {
    const slug = path.basename(dir)
    const metaPath = path.join(dir, 'meta.yaml')
    const relDir = path.relative(root, dir)
    const deliverables = probeDeliverables(dir)
    try {
      const raw = fs.readFileSync(metaPath, 'utf8')
      const { meta } = parseMetaFile(raw, metaPath)
      contents.push({ slug, dir: relDir, meta, deliverables })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      parseErrors.push({ path: path.relative(root, metaPath), error: message })
      contents.push({ slug, dir: relDir, meta: null, parseError: message, deliverables })
    }
  }

  let backlog: Snapshot['backlog'] = { nextUp: null, topics: [] }
  const bPath = backlogPath(root)
  try {
    const raw = fs.readFileSync(bPath, 'utf8')
    const parsed = parseBacklogFile(raw)
    backlog = { nextUp: parsed.nextUp, topics: parsed.topics }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    parseErrors.push({ path: path.relative(root, bPath), error: message })
  }

  let harness: Snapshot['harness'] = []
  const hPath = harnessIndexPath(root)
  if (fs.existsSync(hPath)) {
    const raw = fs.readFileSync(hPath, 'utf8')
    harness = parseIndexJsonl(raw).runs
  }

  let metrics: Snapshot['metrics'] = []
  const mPath = metricsLogPath(root)
  if (fs.existsSync(mPath)) {
    const raw = fs.readFileSync(mPath, 'utf8')
    metrics = parseMetricsJsonl(raw).records
  }

  return {
    generatedAt: new Date().toISOString(),
    root,
    contents,
    backlog,
    harness,
    metrics,
    parseErrors,
  }
}
