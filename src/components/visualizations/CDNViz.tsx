"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface PoP {
  id: string;
  city: string;
  region: string;
  x: number;
  y: number;
  cached: boolean;
  hits: number;
  misses: number;
  ttl: number;
}

interface Packet {
  id: number;
  fromX: number; fromY: number;
  toX:   number; toY:   number;
  midX?: number; midY?: number;
  progress: number;
  phase: 1 | 2;    // 1 = user→PoP, 2 = PoP→origin (miss) or skip
  kind: "hit" | "miss-to-origin" | "miss-return";
  label: string;
}

const ORIGIN = { x: 370, y: 150, label: "Origin Server", sub: "us-east-1" };

const POPS_INIT: PoP[] = [
  { id: "tokyo",    city: "Tokyo",     region: "ap-east",    x: 310, y: 55,  cached: false, hits: 0, misses: 0, ttl: 0 },
  { id: "london",   city: "London",    region: "eu-west",    x: 120, y: 65,  cached: false, hits: 0, misses: 0, ttl: 0 },
  { id: "saopaulo", city: "São Paulo", region: "sa-east",    x: 130, y: 210, cached: false, hits: 0, misses: 0, ttl: 0 },
  { id: "sydney",   city: "Sydney",    region: "ap-south",   x: 320, y: 220, cached: false, hits: 0, misses: 0, ttl: 0 },
];

const USERS = [
  { id: "u1", city: "User (JP)", x: 285, y: 90,  popId: "tokyo" },
  { id: "u2", city: "User (UK)", x: 95,  y: 100, popId: "london" },
  { id: "u3", city: "User (BR)", x: 105, y: 175, popId: "saopaulo" },
  { id: "u4", city: "User (AU)", x: 295, y: 185, popId: "sydney" },
];

const TTL_S = 10;

