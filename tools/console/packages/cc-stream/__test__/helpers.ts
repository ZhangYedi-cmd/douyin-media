// 测试专用工具：不进导出面，只服务 test/ 下的用例。
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = join(HERE, "..", "fixtures");

const FIXTURE_NAME_RE = /^(\d{4}-\d{2}-\d{2})-claude-(.+)\.jsonl$/;

export interface FixtureInfo {
  file: string;
  date: string;
  version: string;
  path: string;
}

/** 列出全部 fixture，按文件名日期升序（最后一个 = 最新）。 */
export function listFixtures(): FixtureInfo[] {
  return readdirSync(FIXTURES_DIR)
    .filter((f) => FIXTURE_NAME_RE.test(f))
    .map((file) => {
      const m = FIXTURE_NAME_RE.exec(file)!;
      return { file, date: m[1]!, version: m[2]!, path: join(FIXTURES_DIR, file) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function latestFixture(): FixtureInfo {
  const all = listFixtures();
  if (all.length === 0) throw new Error("no fixtures found under " + FIXTURES_DIR);
  return all[all.length - 1]!;
}

export function readFixtureText(path: string): string {
  return readFileSync(path, "utf8");
}

/** 把一段文本按固定字节大小切成 Buffer 数组（用于模拟"任意字节切块喂入"）。 */
export function chunkText(text: string, chunkSize: number): Buffer[] {
  const buf = Buffer.from(text, "utf8");
  const chunks: Buffer[] = [];
  for (let i = 0; i < buf.length; i += chunkSize) {
    chunks.push(buf.subarray(i, i + chunkSize));
  }
  return chunks;
}

/** 把一段文本按不规则、循环的字节大小切块（更贴近真实管道读取的不可预测性）。 */
export function chunkTextIrregular(text: string, pattern: number[]): Buffer[] {
  const buf = Buffer.from(text, "utf8");
  const chunks: Buffer[] = [];
  let i = 0;
  let p = 0;
  while (i < buf.length) {
    const size = Math.max(1, pattern[p % pattern.length]!);
    chunks.push(buf.subarray(i, i + size));
    i += size;
    p += 1;
  }
  return chunks;
}

export function streamFromChunks(chunks: Buffer[]): Readable {
  return Readable.from(chunks);
}
