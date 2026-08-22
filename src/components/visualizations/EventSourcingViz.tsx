"use client";
import { useState, useMemo } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStatus, VizStats,
  VizSvg, VizText,
  HUE, TYPE, STROKE, type HueName,
} from "./_shared";

interface AccountState {
  owner: string;
  balance: number;
  status: "new" | "active" | "frozen";
  txCount: number;
}

const INITIAL: AccountState = { owner: "—", balance: 0, status: "new", txCount: 0 };

interface EventDef {
  type: string;
  label: string;
  hue: HueName;
  payload: Record<string, string | number>;
  apply: (s: AccountState) => AccountState;
}

const EVENT_TYPES: EventDef[] = [
  {
    type: "AccountOpened", label: "Open account", hue: "info",
    payload: { owner: "Alice", initial: 1000 },
    apply: (s) => (s.status !== "new" ? s : { owner: "Alice", balance: 1000, status: "active", txCount: 0 }),
  },
  {
    type: "MoneyDeposited", label: "Deposit $500", hue: "success",
    payload: { amount: 500 },
    apply: (s) => (s.status !== "active" ? s : { ...s, balance: s.balance + 500, txCount: s.txCount + 1 }),
  },
  {
    type: "MoneyWithdrawn", label: "Withdraw $200", hue: "warning",
    payload: { amount: 200 },
    apply: (s) => (s.status !== "active" ? s : { ...s, balance: s.balance - 200, txCount: s.txCount + 1 }),
  },
  {
    type: "MoneyTransferred", label: "Transfer $300", hue: "primary",
    payload: { amount: 300, to: "Bob" },
    apply: (s) => (s.status !== "active" ? s : { ...s, balance: s.balance - 300, txCount: s.txCount + 1 }),
  },
  {
    type: "AccountFrozen", label: "Freeze", hue: "danger",
    payload: { reason: "suspected fraud" },
    apply: (s) => (s.status === "new" ? s : { ...s, status: "frozen" }),
  },
  {
    type: "AccountUnfrozen", label: "Unfreeze", hue: "info",
    payload: { reason: "verified" },
    apply: (s) => (s.status !== "frozen" ? s : { ...s, status: "active" }),
  },
];

const byType = (t: string) => EVENT_TYPES.find((e) => e.type === t);

interface StoredEvent {
  seq: number;
  type: string;
  payload: Record<string, string | number>;
  /** Seconds since the first event — a stable relative clock, so the log does
   *  not depend on wall time and cannot mismatch between server and client. */
  offset: number;
}

/**
 * Fold the log into state, capturing the balance after each event in one pass.
 * The previous version recomputed the whole history inside a reduce, which was
 * quadratic and produced the wrong intermediate values.
 */
function fold(events: StoredEvent[]): { state: AccountState; balances: number[] } {
  let state = INITIAL;
  const balances: number[] = [];
  for (const ev of events) {
    const def = byType(ev.type);
    if (def) state = def.apply(state);
    balances.push(state.balance);
  }
  return { state, balances };
}

const CHART_W = 660;
const CHART_H = 130;

