// cc-stream 公共类型面。本包是通用「无头 CC 观察器」：不认识调用方任何具体业务/领域概念，
// 只认识「子进程 stdout 是一串 stream-json 事件」这一件事（上游拍板 §7.3：引擎进包，知识留外）。

/** 传输层解析出的原始事件（未加工的 JSONL 行 JSON.parse 结果）。形状半文档化，字段随 CC 版本可能变化。 */
export type RawEvent = {
  type?: string;
  subtype?: string;
} & Record<string, unknown>;

/**
 * 归一层吐出的 6 种内部事件（上游拍板 §7.2 / 02-后端执行方案 §2.7 落地形态）。
 * 信任分级（§7.4）：say 只展示、永不驱动状态；tool/toolDone 驱动步骤时间线；
 * 文件状态（cc-stream 完全不认识）才是唯一裁决，由调用方在包外完成。
 */
// 2026-08-19 扩容（用户需求：详情页要能看创作全链路，总指挥定契约）：
// 原设计只保留「驱动状态」所需的最小集，thinking 与工具输出被明确丢弃，注释理由是「信任分级」。
// 那条原则在**决定任务成败**上依然成立（绝不让模型自述翻转状态），但被越界应用到了**展示**上——
// 看得见工具输出和思考过程不会让任何状态翻转，只是让人看得懂。故此处只加展示用字段，
// 不改变任何驱动语义：里程碑引擎仍只吃 kind==="tool"，裁决仍只复读文件。
//
// `at`：事件时间（ISO）。原始流的 assistant/user 事件带 `timestamp` 字段（实测 100% 覆盖，
// 正是产出 tool/toolDone 的两类），所以**回放也能还原每步耗时**，不需要额外落盘时间。
// 缺失时（如 result 事件）由消费方按到达时间兜底。
export type NormEvent =
  | { kind: "started"; sessionId: string; at?: string }
  | { kind: "tool"; id: string; name: string; input: unknown; at?: string }
  | {
      kind: "toolDone";
      id: string;
      ok: boolean;
      at?: string;
      /** 结果摘要：前若干行原文，供步骤卡直接展示；全文由调用方按需另取。 */
      preview?: string;
      /** preview 是否因超出行数/字节上限而被截断。 */
      truncated?: boolean;
      /** 结果原文字节数（截断前），让人知道"还有多少没显示"。 */
      bytes?: number;
      /** Bash 工具专属：命令是否被中断（tool_use_result.interrupted），排障时是关键信号。 */
      interrupted?: boolean;
    }
  // 同 messageId 覆盖式更新（增量重复消息去重后的语义）：消费方以最新一条为准，不做拼接。
  | { kind: "say"; messageId: string; text: string; at?: string }
  /** 模型思考过程：仅供展示，默认折叠（用户 2026-08-19 拍板）；永不参与状态判定。
   *  **注意：headless 模式下实测恒不产生**——CLI 出站时把明文抹成空串只留加密 signature，
   *  连 --include-partial-messages 的 thinking_delta 也是空的（两次真实实验验证）。
   *  归一层因此只在真有文本时才吐这类事件；此分支保留是为了 CLI 将来放开明文时自动生效。 */
  | { kind: "thinking"; text: string; at?: string }
  | { kind: "stalling"; reason: "api_retry" | "rate_limit"; at?: string }
  | { kind: "done"; ok: boolean; costUsd?: number; turns?: number; durationMs?: number; at?: string };

export type NormEventKind = NormEvent["kind"];

/** 里程碑匹配规则：声明式，由调用方注入（引擎本身不认识任何具体任务的领域知识）。 */
export interface MilestoneRule {
  id: string;
  label: string;
  /** tool 名精确字符串或正则；input 各字段值 String() 后按正则测试，全部字段命中才算命中。 */
  match: { tool: string | RegExp; input?: Record<string, RegExp> };
  /** 默认 true：命中一次后该规则失效，不再重复吐出。 */
  once?: boolean;
}

export type MilestoneTable = MilestoneRule[];

export interface MilestoneHit {
  id: string;
  label: string;
  at: string;
}

export interface MilestoneEngine {
  /** 只对 kind==="tool" 求值；其余 NormEvent 直接返回空数组。 */
  feed(ev: NormEvent): MilestoneHit[];
}

/** spawn 无头 CC 的参数（后端拍板 §6 四个防坑点落地）。 */
export interface SpawnOptions {
  prompt: string;
  allowedTools: string[];
  cwd: string;
  /** 到时 SIGTERM，10s 后仍未退出再 SIGKILL；不传则不设超时。 */
  timeoutMs?: number;
  /** 子进程环境要剔除的变量名，默认 ["ANTHROPIC_API_KEY"]（坑 1：OAuth token 误当 API key）。 */
  dropEnv?: string[];
  /** 传输层 onRaw 钩子的落点：原始 JSONL 逐行原样 append 到这个文件。 */
  logPath?: string;
  /** 默认 "claude"。 */
  claudeBin?: string;
}

export interface HeadlessRunExit {
  code: number | null;
  signal: string | null;
  /** stderr 环形缓冲末 50 行，用换行拼接。 */
  stderrTail: string;
}

export interface HeadlessRun {
  /** spawn + transport + normalize 已组合好的归一事件流；里程碑引擎由调用方自接。 */
  events: AsyncIterable<NormEvent>;
  pid: number;
  kill(): void;
  exit: Promise<HeadlessRunExit>;
}
