"use client";

import { useCallback, useRef, useState } from "react";
import { CHAIR_VOICE, PRICING_ADVISORS } from "@/lib/personas";
import type { BoardEvent, Critique, Position, Synthesis } from "@/lib/debate";
import { AudioQueue } from "@/lib/voice";
import MicButton from "@/components/MicButton";
import OpenFloor from "@/components/OpenFloor";

type Stage = "idle" | "gathering" | "indexing" | "positions" | "critiques" | "synthesis" | "done";

interface ScrapeStatus {
  url: string;
  status: "ok" | "empty" | "failed";
  chars?: number;
}

const STAGES: Array<{ key: Stage; label: string }> = [
  { key: "gathering", label: "Scraping competitors" },
  { key: "indexing", label: "Indexing evidence" },
  { key: "positions", label: "Independent positions" },
  { key: "critiques", label: "Cross-examination" },
  { key: "synthesis", label: "Chair synthesis" },
];

const DEMO_QUESTION =
  "We are building an AI-native project tracker for startup teams. How should we price it?";
const DEMO_CONTEXT = `Stage: pre-seed, 4 months since launch.
Traction: 40 design-partner teams, 8 paying, $2k MRR.
Current price: $8/user/mo, no free tier, 14-day trial.
Metrics: CAC ~$150 (content + communities), logo churn ~6%/mo, avg team size 7.
Costs: AI inference ~$0.90/user/mo, hosting ~$0.15/user/mo.
Runway: 11 months.`;
const DEMO_URLS = "https://linear.app/pricing\nhttps://asana.com/pricing\nhttps://clickup.com/pricing";

export default function Home() {
  const [question, setQuestion] = useState(DEMO_QUESTION);
  const [context, setContext] = useState(DEMO_CONTEXT);
  const [urls, setUrls] = useState(DEMO_URLS);

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
  const synthesisRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioQueue | null>(null);
  const speakRef = useRef(true);

  const getAudio = useCallback((): AudioQueue => {
    if (!audioRef.current) audioRef.current = new AudioQueue();
    return audioRef.current;
  }, []);

  const handleEvent = useCallback((e: BoardEvent) => {
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
        const adv = PRICING_ADVISORS.find((a) => a.id === e.advisorId);
        if (adv && speakRef.current) {
          getAudio().speak(`${adv.name}: ${e.position.recommendation}`, adv.voice);
        }
        break;
      }
      case "critique":
        setCritiques((prev) => ({ ...prev, [e.advisorId]: e.critique }));
        break;
      case "synthesis":
        setSynthesis(e.synthesis);
        if (speakRef.current) {
          getAudio().speak(`The chair rules: ${e.synthesis.headline}`, CHAIR_VOICE);
        }
        setTimeout(() => synthesisRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        break;
      case "error":
        setError(e.message);
        break;
      case "done":
        setStage("done");
        setMeetingId(e.meetingId);
        break;
    }
  }, [getAudio]);

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
    getAudio().stop();

    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          founderContext: context,
          competitorUrls: urls.split("\n").map((u) => u.trim()).filter(Boolean),
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }
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
  }, [question, context, urls, handleEvent, getAudio]);

  const stageIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Founder Advisory Board
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Three opinionated advisors, live competitor evidence, one structured debate.
            Powered by Bright Data (evidence), Moss (retrieval), and Gemini (reasoning).
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Your question for the board
              </label>
              <div className="flex items-start gap-3">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-slate-500"
                />
                <MicButton onTranscript={setQuestion} disabled={running} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Company context &amp; metrics
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={7}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Competitor pages to scrape (one URL per line)
              </label>
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={7}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs outline-none focus:border-slate-500"
              />
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
          <section className="mt-8">
            <ol className="flex flex-wrap gap-2">
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

            {scrapes.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-slate-400">
                {scrapes.map((s) => (
                  <li key={s.url}>
                    {s.status === "ok"
                      ? `✓ ${s.url} — ${((s.chars ?? 0) / 1000).toFixed(1)}k chars extracted`
                      : s.status === "empty"
                        ? `○ ${s.url} — empty render, skipped`
                        : `✗ ${s.url} — scrape failed, skipped`}
                  </li>
                ))}
                {docCount !== null && (
                  <li className="text-slate-300">
                    ▸ {docCount} evidence chunks indexed in Moss (in-process hybrid search)
                  </li>
                )}
              </ul>
            )}
          </section>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {Object.keys(positions).length > 0 && (
          <section className="mt-8 grid gap-4 lg:grid-cols-3">
            {PRICING_ADVISORS.map((advisor) => {
              const position = positions[advisor.id];
              const critique = critiques[advisor.id];
              return (
                <article
                  key={advisor.id}
                  className={`rounded-xl border ${advisor.accent.border} bg-slate-900/60 p-5`}
                >
                  <div className="mb-3">
                    <h3 className={`font-semibold ${advisor.accent.text}`}>{advisor.name}</h3>
                    <p className="text-xs text-slate-500">{advisor.title}</p>
                  </div>
                  {position ? (
                    <div className="space-y-3 text-sm">
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
                                  <span className={target?.accent.text ?? ""}>
                                    → {target?.name ?? c.of}:
                                  </span>{" "}
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
                  ) : (
                    <p className="animate-pulse text-sm text-slate-500">Forming position…</p>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {synthesis && (
          <section
            ref={synthesisRef}
            className="mt-8 rounded-xl border border-white/20 bg-slate-900 p-6"
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Chair synthesis · confidence: {synthesis.confidence}
            </p>
            <h2 className="text-xl font-semibold text-white">{synthesis.headline}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
              {synthesis.recommendation}
            </p>

            {synthesis.loadBearingAssumptions?.length > 0 && (
              <div className="mt-5 overflow-x-auto">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Load-bearing assumptions
                </p>
                <table className="w-full min-w-[560px] text-left text-xs">
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

            <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dissent, preserved
              </p>
              <p className="text-sm text-slate-300">{synthesis.dissent}</p>
            </div>

            {synthesis.validationPlan?.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Validation plan
                </p>
                <ol className="list-inside list-decimal space-y-1 text-sm text-slate-300">
                  {synthesis.validationPlan.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        {meetingId && synthesis && (
          <OpenFloor
            key={meetingId}
            meetingId={meetingId}
            audio={getAudio()}
            speakEnabled={speakEnabled}
          />
        )}
      </main>
    </div>
  );
}
