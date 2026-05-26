"use client";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DomainEvent {
  seq: number;
  type: string;
  payload: Record<string, string | number>;
  ts: string;
  color: string;
}

interface AccountState {
  owner: string;
  balance: number;
  status: "active" | "closed" | "frozen";
  txCount: number;
}

// ─── Event definitions ────────────────────────────────────────────────────────

const EVENT_PRESETS: Array<{
  type: string; label: string; color: string;
  payload: Record<string, string | number>;
  apply: (s: AccountState) => AccountState;
}> = [
  {
    type: "AccountOpened", label: "Open Account", color: "#6366f1",
    payload: { owner: "Alice", initialBalance: 1000 },
    apply: () => ({ owner: "Alice", balance: 1000, status: "active", txCount: 0 }),
  },
  {
    type: "MoneyDeposited", label: "Deposit $500", color: "#34d399",
    payload: { amount: 500 },
    apply: (s) => ({ ...s, balance: s.balance + 500, txCount: s.txCount + 1 }),
  },
  {
    type: "MoneyWithdrawn", label: "Withdraw $200", color: "#f59e0b",
    payload: { amount: 200 },
    apply: (s) => ({ ...s, balance: s.balance - 200, txCount: s.txCount + 1 }),
  },
  {
    type: "AccountFrozen", label: "Freeze Account", color: "#f87171",
    payload: { reason: "suspicious activity" },
    apply: (s) => ({ ...s, status: "frozen" }),
  },
  {
    type: "AccountUnfrozen", label: "Unfreeze", color: "#a78bfa",
    payload: { reason: "verification passed" },
    apply: (s) => ({ ...s, status: "active" }),
  },
  {
    type: "MoneyTransferred", label: "Transfer $300", color: "#22d3ee",
    payload: { amount: 300, to: "Bob" },
    apply: (s) => ({ ...s, balance: s.balance - 300, txCount: s.txCount + 1 }),
  },
];

function timeLabel() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function replayState(events: DomainEvent[]): AccountState {
  let state: AccountState = { owner: "—", balance: 0, status: "active", txCount: 0 };
  for (const ev of events) {
    const preset = EVENT_PRESETS.find((p) => p.type === ev.type);
    if (preset) state = preset.apply(state);
  }
  return state;
}

