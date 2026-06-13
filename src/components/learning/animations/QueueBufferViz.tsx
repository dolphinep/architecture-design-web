"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

const TICK_MS = 50;
const CYCLE = 240; // 12s
const BURST_START = 90; // 4.5s of steady state first
const BURST_END = 150; // 3s burst

const PROD_GAP_NORMAL = 16; // 1 / 800ms
const PROD_GAP_BURST = 3; // 1 / 150ms
const CONS_GAP = 14; // constant 1 / 700ms
const MAX_VISIBLE = 10;

export function QueueBufferViz() {
  const [depth, setDepth] = useState(0);
  const [burst, setBurst] = useState(false);
  const [prodFlash, setProdFlash] = useState(false);
  const [consFlash, setConsFlash] = useState(false);
  const [done, setDone] = useState(0);

  const tick = useRef(0);
  const depthRef = useRef(0);
  const prodCd = useRef(PROD_GAP_NORMAL);
  const consCd = useRef(CONS_GAP);
  const prodFlashRef = useRef(0);
  const consFlashRef = useRef(0);
  const doneRef = useRef(0);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      tick.current = (tick.current + 1) % CYCLE;
      if (tick.current === 0) {
        depthRef.current = 0;
        prodCd.current = PROD_GAP_NORMAL;
        consCd.current = CONS_GAP;
      }
      const inBurst =
        tick.current >= BURST_START && tick.current < BURST_END;

      // producer — never blocked, enqueue is ~1ms
      prodCd.current -= 1;
      if (prodCd.current <= 0) {
        depthRef.current += 1;
        prodFlashRef.current = 4;
        prodCd.current = inBurst ? PROD_GAP_BURST : PROD_GAP_NORMAL;
      }

      // consumer — constant pace no matter what
      consCd.current -= 1;
      if (consCd.current <= 0) {
        if (depthRef.current > 0) {
          depthRef.current -= 1;
          doneRef.current += 1;
          consFlashRef.current = 4;
        }
        consCd.current = CONS_GAP;
      }

      prodFlashRef.current = Math.max(0, prodFlashRef.current - 1);
      consFlashRef.current = Math.max(0, consFlashRef.current - 1);

      setDepth(depthRef.current);
      setBurst(inBurst);
      setProdFlash(prodFlashRef.current > 0);
      setConsFlash(consFlashRef.current > 0);
      setDone(doneRef.current);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  const draining = !burst && depth >= 3;
  const caption = burst
    ? "spike! queue absorbs the burst — consumer unaffected"
    : draining
      ? "draining backlog…"
      : "steady state — queue near empty";
  const capColor = burst
    ? "text-amber-400"
    : draining
      ? "text-emerald-400"
      : "text-zinc-400";

  const queueTint =
    burst || depth >= 7
      ? "border-amber-500/60 bg-amber-950/20"
      : draining
        ? "border-emerald-500/50 bg-emerald-950/20"
        : "border-zinc-800 bg-zinc-900/40";
  const depthColor =
    burst || depth >= 7
      ? "text-amber-400"
      : draining
        ? "text-emerald-400"
        : "text-zinc-500";

  const visible = Math.min(depth, MAX_VISIBLE);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs font-bold text-zinc-300">
          Queue as a buffer{" "}
          <span className="text-zinc-600 font-normal">
            — producer speed ≠ consumer speed
          </span>
        </span>
        <span className="font-mono text-[10px] text-zinc-500">
          processed: {done}
        </span>
      </div>

      {/* Stage */}
      <div className="flex items-center gap-3 h-36">
        {/* Producer */}
        <div
          className={`w-28 shrink-0 rounded-xl border p-2.5 transition-colors duration-150 ${
            prodFlash
              ? "border-violet-400 bg-violet-950/50"
              : "border-violet-500/50 bg-violet-950/20"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-violet-400">
              Producer
            </span>
          </div>
          <div className="mt-1 font-mono text-[9px] text-zinc-500 h-3.5">
            {burst ? (
              <span className="text-amber-400 font-bold">🔥 traffic spike</span>
            ) : (
              "1 msg / 800ms"
            )}
          </div>
          {burst && (
            <div className="font-mono text-[9px] text-amber-400/80">
              1 msg / 150ms
            </div>
          )}
          <div className="mt-1.5 font-mono text-[9px] text-emerald-400">
            enqueue: ~1ms ✓
          </div>
          <div className="text-[8px] text-zinc-600">never waits</div>
        </div>

        <span className="text-zinc-600 text-xs shrink-0">→</span>

        {/* Queue track */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] text-zinc-500">queue</span>
            <span className={`font-mono text-[10px] ${depthColor}`}>
              depth: {depth}
            </span>
          </div>
          <div
            className={`h-10 rounded-lg border px-2 flex items-center gap-1.5 overflow-hidden transition-colors duration-300 ${queueTint}`}
          >
            {visible === 0 && (
              <span className="font-mono text-[9px] text-zinc-700 italic">
                empty
              </span>
            )}
            {Array.from({ length: visible }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full shrink-0 transition-colors duration-300 ${
                  burst || depth >= 7 ? "bg-amber-400" : "bg-violet-400"
                }`}
                style={{ boxShadow: "0 0 5px currentColor" }}
              />
            ))}
            {depth > MAX_VISIBLE && (
              <span className="font-mono text-[9px] text-amber-400 shrink-0">
                +{depth - MAX_VISIBLE}
              </span>
            )}
          </div>
          {/* depth bar */}
          <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                burst || depth >= 7
                  ? "bg-amber-400"
                  : draining
                    ? "bg-emerald-400"
                    : "bg-violet-400"
              }`}
              style={{ width: `${Math.min(100, (depth / 18) * 100)}%` }}
            />
          </div>
        </div>

        <span className="text-zinc-600 text-xs shrink-0">→</span>

        {/* Consumer */}
        <div
          className={`w-28 shrink-0 rounded-xl border p-2.5 transition-colors duration-150 ${
            consFlash
              ? "border-emerald-400 bg-emerald-950/50"
              : "border-emerald-500/50 bg-emerald-950/20"
          }`}
        >
          <span className="font-mono text-xs font-bold text-emerald-400">
            Consumer
          </span>
          <div className="mt-1 font-mono text-[9px] text-zinc-500">
            1 msg / 700ms
          </div>
          <div className="mt-1.5 font-mono text-[9px] text-cyan-400">
            constant pace
          </div>
          <div className="text-[8px] text-zinc-600">unaffected by spikes</div>
        </div>
      </div>

      {/* caption */}
      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 h-9 flex items-center">
        <span key={caption} className={`font-mono text-xs ${capColor}`}>
          {caption}
        </span>
      </div>
    </div>
  );
}
