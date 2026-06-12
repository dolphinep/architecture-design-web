"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

type Phase = "ramping" | "overloaded" | "resetting";

interface Packet {
  id: number;
  client: number;
  go: boolean;
}

const CLIENT_TOPS = [10, 36, 63, 89]; // % within the stage
const LOAD_PER_REQUEST = 9;

export function DBOverloadViz() {
  const [phase, setPhase] = useState<Phase>("ramping");
  const [load, setLoad] = useState(0);
  const [packets, setPackets] = useState<Packet[]>([]);
  const idRef = useRef(0);
  const pausedRef = useAnimPausedRef();

  // Spawn packets while ramping
  useEffect(() => {
    if (phase !== "ramping") return;
    const timeouts = new Set<ReturnType<typeof setTimeout>>();
    // setTimeout that, if paused when it fires, re-polls every 100ms until unpaused
    const pausableTimeout = (fn: () => void, ms: number) => {
      const cb = () => {
        timeouts.delete(t);
        if (pausedRef.current) {
          t = setTimeout(cb, 100);
          timeouts.add(t);
          return;
        }
        fn();
      };
      let t = setTimeout(cb, ms);
      timeouts.add(t);
    };
    let clientIdx = 0;
    const iv = setInterval(() => {
      if (pausedRef.current) return;
      const id = idRef.current++;
      const client = clientIdx % 4;
      clientIdx++;
      setPackets((p) => [...p, { id, client, go: false }]);
      pausableTimeout(() => {
        setPackets((p) => p.map((x) => (x.id === id ? { ...x, go: true } : x)));
      }, 30);
      pausableTimeout(() => {
        setPackets((p) => p.filter((x) => x.id !== id));
        setLoad((l) => Math.min(100, l + LOAD_PER_REQUEST));
      }, 950);
    }, 600);
    return () => {
      clearInterval(iv);
      timeouts.forEach(clearTimeout);
    };
  }, [phase, pausedRef]);

  // Detect overload
  useEffect(() => {
    if (load >= 100 && phase === "ramping") setPhase("overloaded");
  }, [load, phase]);

  // Overload hold → reset → ramp again
  useEffect(() => {
    if (phase === "overloaded") {
      let t: ReturnType<typeof setTimeout>;
      const cb = () => {
        if (pausedRef.current) {
          t = setTimeout(cb, 100);
          return;
        }
        setPhase("resetting");
      };
      t = setTimeout(cb, 3000);
      return () => clearTimeout(t);
    }
    if (phase === "resetting") {
      setPackets([]);
      setLoad(0);
      let t: ReturnType<typeof setTimeout>;
      const cb = () => {
        if (pausedRef.current) {
          t = setTimeout(cb, 100);
          return;
        }
        setPhase("ramping");
      };
      t = setTimeout(cb, 1100);
      return () => clearTimeout(t);
    }
  }, [phase, pausedRef]);

  const latency = Math.round(12 + Math.pow(load / 100, 2) * 438);
  const level: "low" | "mid" | "high" = load >= 80 ? "high" : load >= 45 ? "mid" : "low";

  const dbBorder =
    level === "high" ? "border-red-500" : level === "mid" ? "border-amber-500" : "border-cyan-500/60";
  const dbBg =
    level === "high" ? "bg-red-950/40" : level === "mid" ? "bg-amber-950/30" : "bg-cyan-950/30";
  const barColor =
    level === "high" ? "bg-red-400" : level === "mid" ? "bg-amber-400" : "bg-cyan-400";
  const loadText =
    level === "high" ? "text-red-400" : level === "mid" ? "text-amber-400" : "text-cyan-400";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="relative" style={{ height: 240 }}>
        {/* Clients */}
        {CLIENT_TOPS.map((top, i) => (
          <div
            key={i}
            className="absolute left-0 -translate-y-1/2 w-20 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 flex items-center gap-1.5"
            style={{ top: `${top}%` }}
          >
            <span className="text-[10px]">🖥️</span>
            <span className="font-mono text-[10px] text-zinc-400">Client {i + 1}</span>
          </div>
        ))}

        {/* Packets */}
        {packets.map((p) => (
          <div
            key={p.id}
            className="absolute w-2 h-2 rounded-full -translate-y-1/2"
            style={{
              left: p.go ? "74%" : "15%",
              top: p.go ? "50%" : `${CLIENT_TOPS[p.client]}%`,
              background: "#a78bfa",
              boxShadow: "0 0 6px #a78bfa",
              transition: "left 900ms ease-in, top 900ms ease-in",
            }}
          />
        ))}

        {/* Database */}
        <div
          className={`absolute right-0 top-1/2 -translate-y-1/2 w-32 rounded-xl border p-3 transition-colors duration-300 ${dbBorder} ${dbBg} ${
            level === "high" ? "animate-pulse" : ""
          }`}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs">🗄️</span>
            <span className="font-mono text-xs font-bold text-cyan-400">Database</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{
                width: `${load}%`,
                transition: phase === "resetting" ? "width 800ms ease" : "width 300ms ease",
              }}
            />
          </div>
          <div className={`mt-1 font-mono text-[10px] ${loadText}`}>load {load}%</div>
        </div>

        {/* Latency readout */}
        <div
          className="absolute right-0 w-32 text-center font-mono text-xs"
          style={{ top: "78%" }}
        >
          <span className="text-zinc-500">latency </span>
          <span className={loadText}>{latency}ms</span>
        </div>

        {/* Overload badge */}
        {phase === "overloaded" && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-red-500 bg-red-950/80 px-3 py-1.5 font-mono text-xs font-bold text-red-400">
            ⚠ DB overloaded
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-zinc-500">
        Without a cache, every request hits the database — load climbs and latency follows.
      </div>
    </div>
  );
}
