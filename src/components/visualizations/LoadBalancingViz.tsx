"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStats, VizLegend, VizLog,
  VizSvg, VizText, VizEdge, VizPacket, VizNode,
  useFlights, useInterval, useOnScreen, useReducedMotion, useEventLog,
  fadeOut, easeInOut,
  HUE, TYPE, MOTION, type HueName, type Flight,
} from "./_shared";

type Algorithm = "round-robin" | "least-connections" | "weighted";

interface ServerState {
  id: string;
  label: string;
  healthy: boolean;
  active: number;
  total: number;
  /** Relative capacity, used by the weighted algorithm */
  weight: number;
  /** Simulated service time, ms */
  serviceMs: number;
  hue: HueName;
}

const INITIAL: ServerState[] = [
  { id: "s1", label: "Server 1", healthy: true, active: 0, total: 0, weight: 3, serviceMs: 320, hue: "info" },
  { id: "s2", label: "Server 2", healthy: true, active: 0, total: 0, weight: 2, serviceMs: 620, hue: "primary" },
  { id: "s3", label: "Server 3", healthy: true, active: 0, total: 0, weight: 1, serviceMs: 1100, hue: "success" },
];

const ALGORITHMS: Array<{ value: Algorithm; label: string; desc: string }> = [
  { value: "round-robin",       label: "Round robin",       desc: "equal turns, ignores load" },
  { value: "least-connections", label: "Least connections", desc: "fewest in-flight wins" },
  { value: "weighted",          label: "Weighted",          desc: "share by capacity" },
];

// ─── Layout ───────────────────────────────────────────────────────────────────
const W = 700;
const H = 300;
const CLIENT_X = 20;
const LB_X = 226;
const LB_W = 108;
const LB_H = 96;
const SRV_X = 470;
const SRV_W = 158;
const SRV_H = 54;
const SRV_Y = [34, 122, 210];
const MID_Y = H / 2 - 22;

/**
 * Pure selection, so each algorithm's behaviour can be reasoned about directly.
 * `turn` is the round-robin cursor; the caller owns it.
 */
export function selectServer(
  servers: ServerState[],
  algo: Algorithm,
  turn: number,
  rand = Math.random
): ServerState | null {
  const healthy = servers.filter((s) => s.healthy);
  if (!healthy.length) return null;

  if (algo === "round-robin") {
    return healthy[turn % healthy.length];
  }
  if (algo === "least-connections") {
    // Ties resolve to the earliest server, keeping the demo deterministic.
    return healthy.reduce((min, s) => (s.active < min.active ? s : min), healthy[0]);
  }
  // Weighted: expand into a pool so each server appears `weight` times.
  const pool = healthy.flatMap((s) => Array.from({ length: s.weight }, () => s));
  return pool[Math.floor(rand() * pool.length)];
}

interface Hop {
  serverId: string;
  returning: boolean;
}

