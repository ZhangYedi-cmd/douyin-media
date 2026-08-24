// @console/core 只读导出面（package.json exports "."）。
// writer/lock/atomic/audit 不从这里导出——cli 是唯一 import '@console/core/writer' 的包（§2.17 包边界）。
export * from './types.js'
export { MediaError, isMediaError } from './errors.js'
export type { MediaErrorCode } from './errors.js'
export {
  resolveRoot,
  contentDirs,
  backlogPath,
  dashboardPath,
  templateDir,
  harnessIndexPath,
  metricsLogPath,
  contentDir,
  findContentDirBySlug,
} from './paths.js'
export { buildSnapshot } from './snapshot.js'
export {
  META_TRANSITIONS,
  BACKLOG_TRANSITIONS,
  assertMetaTransition,
  assertBacklogTransition,
  legalNext,
  legalNextBacklog,
  renderTransitionTable,
  pickNext,
} from './state.js'
export type { TransitionSpec, PickDecision } from './state.js'
export { computeAlerts, expireRules, previewExpiry, DEFAULT_ALERT_CFG } from './alerts.js'
export type { AlertCfg, ExpireMatch, ExpiryPreview } from './alerts.js'
export {
  computeDoctorAlerts,
  gatherDoctorInput,
  runDoctor,
  parsePublishFields,
  parseTags,
  extractReferencedPath,
} from './doctor.js'
export type { DoctorInput, DoctorPublishInput } from './doctor.js'
export { renderZone, replaceZones, hasAllMarkers } from './dashboard.js'
export type { DashboardZoneName } from './dashboard.js'
export { parseYamlValue } from './yaml-read.js'
