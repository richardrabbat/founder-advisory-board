"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHAIR_VOICE, PRICING_ADVISORS } from "@/lib/personas";
import { COMPETITORS } from "@/lib/competitors";
import type { BoardEvent, Critique, Position, Synthesis } from "@/lib/debate";
import { AudioQueue } from "@/lib/voice";
import MicButton from "@/components/MicButton";
import Modal from "@/components/Modal";
import BoardTable, { type Seat } from "@/components/BoardTable";

type Stage = "idle" | "gathering" | "indexing" | "positions" | "critiques" | "synthesis" | "done";

interface ScrapeStatus {
  url: string;
  status: "ok" | "empty" | "failed";
  chars?: number;
}

interface FloorEntry {
  question: string;
  answer: string;
  mossMs: number;
  genMs: number;
  speakMs: number | null;
  evidenceCount: number;
}

const STAGES: Array<{ key: Stage; label: string }> = [
  { key: "gathering", label: "Scraping competitors" },
  { key: "indexing", label: "Indexing evidence" },
  { key: "positions", label: "Independent positions" },
  { key: "critiques", label: "Cross-examination" },
  { key: "synthesis", label: "Chair synthesis" },
];

const ADVISOR_EMOJI: Record<string, string> = {
  "value-pricer": "💰",
  "plg-advocate": "🚀",
  "unit-econ-hawk": "📊",
};
const ADVISOR_ANGLES: Record<string, number> = {
  "value-pricer": 234,
  "plg-advocate": 18,
  "unit-econ-hawk": 162,
};

const SEATS: Seat[] = [
  ...PRICING_ADVISORS.map((a) => ({
    id: a.id,
    name: a.name,
    title: a.title,
    emoji: ADVISOR_EMOJI[a.id] ?? "🧑‍💼",
    angle: ADVISOR_ANGLES[a.id] ?? 0,
    accentText: a.accent.text,
  })),
  { id: "chair", name: "The Chair", title: "Synthesis & verdict", emoji: "⚖️", angle: 306, accentText: "text-white" },
  { id: "founder", name: "You", title: "Founder", emoji: "🧑‍💻", angle: 90, accentText: "text-slate-200" },
];

const DEMO_QUESTION =
  "We are building an AI-native project tracker for startup teams. How should we price it?";
const DEMO_CONTEXT = `Stage: pre-seed, 4 months since launch.
Traction: 40 design-partner teams, 8 paying, $2k MRR.
Current price: $8/user/mo, no free tier, 14-day trial.
Metrics: CAC ~$150 (content + communities), logo churn ~6%/mo, avg team size 7.
Costs: AI inference ~$0.90/user/mo, hosting ~$0.15/user/mo.
Runway: 11 months.`;

const short = (t: string, n = 90) => (t.length > n ? t.slice(0, n).trimEnd() + "…" : t);

