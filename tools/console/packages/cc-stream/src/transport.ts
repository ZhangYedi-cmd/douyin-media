// 传输层：逐行 readline + 半行缓冲 + hook 噪音过滤 + 原始流落盘钩子。
// 只用 node 内建（node:readline）；半行缓冲交给 readline 本身处理——它按任意字节切块喂入都不丢行、
// 不错位（结尾无换行的残段在输入流结束时也会作为最后一"行"吐出）。
import { createInterface } from "node:readline";
import type { RawEvent } from "./types.js";

export interface ParseStreamOptions {
  /** 每一完整行（无论后续 JSON.parse 是否成功）都会先过这个钩子，用于原始 JSONL 落盘排障。 */
  onRaw?: (line: string) => void;
}

/**
 * 把子进程 stdout（或任意 Readable）解析为 RawEvent 流。
 * - JSON.parse 失败的行：计入失败但不抛异常，直接跳过（onRaw 仍收到原始行）。
 * - system/hook_* 噪音：在此丢弃，不透给归一层。
 * - 其余未知 type：原样透传，由归一层决定静默跳过（前向兼容留给归一层判断，02 §2.7）。
 */
export async function* parseStream(
  stdout: NodeJS.ReadableStream,
  opts: ParseStreamOptions = {},
): AsyncGenerator<RawEvent> {
  const rl = createInterface({ input: stdout, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      if (line.length === 0) continue;
      opts.onRaw?.(line);

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue; // 解析失败：静默跳过，不抛异常
      }

      if (!isPlainObject(parsed)) continue;
      if (isHookNoise(parsed)) continue;
      yield parsed;
    }
  } finally {
    rl.close();
  }
}

function isPlainObject(v: unknown): v is RawEvent {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isHookNoise(ev: RawEvent): boolean {
  return ev.type === "system" && typeof ev.subtype === "string" && ev.subtype.startsWith("hook_");
}
