"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

type RdbPhase = "idle" | "fork" | "slide" | "file" | "fade";
type AofMode = "append" | "crash" | "replay" | "rebuilt";

const RDB_TICKS: Record<RdbPhase, number> = {
  idle: 8,
  fork: 10,
  slide: 10,
  file: 10,
  fade: 6,
};
const RDB_NEXT: Record<RdbPhase, RdbPhase> = {
  idle: "fork",
  fork: "slide",
  slide: "file",
  file: "fade",
  fade: "idle",
};

const AOF_CMDS = ["SET a 1", "INCR b", "DEL c", "SET d 9", "INCR b", "SET c 3"];
const APPEND_TICKS = 11;
const CRASH_TICKS = 8;
const REPLAY_STEP_TICKS = 4;
const REBUILT_TICKS = 14;
const APPENDS_PER_CYCLE = 6;
const LOG_VISIBLE = 5;

const MEM_KEYS = [
  { name: "user:1", style: "border-violet-500/50 bg-violet-950/50 text-violet-400" },
  { name: "cart:7", style: "border-cyan-500/50 bg-cyan-950/50 text-cyan-400" },
  { name: "feed:9", style: "border-amber-500/50 bg-amber-950/50 text-amber-400" },
];

interface AofView {
  mode: AofMode;
  log: string[];
  replayIdx: number;
}

