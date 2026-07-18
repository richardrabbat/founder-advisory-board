// Client-side voice helpers: sequential audio playback + WAV mic recording.

interface SpokenItem {
  blob: Blob | null;
  speakerId: string | null;
}

// Keeps spoken lines in enqueue order even though TTS fetches resolve out of
// order: the queue holds promises and the pump awaits them sequentially.
// `onSpeaker` fires with the speaker id while their audio plays (null when idle)
// so the UI can light up the avatar that is actually talking.
export class AudioQueue {
  enabled = true;
  onSpeaker: ((id: string | null) => void) | null = null;
  private queue: Array<Promise<SpokenItem>> = [];
  private pumping = false;

  speak(text: string, voice: string, speakerId: string | null = null): void {
    if (!this.enabled) return;
    const p = fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    })
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null)
      .then((blob) => ({ blob, speakerId }));
    this.queue.push(p);
    void this.pump();
  }

  speakBlob(blob: Blob, speakerId: string | null = null): void {
    if (!this.enabled) return;
    this.queue.push(Promise.resolve({ blob, speakerId }));
    void this.pump();
  }

  stop(): void {
    this.queue = [];
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    while (this.queue.length > 0) {
      const item = await this.queue.shift();
      if (item?.blob && this.enabled) {
        this.onSpeaker?.(item.speakerId);
        await this.play(item.blob);
        this.onSpeaker?.(null);
      }
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

// Mic capture to 16-bit PCM WAV. Deliberately avoids both MediaRecorder
// (container/codec support varies by browser) and the Web Speech API (cloud
// recognizer unavailable in embedded browsers): raw sample capture works
// everywhere getUserMedia does, and the server transcribes the WAV.
export class WavRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private samples: Float32Array[] = [];

  get active(): boolean {
    return this.ctx !== null;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.ctx = new AudioContext();
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.samples = [];
    this.processor.onaudioprocess = (e) => {
      this.samples.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    this.source.connect(this.processor);
    this.processor.connect(this.ctx.destination);
  }

  async stop(): Promise<Blob> {
    const sampleRate = this.ctx?.sampleRate ?? 44100;
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.stream = null;
    this.processor = null;
    this.source = null;

    const total = this.samples.reduce((n, s) => n + s.length, 0);
    const pcm = new Int16Array(total);
    let offset = 0;
    for (const chunk of this.samples) {
      for (let i = 0; i < chunk.length; i++) {
        const v = Math.max(-1, Math.min(1, chunk[i]));
        pcm[offset++] = v < 0 ? v * 0x8000 : v * 0x7fff;
      }
    }
    this.samples = [];
    return new Blob([wavHeader(pcm.byteLength, sampleRate), pcm.buffer], {
      type: "audio/wav",
    });
  }
}

function wavHeader(dataLength: number, sampleRate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44);
  const view = new DataView(buf);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataLength, true);
  return buf;
}
