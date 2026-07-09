"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

const TICK_MS = 80;
// phases: place-query(20) → draw-lines(20) → highlight(30) → hold(20) → reset(10)
const P_PLACE = 20;
const P_LINES = 20;
const P_HI    = 30;
const P_HOLD  = 20;
const CYCLE   = P_PLACE + P_LINES + P_HI + P_HOLD + 10;

// Pre-positioned document vectors (x 0..1, y 0..1)
const DOCS = [
  // Cluster A — code docs (violet)
  { x: 0.12, y: 0.18, label: "setup.md",    group: 0 },
  { x: 0.20, y: 0.28, label: "install.md",  group: 0 },
  { x: 0.09, y: 0.38, label: "config.md",   group: 0 },
  { x: 0.25, y: 0.12, label: "deploy.md",   group: 0 },
  { x: 0.18, y: 0.45, label: "cli.md",      group: 0 },
  // Cluster B — API docs (cyan)
  { x: 0.72, y: 0.22, label: "api/auth",    group: 1 },
  { x: 0.82, y: 0.30, label: "api/users",   group: 1 },
  { x: 0.68, y: 0.38, label: "api/orders",  group: 1 },
  { x: 0.80, y: 0.12, label: "endpoints",   group: 1 },
  { x: 0.90, y: 0.42, label: "api/search",  group: 1 },
  // Cluster C — guides (emerald)
  { x: 0.30, y: 0.75, label: "tutorial",    group: 2 },
  { x: 0.48, y: 0.82, label: "quickstart",  group: 2 },
  { x: 0.22, y: 0.88, label: "faq.md",      group: 2 },
  { x: 0.55, y: 0.70, label: "howto.md",    group: 2 },
  { x: 0.40, y: 0.60, label: "examples",    group: 2 },
] as const;

// Two query positions with pre-computed nearest neighbors (doc indices)
const QUERIES = [
  { x: 0.32, y: 0.28, label: "how to configure?", nearest: [2, 0, 1] },
  { x: 0.68, y: 0.65, label: "search endpoint?",  nearest: [9, 7, 13] },
];

const GROUP_COLORS = ["#a78bfa", "#22d3ee", "#34d399"];
const SIM_SCORES   = ["0.91", "0.87", "0.82"];

type Phase = "idle" | "place" | "lines" | "highlight" | "hold";

