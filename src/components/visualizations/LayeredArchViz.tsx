"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  VizFrame, VizStage, VizHint, VizButton, VizSpacer,
  VizStatus, VizStats, VizLegend, VizDetail, VizField, VizChip,
  VizSvg, VizText, VizPacket,
  useOnScreen, useReducedMotion,
  HUE, TYPE, STROKE, type HueName,
} from "./_shared";

type LayerId = "presentation" | "business" | "persistence" | "database";
type Mode = "normal" | "sinkhole";

interface Layer {
  id: LayerId;
  label: string;
  sublabel: string;
  hue: HueName;
  examples: string[];
  desc: string;
  /** What this layer contributes on a plain read-through request */
  onRead: string;
  /** What it contributes when the request is a pass-through (the sinkhole) */
  onSinkhole: string;
}

const LAYERS: Layer[] = [
  {
    id: "presentation",
    label: "Presentation",
    sublabel: "controller · API · UI",
    hue: "info",
    examples: ["HTTP Controller", "REST endpoint", "GraphQL resolver"],
    desc: "Receives the request, validates shape, formats the response. Knows nothing about business rules or storage.",
    onRead: "parse + validate request",
    onSinkhole: "parse request",
  },
  {
    id: "business",
    label: "Business Logic",
    sublabel: "service · use case · domain",
    hue: "primary",
    examples: ["OrderService", "PricingEngine", "AuthService"],
    desc: "Every business rule, validation and workflow lives here. Must not depend on HTTP, SQL, or any UI framework.",
    onRead: "apply pricing + entitlement rules",
    onSinkhole: "— nothing, just forwards the call",
  },
  {
    id: "persistence",
    label: "Persistence",
    sublabel: "repository · DAO · ORM",
    hue: "warning",
    examples: ["UserRepository", "Prisma", "SQLAlchemy"],
    desc: "Translates domain objects to rows and back. The layer above calls an interface and never sees SQL.",
    onRead: "map domain object ↔ row",
    onSinkhole: "— nothing, just forwards the call",
  },
  {
    id: "database",
    label: "Database",
    sublabel: "SQL · NoSQL · cache",
    hue: "success",
    examples: ["PostgreSQL", "MongoDB", "Redis"],
    desc: "Raw storage. Pure infrastructure — no application logic belongs here.",
    onRead: "SELECT … WHERE id = ?",
    onSinkhole: "SELECT … WHERE id = ?",
  },
];

/** Down through every layer, then back up. */
const PATH: LayerId[] = [
  "presentation", "business", "persistence", "database",
  "persistence", "business", "presentation",
];
/** Index in PATH at which the response starts travelling back up. */
const TURN = 3;

const LH = 62;
const GAP = 14;
const W = 470;
const LW = 320;
const LX = 58;
const TOP = 30;
const H = TOP + LAYERS.length * (LH + GAP) + 20;

const layerY = (i: number) => TOP + i * (LH + GAP);
const indexOf = (id: LayerId) => LAYERS.findIndex((l) => l.id === id);

