// verdict.ts 补测（C 验收跟进项①）：三个 verdict 函数在「is_error 真/假 × meta.status 复读符合/不符合预期」
// 矩阵下的判定，以及 readMetaStatus 的边界（缺字段/非字符串/非法 YAML/slug 不存在）。
// 全部走真文件（临时目录 fixture，不碰主仓），不 mock fs——本模块的存在意义就是「现场读盘」，mock 掉就测不出东西。
// apply-proposal 的 git diff 分支用临时 git 仓造 brain/ 变更（-c user.name/-c user.email 逐次传参，不碰全局 git config）。
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { readMetaStatus, verdictApplyProposal, verdictCreate, verdictHarnessRun, verdictPublish, verdictRework } from '../../jobs/verdict.js'

const tmpRoots: string[] = []
function newTmpRoot(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}
afterAll(() => {
  for (const dir of tmpRoots) fs.rmSync(dir, { recursive: true, force: true })
})

/** 写一个最小 content/<date>/<slug>/meta.yaml；raw 覆盖时忽略 status 参数直接落原文。 */
function writeMeta(root: string, date: string, slug: string, status: string | undefined): void {
  const dir = path.join(root, 'content', date, slug)
  fs.mkdirSync(dir, { recursive: true })
  const body = status === undefined ? `slug: ${slug}\n` : `slug: ${slug}\nstatus: ${status}\n`
  fs.writeFileSync(path.join(dir, 'meta.yaml'), body)
}

function writeRawMeta(root: string, date: string, slug: string, raw: string): void {
  const dir = path.join(root, 'content', date, slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'meta.yaml'), raw)
}

describe('readMetaStatus：现场读盘的边界', () => {
  it('meta.yaml 存在且 status 为字符串 → 原样返回', () => {
    const root = newTmpRoot('verdict-status-ok-')
    writeMeta(root, '2030-01-01', 'ok-slug', 'approved')
    expect(readMetaStatus(root, 'ok-slug')).toBe('approved')
  })

  it('slug 不存在（content 下找不到该目录）→ null', () => {
    const root = newTmpRoot('verdict-status-missing-')
    fs.mkdirSync(path.join(root, 'content'), { recursive: true })
    expect(readMetaStatus(root, 'no-such-slug')).toBeNull()
  })

  it('content/ 目录本身不存在 → null（不抛异常）', () => {
    const root = newTmpRoot('verdict-status-no-content-dir-')
    expect(readMetaStatus(root, 'whatever')).toBeNull()
  })

  it('meta.yaml 存在但无 status 字段 → null', () => {
    const root = newTmpRoot('verdict-status-nofield-')
    writeMeta(root, '2030-01-01', 'no-status', undefined)
    expect(readMetaStatus(root, 'no-status')).toBeNull()
  })

  it('status 字段非字符串（如数字）→ null', () => {
    const root = newTmpRoot('verdict-status-numeric-')
    writeRawMeta(root, '2030-01-01', 'numeric-status', 'slug: numeric-status\nstatus: 123\n')
    expect(readMetaStatus(root, 'numeric-status')).toBeNull()
  })

  it('meta.yaml 是非法 YAML（parse 抛异常）→ 捕获后返回 null，不抛穿', () => {
    const root = newTmpRoot('verdict-status-badyaml-')
    writeRawMeta(root, '2030-01-01', 'bad-yaml', 'status: {\n  unclosed flow map\n')
    expect(readMetaStatus(root, 'bad-yaml')).toBeNull()
  })

  it('多个日期目录下同名 slug → 取按目录名排序的最后一个（与 findContentDirBySlug 语义一致）', () => {
    const root = newTmpRoot('verdict-status-multi-')
    writeMeta(root, '2030-01-01', 'dup-slug', 'ideated')
    writeMeta(root, '2030-01-09', 'dup-slug', 'approved')
    expect(readMetaStatus(root, 'dup-slug')).toBe('approved')
  })
})

