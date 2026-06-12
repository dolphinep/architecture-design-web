"use client";
import { useState, useEffect } from "react";
import { useAnimPausedRef } from "./pause-context";

interface Structure {
  name: string;
  cmd: string;
  use: string;
}

const STRUCTURES: Structure[] = [
  { name: "STRING",     cmd: 'SET user:42 "Ada"',             use: "values up to 512MB" },
  { name: "HASH",       cmd: "HSET user:42 name Ada age 36",  use: "object fields" },
  { name: "LIST",       cmd: "LPUSH queue job1",              use: "queues, timelines" },
  { name: "SET",        cmd: "SADD tags redis cache",         use: "unique members" },
  { name: "SORTED SET", cmd: "ZADD board 99 ada",             use: "leaderboards, rankings" },
];

const ROTATE_MS = 2000;
const OPS_TICK_MS = 120;
const OPS_FLOOR = 98_000;
const OPS_CEIL = 131_000;

export function RedisStructuresViz() {
  const [active, setActive] = useState(0);
  const [ops, setOps] = useState(112_403);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const rotate = setInterval(() => {
      if (pausedRef.current) return;
      setActive((a) => (a + 1) % STRUCTURES.length);
    }, ROTATE_MS);
    const counter = setInterval(() => {
      if (pausedRef.current) return;
      setOps((p) => {
        const next = p + 600 + Math.floor(Math.random() * 2400);
        return next > OPS_CEIL ? OPS_FLOOR + (next - OPS_CEIL) : next;
      });
    }, OPS_TICK_MS);
    return () => {
      clearInterval(rotate);
      clearInterval(counter);
    };
  }, [pausedRef]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <span className="font-mono text-xs font-bold text-zinc-300">Redis data structures</span>
        <span className="text-xs text-zinc-500">— more than a string store</span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-2">
        {STRUCTURES.map((s, i) => {
          const isActive = i === active;
          return (
            <div
              key={s.name}
              className={`rounded-lg border p-3 transition-all duration-300 ${
                isActive
                  ? "border-violet-500 bg-violet-950/30 scale-[1.03]"
                  : "border-zinc-800 bg-zinc-900/40 opacity-50"
              }`}
            >
              <div
                className={`font-mono text-xs font-bold mb-1 ${
                  isActive ? "text-violet-400" : "text-zinc-400"
                }`}
              >
                {s.name}
              </div>
              <div
                className={`font-mono text-xs mb-1 truncate ${
                  isActive ? "text-zinc-300" : "text-zinc-600"
                }`}
                title={s.cmd}
              >
                {s.cmd}
              </div>
              <div className="text-xs text-zinc-500">{s.use}</div>
            </div>
          );
        })}
      </div>

      {/* Ops footer */}
      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="font-mono text-sm text-emerald-400 tabular-nums w-32 shrink-0">
          {ops.toLocaleString("en-US")}
        </span>
        <span className="font-mono text-xs text-zinc-400">ops/sec</span>
        <span className="text-xs text-zinc-500">— single thread, no locks, one event loop</span>
      </div>
    </div>
  );
}
