"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStatus, VizStats, VizLegend, VizLog,
  VizSvg, VizText, VizEdge, VizPacket,
  useOnScreen, useReducedMotion, useEventLog,
  HUE, TYPE, STROKE, type HueName,
} from "./_shared";

type StepState = "idle" | "running" | "done" | "failed" | "compensating" | "compensated";
type Mode = "happy" | "fail-payment" | "fail-shipping";

interface Step {
  id: string;
  service: string;
  action: string;
  event: string;
  undo: string;
  undoEvent: string;
  store: string;
}

const STEPS: Step[] = [
  { id: "order",     service: "Order",     action: "Create order",    event: "OrderCreated",    undo: "Cancel order",    undoEvent: "OrderCancelled",    store: "orders" },
  { id: "inventory", service: "Inventory", action: "Reserve stock",   event: "StockReserved",   undo: "Release stock",   undoEvent: "StockReleased",     store: "inventory" },
  { id: "payment",   service: "Payment",   action: "Charge card",     event: "PaymentCharged",  undo: "Refund card",     undoEvent: "PaymentRefunded",   store: "payments" },
  { id: "shipping",  service: "Shipping",  action: "Book shipment",   event: "ShipmentCreated", undo: "Cancel shipment", undoEvent: "ShipmentCancelled", store: "shipments" },
];

const FAIL_AT: Record<Mode, string | null> = {
  happy: null,
  "fail-payment": "payment",
  "fail-shipping": "shipping",
};

const MODES: Array<{ v: Mode; label: string; desc: string }> = [
  { v: "happy",          label: "Happy path",      desc: "all four steps commit" },
  { v: "fail-payment",   label: "Payment declines", desc: "roll back 2 steps" },
  { v: "fail-shipping",  label: "Shipping fails",   desc: "roll back 3 steps" },
];

const STEP_MS = 850;

const STATE_HUE: Record<StepState, HueName> = {
  idle: "neutral",
  running: "warning",
  done: "success",
  failed: "danger",
  compensating: "warning",
  compensated: "info",
};

const STATE_GLYPH: Record<StepState, string> = {
  idle: "", running: "…", done: "✓", failed: "✗", compensating: "↩", compensated: "⤺",
};

// ─── Layout ───────────────────────────────────────────────────────────────────
const W = 760;
const H = 230;
const BOX_W = 158;
const BOX_H = 74;
const GAP = 42;
const ROW_Y = 74;
const startX = (W - (STEPS.length * BOX_W + (STEPS.length - 1) * GAP)) / 2;
const xOf = (i: number) => startX + i * (BOX_W + GAP);

const emptyStates = () =>
  Object.fromEntries(STEPS.map((s) => [s.id, "idle" as StepState])) as Record<string, StepState>;

