# Founder Advisory Board

Three opinionated AI advisors debate your startup question over **live competitor
evidence** — and disagree on purpose. Built for the HackerSquad hackathon (July 2026).

Ask a pricing question and the board convenes:

1. **Scrape** — Bright Data's hosted MCP pulls competitors' actual pricing pages as markdown.
2. **Index** — evidence is chunked into a [Moss](https://moss.dev) local session index:
   in-process hybrid (semantic + keyword) search, sub-10ms queries, no vector DB.
3. **Independent positions** — three advisors with structurally opposed priors each pull
   their own evidence slice from Moss and argue their case (Gemini flash, parallel):
   - **The Value Pricer** — you are undercharging; price the value, anchor high.
   - **The PLG Advocate** — friction is death; free tier, self-serve, land-and-expand.
   - **The Unit-Economics Hawk** — a price is a claim about CAC payback; show the arithmetic.
4. **Cross-examination** — one critique round; advisors attack each other's weakest assumptions.
5. **Chair synthesis** (Gemini pro) — conditional advice with **load-bearing assumptions
   exposed** ("do X if A holds; inverts if B"), **dissent preserved** (never averaged away),
   a **position scorecard** (each advisor rated 1–5 on five named rubric dimensions, with
   the rationale written before the score, and no overall average), and a concrete
   validation plan.

## Voice

Voice is central, not a gimmick — and the latency story is the point:

- **Speak the question** — mic button (Web Speech API; Chrome recommended).
- **The board speaks** — each advisor reads their one-line position in a distinct
  voice (Gemini TTS `gemini-3.1-flash-tts-preview`, multi-voice), and the chair
  reads the verdict.
- **Open floor** — after the synthesis, ask follow-ups by voice. The meeting's
  Moss session stays alive server-side, so answers are grounded in the same
  evidence at **single-digit-millisecond retrieval** — the latency HUD shows the
  breakdown per question (e.g. `moss retrieval 7ms · think 5.0s · voice 2.9s`),
  making it visible that retrieval rounds to zero next to everything else.

The design borrows from two papers — PCE (turning latent assumptions into explicit,
conditional structure) and FLASK (fine-grained skill-set scoring in place of one
coarse preference number) — plus the multi-agent-debate literature's core lesson:
same-model debate converges unless disagreement is structural (different priors ×
different evidence). SkillOpt-Lite-style self-evolution is future work.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind), streaming SSE from a route handler
- [Moss](https://moss.dev) `@moss-dev/moss` — session index for per-meeting evidence
- [Bright Data](https://brightdata.com) hosted MCP (`mcp.brightdata.com`) — live web scraping
- Gemini via `@google/genai` — `gemini-3.5-flash` (advisors), `gemini-pro-latest` (chair),
  constrained JSON decoding via `responseJsonSchema`

## Run it

```bash
cp .env.example .env   # fill in: MOSS_PROJECT_ID, MOSS_PROJECT_KEY,
                       #          BRIGHTDATA_API_TOKEN, GEMINI_API_KEY
npm install
npm run dev            # http://localhost:3000
```

Smoke tests (live, no full meeting required):

```bash
node --env-file=.env scripts/smoke-gemini.mjs   # Gemini reachable, both tiers
node --env-file=.env scripts/smoke-rubric.mjs   # chair rubric: 3 advisors x 5 dimensions
```

## Layout

- `src/lib/brightdata.ts` — minimal MCP-over-HTTP client (session handshake, SSE parsing)
- `src/lib/moss.ts` — evidence session, chunking, hybrid retrieval
- `src/lib/gemini.ts` — schema-constrained JSON generation with retry
- `src/lib/personas.ts` — the three advisors + chair (prompts, priors, evidence queries,
  rubric dimensions)
- `src/lib/debate.ts` — the orchestrator: scrape → index → positions → critiques → synthesis
- `src/app/api/board/route.ts` — SSE endpoint streaming board events
- `src/app/page.tsx` — the boardroom UI
