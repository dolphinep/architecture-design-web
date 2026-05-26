"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type Algorithm = "round-robin" | "least-connections" | "weighted";
type ServerStatus = "healthy" | "unhealthy";

interface Server {
  id: string;
  label: string;
  status: ServerStatus;
  activeConns: number;
  totalReqs: number;
  weight: number;
  latency: number;
}

interface Packet {
  id: number;
  serverId: string;
  progress: number;
  returning: boolean;
  color: string;
}

const INITIAL_SERVERS: Server[] = [
  { id: "s1", label: "Server 1", status: "healthy", activeConns: 0, totalReqs: 0, weight: 3, latency: 40 },
  { id: "s2", label: "Server 2", status: "healthy", activeConns: 0, totalReqs: 0, weight: 2, latency: 80 },
  { id: "s3", label: "Server 3", status: "healthy", activeConns: 0, totalReqs: 0, weight: 1, latency: 150 },
];

const SERVER_COLORS = ["#6366f1", "#7c3aed", "#0891b2"];

// ─── Algorithm implementations ────────────────────────────────────────────────

let rrIdx = 0;

function pickServer(servers: Server[], algo: Algorithm): Server | null {
  const healthy = servers.filter((s) => s.status === "healthy");
  if (!healthy.length) return null;

  if (algo === "round-robin") {
    const s = healthy[rrIdx % healthy.length];
    rrIdx++;
    return s;
  }

  if (algo === "least-connections") {
    return healthy.reduce((min, s) => s.activeConns < min.activeConns ? s : min, healthy[0]);
  }

  if (algo === "weighted") {
    const pool: Server[] = [];
    healthy.forEach((s) => { for (let i = 0; i < s.weight; i++) pool.push(s); });
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return healthy[0];
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const LB_X = 160; const LB_CY = 145;
const SERVER_X = 310;
const SERVER_Y = [40, 120, 200];

export function LoadBalancingViz() {
  const [servers, setServers]   = useState<Server[]>(structuredClone(INITIAL_SERVERS));
  const [algo, setAlgo]         = useState<Algorithm>("round-robin");
  const [packets, setPackets]   = useState<Packet[]>([]);
  const [running, setRunning]   = useState(false);
  const [log, setLog]           = useState<string[]>([]);
  const packetId = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function addLog(msg: string) { setLog((p) => [msg, ...p].slice(0, 8)); }

  const sendRequest = useCallback(() => {
    const chosen = pickServer(servers, algo);
    if (!chosen) { addLog("✗ No healthy servers!"); return; }

    const color = SERVER_COLORS[INITIAL_SERVERS.findIndex((s) => s.id === chosen.id)];
    const p: Packet = { id: packetId.current++, serverId: chosen.id, progress: 0, returning: false, color };
    setPackets((prev) => [...prev.slice(-15), p]);
    setServers((prev) => prev.map((s) =>
      s.id === chosen.id ? { ...s, activeConns: s.activeConns + 1, totalReqs: s.totalReqs + 1 } : s
    ));
    addLog(`→ [${algo}] routed to ${chosen.label} (${chosen.activeConns + 1} active)`);

    setTimeout(() => {
      setPackets((prev) => prev.map((pk) => pk.id === p.id ? { ...pk, returning: true } : pk));
      setTimeout(() => {
        setServers((prev) => prev.map((s) =>
          s.id === chosen.id ? { ...s, activeConns: Math.max(0, s.activeConns - 1) } : s
        ));
      }, 600);
    }, chosen.latency * 4);
  }, [servers, algo]);

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(sendRequest, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, sendRequest]);

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

  function toggleServer(id: string) {
    setServers((prev) => prev.map((s) =>
      s.id === id ? { ...s, status: s.status === "healthy" ? "unhealthy" : "healthy" } : s
    ));
    const s = servers.find((sv) => sv.id === id)!;
    addLog(s.status === "healthy"
      ? `⚠ ${s.label} marked unhealthy — health check failed`
      : `✓ ${s.label} recovered — re-added to pool`
    );
  }

  function reset() {
    rrIdx = 0;
    setServers(structuredClone(INITIAL_SERVERS));
    setPackets([]);
    setLog([]);
    setRunning(false);
  }

  const totalReqs = servers.reduce((s, sv) => s + sv.totalReqs, 0);

  return (
    <div className="flex flex-col gap-5">

      {/* Algorithm selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-zinc-500">Algorithm:</span>
        {([
          { value: "round-robin",       label: "Round Robin",        desc: "equal turns" },
          { value: "least-connections", label: "Least Connections",  desc: "fewest active" },
          { value: "weighted",          label: "Weighted",           desc: "by capacity" },
        ] as const).map(({ value, label, desc }) => (
          <button key={value} onClick={() => { setAlgo(value); rrIdx = 0; }}
            className={`flex flex-col px-3 py-1.5 rounded-lg text-left border transition-colors ${
              algo === value ? "bg-zinc-700 border-zinc-500" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"}`}>
            <span className={`text-xs font-medium ${algo === value ? "text-white" : "text-zinc-300"}`}>{label}</span>
            <span className="text-[10px] text-zinc-600">{desc}</span>
          </button>
        ))}
      </div>

      {/* Diagram */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <svg width={480} height={280} viewBox="0 0 480 280" className="overflow-visible">
          <defs>
            <marker id="lb-arr" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <polygon points="0 0,6 2.5,0 5" fill="#6366f1"/>
            </marker>
          </defs>

          {/* Client */}
          <rect x={30} y={LB_CY - 22} width={70} height={44} rx={8} fill="#18181b" stroke="#3f3f46" strokeWidth="1"/>
          <text x={65} y={LB_CY - 5} textAnchor="middle" fill="#e4e4e7" fontSize="10" fontWeight="600" fontFamily="sans-serif">Client</text>
          <text x={65} y={LB_CY + 9} textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="sans-serif">requests</text>

          {/* Arrow client → LB */}
          <line x1={100} y1={LB_CY} x2={LB_X - 2} y2={LB_CY}
            stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#lb-arr)"/>

          {/* Load balancer */}
          <rect x={LB_X} y={LB_CY - 38} width={70} height={76} rx={10}
            fill="#1e1b4b" stroke="#6366f1" strokeWidth="2"/>
          <text x={LB_X + 35} y={LB_CY - 16} textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="700" fontFamily="sans-serif">Load</text>
          <text x={LB_X + 35} y={LB_CY - 2} textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="700" fontFamily="sans-serif">Balancer</text>
          <text x={LB_X + 35} y={LB_CY + 14} textAnchor="middle" fill="#4f46e5" fontSize="7.5" fontFamily="monospace">
            {algo === "round-robin" ? "round-robin" : algo === "least-connections" ? "least-conn" : "weighted"}
          </text>
          <text x={LB_X + 35} y={LB_CY + 27} textAnchor="middle" fill="#52525b" fontSize="7" fontFamily="monospace">
            health checks ✓
          </text>

          {/* Lines LB → servers */}
          {servers.map((sv, i) => (
            <line key={sv.id}
              x1={LB_X + 70} y1={LB_CY}
              x2={SERVER_X} y2={SERVER_Y[i] + 22}
              stroke={sv.status === "unhealthy" ? "#3f1515" : "#27272a"}
              strokeWidth="1" strokeDasharray="4,3"/>
          ))}

          {/* Packets */}
          {packets.map((p) => {
            const i = INITIAL_SERVERS.findIndex((s) => s.id === p.serverId);
            const destY = SERVER_Y[i] + 22;
            const progress = p.returning
              ? 1 - p.progress
              : p.progress;
            const cx = (LB_X + 70) + (SERVER_X - (LB_X + 70)) * progress;
            const cy = LB_CY + (destY - LB_CY) * progress;
            return (
              <g key={p.id} opacity={Math.sin(p.progress * Math.PI)}>
                <circle cx={cx} cy={cy} r={5} fill={p.color}/>
                <circle cx={cx} cy={cy} r={8} fill={p.color} opacity={0.2}/>
              </g>
            );
          })}

          {/* Server boxes */}
          {servers.map((sv, i) => {
            const isUnhealthy = sv.status === "unhealthy";
            const pct = totalReqs ? Math.round((sv.totalReqs / totalReqs) * 100) : 0;
            const color = SERVER_COLORS[i];
            return (
              <g key={sv.id}>
                <rect x={SERVER_X} y={SERVER_Y[i]} width={110} height={44} rx={8}
                  fill={isUnhealthy ? "#1c0a0a" : "#18181b"}
                  stroke={isUnhealthy ? "#7f1d1d" : color}
                  strokeWidth={isUnhealthy ? 1 : 1.5}
                  opacity={isUnhealthy ? 0.5 : 1}/>
                <text x={SERVER_X + 55} y={SERVER_Y[i] + 16} textAnchor="middle"
                  fill={isUnhealthy ? "#7f1d1d" : "#e4e4e7"} fontSize="10" fontWeight="600" fontFamily="sans-serif">
                  {sv.label}
                </text>
                <text x={SERVER_X + 55} y={SERVER_Y[i] + 30} textAnchor="middle"
                  fill={isUnhealthy ? "#7f1d1d" : "#71717a"} fontSize="8" fontFamily="monospace">
                  {isUnhealthy ? "× unhealthy" : `${sv.activeConns} active · ${pct}% traffic`}
                </text>
                {/* Weight badge */}
                {algo === "weighted" && !isUnhealthy && (
                  <text x={SERVER_X + 100} y={SERVER_Y[i] + 10} textAnchor="end"
                    fill={color} fontSize="8" fontFamily="monospace">w:{sv.weight}</text>
                )}
                {/* Traffic bar */}
                {!isUnhealthy && totalReqs > 0 && (
                  <rect x={SERVER_X} y={SERVER_Y[i] + 44} width={Math.max(2, pct * 1.1)} height={4} rx={2}
                    fill={color} opacity={0.6}/>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Server health toggles */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-zinc-500">Server health:</span>
        {servers.map((sv, i) => (
          <button key={sv.id} onClick={() => toggleServer(sv.id)}
            className={`px-3 py-1 rounded-lg text-xs border transition-colors font-mono ${
              sv.status === "unhealthy"
                ? "bg-red-950/50 border-red-800 text-red-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"}`}
            style={{ borderColor: sv.status === "healthy" ? SERVER_COLORS[i] + "66" : undefined }}>
            {sv.status === "healthy" ? "✓" : "✗"} {sv.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setRunning((r) => !r)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            running ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-100" : "bg-violet-600 hover:bg-violet-500 text-white"}`}>
          {running ? "⏸ Pause" : "▶ Send requests"}
        </button>
        <button onClick={sendRequest}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
          + One request
        </button>
        <button onClick={reset}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ↺ Reset
        </button>
      </div>

      {log.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-0.5 font-mono text-xs">
          {log.map((e, i) => (
            <div key={i} className={e.startsWith("✗") ? "text-red-400" : e.startsWith("⚠") ? "text-amber-400" : e.startsWith("✓") ? "text-emerald-400" : "text-zinc-400"}>
              {e}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
