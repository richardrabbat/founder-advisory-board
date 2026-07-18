"use client";

import { useState } from "react";
import { CHAIR_VOICE } from "@/lib/personas";
import type { AudioQueue } from "@/lib/voice";
import MicButton from "./MicButton";

interface FloorEntry {
  question: string;
  answer: string;
  mossMs: number;
  genMs: number;
  speakMs: number | null;
  evidenceCount: number;
}

export default function OpenFloor({
  meetingId,
  audio,
  speakEnabled,
}: {
  meetingId: string;
  audio: AudioQueue;
  speakEnabled: boolean;
}) {
  const [entries, setEntries] = useState<FloorEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    setDraft("");
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
      if (!res.ok || !data.answer) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      let speakMs: number | null = null;
      if (speakEnabled) {
        const t0 = performance.now();
        const tts = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.answer, voice: CHAIR_VOICE }),
        });
        if (tts.ok) {
          const blob = await tts.blob();
          speakMs = Math.round(performance.now() - t0);
          audio.speakBlob(blob);
        }
      }

      setEntries((prev) => [
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
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">Open floor</h2>
      <p className="mt-1 text-sm text-slate-400">
        Ask the board a follow-up — answers are grounded in the meeting&apos;s evidence,
        retrieved by Moss in-process.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <MicButton onTranscript={(t) => void ask(t)} disabled={busy} />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void ask(draft);
          }}
          placeholder={busy ? "The chair is thinking…" : "e.g. What does Linear charge for Business?"}
          disabled={busy}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-slate-500 disabled:opacity-50"
        />
        <button
          onClick={() => void ask(draft)}
          disabled={busy || draft.trim().length === 0}
          className="shrink-0 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Ask
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <ul className="mt-5 space-y-4">
        {entries.map((e, i) => (
          <li key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-medium text-white">{e.question}</p>
            <p className="mt-2 text-sm text-slate-300">{e.answer}</p>
            <p className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">
                moss retrieval {e.mossMs}ms
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400">
                {e.evidenceCount} chunks
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400">
                think {(e.genMs / 1000).toFixed(1)}s
              </span>
              {e.speakMs !== null && (
                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400">
                  voice {(e.speakMs / 1000).toFixed(1)}s
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
