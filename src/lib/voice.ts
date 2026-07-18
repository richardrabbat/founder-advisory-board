// Client-side voice helpers: sequential audio playback + speech recognition.

// Keeps spoken lines in enqueue order even though TTS fetches resolve out of
// order: the queue holds promises and the pump awaits them sequentially.
export class AudioQueue {
  enabled = true;
  private queue: Array<Promise<Blob | null>> = [];
  private pumping = false;

  speak(text: string, voice: string): void {
    if (!this.enabled) return;
    const p = fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    })
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null);
    this.queue.push(p);
    void this.pump();
  }

  speakBlob(blob: Blob): void {
    if (!this.enabled) return;
    this.queue.push(Promise.resolve(blob));
    void this.pump();
  }

  stop(): void {
    this.queue = [];
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    while (this.queue.length > 0) {
      const blob = await this.queue.shift();
      if (blob && this.enabled) await this.play(blob);
    }
    this.pumping = false;
  }

  private play(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      const done = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onended = done;
      audio.onerror = done;
      audio.play().catch(done);
    });
  }
}

interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  start(): void;
  stop(): void;
}

// Web Speech API (Chrome-reliable). Returns null where unsupported;
// callers degrade to typing.
export function createRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "en-US";
  r.interimResults = false;
  r.continuous = false;
  r.maxAlternatives = 1;
  return r;
}

export function extractTranscript(e: SpeechResultEvent): string {
  const parts: string[] = [];
  for (let i = 0; i < e.results.length; i++) {
    const alt = e.results[i]?.[0];
    if (alt?.transcript) parts.push(alt.transcript);
  }
  return parts.join(" ").trim();
}
