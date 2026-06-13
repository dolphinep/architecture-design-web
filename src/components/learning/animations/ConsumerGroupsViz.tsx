"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

const TICK_MS = 70;
const SPAWN_GAP = 16;
const CYCLE = 200;

interface Dot {
  id: number;
  partition: number; // 0 1 2
  groupA: boolean;   // goes to group A consumer?
  groupB: boolean;   // goes to group B consumer?
  progress: number;  // 0..1
  lane: "A" | "B";   // which group wire
}

const PART_COLORS = ["#a78bfa", "#22d3ee", "#34d399"];

export function ConsumerGroupsViz() {
  const [dots, setDots]         = useState<Dot[]>([]);
  const [countA, setCountA]     = useState(0);
  const [countB, setCountB]     = useState(0);
  const [flashA, setFlashA]     = useState(-1);
  const [flashB, setFlashB]     = useState(-1);

  const tick     = useRef(0);
  const nextId   = useRef(0);
  const nextPart = useRef(0);
  const dotsRef  = useRef<Dot[]>([]);
  const cntA     = useRef(0);
  const cntB     = useRef(0);
  const flA      = useRef(-1);
  const flB      = useRef(-1);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      tick.current = (tick.current + 1) % CYCLE;

      if (tick.current === 0) {
        dotsRef.current = [];
        cntA.current = cntB.current = 0;
        nextPart.current = 0;
      }

      if (tick.current % SPAWN_GAP === 0) {
        const part = nextPart.current % 3;
        // A gets two dots (split across 2 consumers); B gets one dot (single consumer)
        // Represent as two separate dot objects travelling different y-paths
        dotsRef.current = [
          ...dotsRef.current,
          { id: nextId.current++, partition: part, groupA: true,  groupB: false, progress: 0, lane: "A" },
          { id: nextId.current++, partition: part, groupA: false, groupB: true,  progress: 0, lane: "B" },
        ];
        nextPart.current++;
      }

      let newFlA = -1;
      let newFlB = -1;
      const next: Dot[] = [];
      for (const d of dotsRef.current) {
        const p = d.progress + 0.07;
        if (p >= 1) {
          if (d.lane === "A") { cntA.current++; newFlA = d.partition; }
          else                { cntB.current++; newFlB = d.partition; }
        } else {
          next.push({ ...d, progress: p });
        }
      }
      dotsRef.current = next;
      flA.current = newFlA;
      flB.current = newFlB;

      setDots([...dotsRef.current]);
      setCountA(cntA.current);
      setCountB(cntB.current);
      setFlashA(flA.current);
      setFlashB(flB.current);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  // Group A: 2 consumers — partitions split 1+2 and 0 between them
  // Group B: 1 consumer  — reads all 3 partitions

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs font-bold text-zinc-300">
          Consumer groups <span className="text-zinc-600 font-normal">— same group = queue · diff group = pub/sub</span>
        </span>
      </div>

      <div className="flex gap-2 items-center">
        {/* Partitions column */}
        <div className="shrink-0 w-20 flex flex-col gap-1.5">
          <div className="font-mono text-[9px] text-zinc-600 mb-0.5">Topic</div>
          {[0, 1, 2].map(pi => (
            <div
              key={pi}
              className="rounded border border-zinc-700 bg-zinc-800/40 px-2 py-1 flex items-center gap-1.5"
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PART_COLORS[pi] }} />
              <span className="font-mono text-[9px] text-zinc-400">P{pi}</span>
            </div>
          ))}
        </div>

        {/* Routing area — two lanes */}
        <div className="flex-1 relative" style={{ height: 110 }}>
          <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
            {/* Group A wire — upper half */}
            <line x1="0" y1="28" x2="100%" y2="28" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
            {/* Group B wire — lower half */}
            <line x1="0" y1="82" x2="100%" y2="82" stroke="#a78bfa" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
          </svg>

          {/* dots */}
          {dots.map(d => {
            const yA = 28;
            const yB = 82;
            const y = d.lane === "A" ? yA : yB;
            const color = PART_COLORS[d.partition];
            return (
              <div
                key={d.id}
                className="absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ease-linear"
                style={{
                  left: `${d.progress * 100}%`,
                  top: y,
                  background: color,
                  boxShadow: `0 0 5px ${color}`,
                }}
              />
            );
          })}

          {/* Group A label */}
          <div className="absolute left-1/2 -translate-x-1/2 font-mono text-[8px] text-amber-400/60" style={{ top: 10 }}>
            group A
          </div>
          {/* Group B label */}
          <div className="absolute left-1/2 -translate-x-1/2 font-mono text-[8px] text-violet-400/60" style={{ top: 64 }}>
            group B
          </div>
        </div>

        {/* Consumer groups */}
        <div className="shrink-0 w-32 flex flex-col gap-2">
          {/* Group A — queue: 2 consumers share partitions */}
          <div className={`rounded-lg border p-2 transition-colors duration-150 ${
            flashA >= 0 ? "border-amber-400/80 bg-amber-950/30" : "border-amber-500/30 bg-amber-950/10"
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] font-bold text-amber-400">Group A</span>
              <span className="font-mono text-[8px] text-zinc-600">{countA} msgs</span>
            </div>
            <div className="flex gap-1">
              <div className="flex-1 rounded bg-zinc-800/60 px-1 py-0.5 text-center font-mono text-[7px] text-zinc-400">
                C1 ← P0, P1
              </div>
              <div className="flex-1 rounded bg-zinc-800/60 px-1 py-0.5 text-center font-mono text-[7px] text-zinc-400">
                C2 ← P2
              </div>
            </div>
            <div className="mt-1 font-mono text-[7px] text-amber-400/60">≡ work queue</div>
          </div>

          {/* Group B — pubsub: 1 consumer gets everything */}
          <div className={`rounded-lg border p-2 transition-colors duration-150 ${
            flashB >= 0 ? "border-violet-400/80 bg-violet-950/30" : "border-violet-500/30 bg-violet-950/10"
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] font-bold text-violet-400">Group B</span>
              <span className="font-mono text-[8px] text-zinc-600">{countB} msgs</span>
            </div>
            <div className="rounded bg-zinc-800/60 px-1 py-0.5 text-center font-mono text-[7px] text-zinc-400">
              C1 ← P0 + P1 + P2
            </div>
            <div className="mt-1 font-mono text-[7px] text-violet-400/60">≡ broadcast / pub-sub</div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 h-9 flex items-center">
        <span className="font-mono text-xs text-zinc-400">
          every group independently reads ALL messages — add a group to add a subscriber
        </span>
      </div>
    </div>
  );
}
