"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

const TICK_MS = 100;

// work-queue delivery: fly 0-4, worker flash 5-10
const WQ_GAP = 12;
const WQ_FLY = 4;
const WQ_DONE = 10;

// pub/sub delivery: fly 0-4, all subs flash 5-11
const PS_GAP = 15;
const PS_FLY = 4;
const PS_DONE = 11;

interface WqDelivery {
  label: string;
  worker: number;
  t: number;
}
interface PsDelivery {
  label: string;
  t: number;
}

const SUBS = ["email", "analytics", "audit"];

// % positions inside each panel stage
const wqWorkerLeft = (i: number) => i * 33 + 12;
const psSubLeft = (i: number) => i * 33 + 12;

export function QueuePubSubViz() {
  const [wq, setWq] = useState<WqDelivery | null>(null);
  const [wqNext, setWqNext] = useState(1);
  const [ps, setPs] = useState<PsDelivery | null>(null);
  const [psNext, setPsNext] = useState(1);

  const wqRef = useRef<WqDelivery | null>(null);
  const psRef = useRef<PsDelivery | null>(null);
  const wqCount = useRef(0);
  const psCount = useRef(0);
  const wqCd = useRef(5);
  const psCd = useRef(9);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;

      // ---- work queue ----
      if (wqRef.current) {
        const t = wqRef.current.t + 1;
        wqRef.current = t > WQ_DONE ? null : { ...wqRef.current, t };
      }
      if (!wqRef.current) {
        wqCd.current -= 1;
        if (wqCd.current <= 0) {
          const n = wqCount.current++;
          wqRef.current = {
            label: `m${n + 1}`,
            worker: n % 3, // round-robin
            t: 0,
          };
          wqCd.current = WQ_GAP;
        }
      }

      // ---- pub/sub ----
      if (psRef.current) {
        const t = psRef.current.t + 1;
        psRef.current = t > PS_DONE ? null : { ...psRef.current, t };
      }
      if (!psRef.current) {
        psCd.current -= 1;
        if (psCd.current <= 0) {
          const n = psCount.current++;
          psRef.current = { label: `e${n + 1}`, t: 0 };
          psCd.current = PS_GAP;
        }
      }

      setWq(wqRef.current);
      setWqNext(wqCount.current + 1);
      setPs(psRef.current);
      setPsNext(psCount.current + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  const wqFlying = wq !== null && wq.t <= WQ_FLY;
  const wqFlash = wq !== null && wq.t > WQ_FLY;
  const psFlying = ps !== null && ps.t <= PS_FLY;
  const psFlash = ps !== null && ps.t > PS_FLY;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="grid grid-cols-2 gap-3">
        {/* ===== Work queue panel ===== */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
          <div className="font-mono text-xs font-bold text-violet-400 mb-2">
            Work queue
          </div>

          <div className="relative h-40">
            {/* producer */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 top-0 rounded-lg border px-2 py-1 font-mono text-[10px] transition-colors duration-200 ${
                wq?.t === 0
                  ? "border-violet-400 bg-violet-950/60 text-violet-300"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-400"
              }`}
            >
              producer
            </div>

            {/* queue */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[34%] w-24 rounded-lg border border-zinc-700 bg-zinc-950/60 px-2 py-1 flex items-center justify-center gap-1">
              <span className="font-mono text-[9px] text-zinc-500">queue</span>
              <span className="font-mono text-[9px] px-1 rounded border border-violet-500/40 bg-violet-950/50 text-violet-300">
                m{wqNext}
              </span>
            </div>

            {/* workers */}
            {[0, 1, 2].map((i) => {
              const active = wqFlash && wq !== null && wq.worker === i;
              return (
                <div
                  key={i}
                  className={`absolute bottom-0 -translate-x-1/2 w-12 rounded-lg border px-1 py-1.5 text-center transition-all duration-200 ${
                    active
                      ? "border-emerald-400 bg-emerald-950/60 scale-110"
                      : "border-zinc-800 bg-zinc-950/60"
                  }`}
                  style={{ left: `${wqWorkerLeft(i) + 8}%` }}
                >
                  <div
                    className={`font-mono text-[10px] font-bold ${
                      active ? "text-emerald-400" : "text-zinc-400"
                    }`}
                  >
                    W{i + 1}
                  </div>
                  <div className="font-mono text-[9px] h-3.5 text-emerald-300">
                    {active && wq !== null ? wq.label : ""}
                  </div>
                </div>
              );
            })}

            {/* flying chip — queue → exactly ONE worker */}
            {wq !== null && wqFlying && (
              <span
                className="absolute -translate-x-1/2 font-mono text-[9px] px-1.5 py-0.5 rounded border border-violet-400 bg-violet-950/90 text-violet-300 transition-all duration-500 ease-in-out"
                style={{
                  left: wq.t === 0 ? "50%" : `${wqWorkerLeft(wq.worker) + 8}%`,
                  top: wq.t === 0 ? "36%" : "66%",
                }}
              >
                {wq.label}
              </span>
            )}
          </div>

          <div className="mt-2 font-mono text-[10px] text-zinc-500 text-center">
            each message → <span className="text-violet-400">one</span> worker
          </div>
        </div>

        {/* ===== Pub/Sub panel ===== */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
          <div className="font-mono text-xs font-bold text-cyan-400 mb-2">
            Pub/Sub
          </div>

          <div className="relative h-40">
            {/* publisher */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 top-0 rounded-lg border px-2 py-1 font-mono text-[10px] transition-colors duration-200 ${
                ps?.t === 0
                  ? "border-cyan-400 bg-cyan-950/60 text-cyan-300"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-400"
              }`}
            >
              publisher
            </div>

            {/* topic */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[34%] w-24 rounded-lg border border-zinc-700 bg-zinc-950/60 px-2 py-1 flex items-center justify-center gap-1">
              <span className="font-mono text-[9px] text-zinc-500">topic</span>
              <span className="font-mono text-[9px] px-1 rounded border border-cyan-500/40 bg-cyan-950/50 text-cyan-300">
                e{psNext}
              </span>
            </div>

            {/* subscribers */}
            {SUBS.map((name, i) => (
              <div
                key={name}
                className={`absolute bottom-0 -translate-x-1/2 w-[30%] rounded-lg border px-1 py-1.5 text-center transition-all duration-200 ${
                  psFlash
                    ? "border-cyan-400 bg-cyan-950/60 scale-105"
                    : "border-zinc-800 bg-zinc-950/60"
                }`}
                style={{ left: `${psSubLeft(i) + 5}%` }}
              >
                <div
                  className={`font-mono text-[10px] font-bold ${
                    psFlash ? "text-cyan-400" : "text-zinc-400"
                  }`}
                >
                  {name}
                </div>
                <div className="font-mono text-[9px] h-3.5 text-cyan-300">
                  {psFlash && ps !== null ? ps.label : ""}
                </div>
              </div>
            ))}

            {/* fan-out copies — topic → ALL subscribers at once */}
            {ps !== null &&
              psFlying &&
              [0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="absolute -translate-x-1/2 font-mono text-[9px] px-1.5 py-0.5 rounded border border-cyan-400 bg-cyan-950/90 text-cyan-300 transition-all duration-500 ease-in-out"
                  style={{
                    left: ps.t === 0 ? "50%" : `${psSubLeft(i) + 5}%`,
                    top: ps.t === 0 ? "36%" : "66%",
                  }}
                >
                  {ps.label}
                </span>
              ))}
          </div>

          <div className="mt-2 font-mono text-[10px] text-zinc-500 text-center">
            each message → <span className="text-cyan-400">every</span>{" "}
            subscriber
          </div>
        </div>
      </div>
    </div>
  );
}
