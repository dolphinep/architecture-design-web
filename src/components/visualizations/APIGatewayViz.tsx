"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStatus, VizStats, VizLegend, VizLog,
  VizSvg, VizText, VizEdge, VizPacket, VizNode,
  useOnScreen, useReducedMotion, useEventLog,
  HUE, TYPE, STROKE, type HueName,
} from "./_shared";

type ServiceId = "users" | "orders" | "products";

/** The request's position in the gateway pipeline. */
type Stage = "idle" | "auth" | "rate" | "route" | "served" | "rejected-401" | "rejected-429";

interface Route {
  method: string;
  path: string;
  service: ServiceId;
}

const ROUTES: Route[] = [
  { method: "GET",    path: "/api/users/me",     service: "users" },
  { method: "POST",   path: "/api/orders",       service: "orders" },
  { method: "GET",    path: "/api/products",     service: "products" },
  { method: "DELETE", path: "/api/orders/42",    service: "orders" },
];

const METHOD_HUE: Record<string, HueName> = {
  GET: "success", POST: "info", PUT: "warning", DELETE: "danger",
};

const SERVICES: Array<{ id: ServiceId; label: string; port: string; hue: HueName }> = [
  { id: "users",    label: "User Service",    port: ":3001", hue: "info" },
  { id: "orders",   label: "Order Service",   port: ":3002", hue: "primary" },
  { id: "products", label: "Product Service", port: ":3003", hue: "success" },
];

const RATE_LIMIT = 5;
const STEP_MS = 620;

// ─── Layout ───────────────────────────────────────────────────────────────────
const W = 720;
const H = 300;
const CLIENT_X = 16;
const CLIENT_W = 92;
const GATE_X = 190;
const GATE_W = 190;
const SVC_X = 512;
const SVC_W = 190;
const SVC_H = 52;
const SVC_Y = [40, 122, 204];
const MID = H / 2;

/** The three gates, and where a packet sits while being checked by each. */
const GATES = [
  { id: "auth",  label: "Authenticate", detail: "verify bearer token" },
  { id: "rate",  label: "Rate limit",   detail: `${RATE_LIMIT} req window` },
  { id: "route", label: "Route",        detail: "match path → service" },
] as const;

const GATE_H = 40;
const GATE_GAP = 12;
const GATE_TOP = MID - (GATES.length * GATE_H + (GATES.length - 1) * GATE_GAP) / 2;
const gateY = (i: number) => GATE_TOP + i * (GATE_H + GATE_GAP);