export function LayeredArchViz() {
  const [mode, setMode] = useState<Mode>("normal");
  const [active, setActive] = useState<LayerId | null>(null);
  /** -1 = idle; otherwise the index into PATH the request has reached. */
  const [at, setAt] = useState(-1);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const { ref: hostRef } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const send = useCallback(() => {
    clearTimers();
    setDone(false);
    setActive(null);

    if (reduced) { setAt(PATH.length - 1); setDone(true); return; }

    setRunning(true);
    setAt(-1);

    let clock = 260;
    PATH.forEach((id, i) => {
      // A pass-through layer is quick — that speed *is* the sinkhole smell.
      const passThrough =
        mode === "sinkhole" && (id === "business" || id === "persistence");
      timers.current.push(setTimeout(() => setAt(i), clock));
      clock += passThrough ? 200 : 620;
    });

    timers.current.push(setTimeout(() => {
      setRunning(false);
      setDone(true);
    }, clock));
  }, [clearTimers, mode, reduced]);

  function reset() {
    clearTimers();
    setAt(-1);
    setRunning(false);
    setDone(false);
    setActive(null);
  }

  const currentId = at >= 0 && at < PATH.length ? PATH[at] : null;
  const returning = at > TURN;
  const activeLayer = active ? LAYERS[indexOf(active)] : null;

  // Layers that added nothing on this trip
  const passThroughCount = mode === "sinkhole" ? 2 : 0;
  const usefulLayers = LAYERS.length - passThroughCount;

  return (
    <VizFrame>
      <VizStatus
        hue={done && mode === "sinkhole" ? "warning" : done ? "success" : running ? "primary" : "neutral"}
        label={
          done && mode === "sinkhole" ? "SINKHOLE"
          : done ? "200 OK"
          : currentId ? `${returning ? "↑" : "↓"} ${LAYERS[indexOf(currentId)].label.toUpperCase()}`
          : "READY"
        }
        pulse={running}
      >
        {done && mode === "sinkhole"
          ? "Two of four layers added nothing — they only forwarded the call. That is the sinkhole anti-pattern: the cost of the indirection with none of the benefit."
          : done
            ? "Each layer did real work on the way down and on the way back up."
            : currentId
              ? (mode === "sinkhole" ? LAYERS[indexOf(currentId)].onSinkhole : LAYERS[indexOf(currentId)].onRead)
              : "Send a request and watch it travel down the stack and back. Each layer may only call the one directly below it."}
      </VizStatus>

      {/* Scenario */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl overflow-hidden border border-zinc-800">
          {([
            { v: "normal" as Mode, label: "Every layer earns its keep" },
            { v: "sinkhole" as Mode, label: "Sinkhole anti-pattern" },
          ]).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => { setMode(v); reset(); }}
              aria-pressed={mode === v}
              className={`px-3.5 py-1.5 text-[13px] font-medium transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
                ${mode === v
                  ? v === "sinkhole" ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/20 text-emerald-200"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <VizSpacer />
        <VizButton variant="primary" onClick={send} disabled={running}>
          {running ? "⏳ In flight…" : "▶ Send request"}
        </VizButton>
        <VizButton variant="ghost" onClick={reset}>↺ Reset</VizButton>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div ref={hostRef} className="w-full lg:flex-1 min-w-0">
          <VizStage>
            <VizSvg w={W} h={H} label="Four stacked layers with a request travelling down and a response returning up">
              {/* Allowed call direction rail */}
              <VizText x={W / 2} y={12} size={TYPE.micro} anchor="middle" mono fill="#3f3f46">
                a layer may only call the one directly below it
              </VizText>

              {LAYERS.map((layer, i) => {
                const y = layerY(i);
                const isHere = currentId === layer.id;
                const isActive = active === layer.id;
                const passThrough = mode === "sinkhole" && (layer.id === "business" || layer.id === "persistence");
                const hue: HueName = isHere ? (passThrough ? "warning" : layer.hue) : layer.hue;
                const c = HUE[hue];
                const touched = at >= 0 && PATH.slice(0, at + 1).includes(layer.id);

                return (
                  <g key={layer.id}>
                    <rect
                      x={LX} y={y} width={LW} height={LH} rx={10}
                      fill={isHere || isActive ? "url(#viz-node-active)" : "url(#viz-node)"}
                      stroke={c.line}
                      strokeWidth={isHere ? STROKE.thick : isActive ? STROKE.base : STROKE.thin}
                      strokeOpacity={touched || isActive || at < 0 ? 1 : 0.45}
                      tabIndex={0}
                      role="button"
                      aria-label={`${layer.label}: ${layer.sublabel}`}
                      aria-pressed={isActive}
                      onClick={() => setActive(isActive ? null : layer.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(isActive ? null : layer.id); }
                      }}
                      className="viz-node-interactive"
                      style={{ cursor: "pointer", outline: "none" }}
                    />
                    <VizText x={LX + 14} y={y + 22} size={TYPE.body} weight={600} anchor="start" fill={HUE.neutral.strong}>
                      {layer.label}
                    </VizText>
                    <VizText x={LX + 14} y={y + 42} size={TYPE.micro} anchor="start" mono fill="#7c7c88">
                      {layer.sublabel}
                    </VizText>

                    {/* Pass-through badge — the visible symptom of a sinkhole */}
                    {passThrough && (
                      <>
                        <rect
                          x={LX + LW - 108} y={y + LH / 2 - 11} width={94} height={22} rx={6}
                          fill={HUE.warning.base} fillOpacity={0.18}
                          stroke={HUE.warning.line} strokeWidth={STROKE.hairline}
                        />
                        <VizText x={LX + LW - 61} y={y + LH / 2} size={TYPE.micro} mono hue="warning">
                          pass-through
                        </VizText>
                      </>
                    )}

                    {/* Vertical connector to the next layer down */}
                    {i < LAYERS.length - 1 && (
                      <line
                        x1={LX + LW / 2} y1={y + LH} x2={LX + LW / 2} y2={y + LH + GAP}
                        stroke={HUE.neutral.line} strokeWidth={STROKE.thin} strokeOpacity={0.7}
                      />
                    )}
                  </g>
                );
              })}

              {/* Request going down (left gutter) and response coming up (right gutter) */}
              {currentId && (
                <VizPacket
                  x={returning ? LX + LW + 22 : LX - 22}
                  y={layerY(indexOf(currentId)) + LH / 2}
                  hue={returning ? "success" : "primary"}
                  r={6}
                  label={returning ? "response" : "request"}
                />
              )}

              <VizText x={LX - 22} y={TOP - 14} size={TYPE.micro} mono fill="#4c1d95">↓ req</VizText>
              <VizText x={LX + LW + 22} y={H - 8} size={TYPE.micro} mono fill="#065f46">↑ res</VizText>
            </VizSvg>
          </VizStage>
        </div>

        <div className="w-full lg:w-[300px] shrink-0 flex flex-col gap-3">
          <VizDetail
            title={activeLayer?.label}
            hue={activeLayer?.hue ?? "primary"}
            onClose={() => setActive(null)}
            empty="Click a layer to see what belongs in it."
          >
            {activeLayer && (
              <>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{activeLayer.desc}</p>
                <VizField label="typical contents">
                  <div className="flex flex-wrap gap-1.5">
                    {activeLayer.examples.map((e) => (
                      <VizChip key={e} hue={activeLayer.hue}>{e}</VizChip>
                    ))}
                  </div>
                </VizField>
                <VizField label="may call">
                  {indexOf(activeLayer.id) === LAYERS.length - 1 ? (
                    <span className="text-zinc-500">nothing below it</span>
                  ) : (
                    <VizChip hue="success">{LAYERS[indexOf(activeLayer.id) + 1].label}</VizChip>
                  )}
                </VizField>
              </>
            )}
          </VizDetail>

          <VizStats
            items={[
              { label: "layers traversed", value: `${Math.min(at + 1, PATH.length)}/${PATH.length}`, hue: "primary", meter: [Math.min(at + 1, PATH.length), PATH.length] },
              { label: "layers doing real work", value: `${usefulLayers}/${LAYERS.length}`, hue: passThroughCount ? "warning" : "success", meter: [usefulLayers, LAYERS.length] },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <VizLegend
          items={[
            { hue: "primary", label: "request descending" },
            { hue: "success", label: "response ascending" },
            ...(mode === "sinkhole" ? [{ hue: "warning" as HueName, label: "adds nothing" }] : []),
          ]}
        />
        <VizHint>
          Layering only pays for itself when each layer has a reason to exist.
        </VizHint>
      </div>
    </VizFrame>
  );
}
