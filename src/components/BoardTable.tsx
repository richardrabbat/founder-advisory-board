"use client";

import type { ReactNode } from "react";

export interface Seat {
  id: string;
  name: string;
  title: string;
  emoji: string;
  /** Degrees around the table; 0 = right, 90 = bottom (CSS y-down). */
  angle: number;
  accentText: string;
}

interface BubbleState {
  short: string;
  hasDetails: boolean;
}

export default function BoardTable({
  seats,
  bubbles,
  speakingId,
  thinkingIds,
  onExpand,
  founderExtra,
}: {
  seats: Seat[];
  bubbles: Record<string, BubbleState | undefined>;
  speakingId: string | null;
  /** Seats currently "working" (e.g. advisors drafting positions). */
  thinkingIds: string[];
  onExpand: (seatId: string) => void;
  founderExtra?: ReactNode;
}) {
  return (
    <div className="relative mx-auto h-[440px] w-full max-w-4xl sm:h-[480px]">
      {/* The table */}
      <div className="absolute left-1/2 top-1/2 flex h-[52%] w-[44%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-gradient-to-br from-slate-800/80 to-slate-900 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
        <span className="select-none text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
          Boardroom
        </span>
      </div>

      {seats.map((seat) => {
        const rad = (seat.angle * Math.PI) / 180;
        const x = 50 + 38 * Math.cos(rad);
        const y = 50 + 36 * Math.sin(rad);
        const isTopHalf = Math.sin(rad) < 0;
        const bubble = bubbles[seat.id];
        const speaking = speakingId === seat.id;
        const thinking = thinkingIds.includes(seat.id);

        // Bubbles point inward toward the table so the scene stays compact.
        const bubbleNode = bubble ? (
          <div
            className={`w-48 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug shadow-lg ${
              speaking
                ? "border-emerald-400/60 bg-emerald-950/95 text-emerald-100"
                : "border-slate-600 bg-slate-800/95 text-slate-200"
            }`}
          >
            {bubble.short}
            {bubble.hasDetails && (
              <button
                onClick={() => onExpand(seat.id)}
                title="Show full detail"
                className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15 align-middle text-[11px] font-bold leading-none text-white transition hover:bg-white/30"
              >
                +
              </button>
            )}
          </div>
        ) : null;

        return (
          <div
            key={seat.id}
            className="absolute z-10 flex w-48 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {!isTopHalf && bubbleNode}
            <div>
              <p className={`text-xs font-semibold ${seat.accentText}`}>{seat.name}</p>
              <p className="text-[10px] text-slate-500">{seat.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl shadow-lg transition-colors duration-300 ${
                  speaking
                    ? "animate-pulse border-emerald-300 bg-emerald-400"
                    : thinking
                      ? "animate-pulse border-slate-400 bg-slate-200"
                      : "border-slate-300 bg-white"
                }`}
              >
                <span className="select-none">{seat.emoji}</span>
              </div>
              {seat.id === "founder" && founderExtra}
            </div>
            {isTopHalf && bubbleNode}
          </div>
        );
      })}
    </div>
  );
}
