import { GoogleGenAI } from "@google/genai";

// Advisors run on flash (3+ parallel calls per debate round);
// the chair's synthesis gets the pro tier.
export const ADVISOR_MODEL = "gemini-3.5-flash";
export const CHAIR_MODEL = "gemini-pro-latest";

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
