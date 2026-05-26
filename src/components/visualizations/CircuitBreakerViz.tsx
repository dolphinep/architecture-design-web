"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type CBState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface Request {
  id: number;
  state: "flying" | "success" | "fail" | "blocked";
  progress: number;
}

const FAILURE_THRESHOLD = 3;
const SUCCESS_THRESHOLD = 2;
const RESET_TIMEOUT_MS = 4000;

const STATE_META: Record<CBState, { color: string; bg: string; border: string; label: string; desc: string }> = {
  CLOSED:    { color: "text-emerald-400", bg: "bg-emerald-950/50",  border: "border-emerald-500", label: "CLOSED",    desc: "Traffic flows normally. Failures are counted." },
  OPEN:      { color: "text-red-400",     bg: "bg-red-950/50",      border: "border-red-500",     label: "OPEN",      desc: "All calls fail immediately. Service gets breathing room." },
  HALF_OPEN: { color: "text-amber-400",   bg: "bg-amber-950/50",    border: "border-amber-500",   label: "HALF-OPEN", desc: "One probe request allowed. Success → CLOSED. Fail → OPEN." },
};

export function CircuitBreakerViz() {
  const [cbState, setCbState] = useState<CBState>("CLOSED");
  const [failures, setFailures] = useState(0);
  const [successes, setSuccesses] = useState(0);
  const [requests, setRequests] = useState<Request[]>([]);
  const [log, setLog] = useState<Array<{ text: string; color: string }>>([]);
  const [running, setRunning] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(0);

  const stateRef = useRef<CBState>("CLOSED");
  const failuresRef = useRef(0);
  const successesRef = useRef(0);
  const reqId = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  stateRef.current = cbState;
  failuresRef.current = failures;
  successesRef.current = successes;

  const addLog = useCallback((text: string, color: string) => {
    setLog((prev) => [{ text, color }, ...prev].slice(0, 8));
  }, []);

  const transitionTo = useCallback((next: CBState) => {
    setCbState(next);
    stateRef.current = next;
    if (next === "OPEN") {
      addLog("Circuit OPENED — all calls blocked", "text-red-400");
      setResetCountdown(RESET_TIMEOUT_MS / 1000);
      if (cdRef.current) clearInterval(cdRef.current);
      cdRef.current = setInterval(() => {
        setResetCountdown((c) => {
          if (c <= 1) {
            if (cdRef.current) clearInterval(cdRef.current);
            transitionTo("HALF_OPEN");
            setSuccesses(0); successesRef.current = 0;
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else if (next === "HALF_OPEN") {
      addLog("Circuit HALF-OPEN — sending probe", "text-amber-400");
    } else if (next === "CLOSED") {
      addLog("Circuit CLOSED — service recovered", "text-emerald-400");
      setFailures(0); failuresRef.current = 0;
      setSuccesses(0); successesRef.current = 0;
    }
  }, [addLog]);

  const sendRequest = useCallback((forceOutcome?: "success" | "fail") => {
    const state = stateRef.current;

    if (state === "OPEN") {
      const r: Request = { id: reqId.current++, state: "blocked", progress: 0 };
      setRequests((prev) => [...prev.slice(-6), r]);
      addLog("× Blocked (circuit OPEN)", "text-red-500");
      return;
    }

    if (state === "HALF_OPEN" && forceOutcome !== "success") {
      forceOutcome = Math.random() < 0.6 ? "success" : "fail";
    }

    const outcome = forceOutcome ?? (Math.random() < 0.45 ? "fail" : "success");
    const r: Request = { id: reqId.current++, state: "flying", progress: 0 };
    setRequests((prev) => [...prev.slice(-6), r]);

    setTimeout(() => {
      setRequests((prev) =>
        prev.map((p) => (p.id === r.id ? { ...p, state: outcome } : p))
      );

      if (outcome === "fail") {
        const newF = failuresRef.current + 1;
        setFailures(newF); failuresRef.current = newF;
        addLog(`✗ Request failed (${newF}/${FAILURE_THRESHOLD} threshold)`, "text-red-400");
        if (stateRef.current === "CLOSED" && newF >= FAILURE_THRESHOLD) {
          transitionTo("OPEN");
        } else if (stateRef.current === "HALF_OPEN") {
          transitionTo("OPEN");
        }
      } else {
        const newS = successesRef.current + 1;
        setSuccesses(newS); successesRef.current = newS;
        addLog(`✓ Request succeeded`, "text-emerald-400");
        if (stateRef.current === "HALF_OPEN" && newS >= SUCCESS_THRESHOLD) {
          transitionTo("CLOSED");
        }
      }
    }, 700);
  }, [addLog, transitionTo]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => sendRequest(), 1200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, sendRequest]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (resetRef.current) clearTimeout(resetRef.current);
      if (cdRef.current) clearInterval(cdRef.current);
    };
  }, []);

  useEffect(() => {
    let raf: number;
    function tick() {
      setRequests((prev) =>
        prev.map((r) =>
          r.state === "flying" ? { ...r, progress: Math.min(r.progress + 0.04, 1) } : r
        )
      );
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const meta = STATE_META[cbState];

  return (
    <div className="flex flex-col gap-5">
      {/* State indicator */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${meta.bg} ${meta.border}`}>
        <div className={`w-3 h-3 rounded-full ${
          cbState === "CLOSED" ? "bg-emerald-400" :
          cbState === "OPEN" ? "bg-red-400" : "bg-amber-400"
        } ${cbState !== "CLOSED" ? "" : "animate-pulse"}`} />
        <div>
          <span className={`font-mono font-bold text-sm ${meta.color}`}>{meta.label}</span>
          {" "}
          <span className="text-sm text-zinc-400">{meta.desc}</span>
        </div>
        {cbState === "OPEN" && resetCountdown > 0 && (
          <span className="ml-auto font-mono text-xs text-red-400 bg-red-950/50 px-2 py-1 rounded">
            retry in {resetCountdown}s
          </span>
        )}
      </div>

      {/* State machine diagram */}
      <div className="flex items-center justify-center gap-0">
        {(["CLOSED", "OPEN", "HALF_OPEN"] as CBState[]).map((s, i) => {
          const m = STATE_META[s];
          const isActive = cbState === s;
          return (
            <div key={s} className="flex items-center">
              <div className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl border transition-all ${
                isActive ? `${m.bg} ${m.border} scale-105` : "border-zinc-800 bg-zinc-900/30"
              }`}>
                <span className={`text-xs font-mono font-bold ${isActive ? m.color : "text-zinc-600"}`}>
                  {m.label}
                </span>
              </div>
              {i < 2 && (
                <svg width="40" height="20" className="shrink-0">
                  <defs>
                    <marker id={`arr-${i}`} markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                      <polygon points="0 0, 6 2.5, 0 5" fill="#52525b" />
                    </marker>
                  </defs>
                  <line x1="0" y1="10" x2="34" y2="10" stroke="#52525b" strokeWidth="1" markerEnd={`url(#arr-${i})`} />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Traffic visualization */}
      <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden" style={{ height: 80 }}>
        <div className="absolute inset-0 flex items-center px-6 justify-between pointer-events-none">
          <div className="text-xs text-zinc-600 font-mono">client</div>
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${meta.border} ${meta.bg}`}>
            <span className={`text-xs font-mono font-bold ${meta.color}`}>CB</span>
          </div>
          <div className="text-xs text-zinc-600 font-mono">service</div>
        </div>

        {requests.map((r) => {
          if (r.state === "blocked") {
            return (
              <div
                key={r.id}
                className="absolute top-1/2 -translate-y-1/2 text-red-500 text-xs font-mono"
                style={{ left: "22%", animation: "fade-up 0.3s ease" }}
              >
                ✗
              </div>
            );
          }
          const x = r.state === "flying"
            ? `${20 + r.progress * 60}%`
            : r.state === "success"
            ? "85%"
            : "80%";
          const color = r.state === "success" ? "#34d399" : r.state === "fail" ? "#f87171" : "#a78bfa";
          return (
            <div
              key={r.id}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-opacity"
              style={{
                left: x,
                background: color,
                boxShadow: `0 0 6px ${color}`,
                opacity: r.state === "flying" ? 1 : 0.5,
                transition: r.state === "flying" ? "none" : "opacity 0.5s",
              }}
            />
          );
        })}
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-center">
          <div className={`text-2xl font-bold font-mono ${failures >= FAILURE_THRESHOLD ? "text-red-400" : "text-zinc-300"}`}>
            {failures}
          </div>
          <div className="text-xs text-zinc-600 mt-0.5">failures (/{FAILURE_THRESHOLD})</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-center">
          <div className="text-2xl font-bold font-mono text-emerald-400">{successes}</div>
          <div className="text-xs text-zinc-600 mt-0.5">successes (/{SUCCESS_THRESHOLD})</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-center">
          <div className={`text-2xl font-bold font-mono ${meta.color}`}>{meta.label}</div>
          <div className="text-xs text-zinc-600 mt-0.5">circuit state</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            running ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-100" : "bg-violet-600 hover:bg-violet-500 text-white"
          }`}
        >
          {running ? "⏸ Pause" : "▶ Auto simulate"}
        </button>
        <button
          onClick={() => sendRequest("success")}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
        >
          ✓ Send success
        </button>
        <button
          onClick={() => sendRequest("fail")}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
        >
          ✗ Send failure
        </button>
        <button
          onClick={() => { setCbState("CLOSED"); setFailures(0); setSuccesses(0); setLog([]); setRequests([]); setRunning(false); setResetCountdown(0); if (cdRef.current) clearInterval(cdRef.current); }}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      {/* Event log */}
      {log.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-1 font-mono text-xs">
          {log.map((entry, i) => (
            <div key={i} className={`${entry.color} opacity-${100 - i * 10}`}>
              {entry.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