export function SagaViz() {
  const [states, setStates] = useState<Record<string, StepState>>(emptyStates);
  const [mode, setMode] = useState<Mode>("happy");
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<"none" | "committed" | "rolled-back">("none");
  /** The hop currently animating: [fromIndex, toIndex, direction] */
  const [hop, setHop] = useState<{ from: number; to: number; back: boolean; label: string } | null>(null);

  const { entries, push, clear: clearLog } = useEventLog(8);
  const { ref: hostRef } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const run = useCallback((m: Mode) => {
    clearTimers();
    setStates(emptyStates());
    setHop(null);
    setOutcome("none");
    clearLog();
    setRunning(true);
    setMode(m);

    const failAt = FAIL_AT[m];
    const schedule = (ms: number, fn: () => void) => {
      if (reduced) { fn(); return; }
      timers.current.push(setTimeout(fn, ms));
    };

    let clock = 0;
    let failIdx = -1;

    // Forward pass — each step commits locally and emits its event.
    for (let i = 0; i < STEPS.length; i++) {
      const step = STEPS[i];
      const fails = step.id === failAt;
      const start = clock;

      schedule(start, () => {
        setHop({ from: i - 1, to: i, back: false, label: i === 0 ? "PlaceOrder" : STEPS[i - 1].event });
        setStates((p) => ({ ...p, [step.id]: "running" }));
        push(`→ ${step.service}: ${step.action}`, "warning");
      });

      schedule(start + STEP_MS * 0.65, () => {
        if (fails) {
          setStates((p) => ({ ...p, [step.id]: "failed" }));
          setHop(null);
          push(`✗ ${step.service} failed — no global rollback available`, "danger");
        } else {
          setStates((p) => ({ ...p, [step.id]: "done" }));
          push(`✓ ${step.service} committed · ${step.event}`, "success");
        }
      });

      clock += STEP_MS;
      if (fails) { failIdx = i; break; }
    }

    if (failIdx < 0) {
      schedule(clock, () => {
        setHop(null);
        setOutcome("committed");
        setRunning(false);
        push("✓ Saga complete — every step committed", "success");
      });
      return;
    }

    // Compensation pass — undo the committed steps in reverse order.
    for (let i = failIdx - 1; i >= 0; i--) {
      const step = STEPS[i];
      const start = clock;

      schedule(start, () => {
        setHop({ from: i + 1, to: i, back: true, label: STEPS[i + 1].undoEvent });
        setStates((p) => ({ ...p, [step.id]: "compensating" }));
        push(`↩ ${step.service}: ${step.undo}`, "warning");
      });

      schedule(start + STEP_MS * 0.65, () => {
        setStates((p) => ({ ...p, [step.id]: "compensated" }));
        push(`⤺ ${step.service} compensated · ${step.undoEvent}`, "info");
      });

      clock += STEP_MS;
    }

    schedule(clock, () => {
      setHop(null);
      setOutcome("rolled-back");
      setRunning(false);
      push(
        failIdx === 0
          ? "Failed at the first step — nothing to compensate"
          : `Saga rolled back — ${failIdx} compensation${failIdx === 1 ? "" : "s"} applied`,
        "info"
      );
    });
  }, [clearTimers, clearLog, push, reduced]);

  function reset() {
    clearTimers();
    setStates(emptyStates());
    setHop(null);
    setOutcome("none");
    setRunning(false);
    clearLog();
  }

  const committed = STEPS.filter((s) => states[s.id] === "done").length;
  const compensated = STEPS.filter((s) => states[s.id] === "compensated").length;
  const failedStep = STEPS.find((s) => states[s.id] === "failed");

  const statusHue: HueName =
    outcome === "committed" ? "success"
    : outcome === "rolled-back" ? "info"
    : failedStep ? "danger"
    : running ? "warning" : "neutral";

  const statusLabel =
    outcome === "committed" ? "COMMITTED"
    : outcome === "rolled-back" ? "ROLLED BACK"
    : failedStep ? "COMPENSATING"
    : running ? "IN PROGRESS" : "READY";

  return (
    <VizFrame>
      <VizStatus hue={statusHue} label={statusLabel} pulse={running}>
        {outcome === "committed"
          ? "Every local transaction committed. There was never a distributed transaction — just four independent ones."
          : outcome === "rolled-back"
            ? "Each committed step was undone by its own compensating transaction, in reverse order. Note that money was really charged and really refunded — compensation is not a rollback."
            : failedStep
              ? `${failedStep.service} failed. Earlier steps already committed, so they must be explicitly undone.`
              : running
                ? "Each service commits locally and publishes an event that triggers the next."
                : "Pick a scenario. A saga trades atomicity for availability across service boundaries."}
      </VizStatus>

      {/* Scenario */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {MODES.map((m) => {
          const on = mode === m.v;
          return (
            <button
              key={m.v}
              type="button"
              onClick={() => run(m.v)}
              disabled={running}
              aria-pressed={on}
              className={`rounded-xl border px-3 py-2 text-left transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
                disabled:opacity-40 disabled:pointer-events-none
                ${on ? "border-violet-500/60 bg-violet-500/10" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"}`}
            >
              <span className={`block text-[13px] font-medium ${on ? "text-violet-200" : "text-zinc-300"}`}>
                {m.label}
              </span>
              <span className="block text-[11px] text-zinc-500 mt-0.5">{m.desc}</span>
            </button>
          );
        })}
      </div>

      <div ref={hostRef}>
        <VizStage>
          <VizSvg w={W} h={H} label="Four saga steps, each committing locally, with compensating transactions running in reverse on failure">
            {/* Forward chain above, compensation chain below */}
            {STEPS.slice(0, -1).map((_, i) => (
              <VizEdge
                key={`f-${i}`}
                from={[xOf(i) + BOX_W, ROW_Y + BOX_H / 2 - 12]}
                to={[xOf(i + 1), ROW_Y + BOX_H / 2 - 12]}
                hue="success"
                arrow
                active={hop?.to === i + 1 && !hop.back}
                dimmed={states[STEPS[i + 1].id] === "idle"}
              />
            ))}
            {STEPS.slice(0, -1).map((_, i) => {
              const shown = compensated > 0 || Boolean(failedStep);
              return (
                <VizEdge
                  key={`c-${i}`}
                  from={[xOf(i + 1), ROW_Y + BOX_H / 2 + 14]}
                  to={[xOf(i) + BOX_W, ROW_Y + BOX_H / 2 + 14]}
                  hue="info"
                  dashed
                  arrow
                  active={hop?.to === i && Boolean(hop?.back)}
                  dimmed={!shown}
                />
              );
            })}

            {/* Steps */}
            {STEPS.map((step, i) => {
              const st = states[step.id];
              const hue = STATE_HUE[st];
              const c = HUE[hue];
              const x = xOf(i);
              const lit = st !== "idle";
              return (
                <g key={step.id} opacity={lit ? 1 : 0.55} style={{ transition: "opacity 200ms" }}>
                  <rect
                    x={x} y={ROW_Y} width={BOX_W} height={BOX_H} rx={10}
                    fill={lit ? "url(#viz-node-active)" : "url(#viz-node)"}
                    stroke={c.line}
                    strokeWidth={st === "running" || st === "compensating" ? STROKE.thick : STROKE.thin}
                    strokeOpacity={lit ? 1 : 0.5}
                    style={st === "running" || st === "failed" ? { filter: `drop-shadow(0 0 8px ${c.glow}55)` } : undefined}
                  />
                  <VizText x={x + 12} y={ROW_Y + 18} size={TYPE.body} weight={600} anchor="start" fill={HUE.neutral.strong}>
                    {step.service}
                  </VizText>
                  <VizText x={x + BOX_W - 12} y={ROW_Y + 18} size={TYPE.body} weight={700} anchor="end" hue={hue}>
                    {STATE_GLYPH[st]}
                  </VizText>
                  <VizText x={x + 12} y={ROW_Y + 37} size={TYPE.micro} anchor="start" fill="#8b8b96">
                    {st === "compensating" || st === "compensated" ? step.undo : step.action}
                  </VizText>
                  <VizText x={x + 12} y={ROW_Y + 56} size={TYPE.micro} anchor="start" mono hue={hue}>
                    {st === "idle" ? step.store : st === "compensated" ? step.undoEvent : st === "done" ? step.event : st}
                  </VizText>
                  <VizText x={x + BOX_W / 2} y={ROW_Y - 12} size={TYPE.micro} mono fill="#3f3f46">
                    {`step ${i + 1}`}
                  </VizText>
                </g>
              );
            })}

            {/* The packet on the active hop */}
            {hop && hop.from >= 0 && (
              <VizPacket
                x={(xOf(hop.from) + xOf(hop.to) + BOX_W) / 2}
                y={ROW_Y + BOX_H / 2 + (hop.back ? 14 : -12)}
                hue={hop.back ? "info" : "success"}
                r={5}
                label={hop.label}
              />
            )}

            <VizText x={12} y={ROW_Y + BOX_H / 2 - 12} size={TYPE.micro} anchor="start" mono fill="#0f766e">
              forward →
            </VizText>
            <VizText x={12} y={ROW_Y + BOX_H / 2 + 14} size={TYPE.micro} anchor="start" mono fill="#1e40af">
              ← undo
            </VizText>
            <VizText x={W / 2} y={H - 12} size={TYPE.micro} mono fill="#3f3f46">
              no distributed transaction · no two-phase commit · no shared lock
            </VizText>
          </VizSvg>
        </VizStage>
      </div>

      <VizControls>
        <VizButton variant="primary" onClick={() => run(mode)} disabled={running}>
          ▶ Run {MODES.find((m) => m.v === mode)?.label.toLowerCase()}
        </VizButton>
        <VizSpacer />
        <VizButton variant="ghost" onClick={reset}>↺ Reset</VizButton>
      </VizControls>

      <VizStats
        items={[
          { label: "still committed", value: committed, hue: "success", meter: [committed, STEPS.length] },
          { label: "compensations run", value: compensated, hue: "info" },
          { label: "outcome", value: outcome === "none" ? "—" : outcome === "committed" ? "committed" : "rolled back", hue: outcome === "committed" ? "success" : outcome === "rolled-back" ? "info" : "neutral" },
        ]}
      />

      <VizLog entries={entries} rows={5} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <VizLegend
          items={[
            { hue: "success", label: "committed" },
            { hue: "danger", label: "failed" },
            { hue: "info", label: "compensated", dashed: true },
          ]}
        />
        <VizHint>
          A compensation is a new transaction, not an undo — a refund is not an un-charge.
        </VizHint>
      </div>
    </VizFrame>
  );
}
