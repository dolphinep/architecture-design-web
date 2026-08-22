"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

type Phase = "healthy" | "slow" | "down";

interface Dot {
  id: number;
  dir: "out" | "ok" | "fail";
  p: number; // 0..1 progress along the wire (0 = checkout, 1 = email)
}

const TICK_MS = 100;
const PHASE_TICKS = 40; // 4s per phase
const CYCLE = PHASE_TICKS * 3;
const SPAWN_GAP = 8;
const MAX_WAITING = 6;

const phaseOf = (t: number): Phase =>
  t < PHASE_TICKS ? "healthy" : t < PHASE_TICKS * 2 ? "slow" : "down";

const CAPTIONS: Record<Phase, { text: string; color: string }> = {
  healthy: {
    text: "healthy — checkout calls email synchronously and waits for the reply",
    color: "text-emerald-400",
  },
  slow: { text: "email is slow → checkout is slow", color: "text-amber-400" },
  down: { text: "email is down → checkout is down", color: "text-red-400" },
};

export function SyncCouplingViz() {
  const [phase, setPhase] = useState<Phase>("healthy");
  const [dots, setDots] = useState<Dot[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [okFlash, setOkFlash] = useState(0);
  const [errFlash, setErrFlash] = useState(0);

  const tick = useRef(0);
  const dotsRef = useRef<Dot[]>([]);
  const waitingRef = useRef(0);
  const okFlashRef = useRef(0);
  const errFlashRef = useRef(0);
  const nextId = useRef(0);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      tick.current = (tick.current + 1) % CYCLE;
      const ph = phaseOf(tick.current);

      // reset on loop back to healthy
      if (tick.current === 0) {
        dotsRef.current = [];
        waitingRef.current = 0;
      }

      const outSpeed = ph === "slow" ? 0.035 : 0.18;
      const backSpeed = ph === "slow" ? 0.06 : 0.2;

      const next: Dot[] = [];
      for (const d of dotsRef.current) {
        if (d.dir === "out") {
          const p = d.p + outSpeed;
          if (ph === "down" && p >= 0.88) {
            // bounced off the dead service
            next.push({ ...d, dir: "fail", p: 0.88 });
          } else if (p >= 1) {
            next.push({ ...d, dir: "ok", p: 1 });
          } else {
            next.push({ ...d, p });
          }
        } else {
          const p = d.p - backSpeed;
          if (p <= 0) {
            // reply arrived back at checkout
            if (d.dir === "ok") okFlashRef.current = 4;
            else errFlashRef.current = 4;
          } else {
            next.push({ ...d, p });
          }
        }
      }

      // spawn new requests
      if (tick.current % SPAWN_GAP === 0) {
        if (ph === "slow") {
          // requests pile up — only one crawls the wire at a time
          if (next.some((d) => d.dir === "out")) {
            waitingRef.current = Math.min(MAX_WAITING, waitingRef.current + 1);
          } else {
            next.push({ id: nextId.current++, dir: "out", p: 0 });
          }
        } else {
          waitingRef.current = 0;
          next.push({ id: nextId.current++, dir: "out", p: 0 });
        }
      }
      // dispatch a waiting request when the wire frees up
      if (
        ph === "slow" &&
        waitingRef.current > 0 &&
        !next.some((d) => d.dir === "out")
      ) {
        waitingRef.current -= 1;
        next.push({ id: nextId.current++, dir: "out", p: 0 });
      }

      okFlashRef.current = Math.max(0, okFlashRef.current - 1);
      errFlashRef.current = Math.max(0, errFlashRef.current - 1);

      dotsRef.current = next;
      setDots(next);
      setWaiting(waitingRef.current);
      setOkFlash(okFlashRef.current);
      setErrFlash(errFlashRef.current);
      setPhase(ph);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  const latency =
    phase === "healthy" ? "~20ms" : phase === "slow" ? "~3s" : "timeout";
  const latColor =
    phase === "healthy"
      ? "text-emerald-400"
      : phase === "slow"
        ? "text-amber-400"
        : "text-red-400";

  const checkoutStyle =
    phase === "down" || errFlash > 0
      ? "border-red-500 bg-red-950/40"
      : phase === "slow"
        ? "border-amber-500 bg-amber-950/30"
        : "border-violet-500/60 bg-violet-950/30";

  const emailStyle =
    phase === "down"
      ? "border-red-500 bg-red-950/40 animate-pulse"
      : phase === "slow"
        ? "border-amber-500 bg-amber-950/30"
        : "border-cyan-500/60 bg-cyan-950/30";

  const cap = CAPTIONS[phase];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs font-bold text-zinc-300">
          Synchronous call{" "}
          <span className="text-zinc-600 font-normal">
            — checkout waits on email
          </span>
        </span>
        <span className="font-mono text-[10px] text-zinc-500">
          latency <span className={latColor}>{latency}</span>
        </span>
      </div>

      {/* Stage */}
      <div className="relative h-44">
        {/* wire */}
        <div className="absolute left-[24%] right-[24%] top-1/2 h-px bg-zinc-800" />

        {/* Checkout */}
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-[21%] rounded-xl border p-2.5 transition-colors duration-300 ${checkoutStyle}`}
        >
          <div className="font-mono text-xs font-bold text-violet-400">
            Checkout
          </div>
          <div className="text-[9px] text-zinc-500 mt-0.5">
            POST /order → email
          </div>
          <div className="mt-1.5 h-4 font-mono text-[10px]">
            {errFlash > 0 || phase === "down" ? (
              <span className="text-red-400 font-bold">✕ 500</span>
            ) : okFlash > 0 ? (
              <span className="text-emerald-400 font-bold">200 OK</span>
            ) : (
              <span className="text-zinc-600">waiting…</span>
            )}
          </div>
        </div>

        {/* waiting pile during slow phase */}
        {waiting > 0 && (
          <div className="absolute left-[23%] top-[62%] flex items-center gap-1">
            {Array.from({ length: waiting }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-amber-400/80" />
            ))}
            <span className="ml-1 font-mono text-[9px] text-amber-400">
              {waiting} stuck
            </span>
          </div>
        )}

        {/* Email service */}
        <div
          className={`absolute right-0 top-1/2 -translate-y-1/2 w-[21%] rounded-xl border p-2.5 transition-colors duration-300 ${emailStyle}`}
        >
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-cyan-400">
              Email
            </span>
            {phase === "slow" && (
              <span className="rounded border border-amber-500/60 bg-amber-950/60 px-1 text-[9px] text-amber-400">
                slow
              </span>
            )}
            {phase === "down" && (
              <span className="rounded border border-red-500/60 bg-red-950/60 px-1 text-[9px] text-red-400">
                ✕ down
              </span>
            )}
          </div>
          <div className="text-[9px] text-zinc-500 mt-0.5">SMTP relay</div>
          <div className="mt-1.5 h-4 font-mono text-[10px] text-zinc-600">
            {phase === "healthy"
              ? "200 in 20ms"
              : phase === "slow"
                ? "…3000ms"
                : "no response"}
          </div>
        </div>

        {/* dots on the wire */}
        {dots.map((d) => {
          const left = 24 + d.p * 52;
          if (d.dir === "ok") {
            return (
              <span
                key={d.id}
                className="absolute -translate-y-1/2 flex items-center justify-center w-4 h-4 rounded-full border border-emerald-500/60 bg-emerald-950/80 text-emerald-400 text-[9px] transition-all duration-100 ease-linear"
                style={{ left: `${left}%`, top: "42%" }}
              >
                ✓
              </span>
            );
          }
          if (d.dir === "fail") {
            return (
              <span
                key={d.id}
                className="absolute -translate-y-1/2 flex items-center justify-center w-4 h-4 rounded-full border border-red-500/60 bg-red-950/80 text-red-400 text-[9px] transition-all duration-100 ease-linear"
                style={{ left: `${left}%`, top: "42%" }}
              >
                ✕
              </span>
            );
          }
          return (
            <div
              key={d.id}
              className="absolute w-2 h-2 rounded-full -translate-y-1/2 transition-all duration-100 ease-linear"
              style={{
                left: `${left}%`,
                top: "54%",
                background: "#a78bfa",
                boxShadow: "0 0 6px #a78bfa",
              }}
            />
          );
        })}
      </div>

      {/* phase caption */}
      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 h-9 flex items-center">
        <span key={phase} className={`font-mono text-xs ${cap.color}`}>
          {cap.text}
        </span>
      </div>
    </div>
  );
}
