"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

const TICK_MS = 100;

interface BrokerChip {
  label: string;
  state: "pending" | "inflight";
}
interface Fly {
  label: string;
  kind: "msg" | "ack" | "dlq";
  badge?: string;
}
interface Step {
  d: number; // duration in ticks
  caption: string;
  capColor: string;
  broker: BrokerChip[];
  fly?: Fly;
  consumer: "idle" | "spin" | "crash" | "ok";
  holding?: string;
  countdown?: boolean; // show redeliver countdown for the rest of the step
  fails?: number; // poison-message strike counter
  dlq: boolean; // DLQ holds the poison chip
}

const POISON = "☠ msg-3";
const C1 = "processed + acked → deleted";
const C2 = "no ack → redelivered. consumers must be idempotent!";
const C3 = "3 strikes → dead-letter queue for inspection";

const P = (label: string): BrokerChip => ({ label, state: "pending" });
const I = (label: string): BrokerChip => ({ label, state: "inflight" });

const STEPS: Step[] = [
  // ---- msg-1: happy path ----
  { d: 6, caption: C1, capColor: "text-emerald-400", broker: [I("msg-1"), P("msg-2"), P(POISON)], fly: { label: "msg-1", kind: "msg" }, consumer: "idle", dlq: false },
  { d: 8, caption: C1, capColor: "text-emerald-400", broker: [I("msg-1"), P("msg-2"), P(POISON)], consumer: "spin", holding: "msg-1", dlq: false },
  { d: 6, caption: C1, capColor: "text-emerald-400", broker: [I("msg-1"), P("msg-2"), P(POISON)], fly: { label: "ack ✓", kind: "ack" }, consumer: "ok", holding: "msg-1", dlq: false },
  { d: 5, caption: C1, capColor: "text-emerald-400", broker: [P("msg-2"), P(POISON)], consumer: "idle", dlq: false },
  // ---- msg-2: crash, redeliver, succeed ----
  { d: 6, caption: C2, capColor: "text-amber-400", broker: [I("msg-2"), P(POISON)], fly: { label: "msg-2", kind: "msg" }, consumer: "idle", dlq: false },
  { d: 5, caption: C2, capColor: "text-amber-400", broker: [I("msg-2"), P(POISON)], consumer: "spin", holding: "msg-2", dlq: false },
  { d: 8, caption: C2, capColor: "text-amber-400", broker: [I("msg-2"), P(POISON)], consumer: "crash", holding: "msg-2", dlq: false },
  { d: 15, caption: C2, capColor: "text-amber-400", broker: [I("msg-2"), P(POISON)], consumer: "idle", countdown: true, dlq: false },
  { d: 6, caption: C2, capColor: "text-amber-400", broker: [I("msg-2"), P(POISON)], fly: { label: "msg-2", kind: "msg", badge: "retry 1" }, consumer: "idle", dlq: false },
  { d: 8, caption: C2, capColor: "text-amber-400", broker: [I("msg-2"), P(POISON)], consumer: "spin", holding: "msg-2", dlq: false },
  { d: 6, caption: C2, capColor: "text-amber-400", broker: [I("msg-2"), P(POISON)], fly: { label: "ack ✓", kind: "ack" }, consumer: "ok", holding: "msg-2", dlq: false },
  { d: 5, caption: C2, capColor: "text-amber-400", broker: [P(POISON)], consumer: "idle", dlq: false },
  // ---- msg-3: poison → DLQ after 3 strikes ----
  { d: 5, caption: C3, capColor: "text-red-400", broker: [I(POISON)], fly: { label: POISON, kind: "msg" }, consumer: "idle", dlq: false },
  { d: 6, caption: C3, capColor: "text-red-400", broker: [I(POISON)], consumer: "crash", holding: POISON, fails: 1, dlq: false },
  { d: 5, caption: C3, capColor: "text-red-400", broker: [I(POISON)], fly: { label: POISON, kind: "msg", badge: "retry 1" }, consumer: "idle", fails: 1, dlq: false },
  { d: 6, caption: C3, capColor: "text-red-400", broker: [I(POISON)], consumer: "crash", holding: POISON, fails: 2, dlq: false },
  { d: 5, caption: C3, capColor: "text-red-400", broker: [I(POISON)], fly: { label: POISON, kind: "msg", badge: "retry 2" }, consumer: "idle", fails: 2, dlq: false },
  { d: 6, caption: C3, capColor: "text-red-400", broker: [I(POISON)], consumer: "crash", holding: POISON, fails: 3, dlq: false },
  { d: 7, caption: C3, capColor: "text-red-400", broker: [], fly: { label: POISON, kind: "dlq" }, consumer: "idle", fails: 3, dlq: false },
  { d: 18, caption: C3, capColor: "text-red-400", broker: [], consumer: "idle", fails: 3, dlq: true },
];

const TOTAL = STEPS.reduce((sum, s) => sum + s.d, 0);

