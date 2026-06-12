"use client";
import { useState, useEffect } from "react";
import { useAnimPausedRef } from "./pause-context";

const WT_CYCLE = 3200;
const WB_CYCLE = 4800;
const TICK = 50;

// y positions (px) for the packet dot inside the diagram column
const APP_Y = 14;
const CACHE_Y = 78;
const DB_Y = 142;

function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, p));
}

interface Box {
  label: string;
  active: boolean;
  accent: string; // border/text color when active
}

function NodeBox({ label, active, accent }: Box) {
  return (
    <div
      className={`w-24 h-7 rounded-lg border flex items-center justify-center font-mono text-xs transition-all duration-200 ${
        active
          ? `${accent} bg-zinc-900`
          : "border-zinc-800 bg-zinc-900/50 text-zinc-500"
      }`}
    >
      {label}
    </div>
  );
}

export function WriteStrategyViz() {
  const [wtT, setWtT] = useState(0);
  const [wb, setWb] = useState({ t: 0, cycle: 0 });
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setWtT((t) => (t + TICK) % WT_CYCLE);
      setWb(({ t, cycle }) => {
        const nt = t + TICK;
        return nt >= WB_CYCLE ? { t: 0, cycle: cycle + 1 } : { t: nt, cycle };
      });
    }, TICK);
    return () => clearInterval(id);
  }, [pausedRef]);

  // ── Write-through timeline ───────────────────────────────
  // 0–700: App→Cache | 800–1500: Cache→DB | 1500–2800: ✓ consistent
  const wtDot1 = wtT < 700;
  const wtDot2 = wtT >= 800 && wtT < 1500;
  const wtDone = wtT >= 1500 && wtT < 2800;
  const wtDotY = wtDot1
    ? lerp(APP_Y, CACHE_Y, wtT / 700)
    : lerp(CACHE_Y, DB_Y, (wtT - 800) / 700);
  const wtCacheHot = (wtT >= 600 && wtT < 1000) || wtDone;
  const wtDbHot = wtT >= 1400 && wtT < 2800;

  // ── Write-back timeline ──────────────────────────────────
  // 0–700: App→Cache | 700–2700: dirty + "✓ fast"
  // normal: 2700–3400 flush Cache→DB, 3400+: synced
  // crash (every 3rd cycle): 2700–4000 red "data lost"
  const crashCycle = wb.cycle % 3 === 2;
  const wbDot1 = wb.t < 700;
  const wbDirty = wb.t >= 700 && wb.t < (crashCycle ? 2700 : 3400);
  const wbFlushing = !crashCycle && wb.t >= 2700 && wb.t < 3400;
  const wbSynced = !crashCycle && wb.t >= 3400;
  const wbCrashed = crashCycle && wb.t >= 2700 && wb.t < 4000;
  const wbDotY = wbDot1
    ? lerp(APP_Y, CACHE_Y, wb.t / 700)
    : lerp(CACHE_Y, DB_Y, (wb.t - 2700) / 700);
  const wbFast = wb.t >= 700 && wb.t < 2700;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="grid grid-cols-2 gap-4">
        {/* ── Write-through ── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold text-cyan-400">Write-through</span>
            <span className="font-mono text-[10px] text-zinc-500">~10ms write</span>
          </div>

          <div className="relative h-[178px] flex flex-col items-center">
            <div className="absolute left-1/2 top-5 bottom-5 w-px bg-zinc-800" />
            <div className="absolute top-1 left-1/2 -translate-x-1/2">
              <NodeBox label="App" active={wtT < 300} accent="border-cyan-500 text-cyan-400" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 65 }}>
              <NodeBox label="Cache" active={wtCacheHot} accent="border-cyan-500 text-cyan-400" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 129 }}>
              <NodeBox label="DB" active={wtDbHot} accent="border-emerald-500 text-emerald-400" />
            </div>

            {(wtDot1 || wtDot2) && (
              <div
                className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-cyan-400"
                style={{ top: wtDotY, boxShadow: "0 0 8px #22d3ee" }}
              />
            )}
          </div>

          <div className="h-6 flex items-center justify-center">
            {wtDone ? (
              <span className="font-mono text-xs text-emerald-400">✓ consistent — cache &amp; DB match</span>
            ) : (
              <span className="font-mono text-xs text-zinc-500">
                {wtDot1 ? "write → cache…" : "…and straight to DB"}
              </span>
            )}
          </div>
        </div>

        {/* ── Write-back ── */}
        <div className={`rounded-xl border p-3 transition-colors duration-300 ${
          wbCrashed ? "border-red-500 bg-red-950/30" : "border-zinc-800 bg-zinc-900/30"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold text-amber-400">Write-back</span>
            <span className="font-mono text-[10px] text-zinc-500">~0.2ms write</span>
          </div>

          <div className="relative h-[178px] flex flex-col items-center">
            <div className="absolute left-1/2 top-5 bottom-5 w-px bg-zinc-800" />
            <div className="absolute top-1 left-1/2 -translate-x-1/2">
              <NodeBox label="App" active={wb.t < 300} accent="border-amber-500 text-amber-400" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 65 }}>
              <div className="relative">
                <NodeBox
                  label="Cache"
                  active={wbDirty || wbFlushing}
                  accent={wbDirty ? "border-amber-500 text-amber-400" : "border-cyan-500 text-cyan-400"}
                />
                {wbDirty && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 129 }}>
              <NodeBox label="DB" active={wbSynced} accent="border-emerald-500 text-emerald-400" />
            </div>

            {(wbDot1 || wbFlushing) && (
              <div
                className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-400"
                style={{ top: wbDotY, boxShadow: "0 0 8px #fbbf24" }}
              />
            )}
            {wbDirty && (
              <span className="absolute font-mono text-[10px] text-amber-400" style={{ top: 70, left: "78%" }}>
                dirty
              </span>
            )}
          </div>

          <div className="h-6 flex items-center justify-center">
            {wbCrashed ? (
              <span className="font-mono text-xs text-red-400">⚡ crash before flush = data lost</span>
            ) : wbFast ? (
              <span className="font-mono text-xs text-emerald-400">✓ fast — ack&apos;d at ~0.2ms, DB later</span>
            ) : wbFlushing ? (
              <span className="font-mono text-xs text-amber-400">batch flush → DB…</span>
            ) : wbSynced ? (
              <span className="font-mono text-xs text-zinc-400">DB synced, dirty bit cleared</span>
            ) : (
              <span className="font-mono text-xs text-zinc-500">write → cache only…</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
