"use client";

import type { SequenceStep } from "@/types/lesson";

// actor palette: violet, cyan, emerald, amber
const ACTOR_COLORS = [
  { fill: "rgba(167,139,250,0.12)", stroke: "rgba(167,139,250,0.55)", text: "#a78bfa", act: "rgba(167,139,250,0.25)" },
  { fill: "rgba(34,211,238,0.12)",  stroke: "rgba(34,211,238,0.55)",  text: "#22d3ee", act: "rgba(34,211,238,0.25)"  },
  { fill: "rgba(52,211,153,0.12)",  stroke: "rgba(52,211,153,0.55)",  text: "#34d399", act: "rgba(52,211,153,0.25)"  },
  { fill: "rgba(251,191,36,0.12)",  stroke: "rgba(251,191,36,0.55)",  text: "#fbbf24", act: "rgba(251,191,36,0.25)"  },
];

const MONO = '"ui-monospace","SFMono-Regular","Menlo","Consolas",monospace';

const LANE_W    = 148; // center-to-center spacing
const ACTOR_H   = 30;
const ACTOR_W   = 108;
const STEP_H    = 48;
const PAD_X     = 16;
const PAD_BOT   = 16;
const ARROW_SZ  = 5.5;

export interface SequenceDiagramProps {
  title?: string;
  actors: string[];
  steps: SequenceStep[];
}

export function SequenceDiagram({ title, actors, steps }: SequenceDiagramProps) {
  const n       = actors.length;
  const totalW  = PAD_X * 2 + n * LANE_W;
  const totalH  = ACTOR_H + steps.length * STEP_H + PAD_BOT;

  const cx = (i: number) => PAD_X + i * LANE_W + LANE_W / 2;
  const c  = (i: number) => ACTOR_COLORS[i % ACTOR_COLORS.length];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-x-auto">
      {title && (
        <div className="px-4 py-2 border-b border-zinc-800 font-mono text-[10px] text-zinc-500">
          {title}
        </div>
      )}
      <div className="p-3">
        <svg
          width={totalW}
          height={totalH}
          viewBox={`0 0 ${totalW} ${totalH}`}
          style={{ display: "block", minWidth: totalW, fontFamily: MONO }}
        >
          {/* ── Actors ── */}
          {actors.map((actor, i) => {
            const x   = cx(i);
            const col = c(i);
            return (
              <g key={i}>
                {/* box */}
                <rect
                  x={x - ACTOR_W / 2} y={0}
                  width={ACTOR_W} height={ACTOR_H} rx={5}
                  fill={col.fill} stroke={col.stroke} strokeWidth={1}
                />
                <text
                  x={x} y={ACTOR_H / 2 + 4}
                  textAnchor="middle" fontSize={10} fontWeight="700"
                  fill={col.text}
                >
                  {actor}
                </text>
                {/* lifeline */}
                <line
                  x1={x} y1={ACTOR_H}
                  x2={x} y2={totalH - PAD_BOT}
                  stroke="#3f3f46" strokeWidth={1} strokeDasharray="4 3"
                />
              </g>
            );
          })}

          {/* ── Steps ── */}
          {steps.map((step, si) => {
            const y      = ACTOR_H + si * STEP_H + STEP_H * 0.52;
            const fi     = Math.max(0, actors.indexOf(step.from));
            const ti     = Math.max(0, actors.indexOf(step.to));
            const x1     = cx(fi);
            const x2     = cx(ti);
            const isResp = step.style === "response";
            const goR    = x2 >= x1;
            const col    = c(fi);

            // arrow endpoints (pull back from arrowhead)
            const lx1 = x1 + (goR ? 4 : -4);
            const lx2 = x2 + (goR ? -ARROW_SZ : ARROW_SZ);

            // filled arrowhead
            const ax = x2, ay = y;
            const arrowPts = goR
              ? `${ax},${ay} ${ax - ARROW_SZ},${ay - 3} ${ax - ARROW_SZ},${ay + 3}`
              : `${ax},${ay} ${ax + ARROW_SZ},${ay - 3} ${ax + ARROW_SZ},${ay + 3}`;

            const midX = (x1 + x2) / 2;

            return (
              <g key={si}>
                {/* step number */}
                <text x={4} y={y + 3.5} fontSize={8} fill="#52525b">
                  {si + 1}
                </text>

                {/* arrow line */}
                <line
                  x1={lx1} y1={y} x2={lx2} y2={y}
                  stroke={isResp ? "#52525b" : col.text}
                  strokeWidth={isResp ? 1 : 1.5}
                  strokeDasharray={isResp ? "5 3" : undefined}
                />

                {/* arrowhead */}
                <polygon
                  points={arrowPts}
                  fill={isResp ? "#52525b" : col.text}
                />

                {/* label */}
                <text
                  x={midX} y={y - 7}
                  textAnchor="middle" fontSize={9.5} fill="#a1a1aa"
                >
                  {step.label}
                </text>

                {/* note */}
                {step.note && (
                  <text
                    x={midX} y={y + 14}
                    textAnchor="middle" fontSize={8.5} fill="#71717a"
                    fontStyle="italic"
                  >
                    {step.note}
                  </text>
                )}

                {/* activation box on source actor */}
                <rect
                  x={x1 - 4} y={y - 8} width={8} height={16} rx={2}
                  fill={col.act} stroke={col.stroke} strokeWidth={0.5}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
