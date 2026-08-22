"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStatus, VizStats, VizLegend, VizLog,
  VizSvg, VizText, VizEdge, VizPacket, VizNode,
  useOnScreen, useReducedMotion, useEventLog,
  HUE, TYPE, STROKE,
} from "./_shared";

interface WriteRow { id: number; name: string; email: string }
interface ReadRow { id: number; displayName: string; email: string; orders: number }

const SEED_WRITE: WriteRow[] = [
  { id: 1, name: "Alice Chen", email: "alice@corp.com" },
  { id: 2, name: "Bob Smith", email: "bob@corp.com" },
];
const SEED_READ: ReadRow[] = [
  { id: 1, displayName: "Alice Chen", email: "alice@corp.com", orders: 3 },
  { id: 2, displayName: "Bob Smith", email: "bob@corp.com", orders: 1 },
];

/** Where the command currently is. Queries are instantaneous by comparison. */
type Phase = "idle" | "command" | "written" | "published" | "projecting" | "caught-up";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "IN SYNC",
  command: "COMMAND IN FLIGHT",
  written: "WRITE COMMITTED",
  published: "EVENT PUBLISHED",
  projecting: "PROJECTING",
  "caught-up": "IN SYNC",
};

// ─── Layout ───────────────────────────────────────────────────────────────────
const W = 740;
const H = 250;
const CLIENT_X = 14;
const CLIENT_W = 96;
const H_X = 176;      // handler column
const H_W = 140;
const DB_X = 402;     // store column
const DB_W = 138;
const PROJ_X = 580;
const PROJ_W = 146;
const TOP_Y = 24;     // write side
const BOT_Y = 168;    // read side
const NODE_H = 56;
const BUS_Y = 104;
const BUS_H = 40;

