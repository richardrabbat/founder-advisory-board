import { GoogleGenAI } from "@google/genai";

// Advisors run on flash (3+ parallel calls per debate round);
// the chair's synthesis gets the pro tier.
export const ADVISOR_MODEL = "gemini-3.5-flash";
export const CHAIR_MODEL = "gemini-pro-latest";
export const TTS_MODEL = "gemini-3.1-flash-tts-preview";

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function generateJson<T>(
  model: string,
  systemInstruction: string,
  prompt: string,
  jsonSchema?: object,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await getAI().models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        // Constrained decoding: guarantees parseable output matching the schema.
        ...(jsonSchema ? { responseJsonSchema: jsonSchema } : {}),
        temperature: 0.7,
      },
    });
    const text = res.text ?? "";
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err;
      // Salvage a JSON object embedded in surrounding prose, if any.
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          return JSON.parse(m[0]) as T;
        } catch {
          // fall through to retry
        }
      }
    }
  }
  throw new Error(`Model returned unparseable JSON after retry: ${String(lastError)}`);
}

export async function generateText(
  model: string,
  systemInstruction: string,
  prompt: string,
): Promise<string> {
  const res = await getAI().models.generateContent({
    model,
    contents: prompt,
    config: { systemInstruction, temperature: 0.6 },
  });
  return (res.text ?? "").trim();
}

// TTS returns raw 16-bit PCM @ 24kHz mono; wrap it in a WAV header so the
// browser can play it directly from a blob URL.
export async function synthesizeSpeech(
  text: string,
  voiceName: string,
): Promise<Buffer> {
  const res = await getAI().models.generateContent({
    model: TTS_MODEL,
    contents: text,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
  });
  const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) throw new Error("TTS returned no audio");
  return pcmToWav(Buffer.from(data, "base64"), 24000);
}

function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
