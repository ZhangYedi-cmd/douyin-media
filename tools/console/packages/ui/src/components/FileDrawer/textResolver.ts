import { createContext, useContext } from 'react'

// FileDrawer 对外 props 契约（03 §2.9）只有 path/title/mono/onClose，内部读取方式是
// 「apiGetText(`/api/file?path=…`)」——但 lib/api.ts 是 S2 数据层（本波不做，禁裸 fetch）。
// 用 Context 注入一个「路径 → 文本」解析器，把「怎么拿到文本」与 FileDrawer 的展示逻辑解耦：
//   - 本波（S3）：#/dev 页面提供一个读 fixture 的解析器。
//   - S2 起：main.tsx / ConsoleProvider 提供真正的 apiGetText，FileDrawer 本体代码不用改。
export type FileTextResolver = (path: string) => Promise<string>

const notWired: FileTextResolver = async (path) => {
  throw new Error(`FileDrawer 尚未接入 /api/file（S2 起由 lib/api.ts 的 apiGetText 提供）：${path}`)
}

export const FileTextResolverContext = createContext<FileTextResolver>(notWired)

export function useFileTextResolver(): FileTextResolver {
  return useContext(FileTextResolverContext)
}
