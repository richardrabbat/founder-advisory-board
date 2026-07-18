// Live smoke test for the FLASK-style rubric scoring in the chair synthesis.
// Exercises the real CHAIR_SYSTEM_PROMPT and real rubric dimensions against a
// canned debate record, so it costs one chair call instead of a full meeting.
// Run with: node --env-file=.env scripts/smoke-rubric.mjs
import { GoogleGenAI } from "@google/genai";
import {
  CHAIR_SYSTEM_PROMPT,
  PRICING_ADVISORS,
  RUBRIC_DIMENSIONS,
} from "../src/lib/personas.ts";

const ADVISOR_IDS = PRICING_ADVISORS.map((a) => a.id);
const DIMENSION_IDS = RUBRIC_DIMENSIONS.map((d) => d.id);

// Mirrors the scorecard portion of SYNTHESIS_SCHEMA in src/lib/debate.ts.
const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    recommendation: { type: "string" },
    loadBearingAssumptions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          assumption: { type: "string" },
          ifHolds: { type: "string" },
          ifFails: { type: "string" },
        },
        required: ["assumption", "ifHolds", "ifFails"],
      },
    },
    dissent: { type: "string" },
    validationPlan: { type: "array", items: { type: "string" } },
    scorecards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          advisorId: { type: "string", enum: ADVISOR_IDS },
          dimensions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                dimension: { type: "string", enum: DIMENSION_IDS },
                rationale: { type: "string" },
                score: { type: "integer", minimum: 1, maximum: 5 },
              },
              required: ["dimension", "rationale", "score"],
            },
          },
        },
        required: ["advisorId", "dimensions"],
      },
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: [
    "headline",
    "recommendation",
    "loadBearingAssumptions",
    "dissent",
    "validationPlan",
    "scorecards",
    "confidence",
  ],
};

const DEBATE_RECORD = `### The Value Pricer (id: value-pricer, Enterprise value-based pricing)
POSITION: {"recommendation":"Raise to $18/user/mo and add a $40/user Business tier; kill the idea of a free plan.","reasoning":"At $8 you are below every competitor in the evidence and you are signalling that you are a toy. Linear's entry paid tier is well above your price and Asana's Premium sits higher still. You have 40 design partners and only 8 converting, which is a positioning problem, not a price problem.","keyAssumptions":["Buyers are team leads with budget authority","The AI features are differentiated enough to defend a premium"],"evidenceCited":["Linear paid tiers start above $8/user","Asana Premium is priced well above the current $8"]}
CRITIQUES ISSUED: {"critiques":[{"of":"plg-advocate","point":"A free tier at $0.90/user/mo inference cost is a direct subsidy to non-buyers and will torch what little runway remains."}],"updatedView":""}

### The PLG Advocate (id: plg-advocate, Product-led growth & self-serve)
POSITION: {"recommendation":"Keep entry pricing low, add a capped free tier, and publish transparent self-serve pricing.","reasoning":"You have 40 teams in and 8 paying, which means the product is not yet selling itself. Raising price now optimises a funnel you have not built. ClickUp's free tier is the reason it shows up in every evaluation.","keyAssumptions":["Free users convert at a meaningful rate","Serving cost per free user stays near zero"],"evidenceCited":["ClickUp advertises a Free Forever plan","Competitors publish per-seat pricing openly"]}
CRITIQUES ISSUED: {"critiques":[{"of":"value-pricer","point":"Pricing to a persona you have not yet sold to is a guess dressed up as strategy."}],"updatedView":""}

### The Unit-Economics Hawk (id: unit-econ-hawk, CFO lens: margins & payback)
POSITION: {"recommendation":"At $8/user with $1.05/user serving cost you have 87% gross margin, but CAC payback is 22 months at a 7-seat average — the price must rise or CAC must fall.","reasoning":"CAC of $150 against roughly $56/mo of team ACV is 2.7 months of gross-margin payback per team, which is fine. The real problem is 6% monthly logo churn: that is a 16-month average life, so you are recovering CAC but barely compounding. A free tier at $0.90/user inference is a real cost centre, not a rounding error.","keyAssumptions":["The 6% monthly churn is not concentrated in non-ICP design partners"],"evidenceCited":["Founder metrics: CAC ~$150, churn ~6%/mo, avg team size 7","Founder costs: inference ~$0.90/user/mo, hosting ~$0.15/user/mo"]}
CRITIQUES ISSUED: {"critiques":[{"of":"value-pricer","point":"A 2.25x price rise with 6% monthly churn raises revenue per logo while shortening logo life; show me the retention case before the price case."},{"of":"plg-advocate","point":"Free tier inference cost is 11% of your current per-seat price. Name the conversion rate that makes that pay back."}],"updatedView":""}`;

