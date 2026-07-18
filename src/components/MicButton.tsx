"use client";

import { useRef, useState } from "react";
import { WavRecorder } from "@/lib/voice";

type MicState = "idle" | "recording" | "transcribing";

export default function MicButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<MicState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<WavRecorder | null>(null);

  const toggle = async () => {
    setError(null);

    if (state === "recording") {
      setState("transcribing");
      try {
        const blob = await recorderRef.current?.stop();
        if (!blob || blob.size <= 44) throw new Error("No audio captured");
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "audio/wav" },
          body: blob,
        });
        const data = (await res.json()) as { transcript?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? `Transcription failed (${res.status})`);
        if (!data.transcript) {
          setError("Did not catch any speech — try again closer to the mic.");
        } else {
          onTranscript(data.transcript);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setState("idle");
      }
      return;
    }

    if (state !== "idle") return;
    try {
      const recorder = new WavRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone permission denied — allow mic access and retry."
          : `Mic unavailable: ${err instanceof Error ? err.message : String(err)}`,
      );
      setState("idle");
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={disabled || state === "transcribing"}
        title={
          state === "recording"
            ? "Stop and transcribe"
            : state === "transcribing"
              ? "Transcribing…"
              : "Record your question"
        }
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
          state === "recording"
            ? "animate-pulse border-red-500/60 bg-red-500/20 text-red-300"
            : state === "transcribing"
              ? "animate-pulse border-slate-500 bg-slate-800 text-slate-300"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
        }`}
      >
        {state === "recording" ? "◼" : state === "transcribing" ? "…" : "🎙"}
      </button>
      {error && (
        <p className="max-w-[180px] text-center text-[11px] leading-tight text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
