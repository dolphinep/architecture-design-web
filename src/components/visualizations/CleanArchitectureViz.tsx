"use client";
import { useState } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStatus, VizDetail, VizField, VizChip,
  VizSvg, VizText,
  useReducedMotion,
  HUE, TYPE, STROKE, type HueName,
} from "./_shared";

interface Layer {
  id: string;
  label: string;
  sublabel: string;
  hue: HueName;
  examples: string[];
  description: string;
}

/** Outermost first — index 0 is the outer ring, and depth increases inward. */
const LAYERS: Layer[] = [
  {
    id: "frameworks",
    label: "Frameworks & Drivers",
    sublabel: "web · db · devices",
    hue: "info",
    examples: ["Next.js", "PostgreSQL", "Docker", "Stripe SDK"],
    description:
      "The outermost ring is all detail: frameworks, databases, web servers, device drivers. Everything here is replaceable, and nothing inside is allowed to know it exists.",
  },
  {
    id: "adapters",
    label: "Interface Adapters",
    sublabel: "controllers · gateways",
    hue: "primary",
    examples: ["HTTP Controller", "Repository impl", "Presenter", "DTO"],
    description:
      "Translation. Data arrives in whatever shape the outside world uses and leaves in the shape use cases want — controllers in, presenters out, repositories over storage.",
  },
  {
    id: "usecases",
    label: "Use Cases",
    sublabel: "application rules",
    hue: "warning",
    examples: ["CreateOrder", "ChargePayment", "CancelBooking"],
    description:
      "Application-specific behaviour: the steps that make up one thing a user can do. Orchestrates entities, but knows nothing about HTTP, SQL, or the UI.",
  },
  {
    id: "entities",
    label: "Entities",
    sublabel: "enterprise rules",
    hue: "danger",
    examples: ["Order", "Invoice", "Money", "Booking"],
    description:
      "The rules that would still be true if you deleted the application. Most stable, least likely to change, and dependent on absolutely nothing.",
  },
];

const SIZE = 460;
const C = SIZE / 2;
const OUTER_R = 176;
const RING_W = 42;

/** Outer radius of ring `i`. */
const radiusAt = (i: number) => OUTER_R - i * RING_W;

