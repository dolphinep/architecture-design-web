"use client";
import { useState, useEffect, useRef } from "react";

type ServiceId = "gateway" | "user" | "order" | "payment" | "notification" | "inventory";

interface Service {
  id: ServiceId;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  color: string;
  border: string;
  owns: string;
}

const SERVICES: Service[] = [
  { id: "gateway",      label: "API Gateway",        sublabel: "auth · rate-limit · routing", x: 260, y: 30,  color: "bg-indigo-950", border: "border-indigo-500", owns: "—" },
  { id: "user",         label: "User Service",        sublabel: "profiles · sessions",         x: 40,  y: 155, color: "bg-zinc-900",   border: "border-violet-500", owns: "users DB" },
  { id: "order",        label: "Order Service",       sublabel: "cart · order lifecycle",      x: 180, y: 155, color: "bg-zinc-900",   border: "border-violet-500", owns: "orders DB" },
  { id: "payment",      label: "Payment Service",     sublabel: "charge · refund · stripe",    x: 320, y: 155, color: "bg-zinc-900",   border: "border-violet-500", owns: "payments DB" },
  { id: "inventory",    label: "Inventory Service",   sublabel: "stock · reservations",        x: 460, y: 155, color: "bg-zinc-900",   border: "border-violet-500", owns: "inventory DB" },
  { id: "notification", label: "Notification Service",sublabel: "email · sms · push",          x: 260, y: 290, color: "bg-zinc-900",   border: "border-emerald-500", owns: "templates DB" },
];

interface Packet {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  color: string;
  label: string;
}

const GW_X = 260 + 70; // gateway center X
const GW_Y = 30 + 28;  // gateway center Y
const SVC_CX = (s: Service) => s.x + 70;
const SVC_CY = (s: Service) => s.y + 28;

const FLOWS: Array<{ from: ServiceId; to: ServiceId; label: string; color: string }> = [
  { from: "gateway",  to: "user",         label: "GET /me",          color: "#a78bfa" },
  { from: "gateway",  to: "order",        label: "POST /order",      color: "#a78bfa" },
  { from: "order",    to: "payment",      label: "charge request",   color: "#60a5fa" },
  { from: "order",    to: "inventory",    label: "reserve stock",    color: "#60a5fa" },
  { from: "payment",  to: "notification", label: "receipt event",    color: "#34d399" },
  { from: "order",    to: "notification", label: "order event",      color: "#34d399" },
];

