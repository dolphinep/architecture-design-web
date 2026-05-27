"use client";
import { useState } from "react";
import Link from "next/link";
import { principleRegistry } from "@/lib/registry";

type NodeType = "client" | "gateway" | "lb" | "auth" | "service" | "event" | "storage" | "cdn" | "breaker" | "saga" | "cqrs" | "mesh";

const NW = 108, NH = 40;

const NODE_STYLES: Record<NodeType, { fill: string; stroke: string; label: string; sub: string }> = {
  client:  { fill: "#18181b", stroke: "#52525b", label: "#d4d4d8", sub: "#71717a" },
  gateway: { fill: "#1e1b4b", stroke: "#4f46e5", label: "#a5b4fc", sub: "#818cf8" },
  lb:      { fill: "#083344", stroke: "#0891b2", label: "#67e8f9", sub: "#0e7490" },
  auth:    { fill: "#431407", stroke: "#c2410c", label: "#fdba74", sub: "#ea580c" },
  service: { fill: "#1e1b4b", stroke: "#6366f1", label: "#c7d2fe", sub: "#818cf8" },
  event:   { fill: "#451a03", stroke: "#d97706", label: "#fcd34d", sub: "#f59e0b" },
  storage: { fill: "#042f2e", stroke: "#0d9488", label: "#5eead4", sub: "#14b8a6" },
  cdn:     { fill: "#042f2e", stroke: "#059669", label: "#6ee7b7", sub: "#10b981" },
  breaker: { fill: "#4c0519", stroke: "#e11d48", label: "#fda4af", sub: "#f43f5e" },
  saga:    { fill: "#3b0764", stroke: "#9333ea", label: "#d8b4fe", sub: "#a855f7" },
  cqrs:    { fill: "#172554", stroke: "#2563eb", label: "#93c5fd", sub: "#60a5fa" },
  mesh:    { fill: "#082f49", stroke: "#0284c7", label: "#7dd3fc", sub: "#38bdf8" },
};

interface N { id: string; label: string; sub: string; x: number; y: number; type: NodeType }
interface E { from: string; to: string; label?: string; dashed?: boolean; bidir?: boolean }
interface Diagram { nodes: N[]; edges: E[]; caption: string }

function borderPt(cx: number, cy: number, dir: number): { x: number; y: number } {
  const c = Math.cos(dir), s = Math.sin(dir);
  const hw = NW / 2 + 2, hh = NH / 2 + 2;
  if (Math.abs(c) < 1e-9) return { x: cx, y: cy + hh * Math.sign(s) };
  if (Math.abs(s) < 1e-9) return { x: cx + hw * Math.sign(c), y: cy };
  const t = Math.min(hw / Math.abs(c), hh / Math.abs(s));
  return { x: cx + c * t, y: cy + s * t };
}

function edgePts(a: N, b: N) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const p1 = borderPt(a.x, a.y, ang);
  const p2 = borderPt(b.x, b.y, ang + Math.PI);
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
}

