import { transcribeAudio } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // ~1 minute of 44.1kHz mono WAV is ~5MB

export async function POST(request: Request) {
  const mimeType = request.headers.get("content-type") ?? "audio/wav";
  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0) {
    return Response.json({ error: "empty audio" }, { status: 400 });
  }
  if (audio.byteLength > MAX_BYTES) {
    return Response.json({ error: "recording too long" }, { status: 413 });
  }
  try {
    const transcript = await transcribeAudio(
      Buffer.from(audio).toString("base64"),
      mimeType,
    );
    return Response.json({ transcript });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
