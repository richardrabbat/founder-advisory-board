// Live smoke test for Gemini TTS: confirms model name, voice config, and
// audio output format. Run with: node --env-file=.env scripts/smoke-tts.mjs
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODELS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"];

for (const model of MODELS) {
  try {
    const t0 = performance.now();
    const res = await ai.models.generateContent({
      model,
      contents:
        "Say cheerfully: The board is now in session. Let us talk about pricing.",
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } },
        },
      },
    });
    const ms = (performance.now() - t0).toFixed(0);
    const part = res.candidates?.[0]?.content?.parts?.[0];
    const data = part?.inlineData;
    console.log(
      `[${model}] ${ms}ms — mimeType=${data?.mimeType} bytes=${
        data?.data ? Buffer.from(data.data, "base64").length : 0
      }`,
    );
    break;
  } catch (err) {
    console.log(`[${model}] FAILED: ${String(err).slice(0, 200)}`);
  }
}
