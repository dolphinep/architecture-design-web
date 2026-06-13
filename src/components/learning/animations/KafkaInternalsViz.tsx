"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

const TICK_MS = 80;
// Three phases: sequential-io (60t) → zero-copy (60t) → replication (80t)
const P_SEQ  = 60;
const P_ZERO = 60;
const P_REPL = 80;
const CYCLE  = P_SEQ + P_ZERO + P_REPL;

type Phase = "seq-io" | "zero-copy" | "replication";

interface RepDot { id: number; progress: number; target: 0 | 1; }

export function KafkaInternalsViz() {
  const [phase, setPhase]         = useState<Phase>("seq-io");
  const [writeHead, setWriteHead] = useState(0);   // 0..1
  const [zcStep, setZcStep]       = useState(0);   // 0=disk 1=pagecache 2=nic
  const [zcProg, setZcProg]       = useState(0);   // 0..1 within current step
  const [repDots, setRepDots]     = useState<RepDot[]>([]);
  const [leaderFlash, setLeaderFlash] = useState(false);
  const [isr, setIsr]             = useState<boolean[]>([true, true]);

  const tick        = useRef(0);
  const writeRef    = useRef(0);
  const zcStepRef   = useRef(0);
  const zcProgRef   = useRef(0);
  const repDotsRef  = useRef<RepDot[]>([]);
  const repNextId   = useRef(0);
  const repSpawnCd  = useRef(18);
  const leaderRef   = useRef(false);
  const isrRef      = useRef<boolean[]>([true, true]);
  const pausedRef   = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      tick.current = (tick.current + 1) % CYCLE;

      if (tick.current === 0) {
        writeRef.current   = 0;
        zcStepRef.current  = 0;
        zcProgRef.current  = 0;
        repDotsRef.current = [];
        repSpawnCd.current = 18;
        isrRef.current     = [true, true];
      }

      const t = tick.current;
      const ph: Phase =
        t < P_SEQ           ? "seq-io"
        : t < P_SEQ + P_ZERO ? "zero-copy"
        : "replication";

      if (ph === "seq-io") {
        writeRef.current = (writeRef.current + 0.018) % 1;
      }

      if (ph === "zero-copy") {
        zcProgRef.current += 0.045;
        if (zcProgRef.current >= 1) {
          zcProgRef.current = 0;
          zcStepRef.current = (zcStepRef.current + 1) % 3;
        }
      }

      if (ph === "replication") {
        // spawn replication dots to both replicas
        repSpawnCd.current -= 1;
        if (repSpawnCd.current <= 0) {
          repDotsRef.current = [
            ...repDotsRef.current,
            { id: repNextId.current++, progress: 0, target: 0 },
            { id: repNextId.current++, progress: 0, target: 1 },
          ];
          repSpawnCd.current = 18;
          leaderRef.current = true;
        } else {
          leaderRef.current = false;
        }

        const next: RepDot[] = [];
        for (const d of repDotsRef.current) {
          const p = d.progress + 0.055;
          if (p >= 1) {
            isrRef.current = isrRef.current.map((v, i) => i === d.target ? true : v) as boolean[];
          } else {
            next.push({ ...d, progress: p });
          }
        }
        repDotsRef.current = next;
      }

      setPhase(ph);
      setWriteHead(writeRef.current);
      setZcStep(zcStepRef.current);
      setZcProg(zcProgRef.current);
      setRepDots([...repDotsRef.current]);
      setLeaderFlash(leaderRef.current);
      setIsr([...isrRef.current]);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  const CAPTIONS: Record<Phase, { text: string; color: string }> = {
    "seq-io":      { text: "sequential disk writes are 10–100× faster than random — Kafka never updates in-place", color: "text-amber-400" },
    "zero-copy":   { text: "zero-copy sendfile: data goes disk → page cache → NIC without a userspace copy", color: "text-cyan-400" },
    "replication": { text: "leader appends locally, then replicates to ISR followers — survives broker failure", color: "text-emerald-400" },
  };
  const cap = CAPTIONS[phase];

  const ZC_LABELS = ["Disk", "Page Cache", "NIC / Socket"];
  const ZC_COLORS = ["text-amber-400", "text-cyan-400", "text-violet-400"];
  const ZC_BORDERS = ["border-amber-500/40", "border-cyan-500/40", "border-violet-500/40"];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs font-bold text-zinc-300">
          Why Kafka is fast <span className="text-zinc-600 font-normal">— I/O design, not magic</span>
        </span>
        <div className="flex gap-2">
          {(["seq-io", "zero-copy", "replication"] as Phase[]).map(ph => (
            <div
              key={ph}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                phase === ph ? "bg-violet-400" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Phase: Sequential I/O */}
      {phase === "seq-io" && (
        <div className="mb-4">
          <div className="font-mono text-[10px] text-zinc-500 mb-2">Sequential disk write</div>
          {/* disk track */}
          <div className="relative h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/60 overflow-hidden">
            {/* written region */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-amber-500/20 transition-all duration-75 ease-linear"
              style={{ width: `${writeHead * 100}%` }}
            />
            {/* write head */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1 h-5 rounded bg-amber-400 transition-all duration-75 ease-linear"
              style={{ left: `calc(${writeHead * 100}% - 2px)`, boxShadow: "0 0 8px #fbbf24" }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-zinc-600">
              sequential write head →
            </div>
          </div>
          <div className="flex justify-between mt-1 font-mono text-[8px] text-zinc-700">
            <span>sector 0</span><span>sequential append only →</span><span>EOF</span>
          </div>
          <div className="mt-2 flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/40" />
              <span className="font-mono text-[9px] text-amber-400">sequential ~500 MB/s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
              <span className="font-mono text-[9px] text-red-400/70">random ~0.1 MB/s</span>
            </div>
          </div>
        </div>
      )}

      {/* Phase: Zero-copy */}
      {phase === "zero-copy" && (
        <div className="mb-4">
          <div className="font-mono text-[10px] text-zinc-500 mb-2">Zero-copy sendfile path</div>
          <div className="flex items-center gap-2">
            {ZC_LABELS.map((label, i) => {
              const active = zcStep === i;
              const done   = zcStep > i;
              return (
                <div key={i} className="flex items-center gap-1">
                  <div className={`rounded-lg border px-2 py-2 text-center transition-colors duration-200 w-20 ${
                    active ? ZC_BORDERS[i] + " bg-zinc-800/80" : done ? "border-zinc-700 bg-zinc-800/40" : "border-zinc-800/40 bg-transparent"
                  }`}>
                    <div className={`font-mono text-[9px] font-bold ${active ? ZC_COLORS[i] : done ? "text-zinc-400" : "text-zinc-700"}`}>
                      {label}
                    </div>
                    {active && (
                      <div className="mt-1 h-1 rounded-full bg-zinc-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-75 ${
                            i === 0 ? "bg-amber-400" : i === 1 ? "bg-cyan-400" : "bg-violet-400"
                          }`}
                          style={{ width: `${zcProg * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {i < ZC_LABELS.length - 1 && (
                    <span className={`font-mono text-xs ${done || active ? "text-zinc-400" : "text-zinc-700"}`}>→</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 font-mono text-[9px] text-zinc-600">
            traditional: disk → kernel buf → userspace buf → kernel buf → NIC (4 copies)
          </div>
          <div className="font-mono text-[9px] text-cyan-400/70">
            sendfile: disk → page cache → NIC (0 userspace copies, ~2 kernel copies)
          </div>
        </div>
      )}

      {/* Phase: Replication */}
      {phase === "replication" && (
        <div className="mb-4">
          <div className="font-mono text-[10px] text-zinc-500 mb-2">Replication factor 3 (leader + 2 ISR)</div>
          <div className="flex gap-3 items-center">
            {/* leader */}
            <div className={`rounded-lg border px-3 py-2 transition-colors duration-150 ${
              leaderFlash ? "border-violet-400/80 bg-violet-950/40" : "border-violet-500/40 bg-violet-950/20"
            }`}>
              <div className="font-mono text-[9px] font-bold text-violet-400">Leader</div>
              <div className="font-mono text-[8px] text-zinc-500">writes here</div>
            </div>

            {/* arrows + dots */}
            <div className="flex-1 relative h-14">
              <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
                <line x1="0" y1="18" x2="100%" y2="18" stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                <line x1="0" y1="46" x2="100%" y2="46" stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
              </svg>
              {repDots.map(d => (
                <div
                  key={d.id}
                  className="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ease-linear"
                  style={{
                    left: `${d.progress * 100}%`,
                    top: d.target === 0 ? 18 : 46,
                    background: "#34d399",
                    boxShadow: "0 0 5px #34d399",
                  }}
                />
              ))}
            </div>

            {/* replicas */}
            <div className="flex flex-col gap-1.5">
              {isr.map((synced, i) => (
                <div
                  key={i}
                  className={`rounded border px-2 py-1 transition-colors duration-150 ${
                    synced ? "border-emerald-500/40 bg-emerald-950/20" : "border-zinc-700 bg-zinc-800/20"
                  }`}
                >
                  <span className={`font-mono text-[8px] font-bold ${synced ? "text-emerald-400" : "text-zinc-500"}`}>
                    Replica {i + 1} {synced ? "✓ ISR" : "lagging"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 font-mono text-[9px] text-zinc-600">
            ISR = in-sync replica — only ISR members can become leader on failover
          </div>
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 h-9 flex items-center">
        <span key={phase} className={`font-mono text-xs ${cap.color}`}>{cap.text}</span>
      </div>
    </div>
  );
}