export function EventSourcingViz() {
  const [events, setEvents] = useState<StoredEvent[]>([]);
  /** null = live head; otherwise the 0-based index replayed up to. */
  const [replayTo, setReplayTo] = useState<number | null>(null);

  function append(def: EventDef) {
    setEvents((prev) => [
      ...prev,
      { seq: prev.length + 1, type: def.type, payload: def.payload, offset: prev.length * 7 },
    ]);
    setReplayTo(null);
  }

  function reset() {
    setEvents([]);
    setReplayTo(null);
  }

  const cursor = replayTo ?? events.length - 1;
  const visible = events.slice(0, cursor + 1);
  const { state, balances } = useMemo(() => fold(visible), [visible]);
  const full = useMemo(() => fold(events), [events]);
  const timeTravelling = replayTo !== null && replayTo < events.length - 1;

  // Chart scales to the data rather than a fixed ceiling.
  const maxBal = Math.max(1000, ...full.balances, 0);
  const minBal = Math.min(0, ...full.balances);
  const span = maxBal - minBal || 1;
  const yOf = (v: number) => CHART_H - 22 - ((v - minBal) / span) * (CHART_H - 44);
  const xOf = (i: number) =>
    events.length <= 1 ? CHART_W / 2 : 28 + (i / (events.length - 1)) * (CHART_W - 56);

  const statusHue: HueName =
    state.status === "frozen" ? "danger" : state.status === "active" ? "success" : "neutral";

  return (
    <VizFrame>
      <VizStatus
        hue={timeTravelling ? "warning" : statusHue}
        label={timeTravelling ? `REPLAYED TO #${cursor + 1}` : state.status.toUpperCase()}
        aside={
          timeTravelling ? (
            <button
              type="button"
              onClick={() => setReplayTo(null)}
              className="font-mono text-xs text-amber-300 hover:text-amber-200 rounded
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70"
            >
              → jump to head
            </button>
          ) : null
        }
      >
        {events.length === 0
          ? "The log is empty. Append an event — state is never stored, only derived."
          : timeTravelling
            ? `State rebuilt by folding the first ${cursor + 1} of ${events.length} events. Nothing was mutated to get here.`
            : `Derived by folding all ${events.length} events from an empty account.`}
      </VizStatus>

      {/* Balance over the log — the value of an append-only history */}
      <VizStage>
        <VizSvg w={CHART_W} h={CHART_H} label="Account balance after each event in the log">
          {/* Zero line */}
          <line
            x1={20} y1={yOf(0)} x2={CHART_W - 20} y2={yOf(0)}
            stroke={HUE.neutral.line} strokeWidth={STROKE.hairline} strokeDasharray="4 4" strokeOpacity={0.6}
          />
          <VizText x={16} y={yOf(0)} size={TYPE.micro} anchor="end" mono fill="#52525b">0</VizText>

          {events.length === 0 && (
            <VizText x={CHART_W / 2} y={CHART_H / 2} size={TYPE.small} fill="#3f3f46" mono>
              no events yet
            </VizText>
          )}

          {/* Balance path across the whole log, dimmed beyond the replay cursor */}
          {full.balances.length > 1 && (
            <>
              <path
                d={full.balances.map((b, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(b)}`).join(" ")}
                fill="none" stroke={HUE.neutral.line} strokeWidth={STROKE.thin} strokeOpacity={0.35}
              />
              <path
                d={balances.map((b, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(b)}`).join(" ")}
                fill="none" stroke={HUE.success.line} strokeWidth={STROKE.base}
              />
            </>
          )}

          {/* One marker per event, clickable to time-travel */}
          {events.map((ev, i) => {
            const def = byType(ev.type);
            const hue = def?.hue ?? "neutral";
            const beyond = i > cursor;
            const isCursor = i === cursor;
            return (
              <g
                key={ev.seq}
                onClick={() => setReplayTo(replayTo === i ? null : i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setReplayTo(replayTo === i ? null : i); }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Event ${ev.seq}: ${ev.type}. Replay state to here.`}
                aria-pressed={isCursor}
                className="viz-node-interactive"
                style={{ cursor: "pointer", opacity: beyond ? 0.3 : 1, outline: "none", transition: "opacity 200ms" }}
              >
                <line
                  x1={xOf(i)} y1={yOf(full.balances[i])} x2={xOf(i)} y2={CHART_H - 16}
                  stroke={HUE[hue].line} strokeWidth={STROKE.hairline} strokeOpacity={0.4}
                />
                <circle
                  cx={xOf(i)} cy={yOf(full.balances[i])} r={isCursor ? 6 : 4}
                  fill={HUE[hue].line}
                  stroke="#0a0a0b" strokeWidth={2}
                  filter={isCursor ? "url(#viz-glow)" : undefined}
                />
                <VizText x={xOf(i)} y={CHART_H - 8} size={TYPE.micro} mono fill={isCursor ? HUE[hue].text : "#52525b"}>
                  {`#${ev.seq}`}
                </VizText>
              </g>
            );
          })}

          <VizText x={20} y={14} size={TYPE.micro} anchor="start" mono fill="#3f3f46">
            balance · click any point to rebuild state at that event
          </VizText>
        </VizSvg>
      </VizStage>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Append-only log */}
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-violet-400">event log</span>
            <span className="font-mono text-[10px] text-zinc-600">append-only · immutable</span>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 overflow-hidden" style={{ minHeight: 196 }}>
            {events.length === 0 ? (
              <div className="h-[196px] flex items-center justify-center text-center px-6">
                <span className="text-[13px] text-zinc-700">
                  Nothing appended yet.<br />The log is the only source of truth.
                </span>
              </div>
            ) : (
              <div className="max-h-[196px] overflow-y-auto">
                {events.map((ev, i) => {
                  const def = byType(ev.type);
                  const hue = def?.hue ?? "neutral";
                  const beyond = i > cursor;
                  return (
                    <button
                      key={ev.seq}
                      type="button"
                      onClick={() => setReplayTo(replayTo === i ? null : i)}
                      aria-pressed={i === cursor}
                      className={`w-full text-left flex items-start gap-2.5 px-3 py-2 border-b border-zinc-900 last:border-0
                        transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
                        ${beyond ? "opacity-30" : "hover:bg-zinc-900/60"}
                        ${i === cursor && replayTo !== null ? "bg-amber-500/10" : ""}`}
                    >
                      <span className="font-mono text-[11px] text-zinc-600 w-6 shrink-0 pt-0.5 tabular-nums">
                        #{ev.seq}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-[7px] ${
                        { neutral: "bg-zinc-400", primary: "bg-violet-400", success: "bg-emerald-400",
                          danger: "bg-red-400", warning: "bg-amber-400", info: "bg-blue-400" }[hue]
                      }`} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[12px] font-semibold text-zinc-200 truncate">
                          {ev.type}
                        </span>
                        <span className="block font-mono text-[11px] text-zinc-600 truncate">
                          {Object.entries(ev.payload).map(([k, v]) => `${k}=${v}`).join(" · ")}
                        </span>
                      </span>
                      <span className="font-mono text-[10px] text-zinc-700 shrink-0 pt-0.5 tabular-nums">
                        +{ev.offset}s
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Derived state */}
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
              derived state
            </span>
            <span className="font-mono text-[10px] text-zinc-600">never stored</span>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-4 flex flex-col gap-3" style={{ minHeight: 196 }}>
            <div className="flex flex-col font-mono text-[13px]">
              {[
                { k: "owner", v: state.owner, cls: "text-zinc-200" },
                { k: "balance", v: `$${state.balance.toLocaleString()}`, cls: state.balance < 0 ? "text-red-400" : "text-emerald-400" },
                { k: "status", v: state.status, cls: state.status === "frozen" ? "text-red-400" : state.status === "active" ? "text-emerald-400" : "text-zinc-500" },
                { k: "txCount", v: state.txCount, cls: "text-violet-300" },
              ].map(({ k, v, cls }) => (
                <div key={k} className="flex items-center justify-between py-1.5 border-b border-zinc-900 last:border-0">
                  <span className="text-zinc-500">{k}</span>
                  <span className={`font-semibold tabular-nums ${cls}`}>{String(v)}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-zinc-900/70 border border-zinc-800 px-2.5 py-2 font-mono text-[11px] leading-relaxed">
              <span className="text-zinc-600">{`// ${visible.length} event${visible.length === 1 ? "" : "s"} folded`}</span>
              <br />
              <span className="text-zinc-300">events.reduce(apply, EMPTY)</span>
            </div>
          </div>
        </div>
      </div>

      <VizStats
        items={[
          { label: "events stored", value: events.length, hue: "primary" },
          { label: "state rows", value: 0, hue: "neutral", note: "nothing persisted" },
          { label: "balance now", value: `$${full.state.balance.toLocaleString()}`, hue: full.state.balance < 0 ? "danger" : "success" },
        ]}
      />

      <VizControls>
        {EVENT_TYPES.map((def) => (
          <VizButton key={def.type} onClick={() => append(def)}>
            <span className="font-mono" style={{ color: HUE[def.hue].text }}>+ {def.label}</span>
          </VizButton>
        ))}
        <VizSpacer />
        <VizButton variant="ghost" onClick={reset}>↺ Clear log</VizButton>
      </VizControls>

      <VizHint>
        Events are only ever appended. Every question about the past is answered by folding a
        prefix of the log — which is why an audit trail comes free.
      </VizHint>
    </VizFrame>
  );
}
