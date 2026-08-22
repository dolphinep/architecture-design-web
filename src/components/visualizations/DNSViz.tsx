"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStatus, VizStats,
  VizSvg, VizText, VizEdge, VizPacket,
  useOnScreen, useReducedMotion,
  HUE, TYPE, STROKE, type HueName,
} from "./_shared";

type NodeId = "browser" | "cache" | "resolver" | "root" | "tld" | "auth";
type Mode = "miss" | "hit";

interface Hop {
  from: NodeId;
  to: NodeId;
  /** The wire message, shown on the arrow */
  wire: string;
  /** What is actually happening, and why it matters */
  detail: string;
  kind: "query" | "referral" | "answer";
}

const KIND_HUE: Record<Hop["kind"], HueName> = {
  query: "primary",
  referral: "warning",
  answer: "success",
};

interface NodeSpec {
  id: NodeId;
  label: string;
  sub: string;
  hue: HueName;
}

/**
 * Hops reference nodes by id. The previous version inferred them by
 * substring-matching display labels, which silently mismatched whenever a label
 * changed and made the step ids diverge from what the steps actually did.
 */
function buildHops(domain: string, mode: Mode): Hop[] {
  const parts = domain.split(".").filter(Boolean);
  const tld = parts.at(-1) ?? "com";
  const sld = parts.slice(-2).join(".") || domain;

  if (mode === "hit") {
    return [
      {
        from: "browser", to: "cache", kind: "query",
        wire: `A ${domain}?`,
        detail: "The browser checks its own cache, then the OS resolver cache, before any packet leaves the machine.",
      },
      {
        from: "cache", to: "browser", kind: "answer",
        wire: "93.184.216.34",
        detail: "Cache HIT — the entry is still inside its TTL, so the answer returns in microseconds and no name server is queried at all.",
      },
    ];
  }

  return [
    {
      from: "browser", to: "resolver", kind: "query",
      wire: `A ${domain}?`,
      detail: "Local caches miss, so the browser asks its configured recursive resolver — typically your ISP, 1.1.1.1, or 8.8.8.8.",
    },
    {
      from: "resolver", to: "root", kind: "query",
      wire: `A ${domain}?`,
      detail: "The resolver starts at the top. There are 13 root server identities (a–m.root-servers.net), served by hundreds of anycast instances.",
    },
    {
      from: "root", to: "resolver", kind: "referral",
      wire: `NS .${tld} → gtld-servers.net`,
      detail: `The root does not know the address. It only knows who runs .${tld} — so it returns a referral, not an answer.`,
    },
    {
      from: "resolver", to: "tld", kind: "query",
      wire: `A ${domain}?`,
      detail: `The resolver follows the referral to the .${tld} registry servers.`,
    },
    {
      from: "tld", to: "resolver", kind: "referral",
      wire: `NS ${sld} → ns1.${sld}`,
      detail: `The TLD knows which name servers ${sld} delegated to — the ones its owner set when registering the domain. Still a referral.`,
    },
    {
      from: "resolver", to: "auth", kind: "query",
      wire: `A ${domain}?`,
      detail: `The authoritative name server is the source of truth for ${sld}. This is the first server in the chain that actually holds the record.`,
    },
    {
      from: "auth", to: "resolver", kind: "answer",
      wire: "93.184.216.34 · TTL 3600",
      detail: "The answer comes back with a TTL. The resolver caches it, so every later lookup inside that hour skips this entire chain.",
    },
    {
      from: "resolver", to: "browser", kind: "answer",
      wire: "93.184.216.34",
      detail: "The resolver hands the address to the browser, which caches it too and finally opens a TCP connection.",
    },
  ];
}

const W = 760;
const H = 150;
const NODE_W = 108;
const NODE_H = 56;
const NODE_Y = 46;

