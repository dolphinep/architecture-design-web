"use client";
import { useState, useCallback } from "react";
import {
  VizFrame, VizStage, VizHint, VizButton, VizSpacer,
  VizStats, VizLegend, VizLog,
  VizSvg, VizText, VizEdge, VizPacket, VizNode, pointOnEdge,
  useFlights, useInterval, useOnScreen, useReducedMotion, useEventLog,
  fadeOut, easeInOut,
  HUE, TYPE, STROKE, MOTION, type HueName, type Flight,
} from "./_shared";

type ServiceId = "frontend" | "orders" | "payments";
type Mode = "without" | "with";

interface Svc {
  id: ServiceId;
  label: string;
  role: string;
  hue: HueName;
  x: number;
  y: number;
}

// ─── Layout ───────────────────────────────────────────────────────────────────
const W = 720;
const H = 330;
const BOX_W = 132;
const BOX_H = 60;
const CAR_W = 44;
const CP_X = 470;
const CP_W = 150;
const CP_H = 68;

const SERVICES: Svc[] = [
  { id: "frontend", label: "Frontend", role: "web tier",     hue: "info",    x: 24,  y: 132 },
  { id: "orders",   label: "Orders",   role: "order domain", hue: "primary", x: 250, y: 26  },
  { id: "payments", label: "Payments", role: "PSP adapter",  hue: "success", x: 250, y: 238 },
];

const FLOWS: Array<{ from: ServiceId; to: ServiceId; curve?: number }> = [
  { from: "frontend", to: "orders" },
  { from: "frontend", to: "payments" },
  // Bows out to the right; drawn straight it crosses frontend → payments.
  { from: "orders",   to: "payments", curve: -70 },
];

const byId = (id: ServiceId) => SERVICES.find((s) => s.id === id)!;

/** Traffic leaves through the sidecar when the mesh is on, else straight from the app. */
function egress(id: ServiceId, mode: Mode): [number, number] {
  const s = byId(id);
  const w = mode === "with" ? BOX_W + CAR_W + 4 : BOX_W;
  return [s.x + w, s.y + BOX_H / 2];
}
function ingress(id: ServiceId): [number, number] {
  const s = byId(id);
  return [s.x, s.y + BOX_H / 2];
}

interface Hop {
  from: ServiceId;
  to: ServiceId;
  /** Rejected by the sidecar's mTLS policy */
  blocked: boolean;
  mtls: boolean;
  /** Matches the drawn edge's bow so the packet follows the same path */
  curve?: number;
}

const CAPABILITIES: Record<Mode, Array<{ icon: string; text: string }>> = {
  without: [
    { icon: "✗", text: "Plain HTTP between services — readable on the wire" },
    { icon: "✗", text: "Every service reimplements retries, timeouts, breakers" },
    { icon: "✗", text: "Observability differs per team — no uniform traces" },
    { icon: "✗", text: "No way to enforce which service may call which" },
  ],
  with: [
    { icon: "🔒", text: "mTLS on every hop — encrypted and mutually authenticated" },
    { icon: "↺",  text: "Retries and timeouts handled by the proxy, not app code" },
    { icon: "⚡", text: "Circuit breaking at the network layer" },
    { icon: "📊", text: "Uniform traces, metrics and logs across all services" },
    { icon: "🚦", text: "Traffic splitting for canary and A/B at the proxy" },
  ],
};

