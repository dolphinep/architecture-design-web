"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

const TICK_MS  = 80;
const HOLD     = 18; // ticks per stage
const STAGES   = 6;
const CYCLE    = STAGES * HOLD + 16; // +16 idle ticks at end

const STAGE_DEF = [
  { label: "Query",    color: "#a78bfa", desc: "What is RAG?" },
  { label: "Embed",    color: "#22d3ee", desc: "[0.21, -0.83, 0.44…]" },
  { label: "Search",   color: "#34d399", desc: "1.2M vectors scanned" },
  { label: "Retrieve", color: "#fbbf24", desc: "Top 3 chunks found" },
  { label: "Augment",  color: "#a78bfa", desc: "Context + prompt built" },
  { label: "Generate", color: "#34d399", desc: "Streaming response…" },
] as const;

const RESPONSE_TOKENS = ["RAG", " grounds", " LLM", " responses", " in", " real", " data."];

export function RAGPipelineViz() {
  const [activeStage, setActiveStage]   = useState(-1);
  const [stageProgress, setStageProgress] = useState(0); // 0..1 within stage
  const [tokenCount, setTokenCount]     = useState(0);

  const tick     = useRef(0);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      tick.current = (tick.current + 1) % CYCLE;

      const t    = tick.current;
      const idle = t >= STAGES * HOLD;
      const stage = idle ? -1 : Math.floor(t / HOLD);
      const prog  = idle ? 0  : (t % HOLD) / HOLD;

      // token counter for generate stage
      const tokens = stage === STAGES - 1
        ? Math.min(RESPONSE_TOKENS.length, Math.floor(prog * RESPONSE_TOKENS.length * 1.4))
        : 0;

      setActiveStage(stage);
      setStageProgress(prog);
      setTokenCount(tokens);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pausedRef]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs font-bold text-zinc-300">
          RAG pipeline{" "}
          <span className="text-zinc-600 font-normal">— retrieval-augmented generation</span>
        </span>
      </div>

      {/* Stage boxes */}
      <div className="flex gap-1.5 items-center mb-4 overflow-x-auto">
        {STAGE_DEF.map((s, i) => {
          const isActive = activeStage === i;
          const isDone   = activeStage > i;
          return (
            <div key={i} className="flex items-center gap-1.5 shrink-0">
              <div
                className={`rounded-xl border px-2.5 py-2 transition-all duration-150 min-w-[76px] text-center ${
                  isActive
                    ? "border-current bg-zinc-900/80 shadow-[0_0_12px_currentColor]/20"
                    : isDone
                      ? "border-zinc-700 bg-zinc-900/30"
                      : "border-zinc-800/40 bg-transparent"
                }`}
                style={{ color: isActive ? s.color : isDone ? "#52525b" : "#3f3f46" }}
              >
                <div className="font-mono text-[10px] font-bold">{s.label}</div>
                {isActive && (
                  <div className="mt-1 h-0.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{ width: `${stageProgress * 100}%`, background: s.color }}
                    />
                  </div>
                )}
                {isDone && (
                  <div className="font-mono text-[8px] mt-0.5" style={{ color: "#52525b" }}>✓</div>
                )}
              </div>
              {i < STAGE_DEF.length - 1 && (
                <span
                  className="font-mono text-[10px] transition-colors duration-300"
                  style={{ color: isDone ? "#52525b" : "#3f3f46" }}
                >→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Active stage detail */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 min-h-[64px] flex flex-col justify-center">
        {activeStage < 0 && (
          <span className="font-mono text-xs text-zinc-700 italic">waiting for query…</span>
        )}
        {activeStage === 0 && (
          <div>
            <div className="font-mono text-[10px] text-zinc-500 mb-1">user query</div>
            <div className="font-mono text-sm text-violet-300">"{STAGE_DEF[0].desc}"</div>
          </div>
        )}
        {activeStage === 1 && (
          <div>
            <div className="font-mono text-[10px] text-zinc-500 mb-1">embedding model → dense vector</div>
            <div className="font-mono text-xs text-cyan-300 tracking-tight">{STAGE_DEF[1].desc}</div>
            <div className="font-mono text-[9px] text-zinc-600 mt-1">768 dimensions · cosine similarity</div>
          </div>
        )}
        {activeStage === 2 && (
          <div>
            <div className="font-mono text-[10px] text-zinc-500 mb-1">HNSW index lookup</div>
            <div className="font-mono text-xs text-emerald-300">{STAGE_DEF[2].desc}</div>
            <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-75"
                style={{ width: `${stageProgress * 100}%` }}
              />
            </div>
          </div>
        )}
        {activeStage === 3 && (
          <div>
            <div className="font-mono text-[10px] text-zinc-500 mb-1">retrieved context</div>
            <div className="flex flex-col gap-1">
              {["chunk_042 · sim 0.91", "chunk_017 · sim 0.87", "chunk_103 · sim 0.82"].slice(
                0,
                Math.max(1, Math.ceil(stageProgress * 3))
              ).map((c, i) => (
                <div key={i} className="font-mono text-[10px] text-amber-300">{c}</div>
              ))}
            </div>
          </div>
        )}
        {activeStage === 4 && (
          <div>
            <div className="font-mono text-[10px] text-zinc-500 mb-1">prompt construction</div>
            <div className="font-mono text-[10px] text-zinc-400">
              <span className="text-zinc-600">system:</span> Answer using the context below.<br />
              <span className="text-zinc-600">context:</span> <span className="text-amber-300/70">[3 chunks]</span><br />
              <span className="text-zinc-600">user:</span> <span className="text-violet-300/70">What is RAG?</span>
            </div>
          </div>
        )}
        {activeStage === 5 && (
          <div>
            <div className="font-mono text-[10px] text-zinc-500 mb-1">LLM response (streaming)</div>
            <div className="font-mono text-sm text-emerald-300">
              {RESPONSE_TOKENS.slice(0, tokenCount).join("")}
              {tokenCount < RESPONSE_TOKENS.length && (
                <span className="animate-pulse">▋</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-4 text-[10px] font-mono text-zinc-600">
        <span className="text-violet-400/70">● query</span>
        <span className="text-cyan-400/70">● embed</span>
        <span className="text-emerald-400/70">● retrieve</span>
        <span className="text-amber-400/70">● chunks</span>
        <span className="ml-auto">grounded · no hallucination</span>
      </div>
    </div>
  );
}
