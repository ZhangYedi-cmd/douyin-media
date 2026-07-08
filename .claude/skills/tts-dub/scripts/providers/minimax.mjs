// MiniMax T2A v2 HTTP provider —— 返回 mp3 Buffer。
//
// 为什么直调 HTTP 而非 mmx CLI：mmx 的 `--pronunciation` 实现是坏的（拼成
// {"tone":"hang2"} 字符串，API 要 {"tone":["行/(hang2)"]} 数组），多音字校正用不了。
// 鉴权：env MINIMAX_API_KEY 优先，否则读 ~/.mmx/config.json 的 api_key。
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function apiKey() {
  if (process.env.MINIMAX_API_KEY) return process.env.MINIMAX_API_KEY;
  try {
    const c = JSON.parse(readFileSync(join(homedir(), ".mmx", "config.json"), "utf8"));
    return c.api_key || c.apiKey;
  } catch { return null; }
}

export const name = "minimax";

// opts: { text, voiceId, speed, pitch, pronunciation:[...], model }
export async function synthesize(opts) {
  const key = apiKey();
  if (!key) throw new Error("未找到 api_key（设 MINIMAX_API_KEY 或 ~/.mmx/config.json）");

  const voiceSetting = { voice_id: opts.voiceId, speed: opts.speed ?? 1.0 };
  if (opts.pitch) voiceSetting.pitch = opts.pitch; // pitch/speed 是整段参数，无行内标记
  const body = {
    model: opts.model || "speech-2.8-hd",
    text: opts.text,
    stream: false,
    voice_setting: voiceSetting,
    audio_setting: { format: "mp3", sample_rate: 32000, bitrate: 128000 },
  };
  if (opts.pronunciation?.length) body.pronunciation_dict = { tone: opts.pronunciation };

  // 串行批量合成偶发限流/抖动 → 重试 3 次（指数退避）
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await fetch("https://api.minimaxi.com/v1/t2a_v2", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await resp.json();
      if (j.base_resp?.status_code === 0 && j.data?.audio) return Buffer.from(j.data.audio, "hex");
      last = j.base_resp || j;
    } catch (e) { last = { err: e.message }; }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  throw new Error("T2A 失败(重试3次): " + JSON.stringify(last).slice(0, 200));
}

// 可选：列账户克隆音色（按 UUID v1 时间位排序），供选 voice_id。
export async function listVoices() {
  const key = apiKey();
  const r = await fetch("https://api.minimaxi.com/v1/get_voice", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ voice_type: "all" }),
  });
  const j = await r.json();
  const tsKey = (id) => { const m = id.match(/_([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})/); return m ? m[3].slice(1) + m[2] + m[1] : "0"; };
  return (j.voice_cloning || []).sort((a, b) => (tsKey(a.voice_id) < tsKey(b.voice_id) ? 1 : -1));
}