export function APIGatewayViz() {
  const [stage, setStage] = useState<Stage>("idle");
  const [route, setRoute] = useState<Route | null>(null);
  const [hasToken, setHasToken] = useState(true);
  const [used, setUsed] = useState(0);
  const [counts, setCounts] = useState({ served: 0, blocked: 0 });

  const { entries, push, clear: clearLog } = useEventLog(6);
  const { ref: hostRef } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const after = useCallback((ms: number, fn: () => void) => {
    // Reduced motion collapses the walkthrough to its outcome.
    if (reduced) { fn(); return; }
    timers.current.push(setTimeout(fn, ms));
  }, [reduced]);

  const inFlight = stage !== "idle" && stage !== "served"
    && stage !== "rejected-401" && stage !== "rejected-429";

  const send = useCallback((r: Route) => {
    clearTimers();
    setRoute(r);
    setStage("auth");
    push(`→ ${r.method} ${r.path}`, METHOD_HUE[r.method] ?? "neutral");

    if (!hasToken) {
      after(STEP_MS, () => {
        setStage("rejected-401");
        setCounts((c) => ({ ...c, blocked: c.blocked + 1 }));
        push("✗ 401 Unauthorized — stopped at the gateway", "danger");
      });
      return;
    }

    after(STEP_MS, () => {
      setStage("rate");
      push("✓ Token valid", "success");

      if (used >= RATE_LIMIT) {
        after(STEP_MS, () => {
          setStage("rejected-429");
          setCounts((c) => ({ ...c, blocked: c.blocked + 1 }));
          push(`✗ 429 Too Many Requests — ${used}/${RATE_LIMIT} used`, "danger");
        });
        return;
      }

      setUsed((n) => n + 1);
      after(STEP_MS, () => {
        setStage("route");
        push(`→ ${SERVICES.find((s) => s.id === r.service)!.label}`, "info");
        after(STEP_MS, () => {
          setStage("served");
          setCounts((c) => ({ ...c, served: c.served + 1 }));
          push("✓ 200 OK", "success");
        });
      });
    });
  }, [after, clearTimers, hasToken, push, used]);

  function reset() {
    clearTimers();
    setStage("idle");
    setRoute(null);
    setUsed(0);
    setCounts({ served: 0, blocked: 0 });
    clearLog();
  }

  /** Gate visual state: pending / checking / passed / failed. */
  function gateState(i: number): "idle" | "active" | "ok" | "fail" {
    const order: Stage[] = ["auth", "rate", "route"];
    const at = order.indexOf(stage as Stage);
    if (stage === "rejected-401") return i === 0 ? "fail" : "idle";
    if (stage === "rejected-429") return i === 0 ? "ok" : i === 1 ? "fail" : "idle";
    if (stage === "served") return "ok";
    if (at < 0) return "idle";
    if (i < at) return "ok";
    if (i === at) return "active";
    return "idle";
  }

  const GATE_HUE = { idle: "neutral", active: "warning", ok: "success", fail: "danger" } as const;

  const statusHue: HueName =
    stage === "served" ? "success"
    : stage === "rejected-401" || stage === "rejected-429" ? "danger"
    : stage === "idle" ? "neutral" : "warning";

  const statusLabel =
    stage === "idle" ? "READY"
    : stage === "served" ? "200 OK"
    : stage === "rejected-401" ? "401"
    : stage === "rejected-429" ? "429"
    : stage.toUpperCase();

  const statusText =
    stage === "idle" ? "Send a request to walk it through the gateway."
    : stage === "auth" ? "Checking the bearer token…"
    : stage === "rate" ? "Counting against the rate-limit window…"
    : stage === "route" ? "Matching the path to a backing service…"
    : stage === "served" ? `Served by ${SERVICES.find((s) => s.id === route?.service)?.label}.`
    : stage === "rejected-401" ? "No valid token — the backend was never reached."
    : "Rate limit exhausted — the backend was never reached.";

  // Where the request marker sits right now
  const markerPos = (): [number, number] | null => {
    if (stage === "idle") return null;
    if (stage === "auth" || stage === "rejected-401") return [GATE_X - 8, gateY(0) + GATE_H / 2];
    if (stage === "rate" || stage === "rejected-429") return [GATE_X - 8, gateY(1) + GATE_H / 2];
    if (stage === "route") return [GATE_X - 8, gateY(2) + GATE_H / 2];
    const i = SERVICES.findIndex((s) => s.id === route?.service);
    return [SVC_X - 12, SVC_Y[i] + SVC_H / 2];
  };
  const marker = markerPos();

  return (
    <VizFrame>
      <VizStatus hue={statusHue} label={statusLabel} pulse={inFlight}>
        {statusText}
      </VizStatus>

      {/* Request credentials + quota */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">token</span>
          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-800">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setHasToken(v)}
                aria-pressed={hasToken === v}
                className={`px-2.5 py-1 text-[12px] font-mono transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
                  ${hasToken === v
                    ? v ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"
                    : "bg-zinc-900/50 text-zinc-500 hover:text-zinc-300"}`}
              >
                {v ? "✓ valid" : "✗ missing"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">quota</span>
          <span className="font-mono text-xs text-zinc-400 tabular-nums">{used}/{RATE_LIMIT}</span>
          <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${used >= RATE_LIMIT ? "bg-red-400" : "bg-amber-400"}`}
              style={{ width: `${Math.min(100, (used / RATE_LIMIT) * 100)}%` }}
            />
          </div>
          <VizButton variant="ghost" onClick={() => { setUsed(0); push("↺ Rate window reset", "neutral"); }}>
            reset window
          </VizButton>
        </div>
      </div>

      <div ref={hostRef}>
        <VizStage>
          <VizSvg w={W} h={H} label="An API gateway checking authentication and rate limits before routing to one of three services">
            {/* Client → gateway */}
            <VizEdge
              from={[CLIENT_X + CLIENT_W, MID]} to={[GATE_X - 8, MID]}
              hue={stage === "idle" ? "neutral" : "primary"}
              arrow active={inFlight}
            />
            <VizText x={(CLIENT_X + CLIENT_W + GATE_X) / 2} y={MID - 14} size={TYPE.micro} mono fill="#3f3f46">
              HTTPS
            </VizText>
            <VizNode
              x={CLIENT_X} y={MID - 26} w={CLIENT_W} h={52}
              title="Client" sublabel="browser"
              hue={stage === "served" ? "success" : stage.startsWith("rejected") ? "danger" : "neutral"}
            />

            {/* Gateway shell */}
            <rect
              x={GATE_X - 8} y={GATE_TOP - 26} width={GATE_W + 16} height={GATES.length * (GATE_H + GATE_GAP) + 34}
              rx={14} fill="#101014" stroke={HUE.primary.base} strokeWidth={STROKE.thin} strokeOpacity={0.7}
            />
            <VizText x={GATE_X + GATE_W / 2} y={GATE_TOP - 12} size={TYPE.small} weight={700} hue="primary">
              API Gateway
            </VizText>

            {/* The three gates, stacked in the order they run */}
            {GATES.map((g, i) => {
              const st = gateState(i);
              const hue = GATE_HUE[st] as HueName;
              return (
                <g key={g.id}>
                  <rect
                    x={GATE_X} y={gateY(i)} width={GATE_W} height={GATE_H} rx={8}
                    fill={st === "idle" ? "#17171a" : "url(#viz-node-active)"}
                    stroke={HUE[hue].line}
                    strokeWidth={st === "active" ? STROKE.base : STROKE.thin}
                    strokeOpacity={st === "idle" ? 0.45 : 1}
                  />
                  <VizText
                    x={GATE_X + 12} y={gateY(i) + 15} size={TYPE.small} weight={600} anchor="start"
                    fill={st === "idle" ? "#6b6b76" : HUE[hue].text}
                  >
                    {`${i + 1}. ${g.label}`}
                  </VizText>
                  <VizText
                    x={GATE_X + 12} y={gateY(i) + 29} size={TYPE.micro} anchor="start" mono
                    fill={st === "idle" ? "#4b4b55" : "#8b8b96"}
                  >
                    {g.detail}
                  </VizText>
                  <VizText x={GATE_X + GATE_W - 12} y={gateY(i) + GATE_H / 2} size={TYPE.body} anchor="end" hue={hue} weight={700}>
                    {st === "ok" ? "✓" : st === "fail" ? "✗" : st === "active" ? "…" : ""}
                  </VizText>
                </g>
              );
            })}

            {/* Gateway → services, only the matched route lights up */}
            {SERVICES.map((s, i) => {
              const matched = route?.service === s.id && (stage === "route" || stage === "served");
              return (
                <VizEdge
                  key={s.id}
                  from={[GATE_X + GATE_W + 8, MID]}
                  to={[SVC_X, SVC_Y[i] + SVC_H / 2]}
                  hue={matched ? s.hue : "neutral"}
                  arrow={matched}
                  active={matched}
                  dimmed={!matched}
                  dashed={!matched}
                />
              );
            })}

            {/* Services */}
            {SERVICES.map((s, i) => {
              const matched = route?.service === s.id && (stage === "route" || stage === "served");
              return (
                <VizNode
                  key={s.id}
                  x={SVC_X} y={SVC_Y[i]} w={SVC_W} h={SVC_H}
                  title={s.label} sublabel={s.port}
                  hue={s.hue}
                  active={matched}
                  dimmed={!matched && stage !== "idle"}
                />
              );
            })}

            {/* The request itself */}
            {marker && (
              <VizPacket
                x={marker[0]} y={marker[1]}
                hue={stage.startsWith("rejected") ? "danger" : stage === "served" ? "success" : "primary"}
                r={6}
                // No label: it would sit on the gate text inside the gateway and
                // on the node text at a service. The status banner names the
                // stage and the log carries the request line.
              />
            )}
          </VizSvg>
        </VizStage>
      </div>

      <VizControls>
        {ROUTES.map((r, i) => (
          <VizButton key={i} onClick={() => send(r)} disabled={inFlight}>
            <span className="font-mono" style={{ color: HUE[METHOD_HUE[r.method] ?? "neutral"].text }}>
              {r.method}
            </span>
            <span className="font-mono text-zinc-400">{r.path}</span>
          </VizButton>
        ))}
        <VizSpacer />
        <VizButton variant="ghost" onClick={reset}>↺ Reset</VizButton>
      </VizControls>

      <VizStats
        items={[
          { label: "served (200)", value: counts.served, hue: "success" },
          { label: "blocked at gateway", value: counts.blocked, hue: "danger" },
          { label: "quota used", value: `${used}/${RATE_LIMIT}`, hue: used >= RATE_LIMIT ? "danger" : "warning", meter: [used, RATE_LIMIT] },
        ]}
      />

      <VizLog entries={entries} rows={4} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <VizLegend
          items={[
            { hue: "success", label: "passed" },
            { hue: "warning", label: "checking" },
            { hue: "danger", label: "rejected" },
          ]}
        />
        <VizHint>
          Switch the token off, or exhaust the quota — the backing services never see the request.
        </VizHint>
      </div>
    </VizFrame>
  );
}
