"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

const TICK_MS = 80;
const MAX_LOG = 8;
const PRODUCE_GAP = 10;
// phase lengths in ticks
const P_PRODUCE = 80;
const P_CATCHUP = 40;
const P_REPLAY  = 50;
const CYCLE = P_PRODUCE + P_CATCHUP + P_REPLAY;

const KEY_DEFS = [
  { key: "user-A",  color: "text-violet-400", bg: "bg-violet-400" },
  { key: "order-1", color: "text-cyan-400",   bg: "bg-cyan-400"   },
  { key: "user-B",  color: "text-emerald-400",bg: "bg-emerald-400"},
  { key: "order-2", color: "text-amber-400",  bg: "bg-amber-400"  },
];

type Phase = "produce" | "catchup" | "replay";

interface Msg { offset: number; color: string; label: string; }

export function KafkaLogViz() {
  const [log, setLog]               = useState<Msg[]>([]);
  const [billing, setBilling]       = useState(0);
  const [analytics, setAnalytics]   = useState(0);
  const [phase, setPhase]           = useState<Phase>("produce");

  const tick         = useRef(0);
  const logRef       = useRef<Msg[]>([]);
  const billingRef   = useRef(0);
  const analyticsRef = useRef(0);
  const nextOff      = useRef(0);
  const pausedRef    = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      tick.current = (tick.current + 1) % CYCLE;

      if (tick.current === 0) {
        logRef.current     = [];
        billingRef.current = 0;
        analyticsRef.current = 0;
        nextOff.current    = 0;
      }

      const t = tick.current;
      const ph: Phase =
        t < P_PRODUCE           ? "produce"
        : t < P_PRODUCE + P_CATCHUP ? "catchup"
        : "replay";

      // append messages during produce phase
      if (ph === "produce" && t % PRODUCE_GAP === 0 && nextOff.current < MAX_LOG) {
        const def = KEY_DEFS[nextOff.current % KEY_DEFS.length];
        logRef.current = [
          ...logRef.current,
          { offset: nextOff.current, color: def.color, label: def.key.split("-")[0] },
        ];
        nextOff.current += 1;

        // analytics reads fast; billing reads slow
        analyticsRef.current = Math.min(nextOff.current, analyticsRef.current + 1);
        if (t % (PRODUCE_GAP * 2) === 0) {
          billingRef.current = Math.min(nextOff.current, billingRef.current + 1);
        }
      }

      // catchup: billing catches up to head
      if (ph === "catchup" && t % 4 === 0) {
        billingRef.current = Math.min(nextOff.current, billingRef.current + 1);
      }

      // replay: analytics resets to 0 and re-reads
      if (ph === "replay") {
        if (t === P_PRODUCE + P_CATCHUP) analyticsRef.current = 0;
        if (t % 3 === 0) {
          analyticsRef.current = Math.min(nextOff.current, analyticsRef.current + 1);
        }
      }

      setLog([...logRef.current]);
      setBilling(billingRef.current);
      setAnalytics(analyticsRef.current);
      setPhase(ph);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  const CAPTIONS: Record<Phase, { text: string; color: string }> = {
    produce:  { text: "messages append to the log — immutable, offset-indexed", color: "text-zinc-400" },
    catchup:  { text: "billing catches up — consumers read at their own pace, independently", color: "text-emerald-400" },
    replay:   { text: "analytics resets to offset 0 and replays — data is never deleted", color: "text-violet-400" },
  };
  const cap = CAPTIONS[phase];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs font-bold text-zinc-300">
          Kafka log <span className="text-zinc-600 font-normal">— append-only, consumer-owned offsets</span>
        </span>
        <span className="font-mono text-[10px] text-zinc-500">{log.length}/{MAX_LOG}</span>
      </div>

      {/* pointer row */}
      <div className="flex gap-1 mb-0.5 h-5">
        {Array.from({ length: MAX_LOG }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0">
            {billing === i && (
              <span className="font-mono text-[7px] text-amber-400 leading-none">▼</span>
            )}
            {analytics === i && (
              <span className={`font-mono text-[7px] text-cyan-400 leading-none ${phase === "replay" ? "animate-pulse" : ""}`}>▼</span>
            )}
          </div>
        ))}
      </div>

      {/* log cells */}
      <div className="flex gap-1 mb-1">
        {Array.from({ length: MAX_LOG }).map((_, i) => {
          const msg = log.find(m => m.offset === i);
          return (
            <div
              key={i}
              className={`flex-1 rounded border py-1.5 text-center transition-all duration-200 ${
                msg ? "border-zinc-700 bg-zinc-800/60" : "border-zinc-800/30 bg-transparent"
              }`}
            >
              {msg
                ? <span className={`font-mono text-[8px] font-bold ${msg.color}`}>{msg.label}</span>
                : <span className="font-mono text-[8px] text-zinc-800">{i}</span>}
            </div>
          );
        })}
      </div>

      {/* offset labels */}
      <div className="flex gap-1 mb-3">
        {Array.from({ length: MAX_LOG }).map((_, i) => (
          <div key={i} className="flex-1 text-center font-mono text-[8px] text-zinc-700">{i}</div>
        ))}
      </div>

      {/* consumer legend */}
      <div className="flex gap-5 mb-3">
        {[
          { label: "billing",   offset: billing,   color: "bg-amber-400", text: "text-amber-400",  note: "" },
          { label: "analytics", offset: analytics, color: "bg-cyan-400",  text: "text-cyan-400",   note: phase === "replay" ? " replaying" : "" },
        ].map(c => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full shrink-0 ${c.color} ${phase === "replay" && c.label === "analytics" ? "animate-pulse" : ""}`} />
            <span className={`font-mono text-[10px] ${c.text}`}>
              {c.label} @ {c.offset}{c.note}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 h-9 flex items-center">
        <span key={phase} className={`font-mono text-xs ${cap.color}`}>{cap.text}</span>
      </div>
    </div>
  );
}
