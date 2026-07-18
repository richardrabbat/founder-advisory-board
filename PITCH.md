# Founder Advisory Board — Pitch Deck Source

Source material for building a pitch deck in Claude Design. Each numbered section is
one slide: the **Headline** is the slide title, **On the slide** is the visible content
(keep it sparse), and **Say it** is the speaker note. Sections after slide 14 are
supporting material — design direction, verified facts, and the numbers to capture
before you present.

**One-line description:** Three AI advisors with structurally opposed worldviews debate
your startup question over live competitor evidence — and disagree on purpose.

**Built for:** HackerSquad hackathon, July 2026.

---

## 1. Title

**Headline:** Founder Advisory Board

**On the slide:**
- Three advisors. One question. Deliberate disagreement.
- Built on Bright Data + Moss + Gemini
- HackerSquad · July 2026

**Say it:** Every founder wants an advisory board. Almost none can get one at pre-seed.
We built one that convenes in ninety seconds, argues over live evidence, and refuses to
give you a comfortable answer.

---

## 2. The Problem

**Headline:** Founders make irreversible decisions with reversible-quality advice

**On the slide:**
- Pricing, GTM, hiring — set wrong, they compound for years
- A real advisory board is slow, expensive, and unavailable pre-seed
- So founders ask an LLM instead

**Say it:** Pricing is the sharpest version of this. Set it wrong and you spend two years
paying for the mistake — in margin, in positioning, in who your product attracts. The
people qualified to argue about it with you cost equity and a calendar you don't control.

---

## 3. The Insight

**Headline:** Ask an AI for advice and you get the average of the internet

**On the slide:**
- Generic — not conditioned on your stage or your numbers
- Unconditional — one answer, no "unless"
- Confident — with no visible assumptions to check
- And multi-agent "debate" doesn't fix it: same model + same prompt + same evidence
  converges into expensive agreement

**Say it:** This is the part worth dwelling on. The obvious fix is to spawn several agents
and have them argue. It doesn't work. Same-model debate converges — you pay three times
for three restatements of one answer with different adjectives. Cosmetic disagreement is
worse than none, because it looks like rigor.

---

## 4. What a Real Board Actually Gives You

**Headline:** The disagreement is the product

**On the slide:**
- A real board doesn't hand you consensus
- It shows you **which assumption your decision rests on**
- "We disagree — and here's the fact that decides who's right"
- That's the thing worth rebuilding. Not the persona.

**Say it:** When two experienced people disagree about your pricing, the useful output
isn't the vote count. It's discovering that the whole decision hinges on one thing you
haven't measured — and that you could go measure it this week.

---

## 5. The Product

**Headline:** A board that convenes on demand and argues over live evidence

**On the slide:**
- Ask by voice or text: *"How should we price our AI project tracker?"*
- Three advisors take **independent positions**, then **cross-examine** each other
- The Chair synthesizes — **conditionally**, with **dissent preserved**
- You get a decision, its load-bearing assumptions, and a plan to test them

**Say it:** Ninety seconds, end to end. And what comes out isn't a recommendation — it's
a recommendation plus the conditions under which it's wrong.

---

## 6. How Disagreement Is Manufactured

**Headline:** Three mechanisms make the disagreement structural, not cosmetic

**On the slide:**

| Mechanism | What it means |
|---|---|
| **Different priors** | Genuinely opposed archetypes — not one advisor prompted three ways |
| **Different evidence** | Each advisor retrieves their own slice of the corpus with persona-specific queries |
| **Structured resolution** | Independent positions first (no anchoring) → one critique round → chair synthesis |

**Say it:** Independent-first is the load-bearing design choice. The advisors write in
parallel and never see each other's drafts. Anchoring is what collapses naive debate
systems — remove the anchor and the disagreement survives to the critique round, where
it's useful.

---

## 7. The Bench

**Headline:** Three advisors who cannot agree by construction

**On the slide** (use the accent colors — amber / emerald / sky):

- **The Value Pricer** — amber
  *"You are almost certainly undercharging. Price the value, not the cost."*
  Enterprise, annual contracts, high ACV. Skeptical of free tiers.

- **The PLG Advocate** — emerald
  *"Friction is death. The product must sell itself before anyone talks to sales."*
  Free tier, self-serve, land-and-expand. Skeptical of "contact sales" at seed.

- **The Unit-Economics Hawk** — sky
  *"A price is a claim about CAC payback and gross margin. Show me the arithmetic."*
  Takes no ideological side. Names the missing number and the threshold that flips it.

