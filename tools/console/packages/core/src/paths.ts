// 仓路径定位（01-CLI执行方案.md §2.0 全局参数 --root / env PIPELINE_REPO_ROOT）。
import fs from 'node:fs'
import path from 'node:path'

/** 主仓根目录：--root 显式指定 > env PIPELINE_REPO_ROOT > 从 cwd 向上找 content/_backlog/backlog.yaml。 */
export function resolveRoot(cliFlag?: string): string {
  if (cliFlag) return path.resolve(cliFlag)
  if (process.env.PIPELINE_REPO_ROOT) return path.resolve(process.env.PIPELINE_REPO_ROOT)
  let dir = process.cwd()
  for (;;) {
    if (fs.existsSync(path.join(dir, 'content/_backlog/backlog.yaml'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) {
      throw new Error(
        '找不到仓库根：--root 未指定、env PIPELINE_REPO_ROOT 未设置，且从当前目录向上未找到 content/_backlog/backlog.yaml',
      )
    }
    dir = parent
  }
}

/** 全部内容条目目录（绝对路径），仅收有 meta.yaml 的叶子目录；跳过 content/_* 保留目录。 */
export function contentDirs(root: string): string[] {
  const contentRoot = path.join(root, 'content')
  if (!fs.existsSync(contentRoot)) return []
  const dateDirs = fs
    .readdirSync(contentRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort()

  const result: string[] = []
  for (const dateDir of dateDirs) {
    const dateDirFull = path.join(contentRoot, dateDir)
    const slugDirs = fs
      .readdirSync(dateDirFull, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
    for (const slug of slugDirs) {
      const full = path.join(dateDirFull, slug)
      if (fs.existsSync(path.join(full, 'meta.yaml'))) result.push(full)
    }
  }
  return result
}

export function backlogPath(root: string): string {
  return path.join(root, 'content/_backlog/backlog.yaml')
}

export function dashboardPath(root: string): string {
  return path.join(root, 'dashboard.md')
}

export function templateDir(root: string): string {
  return path.join(root, 'content/_template')
}

export function harnessIndexPath(root: string): string {
  return path.join(root, 'harness/logs/index.jsonl')
}

export function metricsLogPath(root: string): string {
  return path.join(root, 'harness/logs/metrics.jsonl')
}

/** content/<date>/<slug> 目录（不校验是否存在）。 */
export function contentDir(root: string, date: string, slug: string): string {
  return path.join(root, 'content', date, slug)
}

/** 由 slug 反查内容目录（遍历 content 下各日期目录找 <slug>），不存在返回 null。多个同名取按目录名排序最后者。 */
export function findContentDirBySlug(root: string, slug: string): string | null {
  const contentRoot = path.join(root, 'content')
  if (!fs.existsSync(contentRoot)) return null
  const dateDirs = fs
    .readdirSync(contentRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort()
  let found: string | null = null
  for (const dateDir of dateDirs) {
    const candidate = path.join(contentRoot, dateDir, slug)
    if (fs.existsSync(path.join(candidate, 'meta.yaml'))) found = candidate
  }
  return found
}
