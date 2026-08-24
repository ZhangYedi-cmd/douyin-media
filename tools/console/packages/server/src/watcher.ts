// chokidar 四坑落法（02-后端执行方案.md §2.5 watcher.ts / 上游拍板 §8）。
import path from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import type { Store } from './store.js'

const WATCH_RELATIVE = ['content', 'harness/logs', 'harness/tasks.md', 'pipeline/logs', 'dashboard.md']
// 扩展名白名单；mp4/png 为乙类轨迹（assets/*.mp4）与封面观测点。
const EXT_OK = /\.(ya?ml|md|jsonl|mp4|png)$/i
const DEBOUNCE_MS = 500

export interface WatcherHandle {
  watcher: FSWatcher
  isWatching(): boolean
  lastEventAt(): string | null
  close(): Promise<void>
}

export function startWatcher(root: string, store: Store): WatcherHandle {
  const watchPaths = WATCH_RELATIVE.map((p) => path.join(root, p))
  const watcher = chokidar.watch(watchPaths, {
    ignored: (p: string) => /(^|[/\\])\../.test(path.basename(p)) || /node_modules/.test(p),
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 50 },
  })

  let ready = false
  let lastEvent: string | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  watcher.on('ready', () => {
    ready = true
  })

  watcher.on('all', (event, changedPath) => {
    // addDir 放行：audio-segments/ 目录出现本身就是乙类轨迹的观测点（02 §2.5 注释原文）。
    if (event !== 'addDir' && !EXT_OK.test(changedPath)) return
    lastEvent = new Date().toISOString()
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => store.rebuild('fs'), DEBOUNCE_MS)
    timer.unref?.()
  })

  watcher.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[watcher] error:', err)
  })

  return {
    watcher,
    isWatching: () => ready,
    lastEventAt: () => lastEvent,
    close: () => watcher.close(),
  }
}