export function EventSourcingViz() {
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [replayTo, setReplayTo] = useState<number>(-1); // -1 = all
  const [justAdded, setJustAdded] = useState<number | null>(null);

  function addEvent(presetIdx: number) {
    const preset = EVENT_PRESETS[presetIdx];
    const ev: DomainEvent = {
      seq: events.length + 1,
      type: preset.type,
      payload: preset.payload,
      ts: timeLabel(),
      color: preset.color,
    };
    setEvents((prev) => [...prev, ev]);
    setReplayTo(-1);
    setJustAdded(ev.seq);
    setTimeout(() => setJustAdded(null), 800);
  }

  function reset() {
    setEvents([]);
    setReplayTo(-1);
  }

  const visibleEvents = replayTo === -1 ? events : events.slice(0, replayTo + 1);
  const state = replayState(visibleEvents);
  const isReplaying = replayTo !== -1 && replayTo < events.length - 1;

  return (
    <div className="flex flex-col gap-5">

      <div className="grid sm:grid-cols-2 gap-4">

        {/* ── Event Log ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono text-indigo-400 uppercase tracking-wide">Event Log</h4>
            <span className="text-[10px] text-zinc-600 font-mono">append-only · immutable</span>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 min-h-[200px] flex flex-col">
            {events.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-xs text-zinc-700 p-6 text-center">
                No events yet.<br />Append your first event below.
              </div>
            )}
            {events.map((ev) => {
              const isPast = replayTo !== -1 && ev.seq > replayTo + 1;
              const isNew = ev.seq === justAdded;
              return (
                <div
                  key={ev.seq}
                  onClick={() => setReplayTo(replayTo === ev.seq - 1 ? -1 : ev.seq - 1)}
                  className={`flex items-start gap-2 px-3 py-2 border-b border-zinc-900 last:border-0 cursor-pointer transition-all hover:bg-zinc-900/40 ${
                    isPast ? "opacity-25" : ""
                  } ${isNew ? "bg-zinc-800/60" : ""}`}
                  style={isNew ? { animation: "slide-in-right 0.2s ease" } : {}}
                >
                  <span className="text-[10px] font-mono text-zinc-600 w-5 shrink-0 mt-0.5">#{ev.seq}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ev.color }} />
                      <span className="text-xs font-semibold text-zinc-200 font-mono">{ev.type}</span>
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono mt-0.5 truncate">
                      {Object.entries(ev.payload).map(([k, v]) => `${k}: ${v}`).join(", ")}
                    </div>
                  </div>
                  <span className="text-[9px] text-zinc-700 font-mono shrink-0">{ev.ts}</span>
                </div>
              );
            })}
          </div>
          {events.length > 0 && (
            <p className="text-[10px] text-zinc-600">Click an event to replay state up to that point.</p>
          )}
        </div>

        {/* ── Current State ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wide">
              {isReplaying ? `State at event #${replayTo + 1}` : "Current State"}
            </h4>
            {isReplaying && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                time-travel active
              </span>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-3">
            {events.length === 0 ? (
              <div className="text-xs text-zinc-700 py-6 text-center">State will appear here.</div>
            ) : (
              <>
                <div className="flex flex-col gap-2 font-mono text-xs">
                  {[
                    { k: "owner",    v: state.owner,    color: "#e4e4e7" },
                    { k: "balance",  v: `$${state.balance}`, color: state.balance < 0 ? "#f87171" : "#34d399" },
                    { k: "status",   v: state.status,   color: state.status === "active" ? "#34d399" : state.status === "frozen" ? "#f87171" : "#f59e0b" },
                    { k: "txCount",  v: state.txCount,  color: "#a78bfa" },
                  ].map(({ k, v, color }) => (
                    <div key={k} className="flex items-center justify-between py-1 border-b border-zinc-900 last:border-0">
                      <span className="text-zinc-500">{k}</span>
                      <span style={{ color }} className="font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2 font-mono text-[10px] text-zinc-500 leading-relaxed">
                  <span className="text-zinc-600">// derived from {visibleEvents.length} event{visibleEvents.length !== 1 ? "s" : ""}</span><br />
                  <span className="text-zinc-400">events.reduce(apply, initialState)</span>
                </div>

                {/* Balance bar */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-600">balance history</span>
                  <div className="flex items-end gap-0.5 h-10">
                    {events.slice(0, replayTo === -1 ? events.length : replayTo + 1).reduce<number[]>((acc, ev) => {
                      const preset = EVENT_PRESETS.find((p) => p.type === ev.type);
                      const prev = acc.length ? acc[acc.length - 1] : 0;
                      const next = preset ? preset.apply(replayState(events.slice(0, acc.length))).balance : prev;
                      return [...acc, next];
                    }, []).map((bal, i) => (
                      <div key={i}
                        className="flex-1 rounded-t transition-all"
                        style={{
                          height: `${Math.max(4, Math.min(100, (bal / 1500) * 100))}%`,
                          background: bal < 0 ? "#f87171" : "#34d399",
                          opacity: 0.7,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {isReplaying && (
            <button onClick={() => setReplayTo(-1)}
              className="self-start text-xs text-violet-400 hover:text-violet-300 transition-colors">
              → Jump to latest
            </button>
          )}
        </div>
      </div>

      {/* Event buttons */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-zinc-600">Append events to the log:</span>
        <div className="flex flex-wrap gap-2">
          {EVENT_PRESETS.map((preset, i) => (
            <button key={i} onClick={() => addEvent(i)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800 transition-colors"
              style={{ color: preset.color }}>
              + {preset.label}
            </button>
          ))}
          <button onClick={reset}
            className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ↺ Reset
          </button>
        </div>
      </div>

    </div>
  );
}