describe('verdictPublish：is_error(runOk) × meta.status 矩阵', () => {
  it('runOk=true × status=published → ok=true，note 缺席', async () => {
    const root = newTmpRoot('verdict-publish-')
    writeMeta(root, '2030-01-01', 'pub-a', 'published')
    const v = await verdictPublish(root, 'pub-a', true)
    expect(v).toEqual({ ok: true, metaStatus: 'published', expect: ['published', 'scheduled'], note: undefined })
  })

  it('runOk=true × status=scheduled → ok=true（scheduled 与 published 同为「回到位」）', async () => {
    const root = newTmpRoot('verdict-publish-')
    writeMeta(root, '2030-01-01', 'pub-b', 'scheduled')
    const v = await verdictPublish(root, 'pub-b', true)
    expect(v.ok).toBe(true)
    expect(v.note).toBeUndefined()
  })

  it('runOk=true × status=approved（子进程声称成功但文件没翻）→ ok=false，note 标「声称成功但」', async () => {
    const root = newTmpRoot('verdict-publish-')
    writeMeta(root, '2030-01-01', 'pub-c', 'approved')
    const v = await verdictPublish(root, 'pub-c', true)
    expect(v.ok).toBe(false)
    expect(v.metaStatus).toBe('approved')
    expect(v.note).toContain('声称成功但')
    expect(v.note).toContain('meta.status=approved')
  })

  it('runOk=false × status=published（子进程自报失败，即使文件其实已翻好）→ 仍判 ok=false，note 标「报告失败且」', async () => {
    const root = newTmpRoot('verdict-publish-')
    writeMeta(root, '2030-01-01', 'pub-d', 'published')
    const v = await verdictPublish(root, 'pub-d', false)
    expect(v.ok).toBe(false)
    expect(v.metaStatus).toBe('published')
    expect(v.note).toContain('报告失败且')
  })

  it('runOk=false × status=approved（双重失败）→ ok=false', async () => {
    const root = newTmpRoot('verdict-publish-')
    writeMeta(root, '2030-01-01', 'pub-e', 'approved')
    const v = await verdictPublish(root, 'pub-e', false)
    expect(v.ok).toBe(false)
    expect(v.note).toContain('报告失败且')
  })

  it('slug 找不到（metaStatus 未知）→ ok=false，note 用「(未知)」占位', async () => {
    const root = newTmpRoot('verdict-publish-')
    fs.mkdirSync(path.join(root, 'content'), { recursive: true })
    const v = await verdictPublish(root, 'ghost-slug', true)
    expect(v.ok).toBe(false)
    expect(v.metaStatus).toBeUndefined()
    expect(v.note).toContain('(未知)')
  })
})

describe('verdictRework：只认 meta.status===review，与 runOk 无关（沿 feishu _async_rework 语义）', () => {
  it('status=review → ok=true（runOk 传 true/false 结果一致，函数本就不看这个参数）', async () => {
    const root = newTmpRoot('verdict-rework-')
    writeMeta(root, '2030-01-01', 'rw-a', 'review')
    const vTrue = await verdictRework(root, 'rw-a', true)
    const vFalse = await verdictRework(root, 'rw-a', false)
    expect(vTrue).toEqual({ ok: true, metaStatus: 'review', expect: ['review'], note: undefined })
    expect(vFalse).toEqual(vTrue)
  })

  it('status=drafting（还没回到 review，卡在人工节点）→ ok=false，note 点名当前状态', async () => {
    const root = newTmpRoot('verdict-rework-')
    writeMeta(root, '2030-01-01', 'rw-b', 'drafting')
    const v = await verdictRework(root, 'rw-b', true)
    expect(v.ok).toBe(false)
    expect(v.note).toContain('drafting')
    expect(v.note).toContain('3-review.md')
  })

  it('status=published（异常态，不该出现但仍要如实报未完成）→ ok=false', async () => {
    const root = newTmpRoot('verdict-rework-')
    writeMeta(root, '2030-01-01', 'rw-c', 'published')
    const v = await verdictRework(root, 'rw-c', false)
    expect(v.ok).toBe(false)
    expect(v.metaStatus).toBe('published')
  })

  it('slug 找不到 → ok=false，note 用「(未知)」占位', async () => {
    const root = newTmpRoot('verdict-rework-')
    fs.mkdirSync(path.join(root, 'content'), { recursive: true })
    const v = await verdictRework(root, 'ghost', true)
    expect(v.ok).toBe(false)
    expect(v.metaStatus).toBeUndefined()
    expect(v.note).toContain('(未知)')
  })
})

// -----------------------------------------------------------------------------
// verdictApplyProposal：git status/diff 分支，临时 git 仓造 brain/ 变更
// -----------------------------------------------------------------------------

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8')
}
function gitCommit(cwd: string, message: string): void {
  git(cwd, ['-c', 'user.name=console-test', '-c', 'user.email=console-test@example.com', 'commit', '-q', '-m', message])
}