export function PersistenceViz() {
  const [rdbPhase, setRdbPhase] = useState<RdbPhase>("idle");
  const [aof, setAof] = useState<AofView>({ mode: "append", log: [], replayIdx: -1 });

  const rdbRef = useRef<{ phase: RdbPhase; t: number }>({ phase: "idle", t: 0 });
  const aofRef = useRef<{
    mode: AofMode;
    t: number;
    cmdIdx: number;
    appends: number;
    log: string[];
    replayIdx: number;
  }>({ mode: "append", t: 0, cmdIdx: 0, appends: 0, log: [], replayIdx: -1 });
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      // ---- RDB machine ----
      const r = rdbRef.current;
      r.t += 1;
      if (r.t >= RDB_TICKS[r.phase]) {
        rdbRef.current = { phase: RDB_NEXT[r.phase], t: 0 };
        setRdbPhase(rdbRef.current.phase);
      }

      // ---- AOF machine ----
      const a = aofRef.current;
      a.t += 1;
      if (a.mode === "append") {
        if (a.t >= APPEND_TICKS) {
          a.t = 0;
          const cmd = AOF_CMDS[a.cmdIdx % AOF_CMDS.length];
          a.cmdIdx += 1;
          a.appends += 1;
          a.log = [...a.log, cmd].slice(-LOG_VISIBLE);
          if (a.appends >= APPENDS_PER_CYCLE) {
            a.mode = "crash";
            a.appends = 0;
          }
        }
      } else if (a.mode === "crash") {
        if (a.t >= CRASH_TICKS) {
          a.mode = "replay";
          a.t = 0;
          a.replayIdx = 0;
        }
      } else if (a.mode === "replay") {
        if (a.t >= REPLAY_STEP_TICKS) {
          a.t = 0;
          a.replayIdx += 1;
          if (a.replayIdx >= a.log.length) {
            a.mode = "rebuilt";
            a.replayIdx = -1;
          }
        }
      } else {
        // rebuilt
        if (a.t >= REBUILT_TICKS) {
          a.mode = "append";
          a.t = 0;
        }
      }
      setAof({ mode: a.mode, log: [...a.log], replayIdx: a.replayIdx });
    }, 100);
    return () => clearInterval(id);
  }, [pausedRef]);

  const forking = rdbPhase === "fork";
  const childDown = rdbPhase === "slide" || rdbPhase === "file";
  const fileVisible = rdbPhase === "file";
  const memWiped = aof.mode === "crash" || aof.mode === "replay";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="grid grid-cols-2 gap-3">
        {/* ===== RDB panel ===== */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
          <div className="font-mono text-[10px] font-bold text-cyan-400 mb-2">
            RDB <span className="text-zinc-500 font-normal">— point-in-time snapshots</span>
          </div>

          <div className="relative h-44">
            {/* child copy (behind main while overlapped) */}
            <div
              className={`absolute top-0 left-0 right-0 rounded-lg border border-dashed border-cyan-500/50 bg-cyan-950/20 p-2 transition-all duration-700 ease-in-out ${
                rdbPhase === "idle"
                  ? "opacity-0 translate-y-0"
                  : forking
                  ? "opacity-70 translate-x-1.5 translate-y-2"
                  : childDown
                  ? "opacity-60 translate-y-[88px] scale-90"
                  : "opacity-0 translate-y-[88px] scale-90"
              }`}
            >
              <div className="font-mono text-[9px] text-cyan-400/80 mb-1">
                child (snapshot)
              </div>
              <div className="flex gap-1">
                {MEM_KEYS.map((k) => (
                  <span
                    key={k.name}
                    className="font-mono text-[8px] px-1 py-px rounded border border-zinc-700 text-zinc-500"
                  >
                    {k.name}
                  </span>
                ))}
              </div>
            </div>

            {/* main memory box */}
            <div className="absolute top-0 left-0 right-0 rounded-lg border border-zinc-700 bg-zinc-900/80 p-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[9px] text-zinc-400">memory (parent)</span>
                <span className="font-mono text-[8px] px-1 py-px rounded border border-emerald-500/50 bg-emerald-950/50 text-emerald-400 animate-pulse">
                  still serving
                </span>
              </div>
              <div className="flex gap-1">
                {MEM_KEYS.map((k) => (
                  <span
                    key={k.name}
                    className={`font-mono text-[8px] px-1 py-px rounded border ${k.style}`}
                  >
                    {k.name}
                  </span>
                ))}
              </div>
            </div>

            {/* fork label + copy-on-write note */}
            <div
              className={`absolute top-[58px] left-0 right-0 text-center transition-opacity duration-300 ${
                forking || rdbPhase === "slide" ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="font-mono text-[10px] text-amber-400">fork()</span>
              <div className="text-[8px] text-zinc-500">
                child shares pages — near-zero copy cost
              </div>
            </div>

            {/* disk */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
              <span className="font-mono text-[9px] text-zinc-500">💾 disk</span>
              <span
                className={`font-mono text-[9px] px-1.5 py-px rounded border border-cyan-500/60 bg-cyan-950/60 text-cyan-300 transition-opacity duration-500 ${
                  fileVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                dump.rdb
              </span>
            </div>
          </div>
        </div>

        {/* ===== AOF panel ===== */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
          <div className="font-mono text-[10px] font-bold text-violet-400 mb-2">
            AOF <span className="text-zinc-500 font-normal">— append-only command log</span>
          </div>

          <div className="flex flex-col h-44 gap-1.5">
            {/* memory strip */}
            <div
              className={`rounded-lg border px-2 py-1.5 flex items-center justify-between transition-all duration-300 ${
                memWiped
                  ? "border-red-500 bg-red-950/50"
                  : aof.mode === "rebuilt"
                  ? "border-emerald-500/60 bg-emerald-950/30"
                  : "border-zinc-700 bg-zinc-900/80"
              }`}
            >
              <span className="font-mono text-[9px] text-zinc-400">memory</span>
              {memWiped ? (
                <span className="font-mono text-[9px] text-red-400">
                  ⚡ crash — state lost
                </span>
              ) : aof.mode === "rebuilt" ? (
                <span className="font-mono text-[9px] text-emerald-400">
                  state rebuilt ✓
                </span>
              ) : (
                <div className="flex gap-1">
                  {["a", "b", "d"].map((k) => (
                    <span
                      key={k}
                      className="font-mono text-[8px] px-1 py-px rounded border border-violet-500/50 bg-violet-950/50 text-violet-400"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* incoming command / status row */}
            <div className="h-5 flex items-center justify-center">
              {aof.mode === "append" && aof.log.length > 0 && (
                <span className="font-mono text-[9px] px-1.5 py-px rounded border border-amber-500/50 bg-amber-950/40 text-amber-300">
                  {aof.log[aof.log.length - 1]} ↓ append
                </span>
              )}
              {aof.mode === "replay" && (
                <span className="font-mono text-[9px] text-amber-400">
                  replay log ↻ re-running commands…
                </span>
              )}
              {aof.mode === "crash" && (
                <span className="font-mono text-[9px] text-red-400">⚡ crash</span>
              )}
              {aof.mode === "rebuilt" && (
                <span className="font-mono text-[9px] text-emerald-400">
                  log survived on disk
                </span>
              )}
            </div>

            {/* log file */}
            <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1.5 overflow-hidden flex flex-col justify-end gap-px">
              <span className="font-mono text-[8px] text-zinc-600 mb-auto">
                appendonly.aof
              </span>
              {aof.log.map((line, i) => (
                <span
                  key={`${i}-${line}`}
                  className={`font-mono text-[9px] px-1 rounded transition-colors duration-200 ${
                    aof.mode === "replay" && aof.replayIdx === i
                      ? "bg-amber-950/70 text-amber-300"
                      : "text-zinc-400"
                  }`}
                >
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
        <span className="font-mono text-[10px] text-zinc-500">
          RDB = fast restarts, can lose last few minutes · AOF = minimal loss, bigger
          files · most prod setups use both
        </span>
      </div>
    </div>
  );
}