**Say it:** The Hawk is the interesting one. He's not a third opinion — he's the
tiebreaker who refuses to have an opinion until someone produces a number. He's how the
debate resolves into something testable instead of a standoff.

---

## 8. The Pipeline

**Headline:** Scrape → index → argue → cross-examine → synthesize

**On the slide** (horizontal flow diagram, five stages):

1. **Scrape** — Bright Data MCP pulls competitors' live pricing pages as markdown
2. **Index** — evidence chunked into a Moss session index (in-process hybrid search)
3. **Positions** — three advisors, in parallel, each on their own evidence slice
4. **Cross-examination** — one critique round, capped for latency and cost
5. **Synthesis** — the Chair, on the pro-tier model, with assumptions exposed

**Say it:** Note stage three runs in parallel and stage four is capped at exactly one
round. Both are deliberate — parallel keeps the positions independent, and the cap keeps
a debate system from turning into an unbounded token furnace.

---

## 9. The Output

**Headline:** Conditional advice, with the assumptions on the surface

**On the slide** — mock up the synthesis card:

- **Headline** — the decision, one sentence
- **Load-bearing assumptions** — each with `if it holds → do X` / `if it fails → the advice inverts`
- **Position scorecard** — every advisor scored 1–5 on five named dimensions, with the
  rationale behind each score
- **Dissent** — the strongest surviving objection, and which advisor holds it
- **Validation plan** — the cheapest real-world tests that settle it

**Say it:** Dissent is a required field, not a nicety. The Chair is explicitly instructed
never to average the disagreement away — if an advisor still objects after synthesis, that
objection ships with the recommendation. The scorecard is the same principle applied to
quality: you see which advisor was strongest *on which dimension*, rather than a single
verdict on who won.

---

## 10. Voice

**Headline:** The board speaks — and the latency story is the point

**On the slide:**
- Ask by voice (in-app WAV capture → server-side transcription)
- Each advisor reads their position in a **distinct voice**; the Chair reads the verdict
- **Open floor:** after the meeting, keep asking follow-ups by voice
- The meeting's Moss session stays alive server-side — follow-ups hit the same evidence

**Say it:** Voice isn't decoration here. Four distinct voices is what makes three
positions feel like a room instead of three paragraphs. And the open floor is where the
architecture pays off — the index is already warm, so follow-ups are near-instant on
retrieval.

---

## 11. The Latency HUD

**Headline:** Retrieval rounds to zero next to everything else

**On the slide:** the HUD, big and monospace:

```
moss retrieval  <N>ms  ·  think  <N>s  ·  voice  <N>s
```

- Every open-floor answer shows its own breakdown, measured live
- Retrieval is in-process — no vector DB, no cloud round-trip
- Milliseconds against seconds, on screen, every time

**Say it:** We show this because it's the honest version of a "fast search" claim. We're
not asserting a benchmark — we're timing the real query in the real request and printing
it next to the model latency. Retrieval is the part that isn't the bottleneck.

> ⚠️ **Capture real numbers before you present.** See *Numbers to Capture* at the end.

---

## 12. Built With

**Headline:** Two sponsor tools, each doing real work

**On the slide:**

**Bright Data** — the evidence layer
- Hosted MCP endpoint (`mcp.brightdata.com`), streamable HTTP + SSE
- Live scrapes of real competitor pricing pages — Linear, Asana, ClickUp
- Scraped content is handled strictly as data, never as instructions

**Moss** — the retrieval layer
- `@moss-dev/moss` session index, one per board meeting
- Hybrid semantic + keyword search, fully in-process
- Per-advisor evidence slices during the debate; warm index for the open floor

**Also:** Next.js 16 (App Router, TypeScript, Tailwind) · SSE streaming from a route
handler · Gemini — flash for advisors, pro for the Chair, with schema-constrained JSON
decoding · Gemini multi-voice TTS

**Say it:** Neither tool is a checkbox. Without live scraping the advisors argue from
training data, which is exactly the generic-advice failure we set out to fix. Without
in-process retrieval the open floor doesn't feel conversational — you'd be paying a cloud
round-trip on every follow-up.

---

## 13. Research Grounding

**Headline:** Two papers in the build. One on the roadmap.

**On the slide:**

**Shipped — PCE** *(Seo et al., ICLR 2026 — "From Assumptions to Actions")*
PCE turns the assumptions left implicit in an LLM's reasoning into explicit structure you
can act on. Every advisor position carries its `keyAssumptions`; the Chair's verdict carries
`loadBearingAssumptions`, each with an explicit *if it holds → do X* / *if it fails → the
advice inverts* branch. Required output fields, not stylistic flourishes.

