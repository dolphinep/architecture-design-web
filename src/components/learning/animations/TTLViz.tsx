"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

type KeyPhase = "alive" | "flash" | "expired";

interface KeyState {
  name: string;
  ttlMax: number;
  remaining: number;
  phase: KeyPhase;
  phaseT: number;
}

interface LogLine {
  id: number;
  text: string;
  color: string;
}

const INITIAL_KEYS: KeyState[] = [
  { name: "session:9f2", ttlMax: 8, remaining: 8, phase: "alive", phaseT: 0 },
  { name: "user:42",     ttlMax: 5, remaining: 5, phase: "alive", phaseT: 0 },
  { name: "feed:hot",    ttlMax: 3, remaining: 3, phase: "alive", phaseT: 0 },
  { name: "price:btc",   ttlMax: 2, remaining: 2, phase: "alive", phaseT: 0 },
];

const TICK_S = 0.1;
const FLASH_S = 0.5;
const EXPIRED_S = 1.5;

export function TTLViz() {
  const [keys, setKeys] = useState<KeyState[]>(INITIAL_KEYS);
  const [log, setLog] = useState<LogLine[]>([]);
  const keysRef = useRef<KeyState[]>(INITIAL_KEYS.map((k) => ({ ...k })));
  const logId = useRef(0);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const fresh: LogLine[] = [];
      keysRef.current = keysRef.current.map((k): KeyState => {
        if (k.phase === "alive") {
          const remaining = k.remaining - TICK_S;
          if (remaining <= 0) {
            fresh.push({
              id: logId.current++,
              text: `${k.name} TTL hit 0 → evicted`,
              color: "text-red-400",
            });
            return { ...k, remaining: 0, phase: "flash", phaseT: FLASH_S };
          }
          return { ...k, remaining };
        }
        if (k.phase === "flash") {
          const phaseT = k.phaseT - TICK_S;
          if (phaseT <= 0) return { ...k, phase: "expired", phaseT: EXPIRED_S };
          return { ...k, phaseT };
        }
        // expired → refetch after delay
        const phaseT = k.phaseT - TICK_S;
        if (phaseT <= 0) {
          fresh.push({
            id: logId.current++,
            text: `GET ${k.name} → miss → refetched from DB (TTL ${k.ttlMax}s)`,
            color: "text-cyan-400",
          });
          return { ...k, phase: "alive", phaseT: 0, remaining: k.ttlMax };
        }
        return { ...k, phaseT };
      });
      setKeys(keysRef.current);
      if (fresh.length > 0) {
        setLog((prev) => [...fresh.reverse(), ...prev].slice(0, 3));
      }
    }, 100);
    return () => clearInterval(id);
  }, [pausedRef]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      {/* Redis panel */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="font-mono text-xs font-bold text-zinc-300">Redis</span>
          <span className="text-xs text-zinc-500">— every key carries a TTL</span>
        </div>

        <div className="flex flex-col gap-2">
          {keys.map((k) => {
            const pct = Math.max(0, (k.remaining / k.ttlMax) * 100);
            const barColor =
              pct < 20 ? "bg-red-400" : pct < 50 ? "bg-amber-400" : "bg-emerald-400";
            const numColor =
              pct < 20 ? "text-red-400" : pct < 50 ? "text-amber-400" : "text-emerald-400";

            if (k.phase === "expired") {
              return (
                <div
                  key={k.name}
                  className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/60 px-3 py-2 transition-all duration-500"
                >
                  <span className="font-mono text-xs text-zinc-700 w-24 shrink-0 line-through">
                    {k.name}
                  </span>
                  <span className="text-xs text-zinc-600 italic">
                    expired — slot free
                  </span>
                </div>
              );
            }

            const isFlash = k.phase === "flash";
            return (
              <div
                key={k.name}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-300 ${
                  isFlash
                    ? "border-red-500 bg-red-950/50"
                    : "border-zinc-800 bg-zinc-950/60"
                }`}
              >
                <span
                  className={`font-mono text-xs w-24 shrink-0 ${
                    isFlash ? "text-red-400" : "text-zinc-300"
                  }`}
                >
                  {k.name}
                </span>
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-100 ease-linear ${
                      isFlash ? "bg-red-400" : barColor
                    }`}
                    style={{ width: `${isFlash ? 0 : pct}%` }}
                  />
                </div>
                <span
                  className={`font-mono text-xs w-12 text-right shrink-0 ${
                    isFlash ? "text-red-400" : numColor
                  }`}
                >
                  {isFlash ? "0.0s" : `${k.remaining.toFixed(1)}s`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log */}
      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 h-16 overflow-hidden flex flex-col gap-0.5">
        {log.length === 0 && (
          <span className="font-mono text-xs text-zinc-600">waiting for first expiry…</span>
        )}
        {log.map((l, i) => (
          <span
            key={l.id}
            className={`font-mono text-xs ${l.color}`}
            style={{ opacity: 1 - i * 0.35 }}
          >
            {l.text}
          </span>
        ))}
      </div>
    </div>
  );
}
