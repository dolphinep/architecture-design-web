"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStatus, VizStats, VizLegend, VizLog,
  useOnScreen, useReducedMotion, useEventLog,
  HUE_CLASS, type HueName,
} from "./_shared";

type PodPhase = "running" | "pending" | "terminating" | "failed";
type Version = "v1" | "v2";

interface Pod {
  id: string;
  phase: PodPhase;
  version: Version;
}

interface ClusterNode {
  id: string;
  label: string;
  ready: boolean;
  pods: Pod[];
}

type ScenarioId = "scale-out" | "node-failure" | "rolling-deploy";

/**
 * Pod ids are assigned from a counter rather than `Math.random()`. The previous
 * version generated random ids while building module-level initial state, so the
 * server-rendered ids never matched the client's on hydration.
 */
let podSeq = 0;
const nextPodId = () => `pod-${++podSeq}`;

function initialCluster(): ClusterNode[] {
  podSeq = 0;
  const pod = (version: Version = "v1"): Pod => ({ id: nextPodId(), phase: "running", version });
  return [
    { id: "node-1", label: "Node 1", ready: true, pods: [pod(), pod()] },
    { id: "node-2", label: "Node 2", ready: true, pods: [pod(), pod()] },
    { id: "node-3", label: "Node 3", ready: true, pods: [pod()] },
  ];
}

const PHASE_META: Record<PodPhase | "v2", { hue: HueName; glyph: string; label: string }> = {
  running:     { hue: "info",    glyph: "v1", label: "Running (v1)" },
  v2:          { hue: "success", glyph: "v2", label: "Running (v2)" },
  pending:     { hue: "warning", glyph: "◌",  label: "Pending" },
  terminating: { hue: "danger",  glyph: "↓",  label: "Terminating" },
  failed:      { hue: "neutral", glyph: "✗",  label: "Failed" },
};

const podMeta = (p: Pod) =>
  p.phase === "running" && p.version === "v2" ? PHASE_META.v2 : PHASE_META[p.phase];

const SCENARIOS: Array<{ id: ScenarioId; label: string; desc: string }> = [
  { id: "scale-out",      label: "Scale out",      desc: "scheduler places 3 new pods" },
  { id: "node-failure",   label: "Node failure",   desc: "Node 2 dies, pods reschedule" },
  { id: "rolling-deploy", label: "Rolling deploy", desc: "v1 → v2, one pod at a time" },
];

const DESIRED_REPLICAS = 5;

