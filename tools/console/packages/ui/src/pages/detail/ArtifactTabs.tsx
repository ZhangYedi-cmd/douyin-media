import { useEffect, useState } from 'react'
import { Descriptions, Empty, Tabs } from 'antd'
import type { ContentFileRef, PublishInfo } from '@console/server/api-types'
import { apiGetText, assetUrl } from '../../lib/api'
import { MarkdownView } from '../../components/MarkdownView'
import { JobHistoryTab } from './JobHistoryTab'

// 03 §2.5「产物 Tabs 细节」：口播稿(文本)/封面(图)/发布信息(descriptions)/交付物(file-row+缺失标红)。
// 成片不做页内播放器（砍掉清单，§4-Q2 已拍板）——归入「交付物」的一个 file-row，新标签打开原生播放。
//
// 2026-08-19 增补第 5 个 tab「执行记录」（CC 运行日志查看功能，L 号执行，用户原话见 JobHistoryTab.tsx
// 顶部注释）：与另外四个 tab 同属"这条内容的产物/过程"这一组信息，放进同一个 Tabs 里而不是另起
// 一张卡片，减少页面碎片化。
export interface ArtifactTabsProps {
  files: ContentFileRef[]
  publishInfo: PublishInfo | null
  slug: string
}

function findFile(files: ContentFileRef[], role: string): ContentFileRef | undefined {
  return files.find((f) => f.role === role)
}

function ScriptPane({ path }: { path?: string }) {
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText(null)
    setError(null)
    if (!path) return
    let cancelled = false
    apiGetText(`/api/file?path=${encodeURIComponent(path)}`)
      .then((t) => {
        if (!cancelled) setText(t)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [path])

  if (!path) return <Empty description="尚无口播稿（还没有生成）" />
  if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>
  if (text === null) return <p className="muted">加载中…</p>
  // 2026-08-19 起改用 MarkdownView 富渲染（推翻旧拍板「不引 markdown 库」，见 FileDrawer.tsx
  // 顶部注释）；size="base" 对齐原型 .script-doc 的大字号松行距（口播稿是长段落朗读稿，
  // 比治理报告更需要舒展的正文密度）。
  return <MarkdownView text={text} size="base" />
}

function CoverPane({ path }: { path?: string }) {
  if (!path) return <Empty description="尚无封面（还没有生成）" />
  return (
    <img
      src={assetUrl(path)}
      alt="封面"
      style={{
        maxWidth: 260,
        aspectRatio: '3 / 4',
        objectFit: 'cover',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        display: 'block',
      }}
    />
  )
}

function PublishInfoPane({ info }: { info: PublishInfo | null }) {
  if (!info) return <Empty description="尚无发布信息（还没有发布，或信息尚未生成）" />
  return (
    <Descriptions column={1} bordered size="small">
      <Descriptions.Item label="标题">{info.title ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="正文/简介">{info.desc ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="话题标签">{info.tags && info.tags.length > 0 ? info.tags.join(' ') : '—'}</Descriptions.Item>
      <Descriptions.Item label="可见范围">{info.visibility ?? '—'}</Descriptions.Item>
    </Descriptions>
  )
}

function DeliverablesPane({ files }: { files: ContentFileRef[] }) {
  if (files.length === 0) return <Empty description="无产物记录" />
  return (
    <div>
      {files.map((f) => (
        <div className={`file-row${f.exists ? '' : ' missing'}`} key={f.path}>
          <span>{f.role}</span>
          <span className="mono muted">{f.path}</span>
          <span className="st">
            {f.exists ? (
              f.role === 'video' ? (
                <a href={assetUrl(f.path)} target="_blank" rel="noreferrer">
                  新标签打开 ↗
                </a>
              ) : (
                `${f.size ?? '—'} B`
              )
            ) : (
              '缺失'
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ArtifactTabs({ files, publishInfo, slug }: ArtifactTabsProps) {
  const script = findFile(files, '2-script.md')
  const cover = findFile(files, 'cover')

  return (
    <Tabs
      items={[
        { key: 'script', label: '口播稿', children: <ScriptPane path={script?.exists ? script.path : undefined} /> },
        { key: 'cover', label: '封面', children: <CoverPane path={cover?.exists ? cover.path : undefined} /> },
        { key: 'publish', label: '发布信息', children: <PublishInfoPane info={publishInfo} /> },
        { key: 'deliverables', label: '交付物', children: <DeliverablesPane files={files} /> },
        { key: 'jobs', label: '执行记录', children: <JobHistoryTab slug={slug} /> },
      ]}
    />
  )
}