const DIAGRAMS: Record<string, Diagram> = {
  Netflix: {
    caption: "Client traffic flows through a load balancer to the API Gateway, which fans out to microservices wrapped in circuit breakers. If a service is slow or failing, the breaker opens and returns a fallback immediately. Kafka event streams connect services asynchronously, decoupling the recommendation engine from the streaming pipeline.",
    nodes: [
      { id:"cli", label:"Client",          sub:"Browser / App",    x:55,  y:108, type:"client"  },
      { id:"lb",  label:"Load Balancing",  sub:"Round-robin",      x:188, y:108, type:"lb"      },
      { id:"gw",  label:"API Gateway",     sub:"Zuul / Envoy",     x:320, y:108, type:"gateway" },
      { id:"cb",  label:"Circuit Breaker", sub:"Hystrix",          x:450, y:60,  type:"breaker" },
      { id:"svc", label:"Microservices",   sub:"700+ services",    x:450, y:157, type:"service" },
      { id:"ev",  label:"Event-Driven",    sub:"Kafka streams",    x:580, y:108, type:"event"   },
    ],
    edges: [
      { from:"cli", to:"lb",  label:"HTTPS" },
      { from:"lb",  to:"gw",  label:"distribute" },
      { from:"gw",  to:"cb",  label:"wrap" },
      { from:"gw",  to:"svc", label:"route", dashed:true },
      { from:"cb",  to:"svc", label:"open/close" },
      { from:"svc", to:"ev",  label:"publish", bidir:true },
    ],
  },
  Stripe: {
    caption: "Every API call is authenticated via API key or OAuth2 at the gateway before reaching the payment microservice. Each payment appends an immutable event to the event store — balances are never overwritten, just derived from the full event history. CQRS projects those events into a fast read model for dashboards and reporting.",
    nodes: [
      { id:"cli",  label:"Client SDK",     sub:"API / Library",     x:55,  y:108, type:"client"  },
      { id:"gw",   label:"API Gateway",    sub:"Rate limiting",     x:188, y:108, type:"gateway" },
      { id:"auth", label:"Authentication", sub:"API Keys + OAuth2", x:315, y:55,  type:"auth"    },
      { id:"svc",  label:"Microservices",  sub:"Payment service",   x:315, y:160, type:"service" },
      { id:"es",   label:"Event Sourcing", sub:"Immutable ledger",  x:450, y:108, type:"storage" },
      { id:"cqrs", label:"CQRS",           sub:"Read / Write split",x:580, y:108, type:"cqrs"   },
    ],
    edges: [
      { from:"cli",  to:"gw",   label:"API key" },
      { from:"gw",   to:"auth", label:"authenticate" },
      { from:"gw",   to:"svc",  label:"command" },
      { from:"auth", to:"svc",  label:"authorized", dashed:true },
      { from:"svc",  to:"es",   label:"append event" },
      { from:"es",   to:"cqrs", label:"project" },
    ],
  },
  Uber: {
    caption: "The Saga orchestrator coordinates booking → payment → dispatch as a distributed transaction across microservices through the service mesh. If payment fails, compensating events automatically cancel the booking and release the driver — no two-phase locks, no central coordinator database.",
    nodes: [
      { id:"app",  label:"Mobile App",    sub:"iOS / Android",        x:55,  y:108, type:"client"  },
      { id:"gw",   label:"API Gateway",   sub:"Entry point",          x:188, y:108, type:"gateway" },
      { id:"saga", label:"Saga Pattern",  sub:"Trip orchestrator",    x:320, y:55,  type:"saga"    },
      { id:"mesh", label:"Service Mesh",  sub:"Envoy + mTLS",         x:320, y:160, type:"mesh"    },
      { id:"svc",  label:"Microservices", sub:"Book / Pay / Dispatch",x:455, y:108, type:"service" },
      { id:"ev",   label:"Event-Driven",  sub:"Kafka",                x:580, y:108, type:"event"   },
    ],
    edges: [
      { from:"app",  to:"gw",   label:"HTTPS" },
      { from:"gw",   to:"saga", label:"initiate" },
      { from:"gw",   to:"mesh", label:"route" },
      { from:"saga", to:"mesh", label:"coordinate" },
      { from:"saga", to:"ev",   label:"rollback", dashed:true },
      { from:"mesh", to:"svc",  label:"mTLS" },
      { from:"svc",  to:"ev",   label:"location", bidir:true },
    ],
  },
  GitHub: {
    caption: "GitHub acts as an OAuth 2.0 + OIDC identity provider for thousands of third-party apps. A load balancer distributes traffic to the API gateway, which routes to the appropriate microservice. Repository events emit webhooks downstream; git packfiles and LFS objects are cached globally on the CDN.",
    nodes: [
      { id:"cli",  label:"Browser / App",  sub:"Third-party apps",  x:55,  y:80,  type:"client"  },
      { id:"auth", label:"Authentication", sub:"OAuth 2.0 + OIDC",  x:55,  y:155, type:"auth"    },
      { id:"lb",   label:"Load Balancing", sub:"Global traffic",    x:210, y:108, type:"lb"      },
      { id:"gw",   label:"API Gateway",    sub:"api.github.com",    x:355, y:108, type:"gateway" },
      { id:"svc",  label:"Microservices",  sub:"Git / PR / Issues", x:490, y:60,  type:"service" },
      { id:"cdn",  label:"CDN",            sub:"Packfiles / LFS",   x:490, y:157, type:"cdn"     },
    ],
    edges: [
      { from:"cli",  to:"auth", label:"OAuth PKCE" },
      { from:"cli",  to:"lb",   label:"Bearer token" },
      { from:"auth", to:"lb",   label:"access token", dashed:true },
      { from:"lb",   to:"gw",   label:"route" },
      { from:"gw",   to:"svc",  label:"serve" },
      { from:"gw",   to:"cdn",  label:"assets" },
      { from:"svc",  to:"cdn",  label:"push" },
    ],
  },
  Airbnb: {
    caption: "A Saga orchestrates listing-hold → payment → confirmation with automatic compensating rollbacks on failure. The service mesh handles service discovery and mTLS between pods. Availability change events flow into a CQRS read model that powers the Elasticsearch-backed search index — the write and search paths are completely decoupled.",
    nodes: [
      { id:"cli",  label:"User",          sub:"Browser / App",      x:55,  y:108, type:"client"  },
      { id:"gw",   label:"API Gateway",   sub:"Single entry",       x:188, y:108, type:"gateway" },
      { id:"saga", label:"Saga Pattern",  sub:"Book+Pay+Hold",      x:320, y:55,  type:"saga"    },
      { id:"mesh", label:"Service Mesh",  sub:"Istio / mTLS",       x:320, y:160, type:"mesh"    },
      { id:"ev",   label:"Event-Driven",  sub:"Availability events",x:455, y:108, type:"event"   },
      { id:"cqrs", label:"CQRS",          sub:"Search read model",  x:580, y:108, type:"cqrs"   },
    ],
    edges: [
      { from:"cli",  to:"gw",   label:"request" },
      { from:"gw",   to:"saga", label:"book" },
      { from:"gw",   to:"mesh", label:"route" },
      { from:"saga", to:"ev",   label:"hold/confirm" },
      { from:"mesh", to:"ev",   label:"availability" },
      { from:"ev",   to:"cqrs", label:"update index" },
    ],
  },
  Discord: {
    caption: "WebSocket connections are sticky-load-balanced to stateful gateway nodes that hold persistent client connections. Sending a message writes via CQRS to the append-only store, then publishes an event that the pub/sub layer fans out to all gateway nodes with active subscribers — decoupling message delivery from storage.",
    nodes: [
      { id:"cli",  label:"Client",         sub:"WebSocket",           x:55,  y:108, type:"client"  },
      { id:"lb",   label:"Load Balancing", sub:"Sticky sessions",     x:188, y:108, type:"lb"      },
      { id:"gw",   label:"API Gateway",    sub:"WS gateway nodes",    x:320, y:55,  type:"gateway" },
      { id:"cqrs", label:"CQRS",           sub:"Write / History read",x:320, y:160, type:"cqrs"   },
      { id:"ev",   label:"Event-Driven",   sub:"Pub/sub bus",         x:455, y:108, type:"event"   },
      { id:"svc",  label:"Microservices",  sub:"Message + History",   x:580, y:108, type:"service" },
    ],
    edges: [
      { from:"cli",  to:"lb",   label:"WebSocket" },
      { from:"lb",   to:"gw",   label:"persist conn" },
      { from:"lb",   to:"cqrs", label:"HTTP history" },
      { from:"gw",   to:"ev",   label:"send message" },
      { from:"ev",   to:"gw",   label:"push event",  dashed:true },
      { from:"cqrs", to:"svc",  label:"append/query" },
      { from:"svc",  to:"ev",   label:"new message" },
    ],
  },
};

