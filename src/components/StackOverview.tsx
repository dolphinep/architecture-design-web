"use client";
import { useState } from "react";
import Link from "next/link";
import { principleRegistry, LEVELS, LEVEL_META } from "@/lib/registry";
import type { Level } from "@/types/principle";

const LEVEL_EXAMPLES: Record<Level, string> = {
  code:           "Your IDE, source files, pull requests",
  service:        "One running process / Docker container",
  system:         "A cluster of services, a product's backend",
  infrastructure: "Kubernetes cluster, cloud account, CI/CD",
  network:        "DNS zones, CDN config, firewall rules",
};

export function StackOverview() {
  const [active, setActive] = useState<Level | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500">
        Each pattern operates at a different level of the stack. Click a level to see which patterns live there.
      </p>

      {/* Stack rows — bottom (network) to top (code) for visual accuracy */}
      <div className="flex flex-col gap-1.5">
        {[...LEVELS].reverse().map((lvl) => {
          const meta = LEVEL_META[lvl.value];
          const principles = principleRegistry.filter((p) => p.level === lvl.value);
          const isActive = active === lvl.value;
          const isDimmed = active !== null && !isActive;

          return (
            <button
              key={lvl.value}
              onClick={() => setActive(isActive ? null : lvl.value as Level)}
              className={`w-full text-left rounded-xl border transition-all duration-150 ${
                isActive
                  ? `${meta.bg} ${meta.border} ring-1 ring-inset ${meta.border}`
                  : isDimmed
                  ? "border-zinc-900 bg-zinc-950 opacity-40"
                  : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60"
              }`}
            >
              <div className="flex items-start gap-4 p-3 sm:p-4">
                {/* Level label — fixed width column */}
                <div className="shrink-0 w-32 flex flex-col gap-0.5 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono text-sm ${isActive ? meta.color : "text-zinc-400"}`}>
                      {lvl.icon}
                    </span>
                    <span className={`text-sm font-semibold ${isActive ? meta.color : "text-zinc-300"}`}>
                      {lvl.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-600 leading-tight">
                    {LEVEL_EXAMPLES[lvl.value as Level]}
                  </span>
                </div>

                {/* Principle chips */}
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {principles.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/principles/${p.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-colors font-mono ${
                        isActive
                          ? `${meta.bg} ${meta.border} ${meta.color} hover:brightness-125`
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      }`}
                    >
                      {p.implemented && (
                        <span className={`w-1 h-1 rounded-full shrink-0 ${isActive ? meta.color : "text-zinc-600"}`}
                          style={{ background: "currentColor" }} />
                      )}
                      {p.name}
                    </Link>
                  ))}
                </div>

                {/* Count */}
                <span className={`shrink-0 text-xs font-mono tabular-nums ${isActive ? meta.color : "text-zinc-700"}`}>
                  {principles.length}
                </span>
              </div>

              {/* Expanded detail */}
              {isActive && (
                <div className={`px-4 pb-3 pt-0 border-t ${meta.border} mt-1`}>
                  <p className={`text-xs leading-relaxed ${meta.color} opacity-80`}>
                    {lvl.desc}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Arrow label */}
      <div className="flex items-center gap-2 justify-end opacity-40">
        <span className="text-[10px] text-zinc-500 font-mono">code</span>
        <svg width={80} height={12}>
          <defs>
            <marker id="stack-arr-up" markerWidth="5" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0,5 2,0 4" fill="#52525b"/>
            </marker>
            <marker id="stack-arr-down" markerWidth="5" markerHeight="4" refX="0" refY="2" orient="auto-start-reverse">
              <polygon points="0 0,5 2,0 4" fill="#52525b"/>
            </marker>
          </defs>
          <line x1={0} y1={6} x2={78} y2={6} stroke="#3f3f46" strokeWidth="1"
            markerStart="url(#stack-arr-down)" markerEnd="url(#stack-arr-up)"/>
        </svg>
        <span className="text-[10px] text-zinc-500 font-mono">network</span>
      </div>
    </div>
  );
}
