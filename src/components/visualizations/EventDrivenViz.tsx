"use client";
import { useState, useCallback } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStats, VizLegend, VizLog,
  VizSvg, VizText, VizEdge, VizPacket, VizNode,
  useFlights, useInterval, useOnScreen, useReducedMotion, useEventLog,
  fadeOut, easeInOut,
  HUE, TYPE, STROKE, MOTION, type HueName, type Flight,
} from "./_shared";

type EventName = "OrderPlaced" | "PaymentFailed" | "UserSignedUp" | "StockUpdated";

interface EventDef {
  name: EventName;
  producer: number;
  hue: HueName;
}

const EVENTS: EventDef[] = [
  { name: "OrderPlaced",   producer: 0, hue: "primary" },
  { name: "StockUpdated",  producer: 0, hue: "success" },
  { name: "PaymentFailed", producer: 1, hue: "danger" },
  { name: "UserSignedUp",  producer: 2, hue: "info" },
];

const PRODUCERS = ["Order Service", "Payment Service", "User Service"];

/**
 * Consumers declare which events they subscribe to. This is the point of the
 * pattern: one published event fans out to *every* interested subscriber, and
 * the producer neither knows nor cares who they are.
 */
const CONSUMERS: Array<{ label: string; subscribes: EventName[] }> = [
  { label: "Analytics",    subscribes: ["OrderPlaced", "PaymentFailed", "UserSignedUp", "StockUpdated"] },
  { label: "Notification", subscribes: ["OrderPlaced", "PaymentFailed", "UserSignedUp"] },
  { label: "Inventory",    subscribes: ["OrderPlaced", "StockUpdated"] },
];

// ─── Layout ───────────────────────────────────────────────────────────────────
const W = 720;
const H = 340;
const PROD_X = 18;
const PROD_W = 138;
const NODE_H = 46;
const BUS_X = 288;
const BUS_W = 116;
const BUS_H = 168;
const CONS_X = 536;
const CONS_W = 166;
const ROW_Y = [52, 142, 232];
const BUS_CY = H / 2 - 6;

interface Hop {
  event: EventDef;
  /** -1 while travelling producer → bus; otherwise the destination consumer */
  consumer: number;
}

