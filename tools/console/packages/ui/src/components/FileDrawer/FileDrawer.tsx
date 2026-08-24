import { useEffect, useState } from 'react'
import { Drawer, Spin, Typography } from 'antd'
import { useFileTextResolver } from './textResolver'
import { isMarkdownPath } from './isMarkdownPath'
import { MarkdownView } from '../MarkdownView'

// 03 §2.9 FileDrawerProps——仓内文件查看抽屉（P1 日志 / P3 口播稿 / P5 报告）。
export interface FileDrawerProps {
  path?: string // 仓根相对路径；undefined = 关闭
  title?: string
  mono?: boolean // 非 markdown 文件时生效：true=logblock 等宽；false=正文排版（pre-wrap）
  onClose(): void
}

// 内部读取走 useFileTextResolver()（见 textResolver.ts 的说明）。2026-08-19 起推翻「不做
// markdown 富渲染」的旧拍板（原注释见 git 历史/03 §4-Q4）——真机走查发现口播稿/治理报告全部
// 裸源码呈现，可读性差。路由判据：仅 isMarkdownPath(path) 为真（.md/.markdown）才走
// MarkdownView（自带预览/源码切换，默认预览）；其余（.yaml/.json/.log/.jsonl 等结构化/日志
// 文件）继续按 mono 走原有 <pre>/正文两档，不受影响。
export function FileDrawer({ path, title, mono = true, onClose }: FileDrawerProps) {
  const resolveText = useFileTextResolver()
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!path) {
      setText(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    resolveText(path)
      .then((content) => {
        if (!cancelled) setText(content)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [path, resolveText])

  // width 是 antd v6 废弃 API（deprecated，改用 size），且 640 比原 560 更宽——yaml 注释在
  // 窄抽屉里会被硬换行折断（如「人\n工补」），markdown 表格/长代码行也更吃宽度。
  const markdown = path !== undefined && isMarkdownPath(path)

  return (
    <Drawer open={path !== undefined} title={title ?? path} onClose={onClose} size={640} destroyOnHidden>
      {loading ? <Spin /> : null}
      {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
      {!loading && !error && text !== null ? (
        markdown ? (
          <MarkdownView text={text} />
        ) : mono ? (
          <pre className="logblock">{text}</pre>
        ) : (
          <div className="reader">
            <div className="doc" style={{ whiteSpace: 'pre-wrap' }}>
              {text}
            </div>
          </div>
        )
      ) : null}
    </Drawer>
  )
}