export function KubernetesViz() {
  const [nodes, setNodes] = useState<ClusterNode[]>(initialCluster);
  const [busy, setBusy] = useState(false);
  const [scenario, setScenario] = useState<ScenarioId | null>(null);

  const { entries, push, clear: clearLog } = useEventLog(8);
  const { ref: hostRef } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  /** Schedule a step. With reduced motion every step lands immediately, in order. */
  const at = useCallback((ms: number, fn: () => void) => {
    if (reduced) { fn(); return; }
    timers.current.push(setTimeout(fn, ms));
  }, [reduced]);

  const reset = useCallback(() => {
    clearTimers();
    setNodes(initialCluster());
    setBusy(false);
    setScenario(null);
    clearLog();
  }, [clearTimers, clearLog]);

  // ── Scenarios ───────────────────────────────────────────────────────────────

  function scaleOut() {
    push("$ kubectl scale deployment/app --replicas=8", "primary");
    at(500, () => {
      setNodes((prev) =>
        prev.map((n, i) =>
          i < 3 ? { ...n, pods: [...n.pods, { id: nextPodId(), phase: "pending", version: "v1" }] } : n
        )
      );
      push("Scheduler: binding 3 Pending pods to nodes…", "warning");
    });
    at(1700, () => {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          pods: n.pods.map((p) => (p.phase === "pending" ? { ...p, phase: "running" } : p)),
        }))
      );
      push("✓ 8/8 replicas Running", "success");
      setBusy(false);
    });
  }

  function nodeFailure() {
    push("⚠ Node 2 heartbeat lost", "warning");

    at(700, () => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === "node-2"
            ? { ...n, ready: false, pods: n.pods.map((p) => ({ ...p, phase: "failed" as PodPhase })) }
            : n
        )
      );
      push("Node 2 → NotReady, tainted for eviction", "danger");
    });

    at(1600, () => {
      setNodes((prev) => {
        const failed = prev.find((n) => n.id === "node-2")?.pods ?? [];
        // Spread the evicted pods across whatever healthy nodes remain, rather
        // than indexing fixed positions that assumed exactly two.
        const healthy = prev.filter((n) => n.ready);
        if (!healthy.length) return prev;
        const assignment = new Map<string, Pod[]>();
        failed.forEach((_, k) => {
          const target = healthy[k % healthy.length];
          const list = assignment.get(target.id) ?? [];
          list.push({ id: nextPodId(), phase: "pending", version: "v1" });
          assignment.set(target.id, list);
        });
        return prev.map((n) =>
          assignment.has(n.id) ? { ...n, pods: [...n.pods, ...assignment.get(n.id)!] } : n
        );
      });
      push("Rescheduling evicted pods onto healthy nodes…", "warning");
    });

    at(2700, () => {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          pods: n.pods.map((p) => (p.phase === "pending" ? { ...p, phase: "running" } : p)),
        }))
      );
      push("✓ Desired replica count restored — cluster self-healed", "success");
      setBusy(false);
    });
  }

  function rollingDeploy() {
    push("$ kubectl set image deployment/app app=app:v2", "primary");
    push("Strategy: RollingUpdate · maxUnavailable=1", "neutral");

    // Read the *current* pods, so a roll after a scale-out covers them all.
    const ids = nodes.flatMap((n) => n.pods.filter((p) => p.phase === "running").map((p) => p.id));

    ids.forEach((id, i) => {
      at(i * 750 + 400, () => {
        setNodes((prev) =>
          prev.map((n) => ({
            ...n,
            pods: n.pods.map((p) => (p.id === id ? { ...p, phase: "terminating" } : p)),
          }))
        );
      });
      at(i * 750 + 900, () => {
        setNodes((prev) =>
          prev.map((n) => ({
            ...n,
            pods: n.pods.map((p) => (p.id === id ? { ...p, phase: "running", version: "v2" } : p)),
          }))
        );
        push(`✓ ${id} replaced with v2 (${i + 1}/${ids.length})`, "success");
      });
    });

    at(ids.length * 750 + 1100, () => {
      push("✓ Rollout complete — every replica on v2", "success");
      setBusy(false);
    });
  }

  function run(id: ScenarioId) {
    clearTimers();
    setNodes(initialCluster());
    clearLog();
    setBusy(true);
    setScenario(id);
    // Let the reset paint before the scenario starts mutating.
    at(60, () => {
      if (id === "scale-out") scaleOut();
      else if (id === "node-failure") nodeFailure();
      else rollingDeploy();
    });
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const allPods = nodes.flatMap((n) => n.pods);
  const running = allPods.filter((p) => p.phase === "running").length;
  const pending = allPods.filter((p) => p.phase === "pending").length;
  const readyNodes = nodes.filter((n) => n.ready).length;
  const onV2 = allPods.filter((p) => p.phase === "running" && p.version === "v2").length;

  const statusHue: HueName = readyNodes < nodes.length ? "danger" : busy ? "warning" : "success";
  const statusLabel = readyNodes < nodes.length ? "DEGRADED" : busy ? "RECONCILING" : "HEALTHY";
  const statusText = busy
    ? "The control plane is converging actual state on desired state."
    : readyNodes < nodes.length
      ? `${nodes.length - readyNodes} node NotReady — workloads moved elsewhere.`
      : `${running} pods Running across ${readyNodes} ready nodes.`;

  return (
    <VizFrame>
      <VizStatus hue={statusHue} label={statusLabel} pulse={busy}>
        {statusText}
      </VizStatus>

      {/* Scenarios */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
          scenario
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SCENARIOS.map((s) => {
            const on = scenario === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => run(s.id)}
                disabled={busy}
                aria-pressed={on}
                className={`rounded-xl border px-3 py-2 text-left transition-all
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
                  disabled:opacity-40 disabled:pointer-events-none
                  ${on ? "border-violet-500/60 bg-violet-500/10" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"}`}
              >
                <span className={`block text-[13px] font-medium ${on ? "text-violet-200" : "text-zinc-300"}`}>
                  {s.label}
                </span>
                <span className="block text-[11px] text-zinc-500 mt-0.5">{s.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={hostRef}>
        <VizStage>
          {/* Control plane */}
          <div className="flex items-center gap-3 pb-3 mb-4 border-b border-zinc-800/70">
            <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-3 py-2">
              <div className="text-[13px] font-semibold text-violet-200">Control Plane</div>
              <div className="font-mono text-[11px] text-violet-400/70">api-server · scheduler · etcd</div>
            </div>
            <div className="flex-1 border-t border-dashed border-zinc-700" />
            <span className="font-mono text-[11px] text-zinc-500 shrink-0">
              reconciles → {DESIRED_REPLICAS}+ replicas
            </span>
          </div>

          {/* Nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`rounded-xl border p-3 flex flex-col gap-2.5 transition-colors ${
                  node.ready
                    ? "border-zinc-800 bg-zinc-900/40"
                    : "border-red-500/40 bg-red-500/[0.07]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-zinc-200">{node.label}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                      node.ready
                        ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                        : "text-red-300 border-red-500/40 bg-red-500/15"
                    }`}
                  >
                    {node.ready ? "Ready" : "NotReady"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[38px] content-start">
                  {node.pods.map((pod) => {
                    const m = podMeta(pod);
                    const c = HUE_CLASS[m.hue];
                    return (
                      <div
                        key={pod.id}
                        title={`${pod.id} · ${pod.version} · ${pod.phase}`}
                        className={`w-9 h-9 rounded-lg border flex items-center justify-center
                          font-mono text-[11px] font-bold transition-all duration-300
                          ${c.border} ${c.bg} ${c.text}
                          ${pod.phase === "terminating" ? "opacity-50 scale-90" : ""}`}
                      >
                        {m.glyph}
                      </div>
                    );
                  })}
                  {node.pods.length === 0 && (
                    <span className="font-mono text-[11px] text-zinc-700 self-center">no pods</span>
                  )}
                </div>

                <div className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  {node.pods.filter((p) => p.phase === "running").length} running
                  {node.pods.some((p) => p.phase === "pending") && (
                    <span className="text-amber-400">
                      {" · "}
                      {node.pods.filter((p) => p.phase === "pending").length} pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </VizStage>
      </div>

      <VizControls>
        <VizSpacer />
        <VizButton variant="ghost" onClick={reset}>↺ Reset cluster</VizButton>
      </VizControls>

      <VizStats
        items={[
          { label: "pods running", value: running, hue: "success" },
          { label: "pending", value: pending, hue: pending ? "warning" : "neutral" },
          { label: "nodes ready", value: `${readyNodes}/${nodes.length}`, hue: readyNodes === nodes.length ? "success" : "danger", meter: [readyNodes, nodes.length] },
          { label: "on v2", value: `${onV2}/${running || 1}`, hue: "info", meter: [onV2, Math.max(running, 1)] },
        ]}
      />

      <VizLog entries={entries} rows={5} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <VizLegend
          items={[
            { hue: "info", label: "Running v1" },
            { hue: "success", label: "Running v2" },
            { hue: "warning", label: "Pending" },
            { hue: "danger", label: "Terminating" },
            { hue: "neutral", label: "Failed" },
          ]}
        />
        <VizHint>You declare the desired state; the control plane makes reality match it.</VizHint>
      </div>
    </VizFrame>
  );
}
