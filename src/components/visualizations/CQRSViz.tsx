"use client";
import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WriteRecord {
  id: number;
  name: string;
  email: string;
  orderCount: number;
  ts: string;
}

interface ReadRecord {
  id: number;
  displayName: string;
  email: string;
  orders: number;
  status: string;
}

interface LogEntry {
  id: number;
  side: "command" | "event" | "query" | "info";
  text: string;
}

type Phase =
  | "idle"
  | "command-flying"
  | "command-writing"
  | "event-emitting"
  | "projection-updating"
  | "done";

// ─── Sample data ──────────────────────────────────────────────────────────────

const INITIAL_WRITE: WriteRecord[] = [
  { id: 1, name: "Alice Chen",  email: "alice@corp.com",  orderCount: 3, ts: "09:01" },
  { id: 2, name: "Bob Smith",   email: "bob@corp.com",    orderCount: 1, ts: "09:05" },
];

const INITIAL_READ: ReadRecord[] = [
  { id: 1, displayName: "Alice Chen",  email: "alice@corp.com",  orders: 3, status: "active" },
  { id: 2, displayName: "Bob Smith",   email: "bob@corp.com",    orders: 1, status: "active" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

let nextId = 3;

// ─── Main component ───────────────────────────────────────────────────────────

export function CQRSViz() {
  const [writeDB, setWriteDB]     = useState<WriteRecord[]>(INITIAL_WRITE);
  const [readDB, setReadDB]       = useState<ReadRecord[]>(INITIAL_READ);
  const [phase, setPhase]         = useState<Phase>("idle");
  const [log, setLog]             = useState<LogEntry[]>([]);
  const [lag, setLag]             = useState(1200);          // ms of eventual-consistency lag
  const [pendingRead, setPendingRead] = useState<ReadRecord | null>(null);
  const [queryResult, setQueryResult] = useState<ReadRecord | null>(null);
  const [queryId, setQueryId]     = useState("1");
  const [newName, setNewName]     = useState("Carol Jones");
  const [newEmail, setNewEmail]   = useState("carol@corp.com");
  const logId = useRef(0);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  function addLog(side: LogEntry["side"], text: string) {
    setLog((prev) => [{ id: logId.current++, side, text }, ...prev].slice(0, 10));
  }

  function clearTimers() {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  }

  function t(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timerRefs.current.push(id);
  }

  // ── Send Command ──────────────────────────────────────────────────────────

  function sendCommand() {
    if (phase !== "idle") return;
    const name  = newName.trim()  || "New User";
    const email = newEmail.trim() || "new@example.com";
    const id = nextId++;
    const ts = now();

    setPhase("command-flying");
    addLog("command", `CreateUserCommand { name: "${name}", email: "${email}" }`);

    t(() => {
      setPhase("command-writing");
      const record: WriteRecord = { id, name, email, orderCount: 0, ts };
      setWriteDB((prev) => [...prev, record]);
      addLog("command", `Write model updated → users table (id: ${id})`);
    }, 700);

    t(() => {
      setPhase("event-emitting");
      addLog("event", `UserCreatedEvent { id: ${id}, name: "${name}" } → Event Bus`);
    }, 1400);

    const pending: ReadRecord = {
      id, displayName: name, email, orders: 0,
      status: "active",
    };
    setPendingRead(pending);

    t(() => {
      setPhase("projection-updating");
      addLog("info", `⏳ Projection updating… (${lag}ms lag)`);
    }, 1800);

    t(() => {
      setReadDB((prev) => [...prev, pending]);
      setPendingRead(null);
      addLog("event", `Read model projection updated → user_summary view (id: ${id})`);
      setPhase("done");
      t(() => setPhase("idle"), 600);
    }, 1800 + lag);
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  function sendQuery() {
    const id = parseInt(queryId, 10);
    const record = readDB.find((r) => r.id === id) ?? null;
    setQueryResult(record);
    addLog("query", record
      ? `GetUser(${id}) → { displayName: "${record.displayName}", orders: ${record.orders} }`
      : `GetUser(${id}) → null (not found)`
    );
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function reset() {
    clearTimers();
    nextId = 3;
    setWriteDB(INITIAL_WRITE);
    setReadDB(INITIAL_READ);
    setPhase("idle");
    setLog([]);
    setPendingRead(null);
    setQueryResult(null);
    setNewName("Carol Jones");
    setNewEmail("carol@corp.com");
  }

  useEffect(() => () => clearTimers(), []);

  // ─── Arrow animation positions ────────────────────────────────────────────
  const cmdArrowActive  = phase === "command-flying";
  const eventArrowActive = phase === "event-emitting" || phase === "projection-updating";

  return (
    <div className="flex flex-col gap-6">

      {/* ── Diagram ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <svg width="600" height="220" viewBox="0 0 600 220" className="w-full max-w-2xl mx-auto overflow-visible">
          <defs>
            <marker id="cqrs-arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
            </marker>
            <marker id="cqrs-arr-event" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#34d399" />
            </marker>
          </defs>

          {/* CLIENT */}
          <rect x={10} y={80} width={90} height={44} rx={8} fill="#18181b" stroke="#4f46e5" strokeWidth="1.5" />
          <text x={55} y={98} textAnchor="middle" fill="#e4e4e7" fontSize="11" fontWeight="600" fontFamily="sans-serif">Client</text>
          <text x={55} y={114} textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="sans-serif">App / API</text>

          {/* COMMAND HANDLER */}
          <rect x={160} y={30} width={110} height={44} rx={8}
            fill={cmdArrowActive ? "#1e1b4b" : "#18181b"}
            stroke={cmdArrowActive ? "#818cf8" : "#4f46e5"}
            strokeWidth={cmdArrowActive ? 2 : 1}
          />
          <text x={215} y={48} textAnchor="middle" fill="#e4e4e7" fontSize="10" fontWeight="600" fontFamily="sans-serif">Command Handler</text>
          <text x={215} y={63} textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="sans-serif">CreateUser · UpdateUser</text>

          {/* QUERY HANDLER */}
          <rect x={160} y={140} width={110} height={44} rx={8}
            fill="#18181b" stroke="#7c3aed" strokeWidth="1"
          />
          <text x={215} y={158} textAnchor="middle" fill="#e4e4e7" fontSize="10" fontWeight="600" fontFamily="sans-serif">Query Handler</text>
          <text x={215} y={173} textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="sans-serif">GetUser · ListUsers</text>

          {/* WRITE DB */}
          <rect x={340} y={30} width={100} height={44} rx={8}
            fill={phase === "command-writing" ? "#1c1917" : "#18181b"}
            stroke={phase === "command-writing" ? "#f59e0b" : "#52525b"}
            strokeWidth={phase === "command-writing" ? 2 : 1}
          />
          <text x={390} y={48} textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="600" fontFamily="sans-serif">Write DB</text>
          <text x={390} y={63} textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="monospace">normalised · ACID</text>

          {/* EVENT BUS */}
          <rect x={340} y={88} width={100} height={36} rx={8}
            fill={eventArrowActive ? "#1e1b4b" : "#18181b"}
            stroke={eventArrowActive ? "#818cf8" : "#3f3f46"}
            strokeWidth={eventArrowActive ? 1.5 : 1}
          />
          <text x={390} y={107} textAnchor="middle" fill={eventArrowActive ? "#a5b4fc" : "#71717a"} fontSize="9" fontWeight="600" fontFamily="sans-serif">Event Bus</text>
          <text x={390} y={119} textAnchor="middle" fill="#52525b" fontSize="7.5" fontFamily="monospace">Kafka / SNS</text>

          {/* READ DB */}
          <rect x={340} y={140} width={100} height={44} rx={8}
            fill={phase === "projection-updating" || phase === "done" ? "#0f172a" : "#18181b"}
            stroke={phase === "projection-updating" ? "#34d399" : phase === "done" ? "#059669" : "#52525b"}
            strokeWidth={phase === "projection-updating" || phase === "done" ? 2 : 1}
          />
          <text x={390} y={158} textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600" fontFamily="sans-serif">Read DB</text>
          <text x={390} y={173} textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="monospace">denormalised · fast</text>

          {/* PROJECTOR */}
          <rect x={475} y={88} width={100} height={36} rx={8}
            fill={phase === "projection-updating" ? "#052e16" : "#18181b"}
            stroke={phase === "projection-updating" ? "#34d399" : "#3f3f46"}
            strokeWidth={phase === "projection-updating" ? 1.5 : 1}
          />
          <text x={525} y={107} textAnchor="middle" fill={phase === "projection-updating" ? "#86efac" : "#71717a"} fontSize="9" fontWeight="600" fontFamily="sans-serif">Projector</text>
          <text x={525} y={119} textAnchor="middle" fill="#52525b" fontSize="7.5" fontFamily="sans-serif">builds read model</text>

          {/* ── Arrows ── */}
          {/* Client → Command Handler */}
          <line x1={100} y1={88} x2={158} y2={60} stroke={cmdArrowActive ? "#818cf8" : "#3f3f46"}
            strokeWidth={cmdArrowActive ? 2 : 1} strokeDasharray={cmdArrowActive ? "0" : "3,3"}
            markerEnd="url(#cqrs-arr)" />
          <text x={118} y={70} fill="#6366f1" fontSize="7.5" fontFamily="monospace"
            opacity={cmdArrowActive ? 1 : 0.4}>
            Command
          </text>

          {/* Client ← Query Handler */}
          <line x1={158} y1={168} x2={100} y2={118} stroke="#7c3aed"
            strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#cqrs-arr)" />
          <text x={108} y={152} fill="#7c3aed" fontSize="7.5" fontFamily="monospace" opacity={0.6}>
            Query
          </text>

          {/* Command Handler → Write DB */}
          <line x1={270} y1={52} x2={338} y2={52} stroke="#f59e0b"
            strokeWidth={phase === "command-writing" ? 2 : 1}
            strokeDasharray={phase === "command-writing" ? "0" : "3,3"}
            markerEnd="url(#cqrs-arr)" />

          {/* Write DB → Event Bus */}
          <line x1={390} y1={74} x2={390} y2={86} stroke={eventArrowActive ? "#818cf8" : "#3f3f46"}
            strokeWidth={eventArrowActive ? 2 : 1} markerEnd="url(#cqrs-arr)" />

          {/* Event Bus → Projector */}
          <line x1={440} y1={106} x2={473} y2={106} stroke={eventArrowActive ? "#34d399" : "#3f3f46"}
            strokeWidth={eventArrowActive ? 1.5 : 1} markerEnd="url(#cqrs-arr-event)" />

          {/* Projector → Read DB */}
          <line x1={525} y1={124} x2={450} y2={148} stroke={phase === "projection-updating" ? "#34d399" : "#3f3f46"}
            strokeWidth={phase === "projection-updating" ? 2 : 1} markerEnd="url(#cqrs-arr-event)" />

          {/* Query Handler → Read DB */}
          <line x1={270} y1={162} x2={338} y2={162} stroke="#7c3aed"
            strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#cqrs-arr)" />

          {/* Eventual consistency lag label */}
          {(phase === "projection-updating") && (
            <text x={390} y={210} textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="monospace">
              ⏳ eventual consistency: ~{lag}ms lag
            </text>
          )}
        </svg>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Command side */}
        <div className="flex flex-col gap-3 rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-4">
          <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            Command (Write)
          </h3>
          <div className="flex flex-col gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email"
              className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <button
            onClick={sendCommand}
            disabled={phase !== "idle"}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {phase === "idle" ? "▶ Send CreateUserCommand" : "⏳ Processing…"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600 shrink-0">Lag: {lag}ms</span>
            <input
              type="range" min={300} max={3000} step={100} value={lag}
              onChange={(e) => setLag(Number(e.target.value))}
              className="flex-1 accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Query side */}
        <div className="flex flex-col gap-3 rounded-xl border border-violet-900/50 bg-violet-950/20 p-4">
          <h3 className="text-sm font-semibold text-violet-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            Query (Read)
          </h3>
          <div className="flex gap-2">
            <input
              value={queryId}
              onChange={(e) => setQueryId(e.target.value)}
              placeholder="User ID"
              className="w-24 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <button
              onClick={sendQuery}
              className="flex-1 px-4 py-1.5 rounded-lg text-sm font-medium bg-violet-700 hover:bg-violet-600 text-white transition-colors"
            >
              ▶ Send GetUserQuery
            </button>
          </div>
          {queryResult && (
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-xs text-zinc-300 flex flex-col gap-1">
              <span className="text-violet-400">// read model response</span>
              <span>{"{"}</span>
              <span className="pl-4">id: <span className="text-amber-400">{queryResult.id}</span>,</span>
              <span className="pl-4">displayName: <span className="text-emerald-400">"{queryResult.displayName}"</span>,</span>
              <span className="pl-4">email: <span className="text-emerald-400">"{queryResult.email}"</span>,</span>
              <span className="pl-4">orders: <span className="text-amber-400">{queryResult.orders}</span>,</span>
              <span className="pl-4">status: <span className="text-emerald-400">"{queryResult.status}"</span></span>
              <span>{"}"}</span>
            </div>
          )}
          <button onClick={() => setQueryResult(null)} className="text-xs text-zinc-600 hover:text-zinc-400 self-start transition-colors">
            clear result
          </button>
        </div>
      </div>

      {/* ── DB state ─────────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Write DB */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-mono text-amber-500 uppercase tracking-wide">
            Write DB — normalised
          </h4>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  <th className="text-left px-3 py-2 text-zinc-500">id</th>
                  <th className="text-left px-3 py-2 text-zinc-500">name</th>
                  <th className="text-left px-3 py-2 text-zinc-500">orders</th>
                  <th className="text-left px-3 py-2 text-zinc-500">ts</th>
                </tr>
              </thead>
              <tbody>
                {writeDB.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/40">
                    <td className="px-3 py-1.5 text-amber-400">{r.id}</td>
                    <td className="px-3 py-1.5 text-zinc-300">{r.name}</td>
                    <td className="px-3 py-1.5 text-zinc-400">{r.orderCount}</td>
                    <td className="px-3 py-1.5 text-zinc-600">{r.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Read DB */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-mono text-emerald-500 uppercase tracking-wide">
              Read DB — denormalised
            </h4>
            {pendingRead && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 animate-pulse">
                updating…
              </span>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  <th className="text-left px-3 py-2 text-zinc-500">id</th>
                  <th className="text-left px-3 py-2 text-zinc-500">displayName</th>
                  <th className="text-left px-3 py-2 text-zinc-500">orders</th>
                  <th className="text-left px-3 py-2 text-zinc-500">status</th>
                </tr>
              </thead>
              <tbody>
                {readDB.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/40">
                    <td className="px-3 py-1.5 text-emerald-400">{r.id}</td>
                    <td className="px-3 py-1.5 text-zinc-300">{r.displayName}</td>
                    <td className="px-3 py-1.5 text-zinc-400">{r.orders}</td>
                    <td className="px-3 py-1.5 text-zinc-400">{r.status}</td>
                  </tr>
                ))}
                {pendingRead && (
                  <tr className="border-b border-zinc-900 last:border-0 opacity-40">
                    <td className="px-3 py-1.5 text-emerald-400">{pendingRead.id}</td>
                    <td className="px-3 py-1.5 text-zinc-300">{pendingRead.displayName}</td>
                    <td className="px-3 py-1.5 text-zinc-400">{pendingRead.orders}</td>
                    <td className="px-3 py-1.5 text-amber-400">pending…</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Event log ────────────────────────────────────────────────────── */}
      {log.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-1 font-mono text-xs">
          {log.map((entry) => {
            const color =
              entry.side === "command" ? "text-indigo-400" :
              entry.side === "event"   ? "text-emerald-400" :
              entry.side === "query"   ? "text-violet-400" :
              "text-zinc-500";
            const prefix =
              entry.side === "command" ? "[CMD]   " :
              entry.side === "event"   ? "[EVENT] " :
              entry.side === "query"   ? "[QUERY] " :
              "[INFO]  ";
            return (
              <div key={entry.id} className={`${color} leading-snug`}>
                <span className="opacity-50">{prefix}</span>{entry.text}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Reset ────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 items-center">
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          ↺ Reset
        </button>
        <p className="text-xs text-zinc-600">
          Drag the <span className="text-amber-400">Lag</span> slider higher to see eventual consistency in action — the Write DB updates immediately, the Read DB catches up later.
        </p>
      </div>
    </div>
  );
}
