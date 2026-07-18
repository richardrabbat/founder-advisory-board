import type { SessionIndex } from "@moss-dev/moss";

// After a board meeting ends, its Moss session index and debate record stay
// registered here so the founder can ask follow-up questions ("open floor")
// against the same evidence, at in-process retrieval latency.

export interface Meeting {
  session: SessionIndex;
  question: string;
  debateRecord: string;
  createdAt: number;
}

const TTL_MS = 30 * 60 * 1000;

// Survive dev-server hot reloads: the map lives on globalThis.
const g = globalThis as unknown as { __fabMeetings?: Map<string, Meeting> };
const meetings: Map<string, Meeting> = (g.__fabMeetings ??= new Map());

export function registerMeeting(id: string, meeting: Meeting): void {
  for (const [oldId, old] of meetings) {
    if (Date.now() - old.createdAt > TTL_MS) {
      meetings.delete(oldId);
      void old.session.close().catch(() => {});
    }
  }
  meetings.set(id, meeting);
}

export function getMeeting(id: string): Meeting | undefined {
  return meetings.get(id);
}
