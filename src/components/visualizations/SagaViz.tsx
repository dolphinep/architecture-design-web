"use client";
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "idle" | "running" | "success" | "failed" | "compensating" | "compensated";
type RunMode = "happy" | "fail-payment" | "fail-shipping";

interface Step {
  id: string;
  service: string;
  action: string;
  event: string;
  compensation: string;
  compEvent: string;
  db: string;
  color: string;
  borderColor: string;
}

interface LogEntry {
  id: number;
  kind: "forward" | "comp" | "info" | "error";
  text: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: "order",
    service: "Order Service",
    action: "Create Order",
    event: "OrderCreated",
    compensation: "Cancel Order",
    compEvent: "OrderCancelled",
    db: "orders DB",
    color: "#4f46e5",
    borderColor: "#818cf8",
  },
  {
    id: "inventory",
    service: "Inventory Service",
    action: "Reserve Stock",
    event: "StockReserved",
    compensation: "Release Stock",
    compEvent: "StockReleased",
    db: "inventory DB",
    color: "#0891b2",
    borderColor: "#22d3ee",
  },
  {
    id: "payment",
    service: "Payment Service",
    action: "Charge Payment",
    event: "PaymentCharged",
    compensation: "Refund Payment",
    compEvent: "PaymentRefunded",
    db: "payments DB",
    color: "#7c3aed",
    borderColor: "#a78bfa",
  },
  {
    id: "shipping",
    service: "Shipping Service",
    action: "Create Shipment",
    event: "ShipmentCreated",
    compensation: "Cancel Shipment",
    compEvent: "ShipmentCancelled",
    db: "shipments DB",
    color: "#059669",
    borderColor: "#34d399",
  },
];

const FAIL_AT: Record<RunMode, string | null> = {
  happy: null,
  "fail-payment": "payment",
  "fail-shipping": "shipping",
};

const STEP_MS = 900;

// ─── Component ────────────────────────────────────────────────────────────────

