"use client";
import { useState, useRef, useEffect, useCallback } from "react";

type ServiceId = "users" | "orders" | "products";
type AuthMode = "valid" | "invalid";
type RequestState = "idle" | "auth-check" | "rate-check" | "routing" | "success" | "auth-fail" | "rate-fail";

interface Request {
  id: number;
  method: string;
  path: string;
  service: ServiceId;
  auth: AuthMode;
  state: RequestState;
  progress: number;
}

interface LogEntry { id: number; color: string; text: string; }

const ROUTES: Array<{ method: string; path: string; service: ServiceId; label: string }> = [
  { method: "GET",    path: "/api/users/me",       service: "users",    label: "GET /users/me" },
  { method: "POST",   path: "/api/orders",          service: "orders",   label: "POST /orders" },
  { method: "GET",    path: "/api/products",        service: "products", label: "GET /products" },
  { method: "DELETE", path: "/api/orders/42",       service: "orders",   label: "DELETE /orders/42" },
  { method: "PUT",    path: "/api/users/profile",   service: "users",    label: "PUT /users/profile" },
];

const SERVICE_META: Record<ServiceId, { label: string; color: string; border: string; port: string }> = {
  users:    { label: "User Service",    color: "#4f46e5", border: "#818cf8", port: ":3001" },
  orders:   { label: "Order Service",   color: "#7c3aed", border: "#a78bfa", port: ":3002" },
  products: { label: "Product Service", color: "#0891b2", border: "#22d3ee", port: ":3003" },
};

const RATE_LIMIT = 5;
const STEP_MS = 600;