export function CQRSViz() {
  const [writeDb, setWriteDb] = useState<WriteRow[]>(SEED_WRITE);
  const [readDb, setReadDb] = useState<ReadRow[]>(SEED_READ);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lagMs, setLagMs] = useState(1500);
  const [queryResult, setQueryResult] = useState<{ id: number; row: ReadRow | null; stale: boolean } | null>(null);
  const [staleReads, setStaleReads] = useState(0);

  const { entries, push, clear: clearLog } = useEventLog(6);
  const { ref: hostRef } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  // Instance-scoped id counter. This used to be a module-level `let`, which
  // leaked across component instances and page navigations.
  const nextId = useRef(3);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const at = useCallback((ms: number, fn: () => void) => {
    if (reduced) { fn(); return; }
    timers.current.push(setTimeout(fn, ms));
  }, [reduced]);

  const busy = phase !== "idle" && phase !== "caught-up";

  /** The window where the write store and read store disagree. */
  const inconsistent = phase === "written" || phase === "published" || phase === "projecting";

  const sendCommand = useCallback(() => {
    if (busy) return;
    const id = nextId.current++;
    const name = `User ${id}`;
    const email = `user${id}@corp.com`;

    setPhase("command");
    push(`CreateUser { name: "${name}" }`, "primary");

    at(500, () => {
      setWriteDb((prev) => [...prev, { id, name, email }]);
      setPhase("written");
      push(`✓ Write model committed — users(id=${id})`, "warning");
    });

    at(950, () => {
      setPhase("published");
      push(`UserCreated { id: ${id} } → event bus`, "info");
    });

    at(1300, () => {
      setPhase("projecting");
      push(`⏳ Projector rebuilding read model (${lagMs}ms)`, "warning");
    });

    at(1300 + lagMs, () => {
      setReadDb((prev) => [...prev, { id, displayName: name, email, orders: 0 }]);
      setPhase("caught-up");
      push(`✓ Read model caught up — user_summary(id=${id})`, "success");
      at(700, () => setPhase("idle"));
    });
  }, [busy, at, lagMs, push]);

  /** Queries only ever hit the read store — that is the whole point. */
  const sendQuery = useCallback((id: number) => {
    const row = readDb.find((r) => r.id === id) ?? null;
    const existsInWrite = writeDb.some((r) => r.id === id);
    const stale = !row && existsInWrite;
    setQueryResult({ id, row, stale });
    if (stale) {
      setStaleReads((n) => n + 1);
      push(`GetUser(${id}) → null · written but not yet projected`, "danger");
    } else if (row) {
      push(`GetUser(${id}) → { orders: ${row.orders} }`, "success");
    } else {
      push(`GetUser(${id}) → null · no such user`, "neutral");
    }
  }, [readDb, writeDb, push]);

  function reset() {
    clearTimers();
    nextId.current = 3;
    setWriteDb(SEED_WRITE);
    setReadDb(SEED_READ);
    setPhase("idle");
    setQueryResult(null);
    setStaleReads(0);
    clearLog();
  }

  // Derived from state, not from the id counter — reading a ref during render
  // is exactly the pattern that goes stale when React re-renders for other reasons.
  const newestId = writeDb.length ? Math.max(...writeDb.map((r) => r.id)) : 0;

  return (
    <VizFrame>
      <VizStatus
        hue={inconsistent ? "warning" : phase === "command" ? "primary" : "success"}
        label={PHASE_LABEL[phase]}
        pulse={busy}
        aside={
          inconsistent ? (
            <span className="font-mono text-xs text-amber-300">
              {writeDb.length - readDb.length} row behind
            </span>
          ) : null
        }
      >
        {inconsistent
          ? "The write store has the new row; the read store does not. Query it now and you get a stale answer — this is eventual consistency, not a bug."
          : phase === "command"
            ? "Command travelling to its handler."
            : "Both stores agree. Reads and writes scale independently."}
      </VizStatus>

      <div ref={hostRef}>
        <VizStage>
          <VizSvg w={W} h={H} label="CQRS: a command path writing to a normalised store, and a query path reading a projected store">
            {/* Band tints separating the two sides */}
            <rect x={0} y={0} width={W} height={BUS_Y - 6} fill={HUE.warning.base} fillOpacity={0.03} />
            <rect x={0} y={BUS_Y + BUS_H + 6} width={W} height={H - BUS_Y - BUS_H - 6} fill={HUE.success.base} fillOpacity={0.03} />
            <VizText x={W - 10} y={14} size={TYPE.micro} anchor="end" mono fill="#a16207">write side</VizText>
            <VizText x={W - 10} y={H - 8} size={TYPE.micro} anchor="end" mono fill="#0f766e">read side</VizText>

            {/* Command path */}
            <VizEdge from={[CLIENT_X + CLIENT_W, TOP_Y + NODE_H / 2 + 24]} to={[H_X, TOP_Y + NODE_H / 2]} hue="warning" arrow active={phase === "command"} />
            <VizEdge from={[H_X + H_W, TOP_Y + NODE_H / 2]} to={[DB_X, TOP_Y + NODE_H / 2]} hue="warning" arrow active={phase === "written"} />
            {/* Write store → bus → projector → read store */}
            <VizEdge from={[DB_X + DB_W / 2, TOP_Y + NODE_H]} to={[DB_X + DB_W / 2, BUS_Y]} hue="info" arrow active={phase === "published"} />
            <VizEdge from={[DB_X + DB_W, BUS_Y + BUS_H / 2]} to={[PROJ_X, BUS_Y + BUS_H / 2]} hue="info" arrow active={phase === "projecting"} />
            <VizEdge from={[PROJ_X + PROJ_W / 2, BUS_Y + BUS_H]} to={[DB_X + DB_W / 2 + 30, BOT_Y]} hue="success" arrow active={phase === "projecting"} curve={40} />
            {/* Query path */}
            <VizEdge from={[CLIENT_X + CLIENT_W, BOT_Y + NODE_H / 2 - 24]} to={[H_X, BOT_Y + NODE_H / 2]} hue="success" arrow />
            <VizEdge from={[H_X + H_W, BOT_Y + NODE_H / 2]} to={[DB_X, BOT_Y + NODE_H / 2]} hue="success" arrow />

            {/* Client spans both */}
            <VizNode
              x={CLIENT_X} y={H / 2 - 28} w={CLIENT_W} h={56}
              title="Client" sublabel="app / API" hue="neutral"
            />

            {/* Handlers */}
            <VizNode
              x={H_X} y={TOP_Y} w={H_W} h={NODE_H}
              title="Command Handler" sublabel="validate · mutate"
              hue="warning" active={phase === "command" || phase === "written"}
            />
            <VizNode
              x={H_X} y={BOT_Y} w={H_W} h={NODE_H}
              title="Query Handler" sublabel="read only"
              hue="success" active={Boolean(queryResult)}
            />

            {/* Stores */}
            <VizNode
              x={DB_X} y={TOP_Y} w={DB_W} h={NODE_H}
              title="Write store" sublabel="normalised · ACID" footnote={`${writeDb.length} rows`}
              hue="warning" active={phase === "written"}
            />
            <VizNode
              x={DB_X} y={BOT_Y} w={DB_W} h={NODE_H}
              title="Read store" sublabel="denormalised · fast" footnote={`${readDb.length} rows`}
              hue="success" active={phase === "projecting" || phase === "caught-up"}
            />

            {/* Event bus */}
            <rect
              x={DB_X - 30} y={BUS_Y} width={DB_W + 60} height={BUS_H} rx={10}
              fill={phase === "published" ? "url(#viz-node-active)" : "url(#viz-node)"}
              stroke={HUE.info.line} strokeWidth={phase === "published" ? STROKE.base : STROKE.thin}
              strokeOpacity={phase === "published" ? 1 : 0.6}
            />
            <VizText x={DB_X + DB_W / 2} y={BUS_Y + BUS_H / 2} size={TYPE.small} weight={600} hue="info" mono>
              event bus
            </VizText>

            {/* Projector */}
            <VizNode
              x={PROJ_X} y={BUS_Y - 8} w={PROJ_W} h={BUS_H + 16}
              title="Projector" sublabel="builds read model"
              hue="info" active={phase === "projecting"}
            />

            {/* Marker riding the active leg */}
            {phase === "command" && <VizPacket x={H_X - 14} y={TOP_Y + NODE_H / 2} hue="warning" r={6} />}
            {phase === "published" && <VizPacket x={DB_X + DB_W / 2} y={BUS_Y - 12} hue="info" r={6} />}
            {phase === "projecting" && <VizPacket x={PROJ_X - 16} y={BUS_Y + BUS_H / 2} hue="info" r={6} />}
          </VizSvg>
        </VizStage>
      </div>

      <VizControls>
        <VizButton variant="primary" onClick={sendCommand} disabled={busy}>
          ▶ Send command
        </VizButton>
        <VizButton variant="success" onClick={() => sendQuery(newestId)}>
          ? Query newest (#{newestId})
        </VizButton>
        <VizButton variant="secondary" onClick={() => sendQuery(1)}>
          ? Query #1
        </VizButton>
        <VizSpacer />
        <VizButton variant="ghost" onClick={reset}>↺ Reset</VizButton>
      </VizControls>

      {/* Projection lag is the knob that makes the trade-off concrete */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2.5 min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 shrink-0">
            projection lag
          </span>
          <input
            type="range" min={200} max={4000} step={100}
            value={lagMs}
            onChange={(e) => setLagMs(Number(e.target.value))}
            className="w-40 accent-violet-500"
            aria-label="Projection lag in milliseconds"
          />
          <span className="font-mono text-xs text-zinc-400 tabular-nums w-14">{lagMs}ms</span>
        </label>
        <span className="text-[11px] text-zinc-600">
          Raise it, send a command, then query immediately — that gap is where bugs live.
        </span>
      </div>

      {/* The two stores, side by side, so the shape difference is visible */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">write model</span>
            <span className="font-mono text-[10px] text-zinc-600">normalised</span>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 overflow-hidden">
            {writeDb.map((r) => (
              <div key={r.id} className="px-3 py-2 border-b border-zinc-900 last:border-0 font-mono text-[11px] flex gap-2">
                <span className="text-zinc-600 w-4 tabular-nums">{r.id}</span>
                <span className="text-zinc-200 truncate">{r.name}</span>
                <span className="text-zinc-600 truncate ml-auto">{r.email}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">read model</span>
            <span className="font-mono text-[10px] text-zinc-600">denormalised · pre-joined</span>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 overflow-hidden">
            {readDb.map((r) => (
              <div key={r.id} className="px-3 py-2 border-b border-zinc-900 last:border-0 font-mono text-[11px] flex gap-2">
                <span className="text-zinc-600 w-4 tabular-nums">{r.id}</span>
                <span className="text-zinc-200 truncate">{r.displayName}</span>
                <span className="text-violet-300 shrink-0">{r.orders} orders</span>
              </div>
            ))}
            {inconsistent && (
              <div className="px-3 py-2 border-t border-amber-500/25 bg-amber-500/[0.07] font-mono text-[11px] text-amber-300">
                ⏳ waiting for projection…
              </div>
            )}
          </div>
        </div>
      </div>

      {queryResult && (
        <div className={`rounded-xl border px-4 py-3 font-mono text-[12px] ${
          queryResult.stale
            ? "border-red-500/40 bg-red-500/10 text-red-200"
            : queryResult.row
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-zinc-800 bg-zinc-900/40 text-zinc-400"
        }`}>
          <span className="opacity-70">GetUser({queryResult.id}) → </span>
          {queryResult.row
            ? `{ displayName: "${queryResult.row.displayName}", orders: ${queryResult.row.orders} }`
            : "null"}
          {queryResult.stale && (
            <span className="block mt-1 opacity-90">
              The row exists in the write store. The read side has not caught up yet.
            </span>
          )}
        </div>
      )}

      <VizStats
        items={[
          { label: "write rows", value: writeDb.length, hue: "warning" },
          { label: "read rows", value: readDb.length, hue: "success" },
          { label: "stale reads hit", value: staleReads, hue: staleReads ? "danger" : "neutral" },
        ]}
      />

      <VizLog entries={entries} rows={4} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <VizLegend
          items={[
            { hue: "warning", label: "command path" },
            { hue: "info", label: "event + projection" },
            { hue: "success", label: "query path" },
          ]}
        />
        <VizHint>Two models, two stores, one direction of flow — writes never read the read model.</VizHint>
      </div>
    </VizFrame>
  );
}