export function VectorSearchViz() {
  const [phase, setPhase]           = useState<Phase>("idle");
  const [queryVisible, setQueryVis] = useState(false);
  const [lineProgress, setLineProg] = useState(0); // 0..1
  const [highlighted, setHighlighted] = useState<number[]>([]);
  const [queryIdx, setQueryIdx]     = useState(0);

  const tick      = useRef(0);
  const qIdxRef   = useRef(0);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      tick.current = (tick.current + 1) % CYCLE;

      const t = tick.current;
      if (t === 0) {
        qIdxRef.current = (qIdxRef.current + 1) % QUERIES.length;
        setQueryVis(false);
        setLineProg(0);
        setHighlighted([]);
        setPhase("idle");
      }

      if (t < P_PLACE) {
        setPhase("place");
        setQueryVis(t > 4);
        setQueryIdx(qIdxRef.current);
      } else if (t < P_PLACE + P_LINES) {
        setPhase("lines");
        setLineProg((t - P_PLACE) / P_LINES);
      } else if (t < P_PLACE + P_LINES + P_HI) {
        setPhase("highlight");
        const q = QUERIES[qIdxRef.current];
        setHighlighted(q.nearest);
        setLineProg(1);
      } else {
        setPhase("hold");
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  const q     = QUERIES[queryIdx];
  const W     = 320;
  const H     = 180;
  const px    = (v: number) => v * W;
  const py    = (v: number) => v * H;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs font-bold text-zinc-300">
          Vector search{" "}
          <span className="text-zinc-600 font-normal">— semantic similarity in embedding space</span>
        </span>
      </div>

      <div className="flex gap-4 items-start">
        {/* SVG space */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shrink-0">
          <svg width={W} height={H} style={{ display: "block" }}>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map(v => (
              <g key={v}>
                <line x1={px(v)} y1={0} x2={px(v)} y2={H} stroke="#27272a" strokeWidth={0.5} />
                <line x1={0} y1={py(v)} x2={W} y2={py(v)} stroke="#27272a" strokeWidth={0.5} />
              </g>
            ))}

            {/* Retrieval lines */}
            {(phase === "lines" || phase === "highlight" || phase === "hold") &&
              q.nearest.map((di, ri) => {
                const doc = DOCS[di];
                const pct = Math.min(1, lineProgress * 3 - ri * 0.3);
                if (pct <= 0) return null;
                const ex  = px(q.x) + (px(doc.x) - px(q.x)) * pct;
                const ey  = py(q.y) + (py(doc.y) - py(q.y)) * pct;
                return (
                  <line
                    key={di}
                    x1={px(q.x)} y1={py(q.y)}
                    x2={ex} y2={ey}
                    stroke="#fbbf24" strokeWidth={1}
                    strokeDasharray="3 2" opacity={0.5}
                  />
                );
              })}

            {/* Document dots */}
            {DOCS.map((doc, i) => {
              const isHit   = highlighted.includes(i);
              const hitRank = highlighted.indexOf(i);
              const color   = GROUP_COLORS[doc.group];
              return (
                <g key={i}>
                  {isHit && (
                    <circle
                      cx={px(doc.x)} cy={py(doc.y)} r={10}
                      fill="none" stroke="#fbbf24" strokeWidth={1} opacity={0.35}
                    />
                  )}
                  <circle
                    cx={px(doc.x)} cy={py(doc.y)} r={isHit ? 5 : 4}
                    fill={color}
                    opacity={isHit ? 1 : 0.45}
                    style={{ filter: isHit ? `drop-shadow(0 0 4px ${color})` : undefined }}
                  />
                  {isHit && (
                    <text
                      x={px(doc.x) + 7} y={py(doc.y) + 3.5}
                      fontSize={7.5} fill="#fbbf24" fontFamily="ui-monospace,monospace"
                    >
                      {SIM_SCORES[hitRank]}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Query vector */}
            {queryVisible && (
              <g>
                <circle cx={px(q.x)} cy={py(q.y)} r={7} fill="#fbbf24" opacity={0.15} />
                <circle
                  cx={px(q.x)} cy={py(q.y)} r={5}
                  fill="#fbbf24"
                  style={{ filter: "drop-shadow(0 0 5px #fbbf24)" }}
                />
                <text
                  x={px(q.x) + 8} y={py(q.y) - 4}
                  fontSize={7.5} fill="#fbbf24" fontFamily="ui-monospace,monospace"
                >
                  query
                </text>
              </g>
            )}

            {/* Axis labels */}
            <text x={4} y={H - 4} fontSize={7} fill="#3f3f46" fontFamily="ui-monospace,monospace">semantic space</text>
          </svg>
        </div>

        {/* Legend + results */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex flex-col gap-1.5">
            {[
              { color: GROUP_COLORS[0], label: "Setup & config docs" },
              { color: GROUP_COLORS[1], label: "API reference" },
              { color: GROUP_COLORS[2], label: "Guides & tutorials" },
              { color: "#fbbf24",       label: "Query vector" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="font-mono text-[10px] text-zinc-500">{label}</span>
              </div>
            ))}
          </div>

          {highlighted.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-2">
              <div className="font-mono text-[9px] text-amber-400/70 mb-1.5 uppercase tracking-wide">
                Top {highlighted.length} retrieved
              </div>
              {highlighted.map((di, ri) => (
                <div key={di} className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[9px] text-zinc-300 truncate">{DOCS[di].label}</span>
                  <span className="font-mono text-[9px] text-amber-300 shrink-0">{SIM_SCORES[ri]}</span>
                </div>
              ))}
            </div>
          )}

          {queryVisible && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
              <div className="font-mono text-[9px] text-zinc-600 mb-0.5">query</div>
              <div className="font-mono text-[10px] text-zinc-300">"{q.label}"</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 h-9 flex items-center">
        <span className="font-mono text-xs text-zinc-400">
          {phase === "idle"      && "embedding query into the same vector space as documents…"}
          {phase === "place"     && "query vector placed in semantic space"}
          {phase === "lines"     && "computing cosine similarity to all document vectors…"}
          {phase === "highlight" && `top 3 nearest neighbors retrieved by semantic similarity`}
          {phase === "hold"      && "retrieved chunks injected into LLM prompt as context"}
        </span>
      </div>
    </div>
  );
}
