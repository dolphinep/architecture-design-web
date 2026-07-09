"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

const TICK_MS = 80;
// phases: route(20) → queue(20) → generate(60) → done(20) → reset(10)
const P_ROUTE  = 20;
const P_QUEUE  = 20;
const P_GEN    = 60;
const P_DONE   = 20;
const CYCLE    = P_ROUTE + P_QUEUE + P_GEN + P_DONE + 10;

const TOKENS = ["The", " answer", " depends", " on", " your", " use", " case.", " For", " small", " models,", " use", " Ollama."];
const MODELS = [
  { name: "llama3.2:3b",  size: "3B",  speed: "~120 t/s", gpu: "4 GB",  accent: "#34d399" },
  { name: "llama3.1:8b",  size: "8B",  speed: "~60 t/s",  gpu: "8 GB",  accent: "#22d3ee" },
  { name: "llama3.1:70b", size: "70B", speed: "~12 t/s",  gpu: "48 GB", accent: "#a78bfa" },
];
const ROUTED_IDX = 0; // routes to 3B for this demo

type Phase = "idle" | "route" | "queue" | "generate" | "done";

export function LLMInferenceViz() {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [routeProgress, setRP]  = useState(0);
  const [tokenCount, setTC]     = useState(0);
  const [queueLen, setQL]       = useState(0);

  const tick     = useRef(0);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      tick.current = (tick.current + 1) % CYCLE;

      const t = tick.current;
      if (t === 0) {
        setPhase("idle");
        setRP(0); setTC(0); setQL(0);
      }

      if (t > 4 && t < P_ROUTE) {
        setPhase("route");
        setRP((t - 4) / (P_ROUTE - 4));
      } else if (t >= P_ROUTE && t < P_ROUTE + P_QUEUE) {
        setPhase("queue");
        setQL(Math.min(3, Math.floor((t - P_ROUTE) / 7) + 1));
      } else if (t >= P_ROUTE + P_QUEUE && t < P_ROUTE + P_QUEUE + P_GEN) {
        setPhase("generate");
        const gen = t - P_ROUTE - P_QUEUE;
        setTC(Math.min(TOKENS.length, Math.floor((gen / P_GEN) * TOKENS.length * 1.3)));
      } else if (t >= P_ROUTE + P_QUEUE + P_GEN) {
        setPhase("done");
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs font-bold text-zinc-300">
          LLM inference routing{" "}
          <span className="text-zinc-600 font-normal">— model selection by task complexity</span>
        </span>
      </div>

      <div className="flex gap-3 items-start">
        {/* Incoming request */}
        <div className="shrink-0 flex flex-col items-center gap-1.5">
          <div className={`rounded-xl border px-2.5 py-2 text-center transition-colors duration-200 ${
            phase !== "idle" ? "border-violet-500/60 bg-violet-950/30" : "border-zinc-800 bg-transparent"
          }`}>
            <div className="font-mono text-[9px] font-bold text-violet-400">Request</div>
            <div className="font-mono text-[8px] text-zinc-600 mt-0.5">1.2k tokens</div>
            <div className="font-mono text-[8px] text-zinc-600">low complexity</div>
          </div>

          {/* routing arrow */}
          <div className="relative w-full flex justify-center">
            <div className={`font-mono text-xs transition-colors duration-200 ${
              phase === "route" ? "text-violet-400" : phase !== "idle" ? "text-zinc-600" : "text-zinc-800"
            }`}>↓</div>
            {phase === "route" && (
              <div className="absolute -right-10 top-0 font-mono text-[9px] text-violet-400/70 whitespace-nowrap">
                routing…
              </div>
            )}
          </div>

          <div className="font-mono text-[9px] text-zinc-600">Router</div>
          <div className="font-mono text-[8px] text-zinc-700">classifies task</div>
        </div>

        {/* Model fleet */}
        <div className="flex-1 flex flex-col gap-1.5">
          {MODELS.map((m, i) => {
            const isRouted  = i === ROUTED_IDX;
            const isActive  = isRouted && (phase === "queue" || phase === "generate" || phase === "done");
            const isIdle    = !isActive;
            return (
              <div
                key={m.name}
                className={`rounded-xl border px-3 py-2 transition-all duration-200 ${
                  isActive
                    ? "border-current bg-zinc-900/80"
                    : "border-zinc-800/60 bg-transparent opacity-50"
                }`}
                style={{ color: isActive ? m.accent : "#52525b" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px] font-bold">{m.name}</span>
                  <span className="font-mono text-[8px] opacity-70">{m.gpu} VRAM</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="font-mono text-[8px] opacity-60">{m.speed}</span>
                  {isActive && phase === "queue" && (
                    <span className="font-mono text-[8px] text-amber-400">
                      queue: {queueLen}
                    </span>
                  )}
                  {isActive && phase === "generate" && (
                    <span className="font-mono text-[8px]" style={{ color: m.accent }}>
                      ▶ generating…
                    </span>
                  )}
                  {isActive && phase === "done" && (
                    <span className="font-mono text-[8px] text-emerald-400">✓ done</span>
                  )}
                  {isIdle && (
                    <span className="font-mono text-[8px] text-zinc-700">idle</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Token stream */}
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 min-h-[48px] flex flex-col justify-center">
        {phase === "idle" && (
          <span className="font-mono text-xs text-zinc-700 italic">waiting for request…</span>
        )}
        {phase === "route" && (
          <span className="font-mono text-xs text-zinc-500">classifying complexity → small model sufficient</span>
        )}
        {phase === "queue" && (
          <span className="font-mono text-xs text-amber-400/80">
            {queueLen} request{queueLen !== 1 ? "s" : ""} queued · processing in order
          </span>
        )}
        {(phase === "generate" || phase === "done") && (
          <div>
            <div className="font-mono text-[9px] text-zinc-600 mb-1">streamed response</div>
            <div className="font-mono text-sm text-emerald-300">
              {TOKENS.slice(0, tokenCount).join("")}
              {phase === "generate" && tokenCount < TOKENS.length && (
                <span className="animate-pulse">▋</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
