// Live smoke test for the Gemini integration.
// Run with: node --env-file=.env scripts/smoke-gemini.mjs
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

for (const model of ["gemini-3.5-flash", "gemini-pro-latest"]) {
  const t0 = performance.now();
  const res = await ai.models.generateContent({
    model,
    contents:
      "In one sentence: what is the biggest pricing mistake early-stage SaaS founders make?",
  });
  const ms = (performance.now() - t0).toFixed(0);
  console.log(`\n[${model}] (${ms}ms)\n${res.text}`);
}
