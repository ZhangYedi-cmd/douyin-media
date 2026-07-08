// OpenAI TTS provider —— 返回 mp3 Buffer。
//
// 注意：OpenAI TTS **不支持** pronunciation_dict / pitch（多音字校正、音高调整无效，
// 会被忽略）；speed 支持 0.25–4.0。中文多音字只能靠 normalize 改写文本来规避。
// 鉴权：env OPENAI_API_KEY（OPENAI_BASE_URL 可切代理 / Azure）。
export const name = "openai";

export async function synthesize(opts) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("设 OPENAI_API_KEY");
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  let last = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await fetch(`${base}/audio/speech`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: opts.model || "gpt-4o-mini-tts",
          voice: opts.voiceId || "alloy",
          input: opts.text,
          speed: opts.speed ?? 1.0,
          response_format: "mp3",
        }),
      });
      if (resp.ok) return Buffer.from(await resp.arrayBuffer());
      last = await resp.text();
    } catch (e) { last = e.message; }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  throw new Error("OpenAI TTS 失败(重试3次): " + String(last).slice(0, 200));
}
