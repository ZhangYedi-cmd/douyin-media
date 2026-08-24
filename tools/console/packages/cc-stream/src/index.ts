// cc-stream 导出面收口。通用「无头 CC 观察器」：不认识任何调用方的业务/领域词。
export type {
  HeadlessRun,
  HeadlessRunExit,
  MilestoneEngine,
  MilestoneHit,
  MilestoneRule,
  MilestoneTable,
  NormEvent,
  NormEventKind,
  RawEvent,
  SpawnOptions,
} from "./types.js";

export { createMilestoneEngine } from "./milestones.js";
export { createNormalizer } from "./normalize.js";
export { runHeadlessCC } from "./spawn.js";
export { parseStream } from "./transport.js";
export type { ParseStreamOptions } from "./transport.js";