export function CDNViz() {
  const [pops, setPops] = useState<PoP[]>(structuredClone(POPS_INIT));
  const [packets, setPackets] = useState<Packet[]>([]);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const packetId = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ttlRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function addLog(msg: string) { setLog((p) => [msg, ...p].slice(0, 8)); }

  // TTL countdown
  useEffect(() => {
    ttlRef.current = setInterval(() => {
      setPops((prev) => prev.map((p) => {
        if (!p.cached) return p;
        const newTtl = p.ttl - 1;
        if (newTtl <= 0) {
          addLog(`⏱ ${p.city} PoP cache expired (TTL=0)`);
          return { ...p, cached: false, ttl: 0 };
        }
        return { ...p, ttl: newTtl };
      }));
    }, 1000);
    return () => { if (ttlRef.current) clearInterval(ttlRef.current); };
  }, []);

  const sendRequest = useCallback((userId?: string) => {
    const user = userId ? USERS.find((u) => u.id === userId)! : USERS[Math.floor(Math.random() * USERS.length)];
    const pop = pops.find((p) => p.id === user.popId)!;
    const isHit = pop.cached;

    if (isHit) {
      // Cache HIT: user → PoP only
      const p: Packet = {
        id: packetId.current++,
        fromX: user.x, fromY: user.y,
        toX: pop.x + 28, toY: pop.y + 18,
        progress: 0, phase: 1,
        kind: "hit",
        label: "GET /asset.js",
      };
      setPackets((prev) => [...prev.slice(-12), p]);
      setPops((prev) => prev.map((pp) => pp.id === pop.id ? { ...pp, hits: pp.hits + 1 } : pp));
      addLog(`✓ HIT  ${pop.city} → served from cache (TTL: ${pop.ttl}s left)`);
    } else {
      // Cache MISS: user → PoP → origin → PoP (cached) → implicit return
      const p1: Packet = {
        id: packetId.current++,
        fromX: user.x, fromY: user.y,
        toX: pop.x + 28, toY: pop.y + 18,
        progress: 0, phase: 1,
        kind: "miss-to-origin",
        label: "MISS",
      };
      setPackets((prev) => [...prev.slice(-12), p1]);
      addLog(`✗ MISS ${pop.city} → fetching from origin…`);

      setTimeout(() => {
        const p2: Packet = {
          id: packetId.current++,
          fromX: pop.x + 28, fromY: pop.y + 18,
          toX: ORIGIN.x, toY: ORIGIN.y + 18,
          progress: 0, phase: 2,
          kind: "miss-return",
          label: "origin fetch",
        };
        setPackets((prev) => [...prev.slice(-12), p2]);
        setPops((prev) => prev.map((pp) =>
          pp.id === pop.id
            ? { ...pp, cached: true, ttl: TTL_S, misses: pp.misses + 1 }
            : pp
        ));
        addLog(`✓ Cached at ${pop.city} PoP — TTL: ${TTL_S}s`);
      }, 900);
    }
  }, [pops]);

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => sendRequest(), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, sendRequest]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      setPackets((prev) =>
        prev.map((p) => ({ ...p, progress: Math.min(p.progress + 0.025, 1) })).filter((p) => p.progress < 1)
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const SVG_W = 480;
  const SVG_H = 300;

  return (
    <div className="flex flex-col gap-5">

      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="overflow-visible">

          {/* Connection lines: PoP → Origin */}
          {pops.map((pop) => (
            <line key={pop.id}
              x1={pop.x + 28} y1={pop.y + 18}
              x2={ORIGIN.x} y2={ORIGIN.y + 18}
              stroke="#27272a" strokeWidth="1" strokeDasharray="4,3"/>
          ))}

          {/* User → PoP lines */}
          {USERS.map((u) => {
            const pop = pops.find((p) => p.id === u.popId)!;
            return <line key={u.id} x1={u.x} y1={u.y} x2={pop.x + 28} y2={pop.y + 18}
              stroke="#1f2937" strokeWidth="1" strokeDasharray="2,3"/>;
          })}

          {/* Animated packets */}
          {packets.map((p) => {
            const cx = p.fromX + (p.toX - p.fromX) * p.progress;
            const cy = p.fromY + (p.toY - p.fromY) * p.progress;
            const color = p.kind === "hit" ? "#34d399" : p.kind === "miss-to-origin" ? "#f87171" : "#f59e0b";
            return (
              <g key={p.id} opacity={Math.sin(p.progress * Math.PI)}>
                <circle cx={cx} cy={cy} r={5} fill={color}/>
                <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.15}/>
              </g>
            );
          })}

          {/* PoP nodes */}
          {pops.map((pop) => {
            const total = pop.hits + pop.misses;
            const hitRate = total ? Math.round((pop.hits / total) * 100) : 0;
            return (
              <g key={pop.id}>
                <rect x={pop.x} y={pop.y} width={56} height={36} rx={7}
                  fill={pop.cached ? "#052e16" : "#18181b"}
                  stroke={pop.cached ? "#059669" : "#3f3f46"}
                  strokeWidth={pop.cached ? 2 : 1}
                  style={pop.cached ? { filter: "drop-shadow(0 0 6px #05996966)" } : {}}/>
                <text x={pop.x + 28} y={pop.y + 13} textAnchor="middle"
                  fill={pop.cached ? "#34d399" : "#e4e4e7"} fontSize="9" fontWeight="600" fontFamily="sans-serif">
                  {pop.city}
                </text>
                <text x={pop.x + 28} y={pop.y + 26} textAnchor="middle"
                  fill={pop.cached ? "#059669" : "#52525b"} fontSize="7.5" fontFamily="monospace">
                  {pop.cached ? `TTL: ${pop.ttl}s` : "no cache"}
                </text>
                {/* Hit rate badge */}
                {total > 0 && (
                  <text x={pop.x + 28} y={pop.y + 47} textAnchor="middle"
                    fill="#71717a" fontSize="7" fontFamily="monospace">
                    {hitRate}% hit rate
                  </text>
                )}
              </g>
            );
          })}

          {/* User dots */}
          {USERS.map((u) => (
            <g key={u.id}>
              <circle cx={u.x} cy={u.y} r={8} fill="#27272a" stroke="#52525b" strokeWidth="1"/>
              <text x={u.x} y={u.y + 3} textAnchor="middle" fill="#a1a1aa" fontSize="7" fontFamily="sans-serif">
                👤
              </text>
              <text x={u.x} y={u.y + 18} textAnchor="middle" fill="#52525b" fontSize="7" fontFamily="monospace">
                {u.city}
              </text>
            </g>
          ))}

          {/* Origin server */}
          <rect x={ORIGIN.x} y={ORIGIN.y} width={95} height={40} rx={8}
            fill="#1c1407" stroke="#d97706" strokeWidth="1.5"/>
          <text x={ORIGIN.x + 47} y={ORIGIN.y + 16} textAnchor="middle"
            fill="#fbbf24" fontSize="10" fontWeight="700" fontFamily="sans-serif">
            {ORIGIN.label}
          </text>
          <text x={ORIGIN.x + 47} y={ORIGIN.y + 30} textAnchor="middle"
            fill="#92400e" fontSize="8" fontFamily="monospace">
            {ORIGIN.sub}
          </text>

          {/* Legend */}
          <g transform="translate(0, 275)">
            {[
              { color: "#34d399", label: "Cache HIT" },
              { color: "#f87171", label: "Cache MISS" },
              { color: "#f59e0b", label: "Origin fetch" },
            ].map(({ color, label }, i) => (
              <g key={label} transform={`translate(${i * 120}, 0)`}>
                <circle cx={6} cy={6} r={4} fill={color}/>
                <text x={14} y={10} fill="#71717a" fontSize="8" fontFamily="sans-serif">{label}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* PoP stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {pops.map((pop) => (
          <div key={pop.id} className={`rounded-xl border p-2.5 text-center transition-all ${
            pop.cached ? "border-emerald-800 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/30"}`}>
            <div className={`text-xs font-semibold ${pop.cached ? "text-emerald-400" : "text-zinc-300"}`}>
              {pop.city}
            </div>
            <div className="text-[10px] text-zinc-600 font-mono mt-0.5">
              {pop.hits}H / {pop.misses}M
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${pop.cached ? "text-emerald-600" : "text-zinc-700"}`}>
              {pop.cached ? `TTL ${pop.ttl}s` : "cold"}
            </div>
          </div>
        ))}
      </div>

      {/* Send buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setRunning((r) => !r)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            running ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-100" : "bg-violet-600 hover:bg-violet-500 text-white"}`}>
          {running ? "⏸ Pause" : "▶ Auto requests"}
        </button>
        {USERS.map((u) => (
          <button key={u.id} onClick={() => sendRequest(u.id)}
            className="px-2.5 py-1 rounded-lg text-[11px] border border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-300 transition-colors">
            {u.city}
          </button>
        ))}
        <button onClick={() => { setPops(structuredClone(POPS_INIT)); setLog([]); setPackets([]); }}
          className="px-3 py-1 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ↺ Clear cache
        </button>
      </div>

      {log.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-0.5 font-mono text-xs">
          {log.map((e, i) => (
            <div key={i} className={e.startsWith("✓") ? "text-emerald-400" : e.startsWith("✗") ? "text-red-400" : "text-amber-400"}>
              {e}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