**Shipped — FLASK** *(Ye et al., ICLR 2024)*
Fine-grained skill-set scoring instead of one coarse preference number. The Chair scores
every advisor on five named dimensions — evidence grounding, stage fit, arithmetic
soundness, actionability, robustness under critique — on a 1–5 scale, **writing the
rationale before committing to the number**. And there is deliberately **no overall
average**: collapsing the dimensions back into one figure is exactly what the paper argues
against.

**Roadmap — SkillOpt-Lite** *(Shen et al., 2026)*
Minimal-pipeline agent self-evolution. Log which advice founders accept, mine the
transcripts, patch the advisor prompts.

**Say it:** The scorecard earns its place because it discriminates. In our test run the
Value Pricer scored 5 on actionability and 2 on stage fit; the Unit-Economics Hawk scored
the mirror image — 5 on stage fit and robustness, 2 on actionability. That's the FLASK
argument in one screen: a single "which advisor was best" number would have thrown away
the only useful information, which is that each is strong somewhere different.

**Also worth saying:** the design lesson that mattered most isn't from these papers at all
— it's the multi-agent debate literature's finding that same-model debate converges. That's
what pushed us to opposed priors and separate evidence slices instead of just spawning
more agents.

> ⚠️ Don't claim PCE's mechanism, only its idea. PCE builds a scored decision tree
> (scenario likelihood × goal gain × execution cost). We surface assumptions with
> conditional branches; we don't score paths. See *Handle With Care*.

---

## 14. Demo

**Headline:** Live: pricing an AI-native project tracker

**On the slide** — the demo fixture (label it clearly as a fictional company):

> **Question:** "We're building an AI-native project tracker for startup teams. How should
> we price it?"
>
> **Stage:** pre-seed, 4 months post-launch
> **Traction:** 40 design-partner teams, 8 paying, $2k MRR
> **Price today:** $8/user/mo, no free tier, 14-day trial
> **Metrics:** CAC ~$150, logo churn ~6%/mo, avg team size 7
> **Costs:** AI inference ~$0.90/user/mo, hosting ~$0.15/user/mo
> **Runway:** 11 months
>
> **Competitors scraped live:** Linear · Asana · ClickUp

**Say it:** This fixture is built to make the debate bite. Inference cost at ninety cents
against an eight-dollar price is a real margin question, so the Hawk has something to
compute. And a free tier at that cost structure is a genuine disagreement between the
Value Pricer and the PLG Advocate — not a manufactured one.

---

## 15. What's Next

**Headline:** From one board to a bench

**On the slide:**
- **Eight advisors, not three** — fundraising, GTM, pricing, product, CFO, technical,
  people, and a skeptic who attacks the premise of the question itself
- **Question routing** — each question activates only the 2–4 advisors who matter
- **Self-improvement loop** — log which advice founders accept, mine the transcripts,
  patch the advisor prompts (SkillOpt-Lite)
- **Persistent founder context** — your metrics and docs indexed once, grounding every
  future meeting

**Say it:** Pricing was the right place to start because the output is numeric and the
evidence is vivid. The architecture is the same for every other question a board gets
asked — the bench is already designed.

---

## 16. Close

**Headline:** Most AI advice tells you what to do. This tells you what you'd have to
believe.

**On the slide:**
- Three advisors, structurally opposed
- Grounded in live evidence, not training data
- Dissent preserved, assumptions exposed, tests attached

**Say it:** That's the whole thesis in one line. Take the last slide slowly.

---
---

# Supporting Material

## Design Direction

The app's own aesthetic is the safest guide — the deck should look like the product.

- **Mode:** dark. The boardroom UI is dark and the deck should match.
- **Advisor accent colors** (use these consistently, and only these, for advisor
  attribution): amber `#f59e0b` (Value Pricer) · emerald `#10b981` (PLG Advocate) ·
  sky `#0ea5e9` (Unit-Economics Hawk). The Chair reads as neutral — white or slate.
- **Type:** clean sans for body; use monospace for the latency HUD, the pipeline stage
  labels, and any raw numbers. The mono/sans contrast is the deck's main texture.
- **Density:** slides 3, 4, and 16 should be nearly empty — one idea, large. The pipeline
  (8) and bench (7) slides carry the visual detail.
- **The one diagram worth building:** slide 8's five-stage flow. Consider showing the
  three advisor lanes running in *parallel* between stages 3 and 4, then converging into
  the Chair. The shape of the diagram is itself the argument for independence.
- **Screenshots to grab from the running app:** the boardroom mid-debate with all three
  positions visible, the synthesis card with assumptions expanded, and the latency HUD.

