"use client";
import { useState, useRef, useEffect, useCallback } from "react";

type LayerId = "presentation" | "business" | "persistence" | "database";
type Mode = "normal" | "sinkhole";

interface Layer {
  id: LayerId;
  label: string;
  sublabel: string;
  examples: string[];
  desc: string;
  color: string;
  dim: string;
  border: string;
}

const LAYERS: Layer[] = [
  {
    id: "presentation",
    label: "Presentation",
    sublabel: "Controller · API · UI",
    examples: ["HTTP Controller", "REST endpoint", "GraphQL resolver", "React page"],
    desc: "Receives requests from clients and returns responses. Handles input validation and response formatting. Knows nothing about business rules or data access.",
    color: "#4f46e5", dim: "#1e1b4b", border: "#818cf8",
  },
  {
    id: "business",
    label: "Business Logic",
    sublabel: "Service · Use Case · Domain",
    examples: ["OrderService", "UserService", "PricingEngine", "AuthService"],
    desc: "The heart of the application. Contains all business rules, validations, and workflows. Must not depend on HTTP, databases, or UI frameworks.",
    color: "#7c3aed", dim: "#3b0764", border: "#a78bfa",
  },
  {
    id: "persistence",
    label: "Persistence",
    sublabel: "Repository · DAO · ORM",
    examples: ["UserRepository", "OrderDAO", "Prisma ORM", "SQLAlchemy"],
    desc: "Abstracts data storage. Translates between domain objects and database rows. The business layer calls an interface — it never sees SQL directly.",
    color: "#0891b2", dim: "#082f49", border: "#22d3ee",
  },
  {
    id: "database",
    label: "Database",
    sublabel: "SQL · NoSQL · Cache",
    examples: ["PostgreSQL", "MongoDB", "Redis", "Elasticsearch"],
    desc: "Raw storage. Purely infrastructure — no application logic lives here. The persistence layer translates to and from this layer.",
    color: "#059669", dim: "#052e16", border: "#34d399",
  },
];

// Animation steps: 0=idle, 1–4=request down, 5–8=response up, 9=done
const STEP_LAYERS: (LayerId | null)[] = [
  null,
  "presentation", "business", "persistence", "database",
  "database",     "persistence", "business", "presentation",
  null,
];
const STEP_RETURNING = [false, false, false, false, false, true, true, true, true, false];

const LH = 62;
const GAP = 10;
const LW = 236;
const OFFSET_Y = 48;

