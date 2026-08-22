"use client";
import { useState, useCallback } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStats, VizLegend, VizDetail, VizField, VizChip,
  VizSvg, VizText, VizEdge, VizPacket, VizNode, pointOnEdge,
  useFlights, useInterval, useOnScreen, useReducedMotion,
  fadeOut, easeInOut,
  HUE, TYPE, STROKE, MOTION, type HueName, type Flight,
} from "./_shared";

type ServiceId = "gateway" | "user" | "order" | "payment" | "inventory" | "notification";

interface Service {
  id: ServiceId;
  label: string;
  role: string;
  /** Owned datastore — null for the gateway, which is stateless */
  db: string | null;
  hue: HueName;
  x: number;
  y: number;
  /** What this service is responsible for, shown when selected */
  owns: string[];
}

// Layout is in design space; VizSvg scales it to the container width.
const W = 780;
const H = 430;
const NODE_W = 150;
const NODE_H = 58;

const SERVICES: Service[] = [
  { id: "gateway",      label: "API Gateway",   role: "auth · rate limit · route", db: null,            hue: "info",    x: 315, y: 22,  owns: ["Request authentication", "Rate limiting", "Routing to services"] },
  { id: "user",         label: "User Service",  role: "profiles · sessions",       db: "users",         hue: "primary", x: 20,  y: 168, owns: ["User profiles", "Session lifecycle", "Preferences"] },
  { id: "order",        label: "Order Service", role: "cart · order lifecycle",    db: "orders",        hue: "primary", x: 210, y: 168, owns: ["Cart state", "Order state machine", "Order history"] },
  { id: "payment",      label: "Payment",       role: "charge · refund",           db: "payments",      hue: "primary", x: 400, y: 168, owns: ["Charges and refunds", "PSP integration", "Payment audit trail"] },
  { id: "inventory",    label: "Inventory",     role: "stock · reservations",      db: "inventory",     hue: "primary", x: 590, y: 168, owns: ["Stock levels", "Reservations", "Restock signals"] },
  { id: "notification", label: "Notification",  role: "email · sms · push",        db: "templates",     hue: "success", x: 315, y: 314, owns: ["Template rendering", "Delivery retries", "Channel routing"] },
];

type FlowKind = "sync" | "internal" | "event";

interface Flow {
  from: ServiceId;
  to: ServiceId;
  label: string;
  kind: FlowKind;
  /** Perpendicular bow, to route around any node sitting between the endpoints */
  curve?: number;
}

const FLOWS: Flow[] = [
  { from: "gateway", to: "user",         label: "GET /me",       kind: "sync" },
  { from: "gateway", to: "order",        label: "POST /order",   kind: "sync" },
  { from: "order",   to: "payment",      label: "charge",        kind: "internal" },
  // Bows above the Payment node, which sits directly between these two.
  { from: "order",   to: "inventory",    label: "reserve",       kind: "internal", curve: -110 },
  { from: "payment", to: "notification", label: "receipt",       kind: "event" },
  { from: "order",   to: "notification", label: "order placed",  kind: "event" },
];

const FLOW_HUE: Record<FlowKind, HueName> = {
  sync: "info",
  internal: "primary",
  event: "success",
};

const byId = (id: ServiceId) => SERVICES.find((s) => s.id === id)!;
const centre = (s: Service): [number, number] => [s.x + NODE_W / 2, s.y + NODE_H / 2];

/** Where an edge should meet a node's border, so lines stop at the box edge. */
function anchor(from: Service, to: Service): [number, number] {
  const [fx, fy] = centre(from);
  const [tx, ty] = centre(to);
  const dx = tx - fx;
  const dy = ty - fy;
  // Vertical-dominant links attach top/bottom; otherwise left/right.
  if (Math.abs(dy) * (NODE_W / NODE_H) > Math.abs(dx)) {
    return [fx, fy + Math.sign(dy) * (NODE_H / 2)];
  }
  return [fx + Math.sign(dx) * (NODE_W / 2), fy];
}

interface Hop { flow: Flow }

