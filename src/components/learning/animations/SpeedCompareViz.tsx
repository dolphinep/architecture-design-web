"use client";
import { useState, useEffect } from "react";
import { useAnimPausedRef } from "./pause-context";

interface Row {
  label: string;
  latency: string;
  fillMs: number;
  bar: string;
  text: string;
}

const ROWS: Row[] = [
  { label: "RAM (cache)", latency: "~0.1µs", fillMs: 180, bar: "bg-violet-400", text: "text-violet-400" },
  { label: "SSD (database)", latency: "~150µs", fillMs: 900, bar: "bg-cyan-400", text: "text-cyan-400" },
  { label: "Network DB query", latency: "~10ms", fillMs: 3000, bar: "bg-amber-400", text: "text-amber-400" },
];

export function SpeedCompareViz() {
  const [cycle, setCycle] = useState(0);
  const [filling, setFilling] = useState(false);
  const [done, setDone] = useState<boolean[]>([false, false, false]);
  const [showCompare, setShowCompare] = useState(false);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const timeouts: Array<ReturnType<typeof setTimeout>> = [];
    // setTimeout that, if paused when it fires, re-polls every 100ms until unpaused
    const schedule = (fn: () => void, ms: number) => {
      const cb = () => {
        if (pausedRef.current) {
          timeouts.push(setTimeout(cb, 100));
          return;
        }
        fn();
      };
      timeouts.push(setTimeout(cb, ms));
    };
    const START = 400;

    schedule(() => setFilling(true), START);
    ROWS.forEach((row, i) => {
      schedule(() => {
        setDone((d) => d.map((v, j) => (j === i ? true : v)));
      }, START + row.fillMs);
    });
    schedule(() => setShowCompare(true), START + 3000 + 250);
    schedule(() => {
      setShowCompare(false);
      setFilling(false);
      setDone([false, false, false]);
    }, START + 3000 + 250 + 2000);
    schedule(() => setCycle((c) => c + 1), START + 3000 + 250 + 2000 + 500);

    return () => timeouts.forEach(clearTimeout);
  }, [cycle, pausedRef]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex flex-col justify-center gap-6" style={{ height: 240 }}>
        {ROWS.map((row, i) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-mono text-xs text-zinc-300">{row.label}</span>
              <span
                className={`font-mono text-xs font-bold ${row.text} transition-opacity duration-300 ${
                  done[i] ? "opacity-100" : "opacity-0"
                }`}
              >
                {row.latency}
              </span>
            </div>
            <div className="h-3 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${row.bar}`}
                style={{
                  width: filling ? "100%" : "0%",
                  transition: filling ? `width ${row.fillMs}ms linear` : "none",
                }}
              />
            </div>
          </div>
        ))}

        <div
          className={`text-center font-mono text-xs text-emerald-400 transition-opacity duration-300 ${
            showCompare ? "opacity-100" : "opacity-0"
          }`}
        >
          RAM is ~100,000× faster than a network round-trip
        </div>
      </div>

      <div className="mt-3 text-[10px] text-zinc-600">
        (log scale in real life — bars dramatized)
      </div>
    </div>
  );
}
