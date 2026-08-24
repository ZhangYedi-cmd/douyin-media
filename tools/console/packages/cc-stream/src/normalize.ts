// 事件归一层：把半文档化的 stream-json RawEvent 收敛为 7 种 NormEvent（含 2026-08-19 新增的 thinking）。
// 有状态：assistant 消息内 tool_use 块按 id 去重（同一消息随内容块增长会重复出现，02 §2.7 实测）。
import type { NormEvent, RawEvent } from "./types.js";

interface ContentBlock {
  type?: unknown;
  id?: unknown;
  name?: unknown;
  input?: unknown;
  text?: unknown;
  thinking?: unknown;
  content?: unknown;
  tool_use_id?: unknown;
  is_error?: unknown;
}

// 2026-08-19 增补：toolDone.preview 的行数上限（用户拍板「前 20 行」，见任务卡）。
const PREVIEW_MAX_LINES = 20;

/** 原始事件的 `timestamp`（ISO）：assistant/user 两类实测 100% 覆盖，system/result 类没有——
 * 缺失时返回 undefined，由调用方按需省略字段（绝不用 Date.now() 顶替，那样回放会显示假的"刚刚"）。 */
function extractAt(raw: RawEvent): string | undefined {
  return typeof raw.timestamp === "string" ? raw.timestamp : undefined;
}

/** 把结果原文截到前 20 行，超出则 truncated=true；bytes 记截断前的原文字节数（非字符数）。 */
function buildPreview(text: string): { preview: string; truncated: boolean; bytes: number } {
  const bytes = Buffer.byteLength(text, "utf8");
  const lines = text.split("\n");
  if (lines.length <= PREVIEW_MAX_LINES) {
    return { preview: text, truncated: false, bytes };
  }
  return { preview: lines.slice(0, PREVIEW_MAX_LINES).join("\n"), truncated: true, bytes };
}

/**
 * 取 toolDone 的结果原文 + interrupted 标记。优先级（总指挥拍板）：
 * user 事件顶层 `tool_use_result` 若是 Bash 专属的结构化形状（含 stdout/stderr 字符串字段）——
 * 用 stdout+stderr 拼接；否则退回 `message.content[].tool_result.content` 字符串
 * （非 Bash 工具，或 tool_use_result 是别的形状，如 Skill 调用的 {commandName,success}、
 * Read 的 {file,type}、Edit 的 {filePath,...}，这些不是"结果原文"，一律走字符串兜底）。
 * interrupted 只在 tool_use_result 里显式给了布尔值时才带出（Bash 专属信号）。
 */
function resolveResultText(toolUseResult: unknown, blockContent: unknown): { text: string; interrupted?: boolean } {
  let interrupted: boolean | undefined;
  if (toolUseResult && typeof toolUseResult === "object" && !Array.isArray(toolUseResult)) {
    const tur = toolUseResult as { stdout?: unknown; stderr?: unknown; interrupted?: unknown };
    if (typeof tur.interrupted === "boolean") interrupted = tur.interrupted;
    if (typeof tur.stdout === "string" || typeof tur.stderr === "string") {
      const stdout = typeof tur.stdout === "string" ? tur.stdout : "";
      const stderr = typeof tur.stderr === "string" ? tur.stderr : "";
      const text = [stdout, stderr].filter((s) => s.length > 0).join("\n");
      return { text, interrupted };
    }
  }
  if (typeof blockContent === "string") return { text: blockContent, interrupted };
  // tool_result.content 也可以是内容块数组（Anthropic 工具结果的另一合法形状，如 Read 一张图片时
  // 混有 image 块）。实测 12 份日志 144 次 toolDone 全是字符串、一次数组都没出现过，但这形状是
  // 协议里写明的，落地成"只取 text 块、其余标类型占位"——不把 base64 图片塞进 preview。
  if (Array.isArray(blockContent)) {
    const parts = (blockContent as ContentBlock[]).map((b) =>
      b && typeof b === "object" && typeof b.text === "string" ? b.text : `[${String(b?.type ?? "unknown")}]`,
    );
    return { text: parts.join("\n"), interrupted };
  }
  return { text: "", interrupted };
}

/**
 * 创建一个有状态的归一函数：一个 CC 会话的生命周期内复用同一个实例，
 * 这样 tool_use.id 去重的 Set 才能跨多条 RawEvent 生效。
 */
export function createNormalizer(): (raw: RawEvent) => NormEvent[] {
  const seenToolIds = new Set<string>();

  return (raw: RawEvent): NormEvent[] => {
    switch (raw.type) {
      case "system":
        return normalizeSystem(raw);
      case "assistant":
        return normalizeAssistant(raw, seenToolIds);
      case "user":
        return normalizeUser(raw);
      case "rate_limit_event": {
        const ev: Extract<NormEvent, { kind: "stalling" }> = { kind: "stalling", reason: "rate_limit" };
        const at = extractAt(raw);
        if (at) ev.at = at;
        return [ev];
      }
      case "result":
        return normalizeResult(raw);
      default:
        return []; // 未知 type：静默跳过（前向兼容）
    }
  };
}

