"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type ServiceId = "frontend" | "orders" | "payments";
type Mode = "without-mesh" | "with-mesh";

interface Packet { id: number; from: ServiceId; to: ServiceId; progress: number; mtls: boolean; blocked: boolean; }

const SERVICES: Record<ServiceId, { label: string; x: number; y: number; color: string }> = {
  frontend: { label: "Frontend\nService", x: 40,  y: 120, color: "#6366f1" },
  orders:   { label: "Order\nService",    x: 230, y: 30,  color: "#7c3aed" },
  payments: { label: "Payment\nService",  x: 230, y: 210, color: "#0891b2" },
};

const FLOWS: Array<{ from: ServiceId; to: ServiceId }> = [
  { from: "frontend", to: "orders" },
  { from: "orders",   to: "payments" },
  { from: "frontend", to: "payments" },
];

const BOX_W = 100;
const BOX_H = 52;
const SIDECAR_W = 28;
const SIDECAR_H = 52;

function svcCX(id: ServiceId, mode: Mode, isSidecar = false) {
  const s = SERVICES[id];
  if (mode === "without-mesh") return s.x + BOX_W / 2;
  // With mesh: main box + sidecar beside it
  if (isSidecar) return s.x + BOX_W + SIDECAR_W / 2 + 2;
  return s.x + BOX_W / 2;
}
function svcCY(id: ServiceId) { return SERVICES[id].y + BOX_H / 2; }