export function EventDrivenViz() {
  const [running, setRunning] = useState(false);
  const [focus, setFocus] = useState<EventName | null>(null);
  const [published, setPublished] = useState(0);
  const [delivered, setDelivered] = useState(0);

  const { entries, push, clear: clearLog } = useEventLog(6);
  const { ref: hostRef, onScreen } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  const { flights, launch, clear: clearFlights } = useFlights<Hop>({
    active: onScreen,
    max: 18,
    reduced,
    onLand: (f, launchNext) => {
      if (f.meta.consumer === -1) {
        // Reached the bus — fan out to every subscriber of this event.
        const targets = CONSUMERS.map((c, i) => (c.subscribes.includes(f.meta.event.name) ? i : -1))
          .filter((i) => i >= 0);
        for (const c of targets) {
          launchNext({ event: f.meta.event, consumer: c }, { duration: MOTION.flight, linger: 300 });
        }
        push(`▸ ${f.meta.event.name} → ${targets.length} subscriber${targets.length === 1 ? "" : "s"}`, f.meta.event.hue);
        return;
      }
      setDelivered((n) => n + 1);
    },
  });

  const emit = useCallback((name?: EventName) => {
    const def = name
      ? EVENTS.find((e) => e.name === name)!
      : EVENTS[Math.floor(Math.random() * EVENTS.length)];
    launch({ event: def, consumer: -1 }, { duration: MOTION.base, linger: 200 });
    setPublished((n) => n + 1);
  }, [launch]);

  useInterval(running && onScreen, 1000, () => emit());

  function reset() {
    setRunning(false);
    setPublished(0);
    setDelivered(0);
    setFocus(null);
    clearFlights();
    clearLog();
  }

  const fanout = published ? (delivered / published).toFixed(1) : "0.0";

  /** Producer→bus and bus→consumer anchor points. */
  const prodOut = (i: number): [number, number] => [PROD_X + PROD_W, ROW_Y[i] + NODE_H / 2];
  const busIn: [number, number] = [BUS_X, BUS_CY];
  const busOut: [number, number] = [BUS_X + BUS_W, BUS_CY];
  const consIn = (i: number): [number, number] => [CONS_X, ROW_Y[i] + NODE_H / 2];

  return (
    <VizFrame>
      <VizControls>
        <VizButton variant={running ? "secondary" : "primary"} active={running} onClick={() => setRunning((r) => !r)}>
          {running ? "❙❙ Pause stream" : "▶ Start event stream"}
        </VizButton>
        <VizButton onClick={() => emit()}>+ Emit random</VizButton>
        <VizSpacer />
        <VizButton variant="ghost" onClick={reset}>↺ Reset</VizButton>
      </VizControls>

      {/* Event types double as emit buttons and as a subscription filter */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
          event types — click to emit, or focus to see who subscribes
        </span>
        <div className="flex flex-wrap gap-2">
          {EVENTS.map((e) => {
            const on = focus === e.name;
            const subs = CONSUMERS.filter((c) => c.subscribes.includes(e.name)).length;
            return (
              <div key={e.name} className="inline-flex rounded-lg overflow-hidden border border-zinc-800">
                <button
                  type="button"
                  onClick={() => emit(e.name)}
                  className="px-2.5 py-1 text-[12px] font-mono bg-zinc-900/60 hover:bg-zinc-800 transition-colors
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70"
                  style={{ color: HUE[e.hue].text }}
                  title={`Emit ${e.name}`}
                >
                  {e.name}
                </button>
                <button
                  type="button"
                  onClick={() => setFocus(on ? null : e.name)}
                  aria-pressed={on}
                  title={`${subs} subscriber${subs === 1 ? "" : "s"}`}
                  className={`px-2 py-1 text-[11px] font-mono border-l border-zinc-800 transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
                    ${on ? "bg-violet-500/20 text-violet-200" : "bg-zinc-900/30 text-zinc-500 hover:text-zinc-300"}`}
                >
                  ×{subs}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={hostRef}>
        <VizStage>
          <VizSvg w={W} h={H} label="Three producers publishing events to a bus, which fans each event out to its subscribers">
            {/* Producer → bus */}
            {PRODUCERS.map((_, i) => {
              const emitsFocus = focus === null || EVENTS.some((e) => e.name === focus && e.producer === i);
              return <VizEdge key={i} from={prodOut(i)} to={busIn} hue="primary" dashed arrow dimmed={!emitsFocus} />;
            })}

            {/* Bus → consumer, drawn only where a subscription exists */}
            {CONSUMERS.map((c, i) => {
              const relevant = focus === null || c.subscribes.includes(focus);
              return <VizEdge key={i} from={busOut} to={consIn(i)} hue="success" dashed arrow dimmed={!relevant} />;
            })}

            {/* Producers */}
            {PRODUCERS.map((label, i) => {
              const emitsFocus = focus === null || EVENTS.some((e) => e.name === focus && e.producer === i);
              return (
                <VizNode
                  key={label}
                  x={PROD_X} y={ROW_Y[i]} w={PROD_W} h={NODE_H}
                  title={label} sublabel="producer"
                  hue="primary" dimmed={!emitsFocus}
                />
              );
            })}

            {/* Event bus */}
            <g>
              <rect
                x={BUS_X} y={BUS_CY - BUS_H / 2} width={BUS_W} height={BUS_H} rx={12}
                fill="url(#viz-node-active)" stroke={HUE.info.line} strokeWidth={STROKE.base}
              />
              <VizText x={BUS_X + BUS_W / 2} y={BUS_CY - BUS_H / 2 + 22} size={TYPE.body} weight={700} hue="info">
                Event Bus
              </VizText>
              <VizText x={BUS_X + BUS_W / 2} y={BUS_CY - BUS_H / 2 + 38} size={TYPE.micro} mono fill="#3b82f6">
                Kafka / SNS
              </VizText>
              {/* Topic partitions, as a hint that the bus is durable and ordered */}
              {[0, 1, 2].map((k) => (
                <g key={k}>
                  <rect
                    x={BUS_X + 16} y={BUS_CY - 8 + k * 22} width={BUS_W - 32} height={14} rx={4}
                    fill="#1e1b4b" stroke={HUE.info.base} strokeWidth={STROKE.hairline} strokeOpacity={0.7}
                  />
                  <VizText x={BUS_X + BUS_W / 2} y={BUS_CY - 1 + k * 22} size={TYPE.micro} mono fill="#6366f1">
                    p{k}
                  </VizText>
                </g>
              ))}
            </g>

            {/* Consumers */}
            {CONSUMERS.map((c, i) => {
              const relevant = focus === null || c.subscribes.includes(focus);
              return (
                <g key={c.label}>
                  <VizNode
                    x={CONS_X} y={ROW_Y[i]} w={CONS_W} h={NODE_H}
                    title={c.label}
                    sublabel={`subscribes ×${c.subscribes.length}`}
                    hue="success" dimmed={!relevant}
                  />
                </g>
              );
            })}

            {/* Packets */}
            {flights.map((f: Flight<Hop>) => {
              const dim = focus !== null && f.meta.event.name !== focus;
              const [a, b] = f.meta.consumer === -1
                ? [prodOut(f.meta.event.producer), busIn]
                : [busOut, consIn(f.meta.consumer)];
              const t = easeInOut(f.t);
              return (
                <VizPacket
                  key={f.id}
                  x={a[0] + (b[0] - a[0]) * t}
                  y={a[1] + (b[1] - a[1]) * t}
                  hue={f.meta.event.hue}
                  r={5}
                  opacity={(f.landed ? fadeOut(f) : 1) * (dim ? 0.15 : 1)}
                  label={f.meta.consumer === -1 && f.t > 0.2 ? f.meta.event.name : undefined}
                />
              );
            })}

            {/* Column captions */}
            <VizText x={PROD_X + PROD_W / 2} y={H - 14} size={TYPE.micro} fill="#3f3f46" mono>producers</VizText>
            <VizText x={BUS_X + BUS_W / 2} y={H - 14} size={TYPE.micro} fill="#3f3f46" mono>broker</VizText>
            <VizText x={CONS_X + CONS_W / 2} y={H - 14} size={TYPE.micro} fill="#3f3f46" mono>subscribers</VizText>
          </VizSvg>
        </VizStage>
      </div>

      <VizStats
        items={[
          { label: "events published", value: published, hue: "primary" },
          { label: "deliveries", value: delivered, hue: "success" },
          { label: "avg fan-out", value: `×${fanout}`, hue: "info", note: "per event" },
        ]}
      />

      <VizLog entries={entries} rows={4} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <VizLegend
          items={EVENTS.map((e) => ({ hue: e.hue, label: e.name }))}
        />
        <VizHint>Producers never name their consumers — the bus decides who gets what.</VizHint>
      </div>
    </VizFrame>
  );
}