export default function Home() {
  const [question, setQuestion] = useState(DEMO_QUESTION);
  const [context, setContext] = useState(DEMO_CONTEXT);

  const [stage, setStage] = useState<Stage>("idle");
  const [running, setRunning] = useState(false);
  const [scrapes, setScrapes] = useState<ScrapeStatus[]>([]);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [critiques, setCritiques] = useState<Record<string, Critique>>({});
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Record<string, { short: string; hasDetails: boolean }>>({});
  const [modalSeat, setModalSeat] = useState<string | null>(null);
  const [floorEntries, setFloorEntries] = useState<FloorEntry[]>([]);
  const [floorDraft, setFloorDraft] = useState("");
  const [floorBusy, setFloorBusy] = useState(false);

  const audioRef = useRef<AudioQueue | null>(null);
  const speakRef = useRef(true);
  const tableRef = useRef<HTMLElement>(null);

  const getAudio = useCallback((): AudioQueue => {
    if (!audioRef.current) audioRef.current = new AudioQueue();
    return audioRef.current;
  }, []);

  useEffect(() => {
    getAudio().onSpeaker = setSpeakingId;
  }, [getAudio]);

  const handleEvent = useCallback(
    (e: BoardEvent) => {
      switch (e.type) {
        case "stage":
          setStage(e.stage);
          break;
        case "scrape":
          setScrapes((prev) => [...prev, { url: e.url, status: e.status, chars: e.chars }]);
          break;
        case "indexed":
          setDocCount(e.docCount);
          break;
        case "position": {
          setPositions((prev) => ({ ...prev, [e.advisorId]: e.position }));
          setBubbles((prev) => ({
            ...prev,
            [e.advisorId]: { short: short(e.position.recommendation), hasDetails: true },
          }));
          const adv = PRICING_ADVISORS.find((a) => a.id === e.advisorId);
          if (adv && speakRef.current) {
            getAudio().speak(`${adv.name}: ${e.position.recommendation}`, adv.voice, adv.id);
          }
          break;
        }
        case "critique":
          setCritiques((prev) => ({ ...prev, [e.advisorId]: e.critique }));
          break;
        case "synthesis":
          setSynthesis(e.synthesis);
          setBubbles((prev) => ({
            ...prev,
            chair: { short: short(e.synthesis.headline, 110), hasDetails: true },
          }));
          if (speakRef.current) {
            getAudio().speak(`The chair rules: ${e.synthesis.headline}`, CHAIR_VOICE, "chair");
          }
          break;
        case "error":
          setError(e.message);
          break;
        case "done":
          setStage("done");
          setMeetingId(e.meetingId);
          break;
      }
    },
    [getAudio],
  );

  const convene = useCallback(async () => {
    setRunning(true);
    setStage("gathering");
    setScrapes([]);
    setDocCount(null);
    setPositions({});
    setCritiques({});
    setSynthesis(null);
    setError(null);
    setMeetingId(null);
    setFloorEntries([]);
    setModalSeat(null);
    setBubbles({ founder: { short: short(question, 110), hasDetails: true } });
    getAudio().stop();
    setTimeout(
      () => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      100,
    );

    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          founderContext: context,
          competitorUrls: COMPETITORS.map((c) => c.url),
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data: "));
          if (line) handleEvent(JSON.parse(line.slice(6)) as BoardEvent);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [question, context, handleEvent, getAudio]);

  const askFloor = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || !meetingId || floorBusy) return;
      setFloorBusy(true);
      setFloorDraft("");
      setError(null);
      setBubbles((prev) => ({ ...prev, founder: { short: short(q, 110), hasDetails: true } }));
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId, question: q }),
        });
        const data = (await res.json()) as {
          answer?: string;
          mossMs?: number;
          genMs?: number;
          evidenceCount?: number;
          error?: string;
        };
        if (!res.ok || !data.answer) throw new Error(data.error ?? `Request failed (${res.status})`);

        setBubbles((prev) => ({
          ...prev,
          chair: { short: short(data.answer as string, 110), hasDetails: true },
        }));

        let speakMs: number | null = null;
        if (speakRef.current) {
          const t0 = performance.now();
          const tts = await fetch("/api/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: data.answer, voice: CHAIR_VOICE }),
          });
          if (tts.ok) {
            const blob = await tts.blob();
            speakMs = Math.round(performance.now() - t0);
            getAudio().speakBlob(blob, "chair");
          }
        }

        setFloorEntries((prev) => [
          ...prev,
          {
            question: q,
            answer: data.answer as string,
            mossMs: data.mossMs ?? 0,
            genMs: data.genMs ?? 0,
            speakMs,
            evidenceCount: data.evidenceCount ?? 0,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setFloorBusy(false);
      }
    },
    [meetingId, floorBusy, getAudio],
  );

  const stageIndex = STAGES.findIndex((s) => s.key === stage);
  const scrapeFor = (url: string) => scrapes.find((s) => s.url === url);
  const lastFloor = floorEntries[floorEntries.length - 1];

  const thinkingIds =
    running && stage === "positions"
      ? PRICING_ADVISORS.filter((a) => !positions[a.id]).map((a) => a.id)
      : running && (stage === "critiques" || stage === "synthesis")
        ? ["chair"]
        : [];

  const modalSeatDef = SEATS.find((s) => s.id === modalSeat);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Founder Advisory Board
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Three opinionated advisors, live competitor evidence, one structured debate.
            Powered by Bright Data (evidence), Moss (retrieval), and Gemini (reasoning &amp; voice).
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Your question for the board
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Company context &amp; metrics
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-300">Competitor evidence</p>
            <div className="flex flex-wrap gap-3">
              {COMPETITORS.map((c) => {
                const s = scrapeFor(c.url);
                return (
                  <div
                    key={c.domain}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 transition ${
                      s?.status === "ok"
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : s
                          ? "border-slate-700 bg-slate-900 opacity-50"
                          : "border-slate-700 bg-slate-900"
                    }`}
                  >
                    <Image
                      src={c.logo}
                      alt={`${c.name} logo`}
                      width={28}
                      height={28}
                      className="rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">{c.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {!s
                          ? running
                            ? "scraping…"
                            : "pricing page"
                          : s.status === "ok"
                            ? `✓ ${((s.chars ?? 0) / 1000).toFixed(1)}k chars`
                            : s.status === "empty"
                              ? "empty render, skipped"
                              : "scrape failed, skipped"}
                      </p>
                    </div>
                  </div>
                );
              })}
              {docCount !== null && (
                <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5">
                  <p className="text-[11px] text-slate-400">
                    <span className="font-semibold text-emerald-400">{docCount}</span> chunks in
                    Moss
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-5">
            <button
              onClick={convene}
              disabled={running || question.trim().length === 0}
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {running ? "Board in session…" : "Convene the board"}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={speakEnabled}
                onChange={(e) => {
                  setSpeakEnabled(e.target.checked);
                  speakRef.current = e.target.checked;
                  const audio = getAudio();
                  audio.enabled = e.target.checked;
                  if (!e.target.checked) audio.stop();
                }}
                className="accent-white"
              />
              Board speaks aloud
            </label>
          </div>
        </section>

        {stage !== "idle" && (
          <ol className="mt-6 flex flex-wrap gap-2">
            {STAGES.map((s, i) => {
              const isDone = stage === "done" || i < stageIndex;
              const isActive = s.key === stage && running;
              return (
                <li
                  key={s.key}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    isDone
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : isActive
                        ? "animate-pulse border-white/40 bg-white/10 text-white"
                        : "border-slate-800 text-slate-500"
                  }`}
                >
                  {isDone ? "✓ " : ""}
                  {s.label}
                </li>
              );
            })}
          </ol>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section ref={tableRef} className="mt-6">
          <BoardTable
            seats={SEATS}
            bubbles={bubbles}
            speakingId={speakingId}
            thinkingIds={thinkingIds}
            onExpand={setModalSeat}
            founderExtra={
              <MicButton
                onTranscript={(t) => {
                  if (meetingId) void askFloor(t);
                  else setQuestion(t);
                }}
                disabled={running || floorBusy}
              />
            }
          />
        </section>

        {meetingId && (
          <section className="mx-auto mt-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <input
                value={floorDraft}
                onChange={(e) => setFloorDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void askFloor(floorDraft);
                }}
                placeholder={
                  floorBusy
                    ? "The chair is thinking…"
                    : "Open floor — ask a follow-up, or use the mic by your avatar"
                }
                disabled={floorBusy}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-slate-500 disabled:opacity-50"
              />
              <button
                onClick={() => void askFloor(floorDraft)}
                disabled={floorBusy || floorDraft.trim().length === 0}
                className="shrink-0 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ask
              </button>
            </div>
            {lastFloor && (
              <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">
                  moss retrieval {lastFloor.mossMs}ms
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400">
                  {lastFloor.evidenceCount} chunks
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400">
                  think {(lastFloor.genMs / 1000).toFixed(1)}s
                </span>
                {lastFloor.speakMs !== null && (
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400">
                    voice {(lastFloor.speakMs / 1000).toFixed(1)}s
                  </span>
                )}
              </p>
            )}
          </section>
        )}

        {modalSeatDef && (
          <Modal
            title={`${modalSeatDef.name} — ${modalSeatDef.title}`}
            onClose={() => setModalSeat(null)}
          >
            {modalSeat === "founder" ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Question
                  </p>
                  <p className="text-slate-200">{question}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Company context
                  </p>
                  <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300">
                    {context}
                  </pre>
                </div>
              </div>
            ) : modalSeat === "chair" ? (
              <ChairDetails synthesis={synthesis} floorEntries={floorEntries} />
            ) : (
              <AdvisorDetails
                position={positions[modalSeat ?? ""]}
                critique={critiques[modalSeat ?? ""]}
              />
            )}
          </Modal>
        )}
      </main>
    </div>
  );
}