export function LayeredArchViz() {
  const [active, setActive] = useState<LayerId | null>(null);
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [mode, setMode] = useState<Mode>("normal");
  const [showResult, setShowResult] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  function layerY(idx: number) {
    return OFFSET_Y + idx * (LH + GAP);
  }

  // Packet Y: centre of whichever layer is active (or null)
  function packetY(s: number): number | null {
    const layerId = STEP_LAYERS[s];
    if (!layerId) return null;
    const idx = LAYERS.findIndex(l => l.id === layerId);
    return layerY(idx) + LH / 2;
  }

  function sendRequest() {
    if (animating) return;
    clearTimers();
    setAnimating(true);
    setShowResult(false);
    setStep(0);
    setActive(null);

    // In sinkhole mode the business step is much shorter (just a flash, 200ms vs 600ms)
    const normalStep = 600;
    const sinkholeBusinessStep = 200;

    let t = 0;

    // Build timing schedule
    const schedule: Array<{ delay: number; s: number }> = [];

    if (mode === "normal") {
      // Steps 1–8 equally spaced
      for (let s = 1; s <= 8; s++) {
        schedule.push({ delay: t, s });
        t += normalStep;
      }
    } else {
      // Sinkhole: business steps (2 and 7) are fast flashes
      for (let s = 1; s <= 8; s++) {
        schedule.push({ delay: t, s });
        const isBusiness = STEP_LAYERS[s] === "business";
        t += isBusiness ? sinkholeBusinessStep : normalStep;
      }
    }

    schedule.forEach(({ delay, s }) => {
      const id = setTimeout(() => {
        setStep(s);
        setActive(STEP_LAYERS[s]);
      }, delay);
      timers.current.push(id);
    });

    const doneId = setTimeout(() => {
      setStep(9);
      setActive(null);
      setAnimating(false);
      if (mode === "sinkhole") setShowResult(true);
    }, t);
    timers.current.push(doneId);
  }

  function reset() {
    clearTimers();
    setAnimating(false);
    setStep(0);
    setActive(null);
    setShowResult(false);
  }

  const returning = STEP_RETURNING[step];
  const pY = packetY(step);
  const totalH = LAYERS.length * LH + (LAYERS.length - 1) * GAP;
  const svgH = OFFSET_Y + totalH + 12;
  const svgW = LW + 44; // 20px left margin for packet lane, 24px right

  const activeLayer = active ? LAYERS.find(l => l.id === active) : null;

  return (
    <div className="flex flex-col gap-5">

      {/* Mode toggle */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-zinc-500">Visualise:</span>
        {([
          { value: "normal",   label: "Normal flow" },
          { value: "sinkhole", label: "Sinkhole anti-pattern" },
        ] as const).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setMode(value); reset(); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${
              mode === value
                ? "bg-zinc-700 border-zinc-500 text-white"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* SVG stack */}
        <div className="shrink-0">
          <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
            <defs>
              <marker id="la-arr-d" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                <polygon points="0 0, 6 2.5, 0 5" fill="#6366f1" />
              </marker>
              <marker id="la-arr-u" markerWidth="6" markerHeight="5" refX="0" refY="2.5" orient="auto-start-reverse">
                <polygon points="0 0, 6 2.5, 0 5" fill="#34d399" />
              </marker>
            </defs>

            {/* Client node */}
            <rect x={20} y={4} width={LW} height={32} rx={7}
              fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
            <text x={20 + LW / 2} y={16} textAnchor="middle" fill="#e4e4e7"
              fontSize="10" fontWeight="700" fontFamily="sans-serif">Client</text>
            <text x={20 + LW / 2} y={30} textAnchor="middle" fill="#71717a"
              fontSize="8" fontFamily="sans-serif">browser / app</text>

            {/* Arrow client → first layer */}
            <line x1={20 + LW / 2} y1={36} x2={20 + LW / 2} y2={OFFSET_Y - 2}
              stroke="#4f46e5" strokeWidth="1.5" markerEnd="url(#la-arr-d)" />

            {/* Layer boxes */}
            {LAYERS.map((layer, i) => {
              const y = layerY(i);
              const isActive = active === layer.id;
              const isDimmed = active !== null && !isActive;
              const isSinkholeFlash = mode === "sinkhole" && isActive && layer.id === "business";

              // red warning in sinkhole mode (active business layer or post-anim result)
              const showSinkholeWarn = mode === "sinkhole" && layer.id === "business"
                && (isSinkholeFlash || (showResult && !animating));

              return (
                <g key={layer.id} onClick={() => !animating && setActive(isActive ? null : layer.id)}
                  style={{ cursor: animating ? "default" : "pointer" }}>
                  <rect
                    x={20} y={y} width={LW} height={LH} rx={9}
                    fill={
                      showSinkholeWarn ? "#1f0a0a"
                      : isActive ? layer.dim
                      : "#18181b"
                    }
                    stroke={
                      showSinkholeWarn ? "#ef4444"
                      : isActive ? layer.border
                      : "#3f3f46"
                    }
                    strokeWidth={isActive || showSinkholeWarn ? 2 : 1}
                    opacity={isDimmed ? 0.35 : 1}
                    style={isActive && !showSinkholeWarn
                      ? { filter: `drop-shadow(0 0 8px ${layer.color}50)` }
                      : showSinkholeWarn
                      ? { filter: "drop-shadow(0 0 8px #ef444450)" }
                      : {}}
                  />

                  {/* Layer label */}
                  <text x={36} y={y + 24} fill={
                    showSinkholeWarn ? "#f87171"
                    : isActive ? layer.border
                    : "#e4e4e7"
                  } fontSize="11" fontWeight="700" fontFamily="sans-serif">
                    {layer.label}
                  </text>
                  <text x={36} y={y + 40} fill={
                    showSinkholeWarn ? "#f87171"
                    : isActive ? layer.border
                    : "#71717a"
                  } fontSize="9" fontFamily="sans-serif" opacity={0.85}>
                    {layer.sublabel}
                  </text>

                  {/* Sinkhole "no logic" badge */}
                  {showSinkholeWarn && (
                    <g>
                      <rect x={LW - 52} y={y + 14} width={56} height={18} rx={4}
                        fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
                      <text x={LW - 24} y={y + 27} textAnchor="middle"
                        fill="#fca5a5" fontSize="8.5" fontWeight="600" fontFamily="sans-serif">
                        ⚠ no logic
                      </text>
                    </g>
                  )}

                  {/* Connector arrow to next layer */}
                  {i < LAYERS.length - 1 && (
                    <line
                      x1={20 + LW / 2} y1={y + LH}
                      x2={20 + LW / 2} y2={y + LH + GAP - 1}
                      stroke={isActive ? layer.border : "#3f3f46"}
                      strokeWidth="1.5"
                      markerEnd="url(#la-arr-d)"
                    />
                  )}
                </g>
              );
            })}

            {/* Animated packet dot — left lane */}
            {pY !== null && (
              <g>
                <circle cx={10} cy={pY} r={5}
                  fill={returning ? "#34d399" : "#818cf8"} />
                <circle cx={10} cy={pY} r={9}
                  fill={returning ? "#34d399" : "#818cf8"} opacity={0.2} />
              </g>
            )}

            {/* Left lane direction labels */}
            <text x={10} y={OFFSET_Y - 6} textAnchor="middle" fill="#6366f1"
              fontSize="8" fontFamily="monospace">↓ req</text>
            <text x={10} y={OFFSET_Y + totalH + 10} textAnchor="middle" fill="#34d399"
              fontSize="8" fontFamily="monospace">↑ res</text>
          </svg>
        </div>

        {/* Info panel */}
        <div className="flex-1 flex flex-col gap-4 min-h-[260px]">
          {activeLayer && !showResult ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: activeLayer.color }} />
                <h3 className="font-semibold text-white">{activeLayer.label} layer</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{activeLayer.desc}</p>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-zinc-600 font-mono uppercase tracking-wide">
                  Belongs here
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeLayer.examples.map(ex => (
                    <span key={ex}
                      className="text-xs px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => setActive(null)}
                className="self-start text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                ← back
              </button>
            </div>

          ) : showResult ? (
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-red-400 flex items-center gap-2">
                <span>⚠</span> Sinkhole detected
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                The <span className="text-violet-300 font-medium">Business Logic layer</span> contains
                no real logic — it just forwards every call directly to the Persistence layer.
                This is the sinkhole anti-pattern.
              </p>
              <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-3">
                <pre className="text-xs text-red-300 font-mono leading-relaxed">{`// ⚠ sinkhole — no business logic
class UserService {
  getUser(id: string) {
    return this.repo.findById(id); // just passes through
  }
  saveUser(user: User) {
    return this.repo.save(user);   // no validation, no rules
  }
}`}</pre>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                If your business layer looks like this everywhere, either add real domain logic
                or remove the layer and call persistence directly — dead layers add overhead with no benefit.
              </p>
              <button onClick={reset}
                className="self-start text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                ← reset
              </button>
            </div>

          ) : mode === "sinkhole" ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-red-400">Sinkhole anti-pattern</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  A "sinkhole" layer is one that adds no logic — every call passes straight through
                  to the layer below with zero transformation, validation, or business rule enforcement.
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  In this demo, the Business Logic layer is hollow. Watch it flash red as each
                  request speeds through without stopping.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-zinc-600 font-mono uppercase tracking-wide">
                  Click any layer to explore · Run animation to see the pattern
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {LAYERS.map(l => (
                    <button key={l.id} onClick={() => setActive(l.id)}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors text-left">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: l.id === "business" && mode === "sinkhole" ? "#ef4444" : l.color }} />
                      <span className="text-xs text-zinc-400">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-zinc-300">The Golden Rule</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Each layer <span className="text-white">only calls the layer directly below it</span>.
                  A request travels downward; a response returns upward.
                  No layer skips another; no inner layer knows about the outer ones.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-zinc-600 font-mono uppercase tracking-wide">
                  Click any layer to explore
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {LAYERS.map(l => (
                    <button key={l.id} onClick={() => setActive(l.id)}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors text-left">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
                      <span className="text-xs text-zinc-400">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={sendRequest}
          disabled={animating}
          className="px-4 py-1.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {animating ? "⏳ In flight…" : "▶ Send request"}
        </button>
        <span className="text-xs text-zinc-600">
          {mode === "sinkhole"
            ? "Business layer flashes red — it adds no logic, just passes straight through."
            : "Request flows down through each layer; response returns back up."}
        </span>
      </div>

    </div>
  );
}