export function LoadBalancingViz() {
  const [servers, setServers] = useState<ServerState[]>(() => structuredClone(INITIAL));
  const [algo, setAlgo] = useState<Algorithm>("round-robin");
  const [running, setRunning] = useState(false);
  const [rejected, setRejected] = useState(0);

  const { entries, push, clear: clearLog } = useEventLog(6);
  const { ref: hostRef, onScreen } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  // Round-robin cursor as instance state. It used to be a module-level `let`,
  // which leaked between component instances and across navigations.
  const turn = useRef(0);
  const serversRef = useRef(servers);
  useEffect(() => { serversRef.current = servers; }, [servers]);

  const { flights, launch, clear: clearFlights } = useFlights<Hop>({
    active: onScreen,
    max: 14,
    reduced,
    onLand: (f) => {
      if (f.meta.returning) return;
      const srv = serversRef.current.find((s) => s.id === f.meta.serverId);
      if (!srv) return;
      // Response travels back, then the connection is released.
      launch({ serverId: f.meta.serverId, returning: true }, { duration: srv.serviceMs, linger: 250 });
      setServers((prev) =>
        prev.map((s) => (s.id === f.meta.serverId ? { ...s, active: Math.max(0, s.active - 1) } : s))
      );
    },
  });

  const send = useCallback(() => {
    const chosen = selectServer(serversRef.current, algo, turn.current);
    if (!chosen) {
      setRejected((n) => n + 1);
      push("✗ 503 — no healthy servers in the pool", "danger");
      return;
    }
    if (algo === "round-robin") turn.current += 1;

    launch({ serverId: chosen.id, returning: false }, { duration: MOTION.base, linger: 200 });
    setServers((prev) =>
      prev.map((s) => (s.id === chosen.id ? { ...s, active: s.active + 1, total: s.total + 1 } : s))
    );
    push(`→ ${chosen.label} · ${chosen.active + 1} in flight`, "primary");
  }, [algo, launch, push]);

  useInterval(running && onScreen, 600, send);

  function toggleHealth(id: string) {
    const srv = serversRef.current.find((s) => s.id === id)!;
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, healthy: !s.healthy, active: s.healthy ? 0 : s.active } : s))
    );
    push(
      srv.healthy
        ? `⚠ ${srv.label} failed its health check — drained from the pool`
        : `✓ ${srv.label} passed health checks — back in the pool`,
      srv.healthy ? "warning" : "success"
    );
  }

  function reset() {
    turn.current = 0;
    const fresh = structuredClone(INITIAL);
    serversRef.current = fresh;
    setServers(fresh);
    setRejected(0);
    setRunning(false);
    clearFlights();
    clearLog();
  }

  const total = servers.reduce((a, s) => a + s.total, 0);
  const healthyCount = servers.filter((s) => s.healthy).length;
  const inFlight = servers.reduce((a, s) => a + s.active, 0);

  // Even-distribution error: how far the worst server is from its fair share.
  const fairShares = servers.filter((s) => s.healthy);
  const expected = (s: ServerState) =>
    algo === "weighted"
      ? s.weight / Math.max(fairShares.reduce((a, x) => a + x.weight, 0), 1)
      : 1 / Math.max(fairShares.length, 1);
  const skew = total
    ? Math.round(
        Math.max(...fairShares.map((s) => Math.abs(s.total / total - expected(s)))) * 100
      )
    : 0;

  return (
    <VizFrame>
      {/* Algorithm: a segmented control, since it is the primary variable here */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
          routing algorithm
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ALGORITHMS.map((a) => {
            const on = algo === a.value;
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => { setAlgo(a.value); turn.current = 0; }}
                aria-pressed={on}
                className={`rounded-xl border px-3 py-2 text-left transition-all
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
                  ${on
                    ? "border-violet-500/60 bg-violet-500/10"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"}`}
              >
                <span className={`block text-[13px] font-medium ${on ? "text-violet-200" : "text-zinc-300"}`}>
                  {a.label}
                </span>
                <span className="block text-[11px] text-zinc-500 mt-0.5">{a.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={hostRef}>
        <VizStage>
          <VizSvg w={W} h={H} label={`Load balancer distributing requests across three servers using ${algo}`}>
            {/* Client → LB */}
            <VizEdge from={[CLIENT_X + 96, MID_Y + 22]} to={[LB_X, MID_Y + 22]} hue="neutral" arrow />
            <VizNode
              x={CLIENT_X} y={MID_Y} w={96} h={44}
              title="Clients" sublabel="requests" hue="neutral"
            />

            {/* Load balancer */}
            <VizNode
              x={LB_X} y={H / 2 - LB_H / 2} w={LB_W} h={LB_H}
              title="Load"
              sublabel="Balancer"
              footnote={algo === "least-connections" ? "least-conn" : algo}
              hue="primary"
              active
            />

            {/* LB → each server */}
            {servers.map((s, i) => (
              <VizEdge
                key={s.id}
                from={[LB_X + LB_W, H / 2]}
                to={[SRV_X, SRV_Y[i] + SRV_H / 2]}
                hue={s.healthy ? s.hue : "danger"}
                dashed={!s.healthy}
                arrow={s.healthy}
                dimmed={!s.healthy}
              />
            ))}

            {/* Packets */}
            {flights.map((f: Flight<Hop>) => {
              const i = servers.findIndex((s) => s.id === f.meta.serverId);
              if (i < 0) return null;
              const a: [number, number] = [LB_X + LB_W, H / 2];
              const b: [number, number] = [SRV_X, SRV_Y[i] + SRV_H / 2];
              const t = easeInOut(f.t);
              // Responses retrace the same line in reverse.
              const [from, to] = f.meta.returning ? [b, a] : [a, b];
              return (
                <VizPacket
                  key={f.id}
                  x={from[0] + (to[0] - from[0]) * t}
                  y={from[1] + (to[1] - from[1]) * t}
                  hue={f.meta.returning ? "success" : servers[i].hue}
                  r={f.meta.returning ? 4 : 5}
                  opacity={f.landed ? fadeOut(f) : 1}
                />
              );
            })}

            {/* Servers — clickable to fail or recover */}
            {servers.map((s, i) => {
              const share = total ? (s.total / total) * 100 : 0;
              return (
                <g key={s.id}>
                  <VizNode
                    x={SRV_X} y={SRV_Y[i]} w={SRV_W} h={SRV_H}
                    title={s.label}
                    sublabel={s.healthy ? `${s.active} in flight` : "unhealthy — drained"}
                    hue={s.healthy ? s.hue : "danger"}
                    active={false}
                    dimmed={!s.healthy}
                    onClick={() => toggleHealth(s.id)}
                    ariaLabel={`${s.label}, ${s.healthy ? "healthy" : "unhealthy"} — click to toggle`}
                  />
                  {/* Weight, only meaningful for the weighted algorithm */}
                  {algo === "weighted" && s.healthy && (
                    <VizText x={SRV_X + SRV_W - 10} y={SRV_Y[i] + 12} size={TYPE.micro} anchor="end" hue={s.hue} mono>
                      w{s.weight}
                    </VizText>
                  )}
                  {/* Traffic share bar */}
                  <rect
                    x={SRV_X} y={SRV_Y[i] + SRV_H + 5} width={SRV_W} height={5} rx={2.5}
                    fill="#1c1c1f"
                  />
                  <rect
                    x={SRV_X} y={SRV_Y[i] + SRV_H + 5}
                    width={Math.max(share > 0 ? 3 : 0, (share / 100) * SRV_W)} height={5} rx={2.5}
                    fill={HUE[s.healthy ? s.hue : "danger"].line}
                    opacity={s.healthy ? 0.9 : 0.4}
                    style={{ transition: "width 300ms cubic-bezier(0.16,1,0.3,1)" }}
                  />
                  <VizText
                    x={SRV_X + SRV_W + 8} y={SRV_Y[i] + SRV_H + 7}
                    size={TYPE.micro} anchor="start" mono
                    fill={s.healthy ? HUE[s.hue].text : "#52525b"}
                  >
                    {Math.round(share)}%
                  </VizText>
                </g>
              );
            })}

            <VizText x={SRV_X} y={16} size={TYPE.micro} anchor="start" fill="#3f3f46" mono>
              click a server to fail it
            </VizText>
          </VizSvg>
        </VizStage>
      </div>

      <VizControls>
        <VizButton variant={running ? "secondary" : "primary"} active={running} onClick={() => setRunning((r) => !r)}>
          {running ? "❙❙ Pause" : "▶ Send requests"}
        </VizButton>
        <VizButton onClick={send}>+ One request</VizButton>
        <VizSpacer />
        <VizButton variant="ghost" onClick={reset}>↺ Reset</VizButton>
      </VizControls>

      <VizStats
        items={[
          { label: "requests routed", value: total, hue: "primary" },
          { label: "in flight", value: inFlight, hue: "info" },
          { label: "healthy servers", value: `${healthyCount}/${servers.length}`, hue: healthyCount ? "success" : "danger", meter: [healthyCount, servers.length] },
          { label: "distribution skew", value: `${skew}%`, hue: skew > 15 ? "warning" : "success", note: "vs fair share" },
        ]}
      />

      <VizLog entries={entries} rows={4} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <VizLegend
          items={[
            { hue: "primary", label: "request out" },
            { hue: "success", label: "response back" },
            { hue: "danger", label: "drained", dashed: true },
          ]}
        />
        <VizHint>
          {rejected > 0 && <span className="text-red-400">{rejected} rejected · </span>}
          Fail a server mid-run — watch traffic redistribute without dropping requests.
        </VizHint>
      </div>
    </VizFrame>
  );
}