function AdvisorDetails({
  position,
  critique,
}: {
  position?: Position;
  critique?: Critique;
}) {
  if (!position) return <p className="text-sm text-slate-400">No position yet.</p>;
  return (
    <div className="space-y-4 text-sm">
      <p className="font-medium text-white">{position.recommendation}</p>
      <p className="whitespace-pre-wrap text-slate-300">{position.reasoning}</p>
      {position.keyAssumptions?.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assumes
          </p>
          <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
            {position.keyAssumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {position.evidenceCited?.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Evidence cited
          </p>
          <ul className="space-y-1 text-xs text-slate-400">
            {position.evidenceCited.map((e, i) => (
              <li key={i} className="border-l-2 border-slate-700 pl-2">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
      {critique && (
        <div className="border-t border-slate-800 pt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Fires back
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            {critique.critiques?.map((c, i) => {
              const target = PRICING_ADVISORS.find((a) => a.id === c.of);
              return (
                <li key={i}>
                  <span className={target?.accent.text ?? ""}>→ {target?.name ?? c.of}:</span>{" "}
                  {c.point}
                </li>
              );
            })}
          </ul>
          {critique.updatedView && critique.updatedView !== "null" && (
            <p className="mt-2 text-xs italic text-slate-400">
              Updated view: {critique.updatedView}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ChairDetails({
  synthesis,
  floorEntries,
}: {
  synthesis: Synthesis | null;
  floorEntries: FloorEntry[];
}) {
  if (!synthesis) return <p className="text-sm text-slate-400">No synthesis yet.</p>;
  return (
    <div className="space-y-5 text-sm">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Verdict · confidence: {synthesis.confidence}
        </p>
        <p className="font-medium text-white">{synthesis.headline}</p>
        <p className="mt-2 whitespace-pre-wrap text-slate-300">{synthesis.recommendation}</p>
      </div>

      {synthesis.loadBearingAssumptions?.length > 0 && (
        <div className="overflow-x-auto">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Load-bearing assumptions
          </p>
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-500">
                <th className="py-2 pr-4 font-medium">Assumption</th>
                <th className="py-2 pr-4 font-medium">If it holds</th>
                <th className="py-2 font-medium">If it fails</th>
              </tr>
            </thead>
            <tbody>
              {synthesis.loadBearingAssumptions.map((a, i) => (
                <tr key={i} className="border-b border-slate-800/60 align-top">
                  <td className="py-2 pr-4 text-white">{a.assumption}</td>
                  <td className="py-2 pr-4 text-emerald-300/90">{a.ifHolds}</td>
                  <td className="py-2 text-amber-300/90">{a.ifFails}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Dissent, preserved
        </p>
        <p className="text-slate-300">{synthesis.dissent}</p>
      </div>

      {synthesis.validationPlan?.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Validation plan
          </p>
          <ol className="list-inside list-decimal space-y-1 text-slate-300">
            {synthesis.validationPlan.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ol>
        </div>
      )}

      {floorEntries.length > 0 && (
        <div className="border-t border-slate-800 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Open floor
          </p>
          <ul className="space-y-3">
            {floorEntries.map((e, i) => (
              <li key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <p className="font-medium text-white">{e.question}</p>
                <p className="mt-1 text-slate-300">{e.answer}</p>
                <p className="mt-2 font-mono text-[11px] text-slate-500">
                  moss {e.mossMs}ms · think {(e.genMs / 1000).toFixed(1)}s
                  {e.speakMs !== null ? ` · voice ${(e.speakMs / 1000).toFixed(1)}s` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