describe('verdictApplyProposal：git status/diff -- brain/', () => {
  it('brain/ 下已跟踪文件被改动 → ok=true，diff 非空且带上下游行', async () => {
    const root = newTmpRoot('verdict-apply-diff-')
    git(root, ['init', '-q'])
    fs.mkdirSync(path.join(root, 'brain'), { recursive: true })
    fs.writeFileSync(path.join(root, 'brain/benchmarks.md'), 'line1\n')
    git(root, ['add', 'brain/benchmarks.md'])
    gitCommit(root, 'seed brain')

    fs.writeFileSync(path.join(root, 'brain/benchmarks.md'), 'line1 modified\n')
    const v = await verdictApplyProposal(root)
    expect(v.ok).toBe(true)
    expect(v.note).toBeUndefined()
    expect(v.diff).toContain('brain/benchmarks.md')
    expect(v.diff).toContain('-line1')
    expect(v.diff).toContain('+line1 modified')
  })

  it('brain/ 无任何改动 → ok=false，diff 为空，note 点明未检测到改动', async () => {
    const root = newTmpRoot('verdict-apply-nodiff-')
    git(root, ['init', '-q'])
    fs.mkdirSync(path.join(root, 'brain'), { recursive: true })
    fs.writeFileSync(path.join(root, 'brain/benchmarks.md'), 'unchanged\n')
    git(root, ['add', 'brain/benchmarks.md'])
    gitCommit(root, 'seed brain, no further changes')

    const v = await verdictApplyProposal(root)
    expect(v.ok).toBe(false)
    expect(v.diff).toBe('')
    expect(v.note).toContain('未检测到 brain/ 改动')
  })

  it('brain/ 外的文件改动不计入（status/diff 都按 -- brain/ 限定路径）→ ok=false', async () => {
    const root = newTmpRoot('verdict-apply-outside-')
    git(root, ['init', '-q'])
    fs.mkdirSync(path.join(root, 'brain'), { recursive: true })
    fs.mkdirSync(path.join(root, 'pipeline'), { recursive: true })
    fs.writeFileSync(path.join(root, 'brain/x.md'), 'a\n')
    fs.writeFileSync(path.join(root, 'pipeline/y.md'), 'a\n')
    git(root, ['add', '.'])
    gitCommit(root, 'seed both')

    fs.writeFileSync(path.join(root, 'pipeline/y.md'), 'a changed\n') // 只改 brain/ 外的文件
    const v = await verdictApplyProposal(root)
    expect(v.ok).toBe(false)
    expect(v.diff).toBe('')
  })
})

// -----------------------------------------------------------------------------
// 2026-08-19 增补两型（H 号执行；02-后端执行方案.md 未覆盖，契约由总指挥在 api-types.ts/defs.ts 落地）。
// -----------------------------------------------------------------------------

/** 与 verdict.ts 内部 localNoTzStamp 同款转换逻辑（无导出，测试侧独立重写一份构造 fixture ts 值）：
 * 不写死具体时区下的字面时间字符串——用同一套「Date → 本地日历字段拼字符串」的转换，
 * 无论测试机器在哪个时区跑，产出的 fixture ts 与被测函数内部算出的 startMarker 天然对齐。 */
function localStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function writeIndexJsonl(root: string, lines: Record<string, unknown>[]): void {
  const dir = path.join(root, 'harness/logs')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n') + '\n')
}

