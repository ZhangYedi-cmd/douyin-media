// 05 §5D「销账 lib/types.ts 临时镜像」（S2 开工首项）：本文件不再本地定义任何领域/API 层类型。
// 领域类型（MetaStatus/Alert/BacklogTopic/Snapshot/ContentMeta 等）唯一真相源 = @console/core，
// 各消费文件一律直接 `import type { ... } from '@console/core'`（对外契约 §3.2）；
// Job/JobState/DailyRun 等 API 层类型唯一宿主 = @console/server/src/api-types.ts，
// 各消费文件一律直接 `import type { ... } from '@console/server/api-types'`（见 lib/api.ts 顶部说明：
// 契约字面路径 '@console/server/api-types' 因 server 包缺 exports/types 字段而不可解析，未决项已入报告）。
// FastAction / JobAction / FileChange / ActionResult 等「API 层操作形状」按 03 §2.10 归属 lib/api.ts，
// 不留在本文件（CommandChip 等消费方改从 '../../lib/api' 取）。
//
// 本文件此后仅承载「纯 UI 型」（表单态、页面私有 view-model 等）；S2 尚无此类需求，暂空。
export {}
