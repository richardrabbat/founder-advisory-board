import { MossClient, SessionIndex } from "@moss-dev/moss";

export interface EvidenceChunk {
  id: string;
  text: string;
  metadata?: Record<string, string>;
}

export interface EvidenceHit extends EvidenceChunk {
  score: number;
}

let client: MossClient | null = null;

function getClient(): MossClient {
  if (!client) {
    const projectId = process.env.MOSS_PROJECT_ID;
    const projectKey = process.env.MOSS_PROJECT_KEY;
    if (!projectId || !projectKey) {
      throw new Error("MOSS_PROJECT_ID / MOSS_PROJECT_KEY are not set");
    }
    client = new MossClient(projectId, projectKey);
  }
  return client;
}

// A meeting's evidence lives in a Moss local session index: docs are embedded
// and queried entirely in-process (hybrid keyword + semantic), so per-advisor
// retrieval during the debate costs no cloud round-trips.
export async function openEvidenceSession(name: string): Promise<SessionIndex> {
  return getClient().session(name);
}

export async function addEvidence(
  session: SessionIndex,
  chunks: EvidenceChunk[],
): Promise<number> {
  const { added, updated } = await session.addDocs(chunks);
  return added + updated;
}

export async function queryEvidence(
  session: SessionIndex,
  query: string,
  topK = 4,
): Promise<EvidenceHit[]> {
  const result = await session.query(query, { topK });
  return result.docs.map((d) => ({
    id: d.id,
    text: d.text,
    metadata: d.metadata,
    score: d.score,
  }));
}

// Split scraped markdown into indexable chunks: prefer paragraph boundaries,
// merge shreds, cap length so each chunk stays a coherent retrieval unit.
export function chunkMarkdown(
  text: string,
  source: string,
  maxLen = 900,
): EvidenceChunk[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const merged: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxLen && current.length > 0) {
      merged.push(current);
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current) merged.push(current);

  return merged
    .filter((t) => t.replace(/[^a-zA-Z0-9$€£%]/g, "").length > 20)
    .map((t, i) => ({
      id: `${source}-${i}`,
      text: t.slice(0, maxLen * 2),
      metadata: { source },
    }));
}
