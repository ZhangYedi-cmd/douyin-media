#!/usr/bin/env node
// [检查点 2.1] 合成完整性：每段 mp3 都存在、非 0 字节、时长 > 0、段数对得上。
// 串行批量合成偶发 API 限流失败，失败段若旧 mp3 还在会被静默保留 → 旧音色混进成片。
// 用法：node check-completeness.mjs [presentation目录]
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const PRES = process.argv[2] || process.cwd();
const segs = JSON.parse(readFileSync(join(PRES, "audio-segments.json"), "utf8"));

let bad = 0;
for (const s of segs) {
  const mp3 = join(PRES, "public", "audio", s.chapter, `${s.step}.mp3`);
  if (!existsSync(mp3)) { console.log(`✗ 缺失   ${s.chapter}/${s.step}`); bad++; continue; }
  const sz = statSync(mp3).size;
  if (sz < 500) { console.log(`✗ 字节异常 ${s.chapter}/${s.step} (${sz}B)`); bad++; continue; }
  let dur = 0;
  try {
    dur = parseFloat(execSync(
      `ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${mp3}"`,
    ).toString());
  } catch (e) { /* ffprobe 失败 → dur=0 */ }
  if (!dur || dur < 0.3) { console.log(`✗ 时长异常 ${s.chapter}/${s.step} (${dur}s)`); bad++; }
}

console.log(bad
  ? `\n✗ ${bad} 段有问题 —— 可能合成失败残留旧音色，--force 重合成（合成脚本应带重试）`
  : `\n✓ 全部 ${segs.length} 段完整`);
process.exit(bad ? 1 : 0);