export function APIGatewayViz() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [authMode, setAuthMode] = useState<AuthMode>("valid");
  const [rateLimitCount, setRateLimitCount] = useState(0);
  const [activeReq, setActiveReq] = useState<Request | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const reqId = useRef(0);
  const logId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = []; }
  useEffect(() => () => clearTimers(), []);

  function t(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }

  function addLog(color: string, text: string) {
    setLog((prev) => [{ id: logId.current++, color, text }, ...prev].slice(0, 10));
  }

  const sendRequest = useCallback((routeIdx?: number) => {
    const route = ROUTES[routeIdx ?? Math.floor(Math.random() * ROUTES.length)];
    const id = reqId.current++;
    const isRateLimited = rateLimitCount >= RATE_LIMIT;

    const req: Request = {
      id, method: route.method, path: route.path,
      service: route.service, auth: authMode,
      state: "idle", progress: 0,
    };

    setRequests((prev) => [...prev.slice(-6), req]);
    setActiveReq(req);
    setRunning(true);

    // Phase 1: auth check
    t(() => {
      req.state = "auth-check";
      setActiveReq({ ...req });
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, state: "auth-check" } : r));
      addLog("#818cf8", `→ Auth check: ${authMode === "valid" ? "Bearer token present" : "No token / invalid"}`);
    }, STEP_MS * 0.5);

    if (authMode === "invalid") {
      t(() => {
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, state: "auth-fail" } : r));
        setActiveReq({ ...req, state: "auth-fail" });
        addLog("#f87171", "✗ 401 Unauthorized — request rejected at gateway");
        setRunning(false);
      }, STEP_MS * 1.5);
      return;
    }

    // Phase 2: rate limit
    t(() => {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, state: "rate-check" } : r));
      addLog("#f59e0b", `→ Rate limit: ${rateLimitCount + 1}/${RATE_LIMIT} requests`);
      if (!isRateLimited) setRateLimitCount((c) => c + 1);
    }, STEP_MS * 1.5);

    if (isRateLimited) {
      t(() => {
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, state: "rate-fail" } : r));
        addLog("#f87171", "✗ 429 Too Many Requests — rate limit exceeded");
        setRunning(false);
      }, STEP_MS * 2.5);
      return;
    }

    // Phase 3: routing
    t(() => {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, state: "routing" } : r));
      addLog("#22d3ee", `→ Routing ${route.method} ${route.path} → ${SERVICE_META[route.service].label}`);
    }, STEP_MS * 2.5);

    t(() => {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, state: "success" } : r));
      addLog("#34d399", `✓ 200 OK ← ${SERVICE_META[route.service].label}`);
      setRunning(false);
    }, STEP_MS * 3.5);
  }, [authMode, rateLimitCount]);

  const latestReq = requests[requests.length - 1];
  const state = latestReq?.state ?? "idle";

  const gateSteps = [
    { id: "auth",  label: "① Auth",       active: state === "auth-check",  fail: state === "auth-fail",  ok: ["rate-check","routing","success"].includes(state) },
    { id: "rate",  label: "② Rate Limit", active: state === "rate-check",  fail: state === "rate-fail",  ok: ["routing","success"].includes(state) },
    { id: "route", label: "③ Routing",    active: state === "routing",     fail: false,                  ok: state === "success" },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* Settings */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          <span className="text-xs text-zinc-500 self-center">Auth:</span>
          {(["valid","invalid"] as const).map((m) => (
            <button key={m} onClick={() => setAuthMode(m)}
              className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                authMode === m ? "bg-zinc-700 border-zinc-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>
              {m === "valid" ? "✓ Valid token" : "✗ No token"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-zinc-600 font-mono">rate: {rateLimitCount}/{RATE_LIMIT}</span>
          <div className="w-20 bg-zinc-800 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-amber-500 transition-all"
              style={{ width: `${(rateLimitCount / RATE_LIMIT) * 100}%` }} />
          </div>
          <button onClick={() => setRateLimitCount(0)}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">reset</button>
        </div>
      </div>

      {/* Diagram */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 overflow-x-auto">
        <div className="flex items-start gap-3 min-w-[540px]">

          {/* Client */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 w-20 text-center">
              <div className="text-xs font-semibold text-zinc-200">Client</div>
              <div className="text-[10px] text-zinc-600 font-mono">browser</div>
            </div>
            <div className={`text-[10px] font-mono ${
              state === "auth-fail" || state === "rate-fail" ? "text-red-400" :
              state === "success" ? "text-emerald-400" : "text-zinc-700"
            }`}>
              {state === "auth-fail" ? "401" : state === "rate-fail" ? "429" : state === "success" ? "200 OK" : "…"}
            </div>
          </div>

          {/* Arrow in */}
          <div className="flex flex-col items-center justify-center mt-4 shrink-0">
            <svg width={40} height={20}><defs><marker id="gw-arr" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0,6 2.5,0 5" fill="#6366f1"/></marker></defs>
              <line x1={0} y1={10} x2={34} y2={10} stroke={state !== "idle" ? "#6366f1" : "#3f3f46"} strokeWidth="1.5" markerEnd="url(#gw-arr)"/>
            </svg>
            <span className="text-[8px] text-zinc-700 font-mono">HTTPS</span>
          </div>

          {/* API Gateway */}
          <div className="flex flex-col gap-1.5 shrink-0 w-36">
            <div className="text-[10px] text-indigo-400 font-mono text-center mb-0.5">API Gateway</div>
            {gateSteps.map(({ id, label, active, fail, ok }) => (
              <div key={id} className={`rounded-lg border px-2 py-1.5 text-[10px] font-mono transition-all ${
                fail  ? "border-red-700 bg-red-950/50 text-red-400" :
                active? "border-amber-600 bg-amber-950/30 text-amber-300 animate-pulse" :
                ok    ? "border-emerald-800 bg-emerald-950/30 text-emerald-400" :
                "border-zinc-800 bg-zinc-900/50 text-zinc-600"
              }`}>
                {label}
                {fail && " ✗"}
                {ok && !fail && " ✓"}
              </div>
            ))}
          </div>

          {/* Arrow out to services */}
          <div className="flex flex-col items-center justify-center mt-10 shrink-0">
            <svg width={40} height={20}><line x1={0} y1={10} x2={34} y2={10}
              stroke={state === "routing" || state === "success" ? "#22d3ee" : "#3f3f46"}
              strokeWidth="1.5" markerEnd="url(#gw-arr)"/></svg>
          </div>

          {/* Services */}
          <div className="flex flex-col gap-2 shrink-0">
            {(Object.entries(SERVICE_META) as [ServiceId, typeof SERVICE_META[ServiceId]][]).map(([id, meta]) => {
              const isActive = latestReq?.service === id && (state === "routing" || state === "success");
              return (
                <div key={id} className={`rounded-xl border px-3 py-2 w-36 transition-all ${
                  isActive ? `bg-zinc-900` : "bg-zinc-900/40"
                }`}
                  style={{ borderColor: isActive ? meta.border : "#3f3f46" }}>
                  <div className="text-[10px] font-semibold" style={{ color: isActive ? meta.border : "#71717a" }}>
                    {meta.label}
                  </div>
                  <div className="text-[9px] text-zinc-700 font-mono">{meta.port}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Send buttons */}
      <div className="flex flex-wrap gap-2">
        {ROUTES.map((route, i) => (
          <button key={i} onClick={() => sendRequest(i)} disabled={running}
            className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <span className={`${route.method === "GET" ? "text-emerald-400" : route.method === "POST" ? "text-indigo-400" : route.method === "DELETE" ? "text-red-400" : "text-amber-400"} mr-1`}>
              {route.method}
            </span>
            {route.path}
          </button>
        ))}
        <button onClick={() => sendRequest()} disabled={running}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40">
          ▶ Random
        </button>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-0.5 font-mono text-xs">
          {log.map((e) => <div key={e.id} style={{ color: e.color }}>{e.text}</div>)}
        </div>
      )}
    </div>
  );
}