export function ServiceMeshViz() {
  const [mode, setMode]     = useState<Mode>("without-mesh");
  const [packets, setPackets] = useState<Packet[]>([]);
  const [running, setRunning] = useState(false);
  const [mtlsBlock, setMtlsBlock] = useState(false);
  const [log, setLog]         = useState<string[]>([]);
  const packetId = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logId = useRef(0);

  function addLog(msg: string) { setLog((p) => [msg, ...p].slice(0, 8)); }

  const spawn = useCallback(() => {
    const flow = FLOWS[Math.floor(Math.random() * FLOWS.length)];
    const blocked = mtlsBlock && mode === "with-mesh" && Math.random() < 0.4;
    const p: Packet = {
      id: packetId.current++,
      from: flow.from, to: flow.to,
      progress: 0,
      mtls: mode === "with-mesh",
      blocked,
    };
    setPackets((prev) => [...prev.slice(-10), p]);
    if (blocked) addLog(`✗ mTLS: rejected unverified cert ${flow.from}→${flow.to}`);
    else if (mode === "with-mesh") addLog(`✓ mTLS handshake ok ${flow.from}→${flow.to}`);
    else addLog(`→ plain HTTP ${flow.from}→${flow.to}`);
  }, [mode, mtlsBlock]);

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(spawn, 700);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, spawn]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      setPackets((prev) =>
        prev.map((p) => ({ ...p, progress: Math.min(p.progress + 0.03, 1) })).filter((p) => p.progress < 1)
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const SVG_W = 380;
  const SVG_H = 320;

  return (
    <div className="flex flex-col gap-5">

      {/* Mode toggle */}
      <div className="flex flex-wrap gap-2 items-center">
        {([
          { value: "without-mesh", label: "Without mesh" },
          { value: "with-mesh",    label: "With service mesh" },
        ] as const).map(({ value, label }) => (
          <button key={value} onClick={() => { setMode(value); setPackets([]); setRunning(false); }}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              mode === value ? "bg-zinc-700 border-zinc-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>
            {label}
          </button>
        ))}
        {mode === "with-mesh" && (
          <button onClick={() => setMtlsBlock((b) => !b)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ml-2 ${
              mtlsBlock ? "bg-red-950 border-red-700 text-red-400" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>
            {mtlsBlock ? "🔒 mTLS blocking bad certs" : "Allow all certs"}
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* SVG */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 shrink-0">
          <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="overflow-visible">
            <defs>
              <marker id="mesh-arr" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                <polygon points="0 0,6 2.5,0 5" fill="#52525b"/>
              </marker>
            </defs>

            {/* Static flow lines */}
            {FLOWS.map((f, i) => {
              const x1 = svcCX(f.from, mode) + (mode === "with-mesh" ? SIDECAR_W / 2 + BOX_W / 2 : BOX_W / 2);
              const y1 = svcCY(f.from);
              const x2 = svcCX(f.to, mode) - (mode === "without-mesh" ? BOX_W / 2 : 0);
              const y2 = svcCY(f.to);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#mesh-arr)"/>;
            })}

            {/* Packets */}
            {packets.map((p) => {
              const x1 = svcCX(p.from, mode) + (mode === "with-mesh" ? SIDECAR_W / 2 + BOX_W / 2 : BOX_W / 2);
              const y1 = svcCY(p.from);
              const x2 = svcCX(p.to, mode) - (mode === "without-mesh" ? BOX_W / 2 : 0);
              const y2 = svcCY(p.to);
              const cx = x1 + (x2 - x1) * p.progress;
              const cy = y1 + (y2 - y1) * p.progress;
              const color = p.blocked ? "#ef4444" : p.mtls ? "#34d399" : "#818cf8";
              return (
                <g key={p.id} opacity={Math.sin(p.progress * Math.PI)}>
                  <circle cx={cx} cy={cy} r={5} fill={color}/>
                  <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.2}/>
                  {p.mtls && !p.blocked && (
                    <text x={cx + 8} y={cy - 4} fontSize="8" fill={color} fontFamily="monospace">🔒</text>
                  )}
                </g>
              );
            })}

            {/* Service nodes */}
            {(Object.entries(SERVICES) as [ServiceId, typeof SERVICES[ServiceId]][]).map(([id, svc]) => (
              <g key={id}>
                {/* Main service box */}
                <rect x={svc.x} y={svc.y} width={BOX_W} height={BOX_H} rx={8}
                  fill="#18181b" stroke={svc.color} strokeWidth="1.5"/>
                {svc.label.split("\n").map((line, li) => (
                  <text key={li} x={svc.x + BOX_W / 2} y={svc.y + 18 + li * 14}
                    textAnchor="middle" fill="#e4e4e7" fontSize="10" fontWeight="600" fontFamily="sans-serif">
                    {line}
                  </text>
                ))}

                {/* Sidecar proxy (mesh only) */}
                {mode === "with-mesh" && (
                  <g>
                    <rect x={svc.x + BOX_W + 2} y={svc.y} width={SIDECAR_W} height={SIDECAR_H} rx={5}
                      fill="#1e1b4b" stroke="#4f46e5" strokeWidth="1" strokeDasharray="3,2"/>
                    <text x={svc.x + BOX_W + 2 + SIDECAR_W / 2} y={svc.y + BOX_H / 2 - 4}
                      textAnchor="middle" fill="#818cf8" fontSize="7" fontFamily="monospace">
                      Envoy
                    </text>
                    <text x={svc.x + BOX_W + 2 + SIDECAR_W / 2} y={svc.y + BOX_H / 2 + 8}
                      textAnchor="middle" fill="#4f46e5" fontSize="7" fontFamily="monospace">
                      proxy
                    </text>
                  </g>
                )}
              </g>
            ))}

            {/* Control plane (mesh only) */}
            {mode === "with-mesh" && (
              <g>
                <rect x={300} y={120} width={70} height={44} rx={8} fill="#0f172a" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,2"/>
                <text x={335} y={138} textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="600" fontFamily="sans-serif">Control</text>
                <text x={335} y={152} textAnchor="middle" fill="#60a5fa" fontSize="9" fontFamily="sans-serif">Plane</text>
                <text x={335} y={164} textAnchor="middle" fill="#3b82f6" fontSize="7.5" fontFamily="monospace">Istio/Linkerd</text>
                {/* Dashed config lines to sidecars */}
                {(Object.values(SERVICES)).map((svc, i) => (
                  <line key={i}
                    x1={300} y1={142}
                    x2={svc.x + BOX_W + SIDECAR_W / 2 + 2} y2={svc.y + BOX_H / 2}
                    stroke="#1e40af" strokeWidth="1" strokeDasharray="2,3" opacity="0.5"/>
                ))}
              </g>
            )}

            {/* Without mesh warning */}
            {mode === "without-mesh" && (
              <g>
                <rect x={240} y={120} width={130} height={52} rx={8} fill="#450a0a" stroke="#7f1d1d" strokeWidth="1"/>
                <text x={305} y={139} textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="600" fontFamily="sans-serif">No mTLS</text>
                <text x={305} y={153} textAnchor="middle" fill="#fca5a5" fontSize="8" fontFamily="sans-serif">Plain HTTP between</text>
                <text x={305} y={165} textAnchor="middle" fill="#fca5a5" fontSize="8" fontFamily="sans-serif">services — unencrypted</text>
              </g>
            )}
          </svg>
        </div>

        {/* Info panel */}
        <div className="flex flex-col gap-3 flex-1">
          {mode === "without-mesh" ? (
            <>
              <h3 className="font-semibold text-red-400 text-sm">Problems without a mesh</h3>
              {[
                "Service-to-service traffic is plain HTTP — readable on the network",
                "Every service must implement retries, timeouts, circuit breakers itself",
                "No uniform observability — each team instruments differently",
                "No way to enforce which service can call which",
              ].map((item) => (
                <div key={item} className="flex gap-2 text-xs text-zinc-400">
                  <span className="text-red-600 shrink-0 mt-0.5">✗</span>{item}
                </div>
              ))}
            </>
          ) : (
            <>
              <h3 className="font-semibold text-emerald-400 text-sm">What the sidecar handles</h3>
              {[
                ["🔒", "mTLS — all traffic encrypted and authenticated"],
                ["↺",  "Retries and timeouts — no app code needed"],
                ["⚡", "Circuit breaking — automatic at network layer"],
                ["📊", "Traces, metrics, logs — uniform across all services"],
                ["🚦", "Traffic splitting — canary, A/B at the proxy level"],
              ].map(([icon, text]) => (
                <div key={String(text)} className="flex gap-2 text-xs text-zinc-300">
                  <span className="shrink-0">{icon}</span>{text}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setRunning((r) => !r)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            running ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-100" : "bg-violet-600 hover:bg-violet-500 text-white"}`}>
          {running ? "⏸ Pause" : "▶ Animate traffic"}
        </button>
        <button onClick={spawn}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
          + Send request
        </button>
      </div>

      {log.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-0.5 font-mono text-xs">
          {log.map((e, i) => (
            <div key={i} className={e.startsWith("✗") ? "text-red-400" : e.startsWith("✓") ? "text-emerald-400" : "text-zinc-400"}>{e}</div>
          ))}
        </div>
      )}
    </div>
  );
}
