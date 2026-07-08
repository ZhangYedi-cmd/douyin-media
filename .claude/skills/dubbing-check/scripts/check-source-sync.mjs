#!/usr/bin/env node
// [检查点 2.0] 真相源同步：audio-segments.json 各段文本 == 对应 narrations.ts。
// synthesize 读 audio-segments.json（extract-narrations 的产物），不是 narrations.ts。
// 改过 narration 没重跑 extract → 合成的是旧文案音频 → 成片「画面新文案、声音旧文案」（EP02 钩子踩过）。
// 用法：node check-source-sync.mjs [presentation目录]
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const PRES = process.argv[2] || process.cwd();
const segs = JSON.parse(readFileSync(join(PRES, "audio-segments.json"), "utf8"));
const chDir = join(PRES, "src", "chapters");

// 章节 id（audio-segments 里的 chapter，如 coldopen）→ narrations 数组
// 目录名是 NN-<id>（如 01-coldopen），去掉数字前缀即 id。
const map = {};
for (const d of readdirSync(chDir)) {
  const f = join(chDir, d, "narrations.ts");
  if (!existsSync(f)) continue;
  const id = d.replace(/^\d+-/, "");
  const src = readFileSync(f, "utf8");
  // 取 `= [ ... ]` 里的数组（跳过 `string[]` 那个 []）
  const eq = src.indexOf("=");
  const a = src.indexOf("[", eq), b = src.lastIndexOf("]");
  const body = src.slice(a, b + 1);
  const arr = [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)]
    .map((m) => m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
  map[id] = arr;
}

let bad = 0;
for (const s of segs) {
  const arr = map[s.chapter];
  const truth = arr ? arr[s.step - 1] : undefined; // step 是 1-indexed
  if (truth === undefined) { console.log(`✗ 找不到 narrations  ${s.chapter}/${s.step}`); bad++; continue; }
  if (truth !== s.text) {
    bad++;
    console.log(`✗ 文案不一致 ${s.chapter}/${s.step}`);
    console.log(`   narrations.ts : ${truth.slice(0, 42)}`);
    console.log(`   audio-segments: ${s.text.slice(0, 42)}`);
  }
}

console.log(bad
  ? `\n✗ ${bad} 段 audio-segments.json 与 narrations.ts 不一致 —— 改过文案没重跑 extract，音频是旧的！` +
    `\n  修：npm run extract-narrations → rm 改动段 public/audio/<ch>/<n>.mp3 → 重合成`
  : `\n✓ 全部 ${segs.length} 段 audio-segments == narrations（真相源同步）`);
process.exit(bad ? 1 : 0);