export function SagaViz() {
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>(
    Object.fromEntries(STEPS.map((s) => [s.id, "idle"]))
  );
  const [activeArrow, setActiveArrow] = useState<{
    from: number; to: number; kind: "forward" | "comp"; label: string;
  } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<RunMode>("happy");
  const logId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function t(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }

  function setStatus(id: string, status: StepStatus) {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  }

  function addLog(kind: LogEntry["kind"], text: string) {
    setLog((prev) => [{ id: logId.current++, kind, text }, ...prev].slice(0, 14));
  }

  function reset() {
    clearTimers();
    setStatuses(Object.fromEntries(STEPS.map((s) => [s.id, "idle"])));
    setActiveArrow(null);
    setLog([]);
    setRunning(false);
  }

  const run = useCallback((selectedMode: RunMode) => {
    clearTimers();
    setStatuses(Object.fromEntries(STEPS.map((s) => [s.id, "idle"])));
    setActiveArrow(null);
    setLog([]);
    setRunning(true);

    const failAt = FAIL_AT[selectedMode];
    let cursor = 0; // ms

    // ── Forward pass ──────────────────────────────────────────────────────────
    let failIndex = -1;

    for (let i = 0; i < STEPS.length; i++) {
      const step = STEPS[i];
      const isFail = step.id === failAt;
      const stepStart = cursor;

      // Show arrow into this step
      t(() => {
        setActiveArrow({
          from: i - 1,
          to: i,
          kind: "forward",
          label: i === 0 ? "PlaceOrder" : STEPS[i - 1].event,
        });
        setStatus(step.id, "running");
        addLog("forward", `→ ${step.service}: ${step.action}`);
      }, stepStart);

      // Outcome
      t(() => {
        if (isFail) {
          setStatus(step.id, "failed");
          setActiveArrow(null);
          addLog("error", `✗ ${step.service} failed — starting compensation`);
        } else {
          setStatus(step.id, "success");
          addLog("forward", `✓ ${step.service} emits ${step.event}`);
        }
      }, stepStart + STEP_MS * 0.7);

      cursor += STEP_MS;

      if (isFail) {
        failIndex = i;
        break;
      }
    }

    // ── Compensation pass (reverse) ───────────────────────────────────────────
    if (failIndex > 0) {
      for (let i = failIndex - 1; i >= 0; i--) {
        const step = STEPS[i];
        const compStart = cursor;

        t(() => {
          setActiveArrow({
            from: i + 1,
            to: i,
            kind: "comp",
            label: STEPS[i + 1].compEvent,
          });
          setStatus(step.id, "compensating");
          addLog("comp", `↩ ${step.service}: ${step.compensation}`);
        }, compStart);

        t(() => {
          setStatus(step.id, "compensated");
          addLog("comp", `✓ ${step.service} emits ${step.compEvent}`);
        }, compStart + STEP_MS * 0.7);

        cursor += STEP_MS;
      }

      t(() => {
        setActiveArrow(null);
        addLog("info", "Saga rolled back — all compensations complete");
        setRunning(false);
      }, cursor);
    } else if (failIndex === -1) {
      // happy path finish
      t(() => {
        setActiveArrow(null);
        addLog("info", "✓ Saga completed successfully");
        setRunning(false);
      }, cursor);
    } else {
      // failed at first step — no compensation needed
      t(() => {
        setActiveArrow(null);
        addLog("info", "Saga failed at first step — no compensation needed");
        setRunning(false);
      }, cursor + 400);
    }
  }, []);

  useEffect(() => () => clearTimers(), []);

  // ─── Status colours ───────────────────────────────────────────────────────

  function stepBg(id: string) {
    const s = statuses[id];
    if (s === "success")      return "bg-emerald-950/60 border-emerald-500";
    if (s === "failed")       return "bg-red-950/60 border-red-500";
    if (s === "running")      return "bg-indigo-950/60 border-indigo-400";
    if (s === "compensating") return "bg-amber-950/60 border-amber-500";
    if (s === "compensated")  return "bg-zinc-900/60 border-zinc-600";
    return "bg-zinc-900/40 border-zinc-800";
  }

  function stepLabel(id: string) {
    const s = statuses[id];
    if (s === "success")      return <span className="text-[10px] text-emerald-400">✓ done</span>;
    if (s === "failed")       return <span className="text-[10px] text-red-400">✗ failed</span>;
    if (s === "running")      return <span className="text-[10px] text-indigo-400 animate-pulse">⋯ running</span>;
    if (s === "compensating") return <span className="text-[10px] text-amber-400 animate-pulse">↩ rolling back</span>;
    if (s === "compensated")  return <span className="text-[10px] text-zinc-500">↩ compensated</span>;
    return <span className="text-[10px] text-zinc-700">idle</span>;
  }

  // ─── SVG layout ───────────────────────────────────────────────────────────
  const W = 600;
  const boxW = 110;
  const boxH = 70;
  const gapX = (W - STEPS.length * boxW) / (STEPS.length + 1);
  const stepX = (i: number) => gapX + i * (boxW + gapX) + boxW / 2; // centre x
  const boxY = 20;
  const arrowY = boxY + boxH / 2;

  return (
    <div className="flex flex-col gap-5">

      {/* Mode selector */}
      <div className="flex flex-wrap gap-2">
        {([
          { value: "happy",        label: "Happy path",         color: "text-emerald-400" },
          { value: "fail-payment", label: "Fail at Payment",    color: "text-red-400" },
          { value: "fail-shipping",label: "Fail at Shipping",   color: "text-amber-400" },
        ] as const).map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${
              mode === value
                ? "bg-zinc-700 border-zinc-500 text-white"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <span className={`${mode === value ? color : ""}`}>{label}</span>
          </button>
        ))}
      </div>

      {/* Diagram */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <svg width={W} height={160} viewBox={`0 0 ${W} 160`} className="overflow-visible">
          <defs>
            <marker id="saga-fwd" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" fill="#6366f1" />
            </marker>
            <marker id="saga-comp" markerWidth="7" markerHeight="5" refX="0" refY="2.5" orient="auto-start-reverse">
              <polygon points="0 0, 7 2.5, 0 5" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Static connector lines */}
          {STEPS.map((_, i) => {
            if (i === STEPS.length - 1) return null;
            const x1 = stepX(i) + boxW / 2;
            const x2 = stepX(i + 1) - boxW / 2;
            return (
              <line key={i} x1={x1} y1={arrowY} x2={x2} y2={arrowY}
                stroke="#27272a" strokeWidth="1" strokeDasharray="4,3" />
            );
          })}

          {/* Active animated arrow */}
          {activeArrow && (() => {
            const { from, to, kind, label } = activeArrow;
            const isComp = kind === "comp";
            const x1 = from < 0 ? 0 : stepX(from) + (isComp ? -boxW / 2 : boxW / 2);
            const x2 = stepX(to) + (isComp ? boxW / 2 : -boxW / 2);
            const arrowColor = isComp ? "#f59e0b" : "#818cf8";
            return (
              <g>
                <line
                  x1={x1} y1={arrowY + (isComp ? 12 : -12)}
                  x2={x2} y2={arrowY + (isComp ? 12 : -12)}
                  stroke={arrowColor} strokeWidth="2"
                  markerEnd={isComp ? undefined : "url(#saga-fwd)"}
                  markerStart={isComp ? "url(#saga-comp)" : undefined}
                  style={{ filter: `drop-shadow(0 0 4px ${arrowColor})` }}
                />
                <text
                  x={(x1 + x2) / 2} y={arrowY + (isComp ? 26 : -16)}
                  textAnchor="middle" fill={arrowColor}
                  fontSize="8" fontFamily="monospace"
                >
                  {label}
                </text>
              </g>
            );
          })()}

          {/* Step boxes */}
          {STEPS.map((step, i) => {
            const cx = stepX(i);
            const bx = cx - boxW / 2;
            const status = statuses[step.id];
            const isRunning = status === "running" || status === "compensating";

            const stroke =
              status === "success"      ? "#059669" :
              status === "failed"       ? "#ef4444" :
              status === "running"      ? "#818cf8" :
              status === "compensating" ? "#f59e0b" :
              status === "compensated"  ? "#52525b" :
              "#3f3f46";

            const fill =
              status === "success"      ? "#052e16" :
              status === "failed"       ? "#450a0a" :
              status === "running"      ? "#1e1b4b" :
              status === "compensating" ? "#1c1407" :
              status === "compensated"  ? "#18181b" :
              "#09090b";

            return (
              <g key={step.id}>
                <rect x={bx} y={boxY} width={boxW} height={boxH} rx={10}
                  fill={fill} stroke={stroke}
                  strokeWidth={isRunning ? 2 : 1}
                  style={isRunning ? { filter: `drop-shadow(0 0 6px ${stroke})` } : {}}
                />
                <text x={cx} y={boxY + 18} textAnchor="middle"
                  fill="#e4e4e7" fontSize="9.5" fontWeight="700" fontFamily="sans-serif">
                  {step.service}
                </text>
                <text x={cx} y={boxY + 32} textAnchor="middle"
                  fill={stroke} fontSize="8.5" fontFamily="sans-serif">
                  {status === "compensating" ? step.compensation : step.action}
                </text>
                {/* DB badge */}
                <rect x={bx + 10} y={boxY + 42} width={boxW - 20} height={18} rx={4}
                  fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                <text x={cx} y={boxY + 55} textAnchor="middle"
                  fill="#52525b" fontSize="7.5" fontFamily="monospace">
                  {step.db}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          <g transform="translate(0, 135)">
            <circle cx={8} cy={8} r={4} fill="#818cf8" />
            <text x={16} y={12} fill="#71717a" fontSize="8" fontFamily="sans-serif">forward transaction</text>
            <circle cx={130} cy={8} r={4} fill="#f59e0b" />
            <text x={138} y={12} fill="#71717a" fontSize="8" fontFamily="sans-serif">compensating transaction</text>
            <circle cx={290} cy={8} r={4} fill="#ef4444" />
            <text x={298} y={12} fill="#71717a" fontSize="8" fontFamily="sans-serif">failure point</text>
          </g>
        </svg>
      </div>

      {/* Step detail cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STEPS.map((step) => {
          const status = statuses[step.id];
          return (
            <div
              key={step.id}
              className={`rounded-xl border p-3 flex flex-col gap-1.5 transition-all ${stepBg(step.id)}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-zinc-200 leading-snug">{step.service}</span>
                {stepLabel(step.id)}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono leading-snug">
                {status === "compensating" || status === "compensated"
                  ? `↩ ${step.compensation}`
                  : step.action}
              </span>
              <span className="text-[10px] text-zinc-700 font-mono">{step.db}</span>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => run(mode)}
          disabled={running}
          className="px-4 py-1.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? "⏳ Running…" : "▶ Run Saga"}
        </button>
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
        >
          ↺ Reset
        </button>
        <span className="text-xs text-zinc-600">
          {mode === "happy"
            ? "All steps succeed — saga completes."
            : mode === "fail-payment"
            ? "Payment fails — inventory reservation is compensated."
            : "Shipping fails — payment and inventory are both compensated."}
        </span>
      </div>

      {/* Event log */}
      {log.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-1 font-mono text-xs">
          {log.map((entry) => {
            const color =
              entry.kind === "forward" ? "text-indigo-400" :
              entry.kind === "comp"    ? "text-amber-400" :
              entry.kind === "error"   ? "text-red-400" :
              "text-emerald-400";
            const prefix =
              entry.kind === "forward" ? "[TX]   " :
              entry.kind === "comp"    ? "[COMP] " :
              entry.kind === "error"   ? "[FAIL] " :
              "[SAGA] ";
            return (
              <div key={entry.id} className={color}>
                <span className="opacity-40">{prefix}</span>{entry.text}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
