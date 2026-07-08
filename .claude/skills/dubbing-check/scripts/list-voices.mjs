#!/usr/bin/env node
// [检查点 1.1] 列 MiniMax 克隆音色，按 UUID v1 时间位排序，标最新一条。
// 同日录多条音色肉眼分不出新旧 —— 用 UUID 内嵌时间戳定序。
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const cfg = JSON.parse(readFileSync(join(homedir(), ".mmx", "config.json"), "utf8"));
const key = cfg.api_key || cfg.apiKey;
if (!key) { console.error("✗ ~/.mmx/config.json 无 api_key"); process.exit(1); }

const r = await fetch("https://api.minimaxi.com/v1/get_voice", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ voice_type: "all" }),
});
const j = await r.json();
const c = j.voice_cloning || [];

// UUID v1: 完整 60-bit 时间戳 = time_hi(去version) | time_mid | time_low
const tsKey = (id) => {
  const m = id.match(/_([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})/);
  return m ? m[3].slice(1) + m[2] + m[1] : "0";
};
c.sort((a, b) => (tsKey(a.voice_id) < tsKey(b.voice_id) ? 1 : -1)); // 新→旧

console.log(`克隆音色 ${c.length} 条（新→旧）：`);
c.forEach((v, i) =>
  console.log(`${i === 0 ? "  ★最新" : "       "} ${v.voice_id}  ${v.created_time || ""}`),
);
if (c.length) console.log(`\n→ 选定后焊进 scripts/tts-providers/minimax.sh 的默认 voice，别每次手填。`);
console.log("注意 get_voice 偶有一致性延迟，删音色后复查两次。");
