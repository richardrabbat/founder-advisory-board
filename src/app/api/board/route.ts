import { runBoardMeeting, type BoardEvent, type MeetingInput } from "@/lib/debate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<MeetingInput>;
  if (!body.question || typeof body.question !== "string") {
    return Response.json({ error: "question is required" }, { status: 400 });
  }
  const input: MeetingInput = {
    question: body.question,
    founderContext: typeof body.founderContext === "string" ? body.founderContext : "",
    competitorUrls: Array.isArray(body.competitorUrls)
      ? body.competitorUrls.filter((u): u is string => typeof u === "string")
      : [],
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: BoardEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      try {
        await runBoardMeeting(input, emit);
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
