import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { RouterProvider } from 'react-router-dom'
// 必须排在 './app/routes' 之前：在 createHashRouter 读取 window.location.hash 前先把
// `#token=…` 消费掉（见 lib/bootstrapToken.ts 顶部注释——S6 W3a 补：实测发现首屏必炸一次
// react-router 默认 ErrorBoundary 的 console.error，本文件是修法）。
import './lib/bootstrapToken'
import { themeConfig } from './lib/theme'
import { router } from './app/routes'
import { ConsoleProvider } from './lib/store'
import { apiGetText } from './lib/api'
import { FileTextResolverContext } from './components/FileDrawer'
import './theme.css'

// S2 起接数据层：ConsoleProvider 挂 revision/SSE/jobs 全局态（lib/store.tsx）；
// FileDrawer 的 FileTextResolverContext 在这里接上真实 apiGetText（05 §5D 检查项——
// 忘接只在运行时抛错，S3 的 textResolver.ts notWired 兜底就是为了让这类漏接显式炸出来）。
//
// 注意：不能直接把 apiGetText 传进去（S6 W3a 活体验证抓到的真 bug——`data.content 字段缺失`
// 报错，见验收报告）。两者签名字面都是 `(path: string) => Promise<string>`，看着能对上，实则语义
// 不同：FileDrawerProps.path 是「仓根相对路径」（如 `content/x/meta.yaml`），apiGetText(path) 的
// path 却是「完整请求 URL」（调用方要自己拼好 `/api/file?path=…`，见 ArtifactTabs.tsx 的用法）。
// 直接透传会让 fetch 打到相对路径本身（如 `content/x/meta.yaml`，被浏览器解析成同源相对 URL），
// 命中的多半是 index.html 兜底或 404，JSON.parse 失败后原样返回文本，最终在 `envelope.data?.content`
// 处静默拿到 undefined、抛出「响应缺少 data.content 字段」——这里补一层适配，两处口径就此统一。
function resolveFileText(path: string): Promise<string> {
  return apiGetText(`/api/file?path=${encodeURIComponent(path)}`)
}

const container = document.getElementById('root')
if (!container) {
  throw new Error('main.tsx: 找不到 #root 挂载点')
}

createRoot(container).render(
  <StrictMode>
    <ConfigProvider theme={themeConfig}>
      <ConsoleProvider>
        <FileTextResolverContext.Provider value={resolveFileText}>
          <RouterProvider router={router} />
        </FileTextResolverContext.Provider>
      </ConsoleProvider>
    </ConfigProvider>
  </StrictMode>,
)