describe('verdictHarnessRun：治理账本（文件）是唯一真相源，不信子进程自述', () => {
  it('账本里出现 task 匹配且 ts ≥ 任务开始时间的新行 → ok=true，note 带 report 路径', async () => {
    const root = newTmpRoot('verdict-harness-ok-')
    const startedAt = new Date('2030-06-01T09:00:00.000Z')
    writeIndexJsonl(root, [
      { ts: localStamp(new Date(startedAt.getTime() + 60_000)), task: 'ideate', report: 'logs/2030-06-01-ideate.md' },
    ])
    const v = await verdictHarnessRun(root, 'ideate', startedAt.toISOString())
    expect(v.ok).toBe(true)
    expect(v.note).toContain('harness/logs/2030-06-01-ideate.md')
  })

  it('账本里同 task 的行 ts 早于任务开始时间（旧记录、非本轮新增）→ ok=false', async () => {
    const root = newTmpRoot('verdict-harness-stale-')
    const startedAt = new Date('2030-06-01T09:00:00.000Z')
    writeIndexJsonl(root, [
      { ts: localStamp(new Date(startedAt.getTime() - 3_600_000)), task: 'ideate', report: 'logs/2030-05-31-ideate.md' },
    ])
    const v = await verdictHarnessRun(root, 'ideate', startedAt.toISOString())
    expect(v.ok).toBe(false)
    expect(v.note).toContain('没有新增运行记录')
  })

  it('账本里有新行但 task 不同名（别的任务跑了，不算本任务完成）→ ok=false', async () => {
    const root = newTmpRoot('verdict-harness-othertask-')
    const startedAt = new Date('2030-06-01T09:00:00.000Z')
    writeIndexJsonl(root, [{ ts: localStamp(new Date(startedAt.getTime() + 60_000)), task: 'retro', report: 'logs/x.md' }])
    const v = await verdictHarnessRun(root, 'ideate', startedAt.toISOString())
    expect(v.ok).toBe(false)
  })

  it('ts 恰好等于任务开始时间（边界含等）→ ok=true', async () => {
    const root = newTmpRoot('verdict-harness-boundary-')
    const startedAt = new Date('2030-06-01T09:00:00.000Z')
    writeIndexJsonl(root, [{ ts: localStamp(startedAt), task: 'ideate', report: 'logs/x.md' }])
    const v = await verdictHarnessRun(root, 'ideate', startedAt.toISOString())
    expect(v.ok).toBe(true)
  })

  it('新行缺 report 字段 → ok=true 但 note 用占位符，不抛异常', async () => {
    const root = newTmpRoot('verdict-harness-noreport-')
    const startedAt = new Date('2030-06-01T09:00:00.000Z')
    writeIndexJsonl(root, [{ ts: localStamp(new Date(startedAt.getTime() + 60_000)), task: 'ideate' }])
    const v = await verdictHarnessRun(root, 'ideate', startedAt.toISOString())
    expect(v.ok).toBe(true)
    expect(v.note).toContain('未记 report 字段')
  })

  it('多条同 task 新行 → 取 ts 最大（最新）的一条', async () => {
    const root = newTmpRoot('verdict-harness-multi-')
    const startedAt = new Date('2030-06-01T09:00:00.000Z')
    writeIndexJsonl(root, [
      { ts: localStamp(new Date(startedAt.getTime() + 60_000)), task: 'ideate', report: 'logs/earlier.md' },
      { ts: localStamp(new Date(startedAt.getTime() + 120_000)), task: 'ideate', report: 'logs/later.md' },
    ])
    const v = await verdictHarnessRun(root, 'ideate', startedAt.toISOString())
    expect(v.ok).toBe(true)
    expect(v.note).toContain('later.md')
  })

  it('index.jsonl 不存在（从未跑过治理任务）→ ok=false，不抛异常', async () => {
    const root = newTmpRoot('verdict-harness-missing-')
    const v = await verdictHarnessRun(root, 'ideate', new Date().toISOString())
    expect(v.ok).toBe(false)
  })

  it('index.jsonl 含坏行 → 坏行跳过，好行照常判定', async () => {
    const root = newTmpRoot('verdict-harness-badline-')
    const startedAt = new Date('2030-06-01T09:00:00.000Z')
    const dir = path.join(root, 'harness/logs')
    fs.mkdirSync(dir, { recursive: true })
    const goodLine = JSON.stringify({ ts: localStamp(new Date(startedAt.getTime() + 60_000)), task: 'ideate', report: 'logs/x.md' })
    fs.writeFileSync(path.join(dir, 'index.jsonl'), `not-json-at-all\n${goodLine}\n`)
    const v = await verdictHarnessRun(root, 'ideate', startedAt.toISOString())
    expect(v.ok).toBe(true)
  })
})

describe('verdictCreate：复读 meta.status，只认「翻回 review（出审）」', () => {
  it('status=review → ok=true，note 缺席', async () => {
    const root = newTmpRoot('verdict-create-')
    writeMeta(root, '2030-01-01', 'cr-a', 'review')
    const v = await verdictCreate(root, 'cr-a')
    expect(v).toEqual({ ok: true, metaStatus: 'review', expect: ['review'], note: undefined })
  })

  it('status=drafting（创作未完成）→ ok=false，note 明确写「停在 drafting」', async () => {
    const root = newTmpRoot('verdict-create-')
    writeMeta(root, '2030-01-01', 'cr-b', 'drafting')
    const v = await verdictCreate(root, 'cr-b')
    expect(v.ok).toBe(false)
    expect(v.note).toContain('创作未完成')
    expect(v.note).toContain('drafting')
  })

  it('status=其它（如 approved，异常态）→ ok=false，note 带上实际状态', async () => {
    const root = newTmpRoot('verdict-create-')
    writeMeta(root, '2030-01-01', 'cr-c', 'approved')
    const v = await verdictCreate(root, 'cr-c')
    expect(v.ok).toBe(false)
    expect(v.metaStatus).toBe('approved')
    expect(v.note).toContain('未回到 review')
    expect(v.note).toContain('approved')
  })

  it('slug 找不到 → ok=false，note 用「(未知)」占位', async () => {
    const root = newTmpRoot('verdict-create-')
    fs.mkdirSync(path.join(root, 'content'), { recursive: true })
    const v = await verdictCreate(root, 'ghost-create')
    expect(v.ok).toBe(false)
    expect(v.metaStatus).toBeUndefined()
    expect(v.note).toContain('(未知)')
  })
})