## Verified Facts

Everything here was read out of the codebase — safe to put on a slide.

- Three advisors + one Chair. Advisors run `gemini-3.5-flash` in parallel; the Chair runs
  `gemini-pro-latest`.
- Exactly **one** critique round, capped deliberately for latency and cost.
- Advisor positions are generated in parallel and no advisor sees another's draft before
  writing their own.
- Each advisor pulls its own evidence slice using three persona-specific Moss queries plus
  the founder's question, deduplicated and capped at 10 excerpts.
- Scrapes run concurrently, capped at 6 URLs per meeting, and fail independently — one
  dead page doesn't kill the meeting.
- All model output is schema-constrained JSON with a retry-and-salvage path.
- Prompt-injection posture: Bright Data's untrusted-content wrapper is stripped, and every
  prompt instructs the model to treat evidence strictly as data, never as instructions.
- The Chair scores all three advisors on five named rubric dimensions (1–5), with a written
  rationale per cell and deliberately no overall average. Verified live: 15/15 cells scored,
  5 distinct values used.
- Meeting sessions live 30 minutes server-side, then close, which is what makes the open
  floor possible.
- Moss retrieval is in-process — no vector database in the stack.
- Voice input is raw WAV capture via `getUserMedia`, transcribed server-side. This
  deliberately avoids both MediaRecorder and the Web Speech API so it works in embedded
  browsers — worth mentioning only if someone asks why not Web Speech.
- ~1,900 lines of TypeScript across the app.

## Handle With Care

- **The demo company is fictional.** The $2k MRR / 40 design partners / 11 months runway
  numbers are a demo fixture, not traction. Label the slide accordingly — an audience that
  briefly thinks it's your real traction and then finds out otherwise will discount
  everything else on the deck.
- **`moss retrieval 7ms` in the README is an illustrative example**, not a measurement.
  Don't put it on a slide as a benchmark. Either capture a real number (below) or present
  the HUD as a live element you'll demo rather than a claim you're asserting.
- **Integrations were verified live on 2026-07-18**, running locally. There's no deployed
  URL — if the deck implies one, fix it or add a "runs locally" note.
- **Don't claim the eight-advisor bench exists.** It's designed, not built. Slide 15 is
  correctly framed as next steps; keep it that way.
- **Two of the three papers are in the build. Don't round that up to three.**
  - *PCE* — **used**, but the idea, not the mechanism. The app makes latent assumptions
    explicit and conditional (`keyAssumptions`, `loadBearingAssumptions` with
    `ifHolds`/`ifFails`). PCE's actual contribution is a decision tree whose paths are
    scored by scenario likelihood, goal-directed gain, and execution cost. Nothing in the
    codebase scores paths. Claim the borrowing, not the framework.
  - *FLASK* — **used.** Five named rubric dimensions in `RUBRIC_DIMENSIONS`
    ([personas.ts](src/lib/personas.ts)), scored 1–5 per advisor by the Chair, rationale
    declared before score in the schema so constrained decoding reasons first. No overall
    average, by design. Verified live — see the smoke test below.
  - *SkillOpt-Lite* — **not used.** No transcript logging, no prompt patching. Roadmap only,
    and slide 15 already frames it that way.

  "We implemented all three papers" is checkable in about thirty seconds by anyone with the
  repo open, and the third one isn't there. Two shipped is a strong claim on its own.

## Numbers to Capture Before Presenting

The single highest-value thing to do before this deck is final: run one real meeting and
one open-floor follow-up, and write down what the HUD actually says.

```bash
cd founder-advisory-board
npm run dev          # http://localhost:3000
```

Run the demo question, then ask a follow-up on the open floor and record the three HUD
values. Substitute them into slide 11. A measured number you can defend is worth more than
a round number you can't — and the demo will produce it in under two minutes.

Worth capturing at the same time: total wall-clock for a full meeting, the doc count from
the indexing stage, and whether all three competitor scrapes succeeded.

> ⚠️ **Re-time the meeting before repeating the "ninety seconds" claim** on slides 1 and 5.
> The rubric adds 15 rationale-plus-score cells to the Chair's output, and an isolated
> chair call measured **~35s** in the smoke test. Synthesis is the last stage, so total
> meeting time went up. Either re-time it and use the real figure, or drop the specific
> number and say "under two minutes."

To re-check the rubric on its own without paying for a full meeting (one chair call, canned
debate record, asserts all 15 cells and prints the matrix):

```bash
node --env-file=.env scripts/smoke-rubric.mjs
```
