import { synthesizeSpeech } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string; voice?: string };
  if (!body.text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  try {
    const wav = await synthesizeSpeech(body.text.slice(0, 600), body.voice ?? "Orus");
    return new Response(new Uint8Array(wav), {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch (err) {
    // Voice is a progressive enhancement — the client falls back to silence.
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