export function DeliveryViz() {
  const [idx, setIdx] = useState(0);
  const [stepT, setStepT] = useState(0);
  const tick = useRef(0);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      tick.current = (tick.current + 1) % TOTAL;
      let t = tick.current;
      let i = 0;
      while (t >= STEPS[i].d) {
        t -= STEPS[i].d;
        i += 1;
      }
      setIdx(i);
      setStepT(t);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  const step = STEPS[idx];
  const countdownS = step.countdown
    ? ((step.d - stepT) * TICK_MS) / 1000
    : null;

  // flying chip position (% of stage)
  const flyStyle = (fly: Fly): React.CSSProperties => {
    const launched = stepT > 0;
    if (fly.kind === "ack") {
      return { left: launched ? "24%" : "58%", top: "30%" };
    }
    if (fly.kind === "dlq") {
      return { left: launched ? "66%" : "24%", top: launched ? "72%" : "30%" };
    }
    return { left: launched ? "58%" : "24%", top: "30%" };
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs font-bold text-zinc-300">
          At-least-once delivery{" "}
          <span className="text-zinc-600 font-normal">— ack, retry, DLQ</span>
        </span>
        <span className="font-mono text-[9px] text-zinc-500">
          at-least-once = nothing lost, duplicates possible
        </span>
      </div>

      {/* Stage */}
      <div className="relative h-48">
        {/* wire */}
        <div className="absolute left-[22%] right-[28%] top-[36%] h-px bg-zinc-800" />

        {/* Broker */}
        <div className="absolute left-0 top-2 w-[20%] rounded-xl border border-violet-500/60 bg-violet-950/30 p-2.5">
          <div className="font-mono text-xs font-bold text-violet-400 mb-1.5">
            Broker
          </div>
          <div className="flex flex-col gap-1 min-h-[68px]">
            {step.broker.length === 0 && (
              <span className="font-mono text-[9px] text-zinc-700 italic">
                queue empty
              </span>
            )}
            {step.broker.map((c) => (
              <div
                key={c.label}
                className={`rounded border px-1.5 py-0.5 font-mono text-[9px] flex items-center justify-between gap-1 transition-all duration-300 ${
                  c.state === "inflight"
                    ? "border-violet-500/30 bg-violet-950/30 text-zinc-500"
                    : "border-violet-500/60 bg-violet-950/60 text-violet-300"
                }`}
              >
                <span>{c.label}</span>
                {c.state === "inflight" && (
                  <span className="text-[8px] text-zinc-600">in-flight</span>
                )}
              </div>
            ))}
          </div>
          {countdownS !== null && (
            <div className="mt-1 font-mono text-[9px] text-amber-400">
              redeliver in {countdownS.toFixed(1)}s
            </div>
          )}
        </div>

        {/* Consumer */}
        <div
          className={`absolute right-0 top-2 w-[26%] rounded-xl border p-2.5 transition-colors duration-200 ${
            step.consumer === "crash"
              ? "border-red-500 bg-red-950/40"
              : step.consumer === "ok"
                ? "border-emerald-400 bg-emerald-950/40"
                : "border-emerald-500/50 bg-emerald-950/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-emerald-400">
              Consumer
            </span>
            {step.fails !== undefined && (
              <span className="font-mono text-[9px] text-red-400">
                fails {step.fails}/3
              </span>
            )}
          </div>
          <div className="mt-1.5 h-8 flex items-center gap-1.5">
            {step.consumer === "idle" && (
              <span className="font-mono text-[10px] text-zinc-600">
                waiting…
              </span>
            )}
            {step.consumer === "spin" && (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-700 border-t-emerald-400 animate-spin" />
                <span className="font-mono text-[10px] text-zinc-400">
                  processing {step.holding}
                </span>
              </>
            )}
            {step.consumer === "crash" && (
              <span className="font-mono text-[10px] font-bold text-red-400 animate-pulse">
                ✕ crash — no ack sent
              </span>
            )}
            {step.consumer === "ok" && (
              <span className="font-mono text-[10px] font-bold text-emerald-400">
                ✓ done — ack sent
              </span>
            )}
          </div>
        </div>

        {/* DLQ */}
        <div
          className={`absolute right-0 bottom-2 w-[26%] rounded-xl border p-2 transition-all duration-500 ${
            step.dlq
              ? "border-red-500 bg-red-950/50"
              : "border-red-900/40 bg-red-950/10 opacity-50"
          }`}
        >
          <div
            className={`font-mono text-[10px] font-bold ${
              step.dlq ? "text-red-400" : "text-red-400/50"
            }`}
          >
            DLQ
          </div>
          <div className="mt-1 h-5">
            {step.dlq ? (
              <span className="rounded border border-red-500/60 bg-red-950/80 px-1.5 py-0.5 font-mono text-[9px] text-red-300">
                {POISON}
              </span>
            ) : (
              <span className="font-mono text-[8px] text-zinc-700">
                dead-letter queue
              </span>
            )}
          </div>
        </div>

        {/* flying chip */}
        {step.fly && (
          <div
            key={idx}
            className="absolute z-10 -translate-y-1/2 transition-all duration-500 ease-in-out flex items-center gap-1"
            style={flyStyle(step.fly)}
          >
            <span
              className={`font-mono text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap ${
                step.fly.kind === "ack"
                  ? "border-emerald-400 bg-emerald-950/90 text-emerald-300"
                  : step.fly.kind === "dlq"
                    ? "border-red-400 bg-red-950/90 text-red-300"
                    : "border-violet-400 bg-violet-950/90 text-violet-300"
              }`}
            >
              {step.fly.label}
            </span>
            {step.fly.badge && (
              <span className="font-mono text-[8px] px-1 rounded border border-amber-500/60 bg-amber-950/80 text-amber-400 whitespace-nowrap">
                {step.fly.badge}
              </span>
            )}
          </div>
        )}
      </div>

      {/* caption */}
      <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 h-9 flex items-center">
        <span key={step.caption} className={`font-mono text-xs ${step.capColor}`}>
          {step.caption}
        </span>
      </div>
    </div>
  );
}