const FOUNDER_CONTEXT = `Stage: pre-seed, 4 months since launch.
Traction: 40 design-partner teams, 8 paying, $2k MRR.
Current price: $8/user/mo, no free tier, 14-day trial.
Metrics: CAC ~$150, logo churn ~6%/mo, avg team size 7.
Costs: AI inference ~$0.90/user/mo, hosting ~$0.15/user/mo.
Runway: 11 months.`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const t0 = performance.now();
const res = await ai.models.generateContent({
  model: "gemini-pro-latest",
  contents: `FOUNDER QUESTION:\nWe are building an AI-native project tracker for startup teams. How should we price it?\n\nCOMPANY CONTEXT:\n${FOUNDER_CONTEXT}\n\nDEBATE RECORD:\n${DEBATE_RECORD}`,
  config: {
    systemInstruction: CHAIR_SYSTEM_PROMPT,
    responseMimeType: "application/json",
    responseJsonSchema: SCHEMA,
    temperature: 0.7,
  },
});
const ms = (performance.now() - t0).toFixed(0);

const synthesis = JSON.parse(res.text);
console.log(`chair synthesis OK (${ms}ms)\n`);
console.log(`HEADLINE: ${synthesis.headline}`);
console.log(`CONFIDENCE: ${synthesis.confidence}\n`);

// --- assertions ---
const problems = [];
const allScores = [];

for (const id of ADVISOR_IDS) {
  const card = synthesis.scorecards?.find((s) => s.advisorId === id);
  if (!card) {
    problems.push(`missing scorecard for advisor "${id}"`);
    continue;
  }
  for (const dim of DIMENSION_IDS) {
    const scored = card.dimensions?.find((d) => d.dimension === dim);
    if (!scored) {
      problems.push(`${id}: missing dimension "${dim}"`);
      continue;
    }
    if (!Number.isInteger(scored.score) || scored.score < 1 || scored.score > 5) {
      problems.push(`${id}/${dim}: score ${scored.score} is not an integer in 1-5`);
    }
    if (!scored.rationale || scored.rationale.trim().length < 15) {
      problems.push(`${id}/${dim}: rationale missing or too short`);
    }
    allScores.push(scored.score);
  }
}

const unknownAdvisors = (synthesis.scorecards ?? [])
  .map((s) => s.advisorId)
  .filter((id) => !ADVISOR_IDS.includes(id));
if (unknownAdvisors.length) problems.push(`unknown advisor ids: ${unknownAdvisors.join(", ")}`);

// Print the matrix.
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("DIMENSION", 26) + ADVISOR_IDS.map((id) => pad(id, 16)).join(""));
for (const dim of DIMENSION_IDS) {
  const row = ADVISOR_IDS.map((id) => {
    const s = synthesis.scorecards
      ?.find((c) => c.advisorId === id)
      ?.dimensions?.find((d) => d.dimension === dim);
    return pad(s ? s.score : "–", 16);
  }).join("");
  console.log(pad(dim, 26) + row);
}

const distinct = new Set(allScores).size;
console.log(`\n${allScores.length}/15 cells scored · ${distinct} distinct values used`);
if (distinct < 3) {
  problems.push(`only ${distinct} distinct score value(s) — the chair is not discriminating`);
}

console.log("\nSample rationale:");
const sample = synthesis.scorecards?.[0]?.dimensions?.[0];
if (sample) console.log(`  [${synthesis.scorecards[0].advisorId} / ${sample.dimension}] ${sample.rationale}`);

if (problems.length) {
  console.error(`\nFAIL (${problems.length}):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("\nPASS — 3 advisors x 5 dimensions, all scored with rationales.");
