import { useState } from 'react'
import { AlertCard } from '../../components/AlertCard'
import { DeadlineBadge } from '../../components/DeadlineBadge'
import { CommandChip } from '../../components/CommandChip'
import { StatusTag } from '../../components/StatusTag'
import { FileDrawer, FileTextResolverContext } from '../../components/FileDrawer'
import { JobLogView } from '../../components/JobLogView'
import { ALERT_FIXTURES, STATUS_FIXTURES, COMMAND_FIXTURES, FILE_FIXTURES, JOB_LOG_FIXTURE_JOB, JOB_LOG_FIXTURE_EVENTS } from './fixtures'

// S3 临时路由：用本地 fixture 渲染五个跨页组件，供视觉对照 docs/design/ v2 原型
// （.alert / .days / .badge / .file-row / .logblock）与阈值行为抽查（05 §5D）。
// S4 起各页真正建起来后，本路由随时可删；不接入真实数据层（无 fetch）。

async function fixtureFileResolver(path: string): Promise<string> {
  const content = FILE_FIXTURES[path]
  if (content === undefined) throw new Error(`fixture 未登记该路径：${path}`)
  return content
}

const nowIso = () => new Date().toISOString()
const hoursAgoIso = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
const hoursFromNowIso = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString()

export default function DevPage() {
  const [openFile, setOpenFile] = useState<{ path: string; title: string; mono: boolean } | null>(null)

  return (
    <FileTextResolverContext.Provider value={fixtureFileResolver}>
      <div className="page">
        <div className="page-head">
          <h1>#/dev 组件展示台</h1>
          <span className="sub mono">S3 临时路由 · 本地 fixture · 不接网络</span>
        </div>

        <div className="grid" style={{ gap: 'var(--space-6)' }}>
          <section className="card">
            <header>
              <h2>AlertCard</h2>
            </header>
            {ALERT_FIXTURES.map((alert) => (
              <AlertCard key={alert.key} alert={alert} onOpenFile={(path) => setOpenFile({ path, title: path, mono: true })} />
            ))}
          </section>

          <section className="card">
            <header>
              <h2>DeadlineBadge</h2>
              <span className="right muted mono">默认阈值 warnAfterHours=48</span>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div>
                since = 49h 前（应为 warn 色）：<DeadlineBadge since={hoursAgoIso(49)} prefix="停留" />
              </div>
              <div>
                since = 47h 前（应为默认色）：<DeadlineBadge since={hoursAgoIso(47)} prefix="停留" />
              </div>
              <div>
                since = 100h 前 + dangerAfterHours=72（应为 danger 色）：
                <DeadlineBadge since={hoursAgoIso(100)} dangerAfterHours={72} prefix="停留" />
              </div>
              <div>
                deadline = 5h 后（未过期，默认色，显示剩余）：<DeadlineBadge deadline={hoursFromNowIso(5)} />
              </div>
              <div>
                deadline = 38h 前（已过期未到阈值，默认色）：<DeadlineBadge deadline={hoursAgoIso(38)} prefix="排期" />
              </div>
              <div>
                deadline = 60h 前（已过期超阈值，warn 色）：<DeadlineBadge deadline={hoursAgoIso(60)} prefix="排期" />
              </div>
            </div>
          </section>

          <section className="card">
            <header>
              <h2>CommandChip（copy 形态）</h2>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
              {COMMAND_FIXTURES.map((cmd) => (
                <CommandChip key={cmd} command={cmd} />
              ))}
            </div>
          </section>

          <section className="card">
            <header>
              <h2>StatusTag</h2>
            </header>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {STATUS_FIXTURES.map((status) => (
                <StatusTag key={status} status={status} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
              {STATUS_FIXTURES.map((status) => (
                <StatusTag key={`${status}-dot`} status={status} withText={false} />
              ))}
            </div>
          </section>

          <section className="card">
            <header>
              <h2>FileDrawer</h2>
            </header>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setOpenFile({ path: 'pipeline/logs/2026-08-18.md', title: '今日运行日志', mono: true })}
              >
                打开日志（mono）
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  setOpenFile({ path: 'content/2026-07-04-agent-memory/meta.yaml', title: 'meta.yaml（正文档）', mono: false })
                }
              >
                打开 meta（正文）
              </button>
            </div>
          </section>
        </div>

        <FileDrawer
          path={openFile?.path}
          title={openFile?.title}
          mono={openFile?.mono ?? true}
          onClose={() => setOpenFile(null)}
        />

        {/* JobLogView：K 号的 GET /api/jobs/:id/log 端点未就绪期间，用真实历史日志内容手工构造的
            fixture（见 fixtures.ts 顶部说明）走 `events` prop 直接喂数据，跳过内部 fetch——
            端点就绪后应改成不传 events、只传一个真实 job 走内部 fetch 路径做最终核对。 */}
        <section className="card">
          <header>
            <h2>JobLogView</h2>
            <span className="right muted mono">fixture · publish-20260819134540-1f97</span>
          </header>
          <JobLogView job={JOB_LOG_FIXTURE_JOB} events={JOB_LOG_FIXTURE_EVENTS} />
        </section>

        <p className="muted mono" style={{ marginTop: 'var(--space-4)' }}>
          页面渲染时刻：{nowIso()}
        </p>
      </div>
    </FileTextResolverContext.Provider>
  )
}
