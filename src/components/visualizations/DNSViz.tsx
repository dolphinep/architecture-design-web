"use client";
import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepId =
  | "client"
  | "cache-check"
  | "resolver"
  | "root"
  | "tld"
  | "authoritative"
  | "response"
  | "cached"
  | "done";

interface DNSStep {
  id: StepId;
  from: string;
  to: string;
  query: string;
  response: string;
  desc: string;
  isReturn: boolean;
  color: string;
}

type LookupMode = "miss" | "hit";

// ─── Steps ────────────────────────────────────────────────────────────────────

function buildSteps(domain: string, mode: LookupMode): DNSStep[] {
  const tld = domain.split(".").pop() ?? "com";
  const sld = domain.split(".").slice(-2).join(".");

  if (mode === "hit") {
    return [
      {
        id: "client",
        from: "Browser",
        to: "OS Cache",
        query: `A ${domain}?`,
        response: "",
        desc: `Browser checks its own DNS cache first. TTL is still valid.`,
        isReturn: false,
        color: "#6366f1",
      },
      {
        id: "done",
        from: "OS Cache",
        to: "Browser",
        query: "",
        response: `${domain} → 93.184.216.34`,
        desc: `Cache HIT — answer returned immediately. No resolver queried. This is why CDNs set aggressive TTLs.`,
        isReturn: true,
        color: "#34d399",
      },
    ];
  }

  return [
    {
      id: "client",
      from: "Browser",
      to: "Recursive Resolver",
      query: `A ${domain}?`,
      response: "",
      desc: `Browser asks its configured resolver (often 1.1.1.1 or 8.8.8.8). Resolver first checks its own cache — cache MISS, so it starts the recursive lookup.`,
      isReturn: false,
      color: "#6366f1",
    },
    {
      id: "root",
      from: "Recursive Resolver",
      to: "Root Name Server",
      query: `A ${domain}?`,
      response: "",
      desc: `Resolver queries one of 13 root name server clusters (a–m.root-servers.net). The root doesn't know the IP — it knows who manages .${tld}.`,
      isReturn: false,
      color: "#7c3aed",
    },
    {
      id: "tld",
      from: "Root Name Server",
      to: "Recursive Resolver",
      query: "",
      response: `Referral: .${tld} NS → a.gtld-servers.net`,
      desc: `Root returns a referral to the TLD name server responsible for .${tld} — not the answer, just a pointer.`,
      isReturn: true,
      color: "#a78bfa",
    },
    {
      id: "authoritative",
      from: "Recursive Resolver",
      to: `.${tld} TLD Name Server`,
      query: `A ${domain}?`,
      response: "",
      desc: `Resolver asks the TLD server. It knows which authoritative name servers manage ${sld} — the domain owner registered these when they bought the domain.`,
      isReturn: false,
      color: "#0891b2",
    },
    {
      id: "response",
      from: `.${tld} TLD Name Server`,
      to: "Recursive Resolver",
      query: "",
      response: `Referral: ${sld} NS → ns1.${sld}`,
      desc: `TLD returns a referral to the authoritative name server for ${sld}. Still not the final answer.`,
      isReturn: true,
      color: "#22d3ee",
    },
    {
      id: "cached",
      from: "Recursive Resolver",
      to: `Authoritative NS (${sld})`,
      query: `A ${domain}?`,
      response: "",
      desc: `Finally! Resolver queries the authoritative name server — the source of truth for this domain. This server actually has the DNS record.`,
      isReturn: false,
      color: "#059669",
    },
    {
      id: "done",
      from: `Authoritative NS (${sld})`,
      to: "Browser",
      query: "",
      response: `${domain} → 93.184.216.34 (TTL: 3600s)`,
      desc: `IP address returned with a TTL. Resolver caches it for 3600 seconds — subsequent lookups skip this whole chain and get the cached answer instantly.`,
      isReturn: true,
      color: "#34d399",
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DNSViz() {
  const [domain, setDomain]   = useState("api.github.com");
  const [mode, setMode]       = useState<LookupMode>("miss");
  const [stepIdx, setStepIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const steps = buildSteps(domain, mode);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = []; }
  useEffect(() => () => clearTimers(), []);

  function t(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }

  function play() {
    clearTimers();
    setStepIdx(-1);
    setRunning(true);
    steps.forEach((_, i) => {
      t(() => setStepIdx(i), i * 1100);
    });
    t(() => setRunning(false), steps.length * 1100);
  }

  function reset() {
    clearTimers();
    setStepIdx(-1);
    setRunning(false);
  }

  const currentStep = stepIdx >= 0 ? steps[stepIdx] : null;

  // ─── SVG layout ──────────────────────────────────────────────────────────

  const NODES = mode === "hit"
    ? [
        { id: "browser",    label: "Browser",      sub: "DNS cache",        color: "#6366f1", x: 50  },
        { id: "os-cache",   label: "OS Cache",     sub: "TTL: valid",       color: "#34d399", x: 310 },
      ]
    : [
        { id: "browser",    label: "Browser",      sub: "your computer",    color: "#6366f1", x: 10  },
        { id: "resolver",   label: "Recursive\nResolver", sub: "1.1.1.1 / 8.8.8.8", color: "#7c3aed", x: 120 },
        { id: "root",       label: "Root NS",      sub: "13 clusters",      color: "#a78bfa", x: 230 },
        { id: "tld",        label: "TLD NS",       sub: `.${domain.split(".").pop()}`, color: "#0891b2", x: 340 },
        { id: "auth",       label: "Auth NS",      sub: domain.split(".").slice(-2).join("."), color: "#34d399", x: 450 },
      ];

  const NODE_W = 80;
  const NODE_H = 52;
  const SVG_W = mode === "hit" ? 420 : 570;
  const SVG_H = 100;
  const NY = 20;

  return (
    <div className="flex flex-col gap-5">

      {/* Settings */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Domain to resolve</label>
          <input
            value={domain}
            onChange={(e) => { setDomain(e.target.value); reset(); }}
            className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 font-mono focus:outline-none focus:border-zinc-600 w-44"
          />
        </div>
        <div className="flex gap-2">
          {([
            { value: "miss", label: "Cache MISS" },
            { value: "hit",  label: "Cache HIT" },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setMode(value); reset(); }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                mode === value
                  ? "bg-zinc-700 border-zinc-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG diagram */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="overflow-visible">
          <defs>
            <marker id="dns-fwd" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" fill="#6366f1" />
            </marker>
            <marker id="dns-ret" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" fill="#34d399" />
            </marker>
          </defs>

          {/* Connector lines */}
          {NODES.map((node, i) => {
            if (i === NODES.length - 1) return null;
            const x1 = node.x + NODE_W;
            const x2 = NODES[i + 1].x;
            return (
              <line key={i} x1={x1} y1={NY + NODE_H / 2} x2={x2} y2={NY + NODE_H / 2}
                stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
            );
          })}

          {/* Active step arrow */}
          {currentStep && (() => {
            const fromNode = NODES.find((n) =>
              currentStep.from.toLowerCase().includes(n.id) ||
              currentStep.from.toLowerCase().includes(n.label.toLowerCase().split("\n")[0].toLowerCase())
            );
            const toNode = NODES.find((n) =>
              currentStep.to.toLowerCase().includes(n.id) ||
              currentStep.to.toLowerCase().includes(n.label.toLowerCase().split("\n")[0].toLowerCase())
            );
            if (!fromNode || !toNode) return null;
            const offset = currentStep.isReturn ? 14 : -14;
            const x1 = currentStep.isReturn ? fromNode.x : fromNode.x + NODE_W;
            const x2 = currentStep.isReturn ? toNode.x + NODE_W : toNode.x;
            return (
              <g>
                <line
                  x1={x1} y1={NY + NODE_H / 2 + offset}
                  x2={x2} y2={NY + NODE_H / 2 + offset}
                  stroke={currentStep.color} strokeWidth="2"
                  markerEnd={`url(#dns-${currentStep.isReturn ? "ret" : "fwd"})`}
                  style={{ filter: `drop-shadow(0 0 4px ${currentStep.color})` }}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={NY + NODE_H / 2 + offset + (currentStep.isReturn ? 13 : -4)}
                  textAnchor="middle" fill={currentStep.color} fontSize="7.5" fontFamily="monospace"
                >
                  {currentStep.query || currentStep.response}
                </text>
              </g>
            );
          })()}

          {/* Node boxes */}
          {NODES.map((node, i) => {
            const isActive =
              currentStep &&
              (currentStep.from.toLowerCase().includes(node.id) ||
               currentStep.to.toLowerCase().includes(node.id) ||
               currentStep.from.toLowerCase().includes(node.label.toLowerCase().split("\n")[0].toLowerCase()) ||
               currentStep.to.toLowerCase().includes(node.label.toLowerCase().split("\n")[0].toLowerCase()));
            return (
              <g key={node.id}>
                <rect x={node.x} y={NY} width={NODE_W} height={NODE_H} rx={8}
                  fill={isActive ? node.color + "22" : "#18181b"}
                  stroke={isActive ? node.color : "#3f3f46"}
                  strokeWidth={isActive ? 2 : 1}
                  style={isActive ? { filter: `drop-shadow(0 0 6px ${node.color}66)` } : {}}
                />
                {node.label.split("\n").map((line, li) => (
                  <text key={li} x={node.x + NODE_W / 2} y={NY + 18 + li * 13}
                    textAnchor="middle" fill={isActive ? node.color : "#e4e4e7"}
                    fontSize="9.5" fontWeight="600" fontFamily="sans-serif">
                    {line}
                  </text>
                ))}
                <text x={node.x + NODE_W / 2} y={NY + NODE_H - 8}
                  textAnchor="middle" fill="#52525b" fontSize="7.5" fontFamily="monospace">
                  {node.sub}
                </text>
                {/* Step number bubble */}
                {steps.findIndex((s, si) => {
                  return si <= stepIdx && (
                    s.from.toLowerCase().includes(node.id) ||
                    s.to.toLowerCase().includes(node.id) ||
                    s.from.toLowerCase().includes(node.label.toLowerCase().split("\n")[0].toLowerCase()) ||
                    s.to.toLowerCase().includes(node.label.toLowerCase().split("\n")[0].toLowerCase())
                  );
                }) >= 0 && (
                  <circle cx={node.x + NODE_W - 6} cy={NY + 6} r={6} fill={node.color} />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Step progress */}
      <div className="flex gap-1.5">
        {steps.map((s, i) => (
          <button
            key={s.id + i}
            onClick={() => { clearTimers(); setStepIdx(i); setRunning(false); }}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              i <= stepIdx ? "bg-violet-500" : "bg-zinc-800"
            }`}
          />
        ))}
      </div>

      {/* Current step info */}
      {currentStep && (
        <div
          key={stepIdx}
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2"
          style={{ animation: "fade-up 0.15s ease" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500">Step {stepIdx + 1}/{steps.length}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${
              currentStep.isReturn
                ? "bg-emerald-950/50 border-emerald-800 text-emerald-400"
                : "bg-indigo-950/50 border-indigo-800 text-indigo-400"
            }`}>
              {currentStep.isReturn ? "↩ response" : "→ query"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-zinc-300">{currentStep.from}</span>
            <span className="text-zinc-600">{currentStep.isReturn ? "←" : "→"}</span>
            <span className="font-mono text-zinc-300">{currentStep.to}</span>
          </div>
          {(currentStep.query || currentStep.response) && (
            <code className="text-xs rounded bg-zinc-900 border border-zinc-800 px-2 py-1 font-mono"
              style={{ color: currentStep.color }}>
              {currentStep.query || currentStep.response}
            </code>
          )}
          <p className="text-sm text-zinc-400 leading-relaxed">{currentStep.desc}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={play}
          disabled={running}
          className="px-4 py-1.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? "⏳ Resolving…" : "▶ Resolve DNS"}
        </button>
        {stepIdx >= 0 && (
          <>
            <button
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              disabled={stepIdx === 0 || running}
              className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-30"
            >
              ← prev
            </button>
            <button
              onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
              disabled={stepIdx === steps.length - 1 || running}
              className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-30"
            >
              next →
            </button>
          </>
        )}
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ↺ Reset
        </button>
        <span className="text-xs text-zinc-600">
          {mode === "hit" ? "Cache HIT: skips the entire resolver chain." : `${steps.length} hops to resolve ${domain}`}
        </span>
      </div>

    </div>
  );
}