export function MicroservicesViz() {
  const [selected, setSelected] = useState<ServiceId | null>(null);
  const [running, setRunning] = useState(false);
  const [delivered, setDelivered] = useState(0);

  const { ref: hostRef, onScreen } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  const { flights, launch, clear } = useFlights<Hop>({
    active: onScreen,
    max: 9,
    reduced,
    onLand: () => setDelivered((n) => n + 1),
  });

  const spawn = useCallback(() => {
    const flow = FLOWS[Math.floor(Math.random() * FLOWS.length)];
    launch({ flow }, { duration: MOTION.flight, linger: 400 });
  }, [launch]);

  useInterval(running && onScreen, 700, spawn);

  const active = selected ? byId(selected) : null;
  const related = FLOWS.filter((f) => f.from === selected || f.to === selected);
  const relatedIds = new Set(related.flatMap((f) => [f.from, f.to]));

  function reset() {
    setRunning(false);
    setSelected(null);
    setDelivered(0);
    clear();
  }

  return (
    <VizFrame>
      <VizControls>
        <VizButton variant={running ? "secondary" : "primary"} active={running} onClick={() => setRunning((r) => !r)}>
          {running ? "❙❙ Pause traffic" : "▶ Animate traffic"}
        </VizButton>
        <VizButton onClick={spawn}>→ Single request</VizButton>
        <VizSpacer />
        <VizButton variant="ghost" onClick={reset}>↺ Reset</VizButton>
      </VizControls>

      <div ref={hostRef}>
        <VizStage>
          <VizSvg w={W} h={H} label="Six microservices behind an API gateway, each owning its own database">
            {/* Edges first, so nodes paint over the line ends */}
            {FLOWS.map((flow, i) => {
              const from = byId(flow.from);
              const to = byId(flow.to);
              const isRelated = selected === null || flow.from === selected || flow.to === selected;
              return (
                <VizEdge
                  key={i}
                  from={anchor(from, to)}
                  to={anchor(to, from)}
                  hue={FLOW_HUE[flow.kind]}
                  dashed={flow.kind === "event"}
                  arrow
                  curve={flow.curve ?? 0}
                  active={selected !== null && isRelated}
                  dimmed={!isRelated}
                />
              );
            })}

            {/* Packets in flight */}
            {flights.map((f: Flight<Hop>) => {
              const from = byId(f.meta.flow.from);
              const to = byId(f.meta.flow.to);
              // Follow the drawn path, bow included
              const [px, py] = pointOnEdge(
                anchor(from, to),
                anchor(to, from),
                f.meta.flow.curve ?? 0,
                easeInOut(f.t)
              );
              return (
                <VizPacket
                  key={f.id}
                  x={px}
                  y={py}
                  hue={FLOW_HUE[f.meta.flow.kind]}
                  r={5}
                  opacity={f.landed ? fadeOut(f) : 1}
                  label={f.t > 0.15 && f.t < 0.85 ? f.meta.flow.label : undefined}
                />
              );
            })}

            {/* Service nodes + their owned datastore */}
            {SERVICES.map((svc) => {
              const isActive = selected === svc.id;
              const isDimmed = selected !== null && !relatedIds.has(svc.id);
              return (
                <g key={svc.id}>
                  <VizNode
                    x={svc.x} y={svc.y} w={NODE_W} h={NODE_H}
                    title={svc.label}
                    sublabel={svc.role}
                    hue={svc.hue}
                    active={isActive}
                    dimmed={isDimmed}
                    onClick={() => setSelected(isActive ? null : svc.id)}
                    ariaLabel={`${svc.label}: ${svc.role}`}
                  />
                  {/* Database-per-service, drawn as an actual store rather than a text note */}
                  {svc.db && (
                    <g opacity={isDimmed ? 0.3 : 1} style={{ pointerEvents: "none", transition: "opacity 220ms" }}>
                      <ellipse
                        cx={svc.x + NODE_W / 2} cy={svc.y + NODE_H + 16} rx={30} ry={5}
                        fill="none" stroke={HUE[svc.hue].base} strokeWidth={STROKE.hairline} strokeOpacity={0.9}
                      />
                      <path
                        d={`M ${svc.x + NODE_W / 2 - 30} ${svc.y + NODE_H + 16}
                            v 10 a 30 5 0 0 0 60 0 v -10`}
                        fill="none" stroke={HUE[svc.hue].base} strokeWidth={STROKE.hairline} strokeOpacity={0.9}
                      />
                      <line
                        x1={svc.x + NODE_W / 2} y1={svc.y + NODE_H}
                        x2={svc.x + NODE_W / 2} y2={svc.y + NODE_H + 11}
                        stroke={HUE[svc.hue].base} strokeWidth={STROKE.hairline} strokeOpacity={0.7}
                      />
                      <VizText
                        x={svc.x + NODE_W / 2} y={svc.y + NODE_H + 40}
                        size={TYPE.micro} hue={svc.hue} mono
                      >
                        {svc.db}
                      </VizText>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Tier captions — name the rows so the topology reads at a glance */}
            <VizText x={8} y={51} size={TYPE.micro} anchor="start" fill="#3f3f46" mono>edge</VizText>
            <VizText x={8} y={150} size={TYPE.micro} anchor="start" fill="#3f3f46" mono>domain</VizText>
            <VizText x={8} y={300} size={TYPE.micro} anchor="start" fill="#3f3f46" mono>async</VizText>
          </VizSvg>
        </VizStage>
      </div>

      <VizStats
        items={[
          { label: "services", value: SERVICES.length, hue: "primary" },
          { label: "independent datastores", value: SERVICES.filter((s) => s.db).length, hue: "info" },
          { label: "messages delivered", value: delivered, hue: "success" },
        ]}
      />

      <VizDetail
        title={active?.label}
        hue={active?.hue ?? "primary"}
        onClose={() => setSelected(null)}
        empty="Click any service to see what it owns and who it talks to."
      >
        {active && (
          <>
            <VizField label="responsibility">
              <ul className="flex flex-col gap-0.5">
                {active.owns.map((o) => (
                  <li key={o} className="text-zinc-300">— {o}</li>
                ))}
              </ul>
            </VizField>
            <VizField label={active.db ? "owns datastore" : "state"}>
              {active.db ? <VizChip hue={active.hue}>{active.db}</VizChip> : <span className="text-zinc-500">stateless</span>}
            </VizField>
            {related.length > 0 && (
              <VizField label="talks to">
                <div className="flex flex-wrap gap-1.5">
                  {related.map((f, i) => {
                    const outbound = f.from === active.id;
                    const other = byId(outbound ? f.to : f.from);
                    return (
                      <VizChip key={i} hue={FLOW_HUE[f.kind]}>
                        {outbound ? "→" : "←"} {other.label} · {f.label}
                      </VizChip>
                    );
                  })}
                </div>
              </VizField>
            )}
          </>
        )}
      </VizDetail>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <VizLegend
          items={[
            { hue: "info", label: "client request" },
            { hue: "primary", label: "service-to-service" },
            { hue: "success", label: "async event", dashed: true },
          ]}
        />
        <VizHint>Each service owns its own datastore — no shared database.</VizHint>
      </div>
    </VizFrame>
  );
}
