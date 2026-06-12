"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

type ChipPhase = "fly" | "queued" | "processing" | "reply";

interface Chip {
  id: number;
  cmd: string;
  client: number;
  phase: ChipPhase;
  t: number; // ticks in current phase
  slot: number; // queue slot
}

const COMMANDS = ["GET user:42", "INCR views", "SET k v", "ZADD board", "LPUSH q"];
const SPAWN_GAPS = [7, 5, 9, 6, 8]; // ticks between spawns
const MESSAGES = [
  "commands execute one-by-one — atomic by design",
  "no locks, no mutexes, no race conditions",
];

const TICK_MS = 100;
const FLY_TICKS = 6;
const PROCESS_TICKS = 4; // ~400ms docked at the loop
const REPLY_TICKS = 8;
const MAX_QUEUE = 4;

// positions in % of the stage
const clientY = (i: number) => i * 20 + 2;
const chipAtClient = (i: number) => ({ x: 2, y: clientY(i) + 3 });
const replyAtClient = (i: number) => ({ x: 15, y: clientY(i) + 4 });
const queuePos = (slot: number) => ({ x: 38, y: slot * 17 + 16 });
const LOOP_CHIP = { x: 70, y: 38 };

export function EventLoopViz() {
  const [chips, setChips] = useState<Chip[]>([]);
  const [busy, setBusy] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [ops, setOps] = useState(101_240);

  const chipsRef = useRef<Chip[]>([]);
  const nextId = useRef(0);
  const spawnCd = useRef(3);
  const spawnCount = useRef(0);
  const tick = useRef(0);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      tick.current += 1;
      let next = chipsRef.current.map((c) => ({ ...c, t: c.t + 1 }));

      // fly → queued
      next = next.map((c) =>
        c.phase === "fly" && c.t >= FLY_TICKS
          ? { ...c, phase: "queued" as ChipPhase, t: 0 }
          : c
      );

      // event loop takes ONE chip at a time
      if (!next.some((c) => c.phase === "processing")) {
        const queued = next.filter((c) => c.phase === "queued");
        if (queued.length > 0) {
          const first = queued.reduce((a, b) => (a.id < b.id ? a : b));
          next = next.map((c) =>
            c.id === first.id
              ? { ...c, phase: "processing" as ChipPhase, t: 0 }
              : c
          );
        }
      }

      // processing → reply dot flies home
      next = next.map((c) =>
        c.phase === "processing" && c.t >= PROCESS_TICKS
          ? { ...c, phase: "reply" as ChipPhase, t: 0 }
          : c
      );

      // remove delivered replies
      next = next.filter((c) => !(c.phase === "reply" && c.t >= REPLY_TICKS));

      // compact queue slots
      const queuedIds = next
        .filter((c) => c.phase === "queued")
        .sort((a, b) => a.id - b.id)
        .map((c) => c.id);
      next = next.map((c) =>
        c.phase === "queued" ? { ...c, slot: queuedIds.indexOf(c.id) } : c
      );

      // spawn new commands from clients
      spawnCd.current -= 1;
      const waiting =
        queuedIds.length + next.filter((c) => c.phase === "fly").length;
      if (spawnCd.current <= 0 && waiting < MAX_QUEUE) {
        const n = spawnCount.current;
        spawnCount.current += 1;
        next.push({
          id: nextId.current++,
          cmd: COMMANDS[n % COMMANDS.length],
          client: n % 5,
          phase: "fly",
          t: 0,
          slot: waiting,
        });
        spawnCd.current = SPAWN_GAPS[n % SPAWN_GAPS.length];
      }

      chipsRef.current = next;
      setChips(next);
      setBusy(next.some((c) => c.phase === "processing"));
      setMsgIdx(Math.floor(tick.current / 35) % MESSAGES.length);
      if (tick.current % 10 === 0) {
        setOps(98_000 + ((tick.current * 7919) % 18_000));
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  const chipPos = (c: Chip) => {
    if (c.phase === "fly")
      return c.t === 0 ? chipAtClient(c.client) : queuePos(c.slot);
    if (c.phase === "queued") return queuePos(c.slot);
    if (c.phase === "processing") return LOOP_CHIP;
    // reply
    return c.t === 0 ? LOOP_CHIP : replyAtClient(c.client);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs font-bold text-zinc-300">
          Redis event loop{" "}
          <span className="text-zinc-600 font-normal">— one thread, all clients</span>
        </span>
        <span className="font-mono text-[10px] text-zinc-500">
          {ops.toLocaleString()} ops/s
        </span>
      </div>

      {/* Stage */}
      <div className="relative h-52">
        {/* Clients */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute left-0 w-[13%] rounded border border-zinc-800 bg-zinc-900/50 flex items-center justify-center gap-1 py-1"
            style={{ top: `${clientY(i)}%`, height: "15%" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/70" />
            <span className="font-mono text-[10px] text-zinc-400">C{i + 1}</span>
          </div>
        ))}

        {/* epoll box */}
        <div className="absolute left-[33%] w-[26%] top-[2%] bottom-[2%] rounded-lg border border-zinc-700 bg-zinc-900/30 flex flex-col justify-between px-1 py-1.5">
          <span className="font-mono text-[10px] font-bold text-amber-400 text-center">
            epoll
          </span>
          <span className="text-[8px] text-zinc-500 text-center leading-tight">
            I/O multiplexing — one thread watches all sockets
          </span>
        </div>

        {/* Event loop ring */}
        <div
          className={`absolute left-[68%] top-[26%] w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-200 ${
            busy
              ? "border-violet-500/60 bg-violet-950/30 ring-2 ring-violet-400/40"
              : "border-zinc-700 bg-zinc-900/40"
          }`}
        >
          <div className="absolute inset-[-2px] rounded-full border-2 border-transparent border-t-violet-400 animate-spin" />
          <span className="font-mono text-[10px] font-bold text-violet-400">
            Event loop
          </span>
          <span className="text-[9px] text-zinc-500">single thread</span>
        </div>
        <span className="absolute left-[68%] top-[78%] w-24 text-center text-[9px] text-zinc-600">
          one command at a time
        </span>

        {/* Command chips + reply dots */}
        {chips.map((c) => {
          const p = chipPos(c);
          if (c.phase === "reply") {
            return (
              <div
                key={c.id}
                className="absolute z-10 transition-all duration-700 ease-in-out"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  opacity: c.t >= REPLY_TICKS - 1 ? 0 : 1,
                }}
              >
                <span className="flex items-center justify-center w-4 h-4 rounded-full border border-emerald-500/60 bg-emerald-950/80 text-emerald-400 text-[9px]">
                  ✓
                </span>
              </div>
            );
          }
          const isProc = c.phase === "processing";
          return (
            <div
              key={c.id}
              className={`absolute z-10 font-mono text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap transition-all duration-500 ease-in-out ${
                isProc
                  ? "border-violet-400 bg-violet-950/90 text-violet-300 scale-110"
                  : "border-cyan-500/50 bg-cyan-950/80 text-cyan-300"
              }`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              {c.cmd}
            </div>
          );
        })}
      </div>

      {/* Callout */}
      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 h-9 flex items-center">
        <span
          key={msgIdx}
          className="font-mono text-xs text-emerald-400 transition-opacity duration-300"
        >
          {MESSAGES[msgIdx]}
        </span>
      </div>
    </div>
  );
}
