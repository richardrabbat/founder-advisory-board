import { getMeeting } from "@/lib/meetings";
import { queryEvidence } from "@/lib/moss";
import { ADVISOR_MODEL, generateText } from "@/lib/gemini";
import { OPEN_FLOOR_SYSTEM_PROMPT } from "@/lib/personas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as { meetingId?: string; question?: string };
  if (!body.meetingId || !body.question) {
    return Response.json({ error: "meetingId and question are required" }, { status: 400 });
  }
  const meeting = getMeeting(body.meetingId);
  if (!meeting) {
    return Response.json(
      { error: "This board has adjourned. Convene a new meeting." },
      { status: 404 },
    );
  }

  // The Moss moment: in-process hybrid retrieval over the meeting's evidence.
  const t0 = performance.now();
  const hits = await queryEvidence(meeting.session, body.question, 5);
  const mossMs = performance.now() - t0;

  const evidence =
    hits.length > 0
      ? hits.map((h) => `[${h.metadata?.source ?? "unknown"}] ${h.text}`).join("\n---\n")
      : "(no matching evidence)";

  const t1 = performance.now();
  const answer = await generateText(
    ADVISOR_MODEL,
    OPEN_FLOOR_SYSTEM_PROMPT,
    `ORIGINAL BOARD QUESTION:\n${meeting.question}\n\nDEBATE RECORD:\n${meeting.debateRecord}\n\nRETRIEVED EVIDENCE:\n${evidence}\n\nFOUNDER'S FOLLOW-UP QUESTION:\n${body.question}`,
  );
  const genMs = performance.now() - t1;

  return Response.json({
    answer,
    mossMs: Math.round(mossMs * 10) / 10,
    genMs: Math.round(genMs),
    evidenceCount: hits.length,
  });
}
