"use client";

import { useEffect, useRef, useState } from "react";
import {
  createRecognition,
  extractTranscript,
  type SpeechRecognitionLike,
} from "@/lib/voice";

export default function MicButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(createRecognition() !== null);
  }, []);

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = createRecognition();
    if (!rec) return;
    recRef.current = rec;
    rec.onresult = (e) => {
      const text = extractTranscript(e);
      if (text) onTranscript(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? "Stop listening" : "Speak instead of typing"}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
        listening
          ? "animate-pulse border-red-500/60 bg-red-500/20 text-red-300"
          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
      }`}
    >
      {listening ? "◼" : "🎙"}
    </button>
  );
}