export function CleanArchitectureViz() {
  const [active, setActive] = useState<string | null>(null);
  /** A demonstrated dependency: [fromLayerIndex, toLayerIndex] */
  const [probe, setProbe] = useState<[number, number] | null>(null);
  const reduced = useReducedMotion();

  const activeIdx = LAYERS.findIndex((l) => l.id === active);
  const activeLayer = activeIdx >= 0 ? LAYERS[activeIdx] : null;

  // A dependency is legal only when it points inward (higher index = deeper).
  const legal = probe ? probe[1] > probe[0] : null;

  function tryDependency(from: number, to: number) {
    if (from === to) return;
    setProbe([from, to]);
  }

  return (
    <VizFrame>
      <VizStatus
        hue={probe === null ? "neutral" : legal ? "success" : "danger"}
        label={probe === null ? "THE DEPENDENCY RULE" : legal ? "ALLOWED" : "VIOLATION"}
      >
        {probe === null ? (
          <>Source-code dependencies must always point <span className="text-violet-300">inward</span>. Nothing in an inner ring may name anything in an outer one.</>
        ) : legal ? (
          <><span className="font-mono text-zinc-200">{LAYERS[probe[0]].label}</span> → <span className="font-mono text-zinc-200">{LAYERS[probe[1]].label}</span> points inward. Fine.</>
        ) : (
          <><span className="font-mono text-zinc-200">{LAYERS[probe[0]].label}</span> → <span className="font-mono text-zinc-200">{LAYERS[probe[1]].label}</span> points outward. This is the dependency that rots a codebase — invert it with an interface owned by the inner layer.</>
        )}
      </VizStatus>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <VizStage className="shrink-0 w-full lg:w-[420px]">
          <VizSvg
            w={SIZE} h={SIZE}
            minWidth={320}
            label="Four concentric Clean Architecture rings, from Frameworks and Drivers on the outside to Entities at the centre"
          >
            {/* Rings, outermost first so inner ones paint on top */}
            {LAYERS.map((layer, i) => {
              const r = radiusAt(i);
              const isActive = active === layer.id;
              const isDimmed = active !== null && !isActive;
              const c = HUE[layer.hue];
              return (
                <g key={layer.id}>
                  <circle
                    cx={C} cy={C} r={r}
                    fill={c.base}
                    fillOpacity={isDimmed ? 0.1 : isActive ? 0.3 : 0.18}
                    stroke={c.line}
                    strokeWidth={isActive ? STROKE.thick : STROKE.thin}
                    strokeOpacity={isDimmed ? 0.3 : 1}
                    tabIndex={0}
                    role="button"
                    aria-label={`${layer.label}: ${layer.sublabel}`}
                    aria-pressed={isActive}
                    onClick={() => setActive(isActive ? null : layer.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActive(isActive ? null : layer.id);
                      }
                    }}
                    className="viz-node-interactive"
                    style={{
                      cursor: "pointer",
                      transition: reduced ? undefined : "fill-opacity 220ms, stroke-width 220ms",
                      outline: "none",
                    }}
                  />
                  {/* Label sits inside its own band, not on the ring below it. The
                      innermost ring is labelled at the centre — the old version
                      drew both and printed "Entities" twice. */}
                  {i < LAYERS.length - 1 ? (
                    <>
                      <VizText
                        x={C} y={C - r + RING_W / 2 - 6}
                        size={TYPE.small} weight={600}
                        fill={isDimmed ? "#52525b" : HUE.neutral.strong}
                      >
                        {layer.label}
                      </VizText>
                      <VizText
                        x={C} y={C - r + RING_W / 2 + 9}
                        size={TYPE.micro} mono
                        fill={isDimmed ? "#3f3f46" : c.text}
                      >
                        {layer.sublabel}
                      </VizText>
                    </>
                  ) : (
                    <>
                      <VizText
                        x={C} y={C - 8} size={TYPE.title} weight={700}
                        fill={isDimmed ? "#52525b" : HUE.neutral.strong}
                      >
                        {layer.label}
                      </VizText>
                      <VizText
                        x={C} y={C + 10} size={TYPE.micro} mono
                        fill={isDimmed ? "#3f3f46" : c.text}
                      >
                        {layer.sublabel}
                      </VizText>
                    </>
                  )}
                </g>
              );
            })}

            {/* The dependency rule, drawn as an inward arrow down the right side */}
            <g>
              <path
                d={`M ${C + OUTER_R + 16} ${C} L ${C + radiusAt(LAYERS.length - 1) - 6} ${C}`}
                stroke={HUE.primary.line}
                strokeWidth={STROKE.thin}
                strokeDasharray="5 4"
                markerEnd="url(#viz-arrow-primary)"
                className={reduced ? undefined : "viz-edge-flowing"}
              />
              <VizText
                x={C} y={14}
                size={TYPE.micro} hue="primary" mono
              >
                dependencies may only point inward →
              </VizText>
            </g>

            {/* The probe: an arrow between two chosen rings */}
            {probe && (() => {
              const [from, to] = probe;
              const rFrom = radiusAt(from) - RING_W / 2;
              const rTo = radiusAt(to) - RING_W / 2;
              const hue: HueName = legal ? "success" : "danger";
              // Drawn on the left side so it does not collide with the rule arrow
              return (
                <g>
                  <path
                    d={`M ${C - rFrom} ${C} L ${C - rTo} ${C}`}
                    stroke={HUE[hue].line}
                    strokeWidth={STROKE.thick}
                    markerEnd={`url(#viz-arrow-${hue})`}
                    style={{ filter: `drop-shadow(0 0 6px ${HUE[hue].glow})` }}
                  />
                  <VizText
                    x={C - (rFrom + rTo) / 2} y={C - 16}
                    size={TYPE.small} weight={700} hue={hue} mono
                  >
                    {legal ? "✓ inward" : "✗ outward"}
                  </VizText>
                </g>
              );
            })()}
          </VizSvg>
        </VizStage>

        {/* Detail + the dependency probe */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 w-full">
          <VizDetail
            title={activeLayer?.label}
            hue={activeLayer?.hue ?? "primary"}
            onClose={() => setActive(null)}
            empty="Click a ring to see what belongs in it."
          >
            {activeLayer && (
              <>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{activeLayer.description}</p>
                <VizField label="typically contains">
                  <div className="flex flex-wrap gap-1.5">
                    {activeLayer.examples.map((e) => (
                      <VizChip key={e} hue={activeLayer.hue}>{e}</VizChip>
                    ))}
                  </div>
                </VizField>
                <VizField label="may depend on">
                  {activeIdx === LAYERS.length - 1 ? (
                    <span className="text-zinc-500">nothing — this is the centre</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {LAYERS.slice(activeIdx + 1).map((l) => (
                        <VizChip key={l.id} hue="success">{l.label}</VizChip>
                      ))}
                    </div>
                  )}
                </VizField>
                {activeIdx > 0 && (
                  <VizField label="must never name">
                    <div className="flex flex-wrap gap-1.5">
                      {LAYERS.slice(0, activeIdx).map((l) => (
                        <VizChip key={l.id} hue="danger">{l.label}</VizChip>
                      ))}
                    </div>
                  </VizField>
                )}
              </>
            )}
          </VizDetail>

          {/* Try a dependency — the rule is easier to feel than to read */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-3 flex flex-col gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
              test a dependency
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { from: 1, to: 2, label: "Adapter → Use Case" },
                { from: 2, to: 3, label: "Use Case → Entity" },
                { from: 2, to: 1, label: "Use Case → Adapter" },
                { from: 3, to: 0, label: "Entity → Framework" },
              ].map((d) => {
                const on = probe?.[0] === d.from && probe?.[1] === d.to;
                const ok = d.to > d.from;
                return (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => tryDependency(d.from, d.to)}
                    aria-pressed={on}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-mono transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
                      ${on
                        ? ok ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                             : "border-red-500/60 bg-red-500/15 text-red-200"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"}`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <VizControls>
        <VizSpacer />
        <VizButton variant="ghost" onClick={() => { setActive(null); setProbe(null); }}>
          ↺ Reset
        </VizButton>
      </VizControls>

      <VizHint>
        Every arrow that points outward is a future refactor. Invert it with an interface the
        inner layer owns and the outer layer implements.
      </VizHint>
    </VizFrame>
  );
}