export function ServiceMeshViz() {
  const [mode, setMode] = useState<Mode>("without");
  const [strict, setStrict] = useState(false);
  const [running, setRunning] = useState(false);
  const [counts, setCounts] = useState({ ok: 0, blocked: 0, plain: 0 });

  const { entries, push, clear: clearLog } = useEventLog(6);
  const { ref: hostRef, onScreen } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  const { flights, launch, clear: clearFlights } = useFlights<Hop>({
    active: onScreen,
    max: 12,
    reduced,
    onLand: (f) => {
      if (f.meta.blocked) return;
      setCounts((c) =>
        f.meta.mtls ? { ...c, ok: c.ok + 1 } : { ...c, plain: c.plain + 1 }
      );
    },
  });

  const send = useCallback(() => {
    const flow = FLOWS[Math.floor(Math.random() * FLOWS.length)];
    const mtls = mode === "with";
    // With strict mTLS, a workload presenting an unknown cert is refused.
    const blocked = mtls && strict && Math.random() < 0.35;

    launch(
      { ...flow, blocked, mtls },
      // A blocked call dies at the sidecar, so it travels only a short way.
      { duration: blocked ? MOTION.quick : MOTION.flight, linger: blocked ? 800 : 300 }
    );

    if (blocked) {
      setCounts((c) => ({ ...c, blocked: c.blocked + 1 }));
      push(`✗ mTLS denied ${flow.from} → ${flow.to} — unknown identity`, "danger");
    } else if (mtls) {
      push(`🔒 mTLS ok ${flow.from} → ${flow.to}`, "success");
    } else {
      push(`→ plain HTTP ${flow.from} → ${flow.to}`, "warning");
    }
  }, [launch, mode, strict, push]);

  useInterval(running && onScreen, 850, send);

  function switchMode(m: Mode) {
    setMode(m);
    setRunning(false);
    clearFlights();
    clearLog();
    setCounts({ ok: 0, blocked: 0, plain: 0 });
  }

  const total = counts.ok + counts.blocked + counts.plain;
  const encryptedPct = total ? Math.round((counts.ok / total) * 100) : 0;

  return (
    <VizFrame>
      {/* Mode is the central comparison, so it leads */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl overflow-hidden border border-zinc-800">
          {([
            { v: "without" as Mode, label: "Without mesh" },
            { v: "with" as Mode, label: "With service mesh" },
          ]).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => switchMode(v)}
              aria-pressed={mode === v}
              className={`px-3.5 py-1.5 text-[13px] font-medium transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
                ${mode === v
                  ? v === "with" ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/15 text-red-200"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "with" && (
          <VizButton
            variant={strict ? "danger" : "secondary"}
            active={strict}
            onClick={() => setStrict((b) => !b)}
            title="Reject workloads without a valid mesh identity"
          >
            {strict ? "🔒 STRICT mTLS" : "PERMISSIVE mTLS"}
          </VizButton>
        )}

        <VizSpacer />
        <VizButton variant={running ? "secondary" : "primary"} active={running} onClick={() => setRunning((r) => !r)}>
          {running ? "❙❙ Pause" : "▶ Animate traffic"}
        </VizButton>
        <VizButton onClick={send}>+ Send request</VizButton>
      </div>

      <div ref={hostRef}>
        <VizStage>
          <VizSvg
            w={W} h={H}
            label={mode === "with"
              ? "Three services each fronted by a sidecar proxy, configured by a control plane"
              : "Three services calling each other directly over plain HTTP"}
          >
            {/* Flow lines */}
            {FLOWS.map((f, i) => (
              <VizEdge
                key={i}
                from={egress(f.from, mode)}
                to={ingress(f.to)}
                hue={mode === "with" ? "success" : "warning"}
                dashed={mode === "without"}
                curve={f.curve ?? 0}
                arrow
              />
            ))}

            {/* Control plane → sidecars (config push) */}
            {mode === "with" && SERVICES.map((s) => (
              <VizEdge
                key={`cp-${s.id}`}
                from={[CP_X, 150]}
                to={[s.x + BOX_W + 4 + CAR_W / 2, s.y + BOX_H]}
                hue="info"
                dashed
                dimmed
              />
            ))}

            {/* Packets */}
            {flights.map((f: Flight<Hop>) => {
              const [px, py] = pointOnEdge(
                egress(f.meta.from, mode),
                ingress(f.meta.to),
                f.meta.curve ?? 0,
                easeInOut(f.t)
              );
              const hue: HueName = f.meta.blocked ? "danger" : f.meta.mtls ? "success" : "warning";
              return (
                <g key={f.id}>
                  <VizPacket
                    x={px}
                    y={py}
                    hue={hue}
                    r={5}
                    opacity={f.landed ? fadeOut(f) : 1}
                    label={f.meta.blocked && f.landed ? "denied" : undefined}
                  />
                </g>
              );
            })}

            {/* Services, each with its sidecar when the mesh is on */}
            {SERVICES.map((s) => (
              <g key={s.id}>
                <VizNode
                  x={s.x} y={s.y} w={BOX_W} h={BOX_H}
                  title={s.label} sublabel={s.role}
                  hue={s.hue}
                />
                {mode === "with" && (
                  <g>
                    <rect
                      x={s.x + BOX_W + 4} y={s.y} width={CAR_W} height={BOX_H} rx={8}
                      fill="url(#viz-node-active)"
                      stroke={HUE.info.line} strokeWidth={STROKE.thin} strokeDasharray="4 3"
                    />
                    <VizText x={s.x + BOX_W + 4 + CAR_W / 2} y={s.y + BOX_H / 2 - 7} size={TYPE.micro} mono hue="info">
                      envoy
                    </VizText>
                    <VizText x={s.x + BOX_W + 4 + CAR_W / 2} y={s.y + BOX_H / 2 + 7} size={TYPE.micro} mono fill="#3b82f6">
                      🔒
                    </VizText>
                  </g>
                )}
              </g>
            ))}

            {/* Control plane, or the warning that replaces it */}
            {mode === "with" ? (
              <g>
                <rect
                  x={CP_X} y={150 - CP_H / 2} width={CP_W} height={CP_H} rx={12}
                  fill="#0b1220" stroke={HUE.info.line} strokeWidth={STROKE.thin} strokeDasharray="5 3"
                />
                <VizText x={CP_X + CP_W / 2} y={150 - 16} size={TYPE.body} weight={700} hue="info">
                  Control Plane
                </VizText>
                <VizText x={CP_X + CP_W / 2} y={150 + 2} size={TYPE.micro} mono fill="#3b82f6">
                  Istio · Linkerd
                </VizText>
                <VizText x={CP_X + CP_W / 2} y={150 + 18} size={TYPE.micro} fill="#52525b">
                  pushes policy + certs
                </VizText>
              </g>
            ) : (
              <g>
                <rect
                  x={CP_X} y={150 - CP_H / 2} width={CP_W} height={CP_H} rx={12}
                  fill="#1a0a0a" stroke={HUE.danger.base} strokeWidth={STROKE.thin}
                />
                <VizText x={CP_X + CP_W / 2} y={150 - 16} size={TYPE.body} weight={700} hue="danger">
                  No mTLS
                </VizText>
                <VizText x={CP_X + CP_W / 2} y={150 + 2} size={TYPE.micro} fill="#fca5a5">
                  plain HTTP on the wire
                </VizText>
                <VizText x={CP_X + CP_W / 2} y={150 + 18} size={TYPE.micro} fill="#7f1d1d" mono>
                  no identity · no policy
                </VizText>
              </g>
            )}
          </VizSvg>
        </VizStage>
      </div>

      <VizStats
        items={[
          { label: "requests", value: total, hue: "primary" },
          {
            label: mode === "with" ? "mTLS encrypted" : "unencrypted",
            value: mode === "with" ? `${encryptedPct}%` : `${counts.plain}`,
            hue: mode === "with" ? "success" : "warning",
            ...(mode === "with" ? { meter: [counts.ok, Math.max(total, 1)] as [number, number] } : {}),
          },
          { label: "denied by policy", value: counts.blocked, hue: "danger" },
        ]}
      />

      {/* What changes between the two modes */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-3 flex flex-col gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
          {mode === "with" ? "handled by the sidecar" : "left to every service"}
        </span>
        {CAPABILITIES[mode].map((c) => (
          <div key={c.text} className="flex gap-2 text-[13px]">
            <span className={`shrink-0 ${mode === "with" ? "" : "text-red-500"}`}>{c.icon}</span>
            <span className={mode === "with" ? "text-zinc-300" : "text-zinc-400"}>{c.text}</span>
          </div>
        ))}
      </div>

      <VizLog entries={entries} rows={4} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <VizLegend
          items={
            mode === "with"
              ? [{ hue: "success", label: "mTLS encrypted" }, { hue: "danger", label: "denied by policy" }]
              : [{ hue: "warning", label: "plain HTTP", dashed: true }]
          }
        />
        <VizHint>
          {mode === "with"
            ? "Turn on STRICT and watch calls without a valid identity die at the proxy."
            : "Nothing here is encrypted or authenticated — switch the mesh on."}
        </VizHint>
      </div>
    </VizFrame>
  );
}