function normalizeSystem(raw: RawEvent): NormEvent[] {
  const at = extractAt(raw); // 实测 system 类无 timestamp，这里按通用规则一并取，留作前向兼容
  if (raw.subtype === "init") {
    const sessionId = raw.session_id;
    if (typeof sessionId !== "string") return [];
    const ev: Extract<NormEvent, { kind: "started" }> = { kind: "started", sessionId };
    if (at) ev.at = at;
    return [ev];
  }
  if (raw.subtype === "api_retry") {
    const ev: Extract<NormEvent, { kind: "stalling" }> = { kind: "stalling", reason: "api_retry" };
    if (at) ev.at = at;
    return [ev];
  }
  // 其余 system 子类型（如 thinking_tokens、hook_*）：静默跳过
  return [];
}

function normalizeAssistant(raw: RawEvent, seenToolIds: Set<string>): NormEvent[] {
  const message = raw.message as { id?: unknown; content?: unknown } | undefined;
  const content = message?.content;
  if (!Array.isArray(content)) return [];
  const messageId = typeof message?.id === "string" ? message.id : undefined;
  const at = extractAt(raw);

  const events: NormEvent[] = [];
  let textBuf = "";

  for (const block of content as ContentBlock[]) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "tool_use") {
      const id = block.id;
      const name = block.name;
      if (typeof id !== "string" || typeof name !== "string") continue;
      if (seenToolIds.has(id)) continue; // 内容块增长导致的重复出现：只在首见时吐 tool
      seenToolIds.add(id);
      const ev: Extract<NormEvent, { kind: "tool" }> = { kind: "tool", id, name, input: block.input };
      if (at) ev.at = at;
      events.push(ev);
    } else if (block.type === "text") {
      if (typeof block.text === "string") textBuf += block.text;
    } else if (block.type === "thinking") {
      // 2026-08-19 起不再跳过：模型思考过程只供展示、默认折叠、永不驱动状态（信任分级 §7.4
      // 仍然成立——thinking 从不参与终局裁决），但看得见能帮人理解全链路，不该被丢弃。
      //
      // **但实测：headless 模式下明文思考根本拿不到。** 12 份真实任务日志共 111 个 thinking
      // 块，`thinking` 字段 100% 是空串，只有 `signature`（加密）有内容；另起两次真实
      // `claude -p --include-partial-messages` 实验，`thinking_delta` 增量事件的 `thinking`
      // 字段同样是空串——即 CLI 在 headless 出站时一律抹掉明文，没有开关能打开。
      // 所以这里只在**真有文本时**才吐事件：今天恒不触发（UI 自然什么都不显示，不会出现
      // 一串空的"思考"卡片），将来 CLI 若放开明文则自动生效，不必再改这里。
      const text = typeof block.thinking === "string" ? block.thinking : "";
      if (text.length === 0) continue;
      const ev: Extract<NormEvent, { kind: "thinking" }> = { kind: "thinking", text };
      if (at) ev.at = at;
      events.push(ev);
    }
  }

  if (textBuf.length > 0 && messageId) {
    const ev: Extract<NormEvent, { kind: "say" }> = { kind: "say", messageId, text: textBuf };
    if (at) ev.at = at;
    events.push(ev);
  }
  return events;
}

function normalizeUser(raw: RawEvent): NormEvent[] {
  const message = raw.message as { content?: unknown } | undefined;
  const content = message?.content;
  if (!Array.isArray(content)) return [];
  const at = extractAt(raw);

  const events: NormEvent[] = [];
  for (const block of content as ContentBlock[]) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "tool_result") {
      const id = block.tool_use_id;
      if (typeof id !== "string") continue;
      const ev: Extract<NormEvent, { kind: "toolDone" }> = { kind: "toolDone", id, ok: block.is_error !== true };
      if (at) ev.at = at;
      // raw.tool_use_result 是这条 user 事件顶层字段（不在 content 块内），与本 block 一一对应——
      // 实测同一 user 事件从未出现过多个 tool_result 块，一一对应关系可靠。
      const { text, interrupted } = resolveResultText(raw.tool_use_result, block.content);
      const preview = buildPreview(text);
      ev.preview = preview.preview;
      ev.truncated = preview.truncated;
      ev.bytes = preview.bytes;
      if (typeof interrupted === "boolean") ev.interrupted = interrupted;
      events.push(ev);
    }
  }
  return events;
}

function normalizeResult(raw: RawEvent): NormEvent[] {
  const ok = raw.is_error !== true;
  const ev: Extract<NormEvent, { kind: "done" }> = { kind: "done", ok };
  const at = extractAt(raw); // 实测 result 类无 timestamp，留空由消费方兜底
  if (at) ev.at = at;
  if (typeof raw.total_cost_usd === "number") ev.costUsd = raw.total_cost_usd;
  if (typeof raw.num_turns === "number") ev.turns = raw.num_turns;
  if (typeof raw.duration_api_ms === "number") ev.durationMs = raw.duration_api_ms;
  return [ev];
}
