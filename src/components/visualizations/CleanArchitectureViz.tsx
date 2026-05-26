"use client";
import { useState } from "react";

const LAYERS = [
  {
    id: "frameworks",
    label: "Frameworks & Drivers",
    sublabel: "Web, DB, UI, Devices",
    examples: ["Next.js", "PostgreSQL", "Docker", "REST API"],
    color: "#4f46e5",
    dimColor: "#312e81",
    description:
      "The outermost layer. Frameworks, databases, web servers, and device drivers live here. All details are kept at the boundary — nothing here should leak inward.",
  },
  {
    id: "adapters",
    label: "Interface Adapters",
    sublabel: "Controllers, Presenters, Gateways",
    examples: ["HTTP Controller", "Repository", "Presenter", "DTO"],
    color: "#7c3aed",
    dimColor: "#4c1d95",
    description:
      "Converts data between the format convenient for Use Cases and the format convenient for external agents (UI, DB). Controllers receive input; Presenters format output; Repositories abstract storage.",
  },
  {
    id: "usecases",
    label: "Use Cases",
    sublabel: "Application Business Rules",
    examples: ["CreateOrder", "ChargePayment", "SendNotification"],
    color: "#a855f7",
    dimColor: "#6b21a8",
    description:
      "Application-specific business rules. Each use case orchestrates data flow to and from Entities. A change here does not affect Entities, and a change in the UI does not affect Use Cases.",
  },
  {
    id: "entities",
    label: "Entities",
    sublabel: "Enterprise Business Rules",
    examples: ["Order", "User", "Product", "Invoice"],
    color: "#d946ef",
    dimColor: "#86198f",
    description:
      "The heart of the system. Entities encapsulate enterprise-wide business rules and are the most stable, least likely to change. They know nothing about databases, frameworks, or UI.",
  },
];

export function CleanArchitectureViz() {
  const [active, setActive] = useState<string | null>(null);

  const activeLayer = LAYERS.find((l) => l.id === active);
  const outerR = 200;
  const ringWidth = 44;
  const gap = 2;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* SVG diagram */}
        <div className="shrink-0">
          <svg
            width={outerR * 2 + 20}
            height={outerR * 2 + 20}
            viewBox={`-10 -10 ${outerR * 2 + 20} ${outerR * 2 + 20}`}
            className="overflow-visible"
          >
            {/* Dependency rule arrow */}
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
              </marker>
            </defs>
            <line
              x1={outerR + 30} y1={-8}
              x2={outerR + 10} y2={-8}
              stroke="#6366f1" strokeWidth="1.5" markerEnd="url(#arrowhead)"
              strokeDasharray="3,2"
            />
            <text x={outerR + 35} y={-4} fill="#6366f1" fontSize="9" fontFamily="monospace">
              dependency rule
            </text>

            {LAYERS.map((layer, i) => {
              const r = outerR - i * (ringWidth + gap);
              const isActive = active === layer.id;
              const isDimmed = active !== null && !isActive;
              return (
                <g key={layer.id}>
                  <circle
                    cx={outerR}
                    cy={outerR}
                    r={r}
                    fill={isDimmed ? layer.dimColor : layer.color}
                    stroke={isActive ? "#fff" : "transparent"}
                    strokeWidth={2}
                    style={{
                      cursor: "pointer",
                      transition: "fill 0.2s, opacity 0.2s",
                      opacity: isDimmed ? 0.5 : 1,
                    }}
                    onClick={() => setActive(isActive ? null : layer.id)}
                  />
                  {/* Layer label */}
                  {!isDimmed && (
                    <>
                      <text
                        x={outerR}
                        y={outerR - r + 16}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.9)"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="sans-serif"
                        style={{ pointerEvents: "none" }}
                      >
                        {layer.label}
                      </text>
                      <text
                        x={outerR}
                        y={outerR - r + 28}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.55)"
                        fontSize="8"
                        fontFamily="sans-serif"
                        style={{ pointerEvents: "none" }}
                      >
                        {layer.sublabel}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Centre label */}
            <text
              x={outerR}
              y={outerR - 6}
              textAnchor="middle"
              fill="rgba(255,255,255,0.95)"
              fontSize="11"
              fontWeight="700"
              fontFamily="sans-serif"
              style={{ pointerEvents: "none" }}
            >
              Entities
            </text>
            <text
              x={outerR}
              y={outerR + 8}
              textAnchor="middle"
              fill="rgba(255,255,255,0.55)"
              fontSize="8"
              fontFamily="sans-serif"
              style={{ pointerEvents: "none" }}
            >
              Business Rules
            </text>
          </svg>
        </div>

        {/* Info panel */}
        <div className="flex-1 flex flex-col gap-4 min-h-[220px]">
          {activeLayer ? (
            <div
              key={activeLayer.id}
              className="flex flex-col gap-3"
              style={{ animation: "slide-in-right 0.2s ease" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: activeLayer.color }}
                />
                <h3 className="font-semibold text-white text-lg">{activeLayer.label}</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{activeLayer.description}</p>
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-xs text-zinc-600 font-mono uppercase tracking-wide">Examples</span>
                <div className="flex flex-wrap gap-2">
                  {activeLayer.examples.map((ex) => (
                    <span
                      key={ex}
                      className="text-xs px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-zinc-500">
              <h3 className="font-semibold text-zinc-300 text-lg">The Dependency Rule</h3>
              <p className="text-sm leading-relaxed">
                Source-code dependencies must always point <span className="text-violet-400">inward</span>.
                Nothing in an inner circle can know about something in an outer circle — not a function name,
                class, variable, or framework type.
              </p>
              <p className="text-sm leading-relaxed">
                Click any ring to explore its responsibility.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {LAYERS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setActive(l.id)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors text-left"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
                    <span className="text-xs text-zinc-400">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeLayer && (
            <button
              onClick={() => setActive(null)}
              className="self-start text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              ← Back to overview
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Click any concentric ring to explore its role and responsibilities.
      </p>
    </div>
  );
}