export function DNSViz() {
  const [domain, setDomain] = useState("api.github.com");
  const [mode, setMode] = useState<Mode>("miss");
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);

  const { ref: hostRef } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  const hops = useMemo(() => buildHops(domain, mode), [domain, mode]);

  const nodes: NodeSpec[] = useMemo(() => {
    const tld = domain.split(".").filter(Boolean).at(-1) ?? "com";
    const sld = domain.split(".").filter(Boolean).slice(-2).join(".") || domain;
    return mode === "hit"
      ? [
          { id: "browser", label: "Browser",  sub: "local cache",  hue: "primary" },
          { id: "cache",   label: "OS Cache", sub: "TTL valid",    hue: "success" },
        ]
      : [
          { id: "browser",  label: "Browser",   sub: "your machine",   hue: "primary" },
          { id: "resolver", label: "Resolver",  sub: "1.1.1.1",        hue: "info" },
          { id: "root",     label: "Root NS",   sub: "13 identities",  hue: "warning" },
          { id: "tld",      label: "TLD NS",    sub: `.${tld}`,        hue: "warning" },
          { id: "auth",     label: "Auth NS",   sub: sld,              hue: "success" },
        ];
  }, [domain, mode]);

  const xOf = useCallback(
    (id: NodeId) => {
      const i = nodes.findIndex((n) => n.id === id);
      if (i < 0) return 0;
      const gap = (W - nodes.length * NODE_W) / (nodes.length + 1);
      return gap + i * (NODE_W + gap);
    },
    [nodes]
  );

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const play = useCallback(() => {
    clearTimers();
    setStep(-1);
    if (reduced) { setStep(hops.length - 1); return; }
    setRunning(true);
    hops.forEach((_, i) => {
      timers.current.push(setTimeout(() => setStep(i), i * 1150 + 150));
    });
    timers.current.push(setTimeout(() => setRunning(false), hops.length * 1150 + 200));
  }, [clearTimers, hops, reduced]);

  const reset = useCallback(() => {
    clearTimers();
    setStep(-1);
    setRunning(false);
  }, [clearTimers]);

  const current = step >= 0 ? hops[step] : null;
  /** Nodes already touched, so the path so far stays visible. */
  const visited = new Set<NodeId>(hops.slice(0, step + 1).flatMap((h) => [h.from, h.to]));

  // Name servers actually queried — every query hop except the browser's first
  // request to its own resolver.
  const serversQueried = hops.filter((h) => h.kind === "query" && h.from !== "browser").length;

  return (
    <VizFrame>
      <VizStatus
        hue={current ? KIND_HUE[current.kind] : "neutral"}
        label={current ? `${step + 1}/${hops.length} ${current.kind.toUpperCase()}` : "READY"}
        pulse={running}
      >
        {current ? current.detail : "Resolve a name and watch the resolver walk down the hierarchy."}
      </VizStatus>

      {/* Inputs */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">domain</span>
          <input
            value={domain}
            onChange={(e) => { setDomain(e.target.value); reset(); }}
            spellCheck={false}
            className="w-48 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 font-mono text-[13px] text-zinc-200
                       focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/30"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">cache</span>
          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-800">
            {([
              { v: "miss" as Mode, label: "MISS — full walk" },
              { v: "hit" as Mode, label: "HIT — cached" },
            ]).map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => { setMode(v); reset(); }}
                aria-pressed={mode === v}
                className={`px-3 py-1.5 text-[12px] transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
                  ${mode === v
                    ? v === "hit" ? "bg-emerald-500/20 text-emerald-200" : "bg-violet-500/20 text-violet-200"
                    : "bg-zinc-900/60 text-zinc-500 hover:text-zinc-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={hostRef}>
        <VizStage>
          <VizSvg
            w={W} h={H}
            label={mode === "hit"
              ? "A cached DNS lookup answered locally"
              : "A recursive DNS lookup walking from the root to the authoritative name server"}
          >
            {/* Baseline chain */}
            {nodes.slice(0, -1).map((n, i) => (
              <VizEdge
                key={n.id}
                from={[xOf(n.id) + NODE_W, NODE_Y + NODE_H / 2]}
                to={[xOf(nodes[i + 1].id), NODE_Y + NODE_H / 2]}
                hue="neutral"
                dashed
                dimmed
              />
            ))}

            {/* The active hop, above the row for queries and below for answers */}
            {current && (() => {
              const forward = xOf(current.to) > xOf(current.from);
              const y = NODE_Y + NODE_H / 2 + (current.kind === "query" ? -34 : 34);
              const fx = forward ? xOf(current.from) + NODE_W : xOf(current.from);
              const tx = forward ? xOf(current.to) : xOf(current.to) + NODE_W;
              const hue = KIND_HUE[current.kind];
              return (
                <g>
                  {/* Riser out of the source, across, and down into the target */}
                  <path
                    d={`M ${fx} ${NODE_Y + NODE_H / 2} L ${fx} ${y} L ${tx} ${y} L ${tx} ${NODE_Y + NODE_H / 2}`}
                    fill="none"
                    stroke={HUE[hue].line}
                    strokeWidth={STROKE.base}
                    strokeLinecap="round"
                    markerEnd={`url(#viz-arrow-${hue})`}
                    style={{ filter: `drop-shadow(0 0 5px ${HUE[hue].glow}88)` }}
                  />
                  <rect
                    x={(fx + tx) / 2 - current.wire.length * 3.3 - 6}
                    y={y - 9}
                    width={current.wire.length * 6.6 + 12}
                    height={18}
                    rx={5}
                    fill="#0a0a0b"
                  />
                  <VizText x={(fx + tx) / 2} y={y} size={TYPE.micro} hue={hue} mono>
                    {current.wire}
                  </VizText>
                </g>
              );
            })()}

            {/* Nodes */}
            {nodes.map((n) => {
              const touched = visited.has(n.id);
              const active = current?.from === n.id || current?.to === n.id;
              const x = xOf(n.id);
              return (
                <g key={n.id} opacity={touched || step < 0 ? 1 : 0.4}
                   style={{ transition: "opacity 220ms" }}>
                  <rect
                    x={x} y={NODE_Y} width={NODE_W} height={NODE_H} rx={10}
                    fill={active ? "url(#viz-node-active)" : "url(#viz-node)"}
                    stroke={active ? HUE[n.hue].line : HUE.neutral.base}
                    strokeWidth={active ? STROKE.base : STROKE.thin}
                    style={active ? { filter: `drop-shadow(0 0 8px ${HUE[n.hue].glow}55)` } : undefined}
                  />
                  <VizText
                    x={x + NODE_W / 2} y={NODE_Y + 22} size={TYPE.body} weight={600}
                    fill={active ? HUE[n.hue].text : HUE.neutral.strong}
                  >
                    {n.label}
                  </VizText>
                  <VizText x={x + NODE_W / 2} y={NODE_Y + 39} size={TYPE.micro} mono fill="#6b6b76">
                    {n.sub}
                  </VizText>
                  {touched && (
                    <circle cx={x + NODE_W - 8} cy={NODE_Y + 8} r={4} fill={HUE[n.hue].line} />
                  )}
                </g>
              );
            })}

            {/* Packet riding the active hop */}
            {current && (
              <VizPacket
                x={(xOf(current.from) + xOf(current.to) + NODE_W) / 2}
                y={NODE_Y + NODE_H / 2 + (current.kind === "query" ? -34 : 34)}
                hue={KIND_HUE[current.kind]}
                r={0}
              />
            )}

            <VizText x={12} y={H - 10} size={TYPE.micro} anchor="start" fill="#3f3f46" mono>
              queries above the line · answers below
            </VizText>
          </VizSvg>
        </VizStage>
      </div>

      {/* Step scrubber */}
      <div className="flex gap-1.5" role="group" aria-label="Lookup steps">
        {hops.map((h, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { clearTimers(); setRunning(false); setStep(i); }}
            aria-label={`Step ${i + 1}: ${h.from} to ${h.to}`}
            aria-current={i === step}
            className={`flex-1 h-1.5 rounded-full transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
              ${i <= step ? "bg-violet-500" : "bg-zinc-800 hover:bg-zinc-700"}`}
          />
        ))}
      </div>

      <VizControls>
        <VizButton variant="primary" onClick={play} disabled={running}>
          {running ? "⏳ Resolving…" : "▶ Resolve"}
        </VizButton>
        <VizButton onClick={() => { clearTimers(); setRunning(false); setStep((i) => Math.max(0, i - 1)); }} disabled={step <= 0 || running}>
          ← prev
        </VizButton>
        <VizButton onClick={() => { clearTimers(); setRunning(false); setStep((i) => Math.min(hops.length - 1, i + 1)); }} disabled={step >= hops.length - 1 || running}>
          next →
        </VizButton>
        <VizSpacer />
        <VizButton variant="ghost" onClick={reset}>↺ Reset</VizButton>
      </VizControls>

      <VizStats
        items={[
          { label: "messages", value: hops.length, hue: "primary" },
          { label: "servers queried", value: serversQueried, hue: "info" },
          { label: mode === "hit" ? "latency" : "typical latency", value: mode === "hit" ? "~0ms" : "20–120ms", hue: mode === "hit" ? "success" : "warning" },
        ]}
      />

      <VizHint>
        {mode === "hit"
          ? "A warm cache answers without touching the network — which is why TTL choice is a real design decision."
          : "Every referral is a round trip. This is why the resolver caches aggressively, and why the first visit to a domain feels slower."}
      </VizHint>
    </VizFrame>
  );
}
