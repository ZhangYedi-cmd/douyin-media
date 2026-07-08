#!/usr/bin/env node
// 列 MiniMax 账户克隆音色（按 UUID v1 时间位排序，标最新），选 voice_id 用。
import { listVoices } from "./providers/minimax.mjs";

const c = await listVoices();
console.log(`克隆音色 ${c.length} 条（新→旧）：`);
c.forEach((v, i) =>
  console.log(`${i === 0 ? "  ★最新" : "       "} ${v.voice_id}  ${v.created_time || ""}`),
);
if (c.length) console.log(`\n→ 把选定 voice_id 填进工程的 tts.config.json。`);