function Diagram({ data }: { data: Diagram }) {
  const { nodes, edges } = data;
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <svg viewBox="0 0 640 220" className="w-full" style={{ minWidth: 480 }}>
          <defs>
            <marker id="bp-ah" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" fill="#52525b" />
            </marker>
            <marker id="bp-ah-r" markerWidth="7" markerHeight="5" refX="1" refY="2.5" orient="auto-start-reverse">
              <polygon points="0 0, 7 2.5, 0 5" fill="#52525b" />
            </marker>
            <marker id="bp-ah-d" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" fill="#3f3f46" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const a = nodeMap[e.from], b = nodeMap[e.to];
            if (!a || !b) return null;
            const { x1, y1, x2, y2 } = edgePts(a, b);
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ox = (-dy / len) * 9, oy = (dx / len) * 9;
            const strokeColor = e.dashed ? "#3f3f46" : "#52525b";
            const markerId = e.dashed ? "bp-ah-d" : "bp-ah";

            return (
              <g key={i}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeDasharray={e.dashed ? "5,3" : undefined}
                  markerEnd={`url(#${markerId})`}
                  markerStart={e.bidir ? `url(#bp-ah-r)` : undefined}
                />
                {e.label && (
                  <text
                    x={mx + ox} y={my + oy}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={e.dashed ? "#3f3f46" : "#71717a"}
                    fontSize="7" fontFamily="monospace"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            const s = NODE_STYLES[n.type];
            return (
              <g key={n.id}>
                <rect
                  x={n.x - NW / 2} y={n.y - NH / 2}
                  width={NW} height={NH} rx={6}
                  fill={s.fill} stroke={s.stroke} strokeWidth={1.5}
                />
                <text
                  x={n.x} y={n.y - 5}
                  textAnchor="middle"
                  fill={s.label} fontSize="9" fontWeight="600" fontFamily="sans-serif"
                >
                  {n.label}
                </text>
                <text
                  x={n.x} y={n.y + 9}
                  textAnchor="middle"
                  fill={s.sub} fontSize="7.5" fontFamily="sans-serif"
                >
                  {n.sub}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{data.caption}</p>
    </div>
  );
}

const BLUEPRINTS = [
  {
    company: "Netflix",
    industry: "Video streaming",
    scale: "200M+ subscribers",
    challenge: "Stream 1B+ hours/day to a global audience across 700+ independent services — with zero tolerance for full-site outages.",
    principles: ["api-gateway", "microservices", "circuit-breaker", "event-driven", "cdn", "load-balancing"],
    story: "The API Gateway fans out every client request to the right microservice. Hystrix circuit breakers isolate failures — a slow recommendation service can't cascade into a broken homepage. Kafka event streams feed the real-time recommendation engine. 15,000+ CDN PoPs push video within one hop of every subscriber.",
    accent: "border-red-900/40 bg-red-950/10",
    tag: "text-red-400",
  },
  {
    company: "Stripe",
    industry: "Payment processing",
    scale: "$1T+ payments/year",
    challenge: "Every charge must be idempotent, fully auditable, and consistent — no double charges, no silent failures.",
    principles: ["api-gateway", "authentication", "event-sourcing", "cqrs", "microservices", "circuit-breaker"],
    story: "Event Sourcing gives an immutable ledger: every balance change is an appended event, never an overwrite. CQRS separates high-throughput payment writes from read-optimised reporting queries. API keys + OAuth2 enforce per-key rate limits and scope isolation at the gateway.",
    accent: "border-violet-900/40 bg-violet-950/10",
    tag: "text-violet-400",
  },
  {
    company: "Uber",
    industry: "Ride hailing",
    scale: "25M trips/day",
    challenge: "Atomically book a ride, charge a card, and dispatch a driver across three independent services in under 2 seconds.",
    principles: ["api-gateway", "microservices", "saga-pattern", "event-driven", "load-balancing", "service-mesh"],
    story: "The Saga pattern coordinates booking → payment → dispatch as a distributed transaction with automatic compensating rollbacks on failure. Kafka connects 1,000+ microservices with event streams for real-time location updates. Envoy service mesh handles mTLS and circuit breaking between pods.",
    accent: "border-zinc-700/40 bg-zinc-800/10",
    tag: "text-zinc-300",
  },
  {
    company: "GitHub",
    industry: "Developer platform",
    scale: "100M+ developers",
    challenge: "Let any third-party app authenticate as a GitHub user, deliver webhooks reliably, and serve git data globally fast.",
    principles: ["authentication", "api-gateway", "event-driven", "cdn", "load-balancing", "microservices"],
    story: "OAuth 2.0 + OIDC powers 'Sign in with GitHub' for thousands of apps — GitHub acts as the Auth Server issuing short-lived access tokens. Event-driven webhooks fan repository events to external CI systems. CDN serves git packfiles and release assets at sub-50ms globally.",
    accent: "border-zinc-600/40 bg-zinc-800/10",
    tag: "text-zinc-400",
  },
  {
    company: "Airbnb",
    industry: "Marketplace",
    scale: "150M+ users",
    challenge: "Coordinate listing availability, booking, and payment so a host never double-books and a guest always pays exactly once.",
    principles: ["microservices", "saga-pattern", "cqrs", "api-gateway", "event-driven", "service-mesh"],
    story: "A Saga orchestrates book → hold-listing → charge with automatic compensating transactions if the payment fails. CQRS lets the search service denormalise listings into an Elasticsearch read model while the booking service owns the write path. Events propagate availability changes to all replicas.",
    accent: "border-rose-900/40 bg-rose-950/10",
    tag: "text-rose-400",
  },
  {
    company: "Discord",
    industry: "Real-time messaging",
    scale: "4B+ messages/day",
    challenge: "Push new messages to millions of live WebSocket connections while keeping billion-message history fast to query.",
    principles: ["event-driven", "cqrs", "load-balancing", "microservices", "cdn", "api-gateway"],
    story: "CQRS separates send-message writes (Cassandra, append-only) from history reads (ScyllaDB, time-range optimised). An event-driven pub/sub layer pushes new messages to stateful gateway nodes holding WebSocket connections. Load balancers route new connections to the least-loaded gateway.",
    accent: "border-indigo-900/40 bg-indigo-950/10",
    tag: "text-indigo-400",
  },
];

export function BlueprintsSection() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-white">How real systems combine patterns</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Production architectures are never one pattern — they&apos;re a deliberate stack of complementary decisions.
          Click any card to see how the components connect.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BLUEPRINTS.map(({ company, industry, scale, challenge, principles, story, accent, tag }) => {
          const resolved = principles.map((slug) => ({
            slug,
            name: principleRegistry.find((p) => p.slug === slug)?.name ?? slug,
          }));
          const isSelected = selected === company;
          return (
            <button
              key={company}
              onClick={() => setSelected(isSelected ? null : company)}
              className={`text-left rounded-xl border p-5 flex flex-col gap-4 transition-all cursor-pointer ${accent} ${
                isSelected ? "ring-2 ring-white/20 scale-[1.01]" : "hover:scale-[1.005]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className={`text-sm font-semibold ${tag}`}>{company}</span>
                  <span className="text-xs text-zinc-500">{industry}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-700 text-zinc-500 shrink-0">
                    {scale}
                  </span>
                  <span className={`text-[10px] transition-transform ${isSelected ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed italic border-l-2 border-zinc-700 pl-3">
                {challenge}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resolved.map(({ slug, name }) => (
                  <span
                    key={slug}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-900/60 text-zinc-400 font-mono"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{story}</p>
            </button>
          );
        })}
      </div>

      {/* Diagram panel */}
      {selected && DIAGRAMS[selected] && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-200">{selected} — Architecture diagram</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 font-mono">
                how they connect
              </span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
            >
              ✕ close
            </button>
          </div>
          <Diagram data={DIAGRAMS[selected]} />

          {/* Principle links */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
            <span className="text-xs text-zinc-600">Explore the patterns →</span>
            {BLUEPRINTS.find(b => b.company === selected)?.principles.map(slug => {
              const p = principleRegistry.find(p => p.slug === slug);
              if (!p) return null;
              return (
                <Link
                  key={slug}
                  href={`/principles/${slug}`}
                  className="text-xs text-violet-400 hover:text-violet-300 hover:underline transition-colors font-mono"
                  onClick={e => e.stopPropagation()}
                >
                  {p.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