export function MicroservicesViz() {
  const [activeService, setActiveService] = useState<ServiceId | null>(null);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [running, setRunning] = useState(false);
  const packetId = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function spawnPacket() {
    const flow = FLOWS[Math.floor(Math.random() * FLOWS.length)];
    const fromSvc = SERVICES.find((s) => s.id === flow.from)!;
    const toSvc = SERVICES.find((s) => s.id === flow.to)!;
    const p: Packet = {
      id: packetId.current++,
      fromX: SVC_CX(fromSvc),
      fromY: SVC_CY(fromSvc),
      toX: SVC_CX(toSvc),
      toY: SVC_CY(toSvc),
      progress: 0,
      color: flow.color,
      label: flow.label,
    };
    setPackets((prev) => [...prev.slice(-12), p]);
  }

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(spawnPacket, 600);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  useEffect(() => {
    let raf: number;
    function tick() {
      setPackets((prev) =>
        prev
          .map((p) => ({ ...p, progress: p.progress + 0.025 }))
          .filter((p) => p.progress < 1)
      );
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const activeInfo = SERVICES.find((s) => s.id === activeService);
  const connectedFlows = FLOWS.filter(
    (f) => f.from === activeService || f.to === activeService
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            running
              ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
              : "bg-violet-600 hover:bg-violet-500 text-white"
          }`}
        >
          {running ? "⏸ Pause traffic" : "▶ Animate traffic"}
        </button>
        <span className="text-xs text-zinc-600">Click a service to explore its responsibilities</span>
      </div>

      <div className="relative overflow-x-auto">
        <svg width="600" height="380" viewBox="0 0 600 380" className="overflow-visible">
          {/* Static connection lines */}
          {FLOWS.map((flow, i) => {
            const fromSvc = SERVICES.find((s) => s.id === flow.from)!;
            const toSvc = SERVICES.find((s) => s.id === flow.to)!;
            const highlighted =
              activeService === null ||
              flow.from === activeService ||
              flow.to === activeService;
            return (
              <line
                key={i}
                x1={SVC_CX(fromSvc)} y1={SVC_CY(fromSvc)}
                x2={SVC_CX(toSvc)}   y2={SVC_CY(toSvc)}
                stroke={highlighted ? flow.color : "#27272a"}
                strokeWidth={highlighted ? 1.5 : 1}
                strokeOpacity={highlighted ? 0.35 : 0.2}
                strokeDasharray="4,3"
              />
            );
          })}

          {/* Animated packets */}
          {packets.map((p) => {
            const cx = p.fromX + (p.toX - p.fromX) * p.progress;
            const cy = p.fromY + (p.toY - p.fromY) * p.progress;
            const opacity = Math.sin(p.progress * Math.PI);
            return (
              <g key={p.id} opacity={opacity}>
                <circle cx={cx} cy={cy} r={5} fill={p.color} />
                <text x={cx + 7} y={cy - 5} fontSize="7" fill={p.color} fontFamily="monospace">
                  {p.label}
                </text>
              </g>
            );
          })}

          {/* Service nodes */}
          {SERVICES.map((svc) => {
            const isActive = activeService === svc.id;
            const isDimmed = activeService !== null && !isActive &&
              !connectedFlows.some((f) => f.from === svc.id || f.to === svc.id);
            return (
              <g
                key={svc.id}
                onClick={() => setActiveService(isActive ? null : svc.id)}
                style={{ cursor: "pointer" }}
                opacity={isDimmed ? 0.35 : 1}
              >
                <rect
                  x={svc.x} y={svc.y}
                  width={140} height={56}
                  rx={10}
                  fill={isActive ? "#1e1b4b" : "#18181b"}
                  stroke={
                    isActive
                      ? "#a78bfa"
                      : svc.border === "border-violet-500"
                      ? "#7c3aed"
                      : svc.border === "border-indigo-500"
                      ? "#4f46e5"
                      : "#059669"
                  }
                  strokeWidth={isActive ? 2 : 1}
                />
                <text x={svc.x + 70} y={svc.y + 20} textAnchor="middle" fill="#e4e4e7" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                  {svc.label}
                </text>
                <text x={svc.x + 70} y={svc.y + 35} textAnchor="middle" fill="#71717a" fontSize="8.5" fontFamily="sans-serif">
                  {svc.sublabel}
                </text>
                {svc.owns !== "—" && (
                  <text x={svc.x + 70} y={svc.y + 49} textAnchor="middle" fill="#4f46e5" fontSize="7.5" fontFamily="monospace">
                    owns: {svc.owns}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      {activeInfo && (
        <div
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3"
          style={{ animation: "fade-up 0.2s ease" }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">{activeInfo.label}</h3>
            <button onClick={() => setActiveService(null)} className="text-xs text-zinc-600 hover:text-zinc-400">
              ✕ close
            </button>
          </div>
          <p className="text-sm text-zinc-400">{activeInfo.sublabel}</p>
          {activeInfo.owns !== "—" && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-600">Owns database:</span>
              <span className="font-mono text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800">
                {activeInfo.owns}
              </span>
            </div>
          )}
          {connectedFlows.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-600 font-mono uppercase tracking-wide">Connections</span>
              <div className="flex flex-wrap gap-2">
                {connectedFlows.map((f, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-300">
                    {f.from === activeService ? `→ ${f.to}` : `← ${f.from}`} : {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
