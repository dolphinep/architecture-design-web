"use client";
import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PodStatus = "running" | "pending" | "terminating" | "failed" | "empty";
type NodeStatus = "healthy" | "failed";

interface Pod {
  id: string;
  name: string;
  version: "v1" | "v2";
  status: PodStatus;
}

interface Node {
  id: string;
  label: string;
  status: NodeStatus;
  pods: Pod[];
}

type ScenarioId = "scale-out" | "node-failure" | "rolling-deploy";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePod(idx: number, version: "v1" | "v2" = "v1", status: PodStatus = "running"): Pod {
  return { id: `pod-${idx}-${Math.random().toString(36).slice(2, 5)}`, name: `app-${idx}`, version, status };
}

const INITIAL_STATE: Node[] = [
  { id: "node-1", label: "Node 1", status: "healthy", pods: [makePod(1), makePod(2)] },
  { id: "node-2", label: "Node 2", status: "healthy", pods: [makePod(3), makePod(4)] },
  { id: "node-3", label: "Node 3", status: "healthy", pods: [makePod(5)] },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function KubernetesViz() {
  const [nodes, setNodes] = useState<Node[]>(structuredClone(INITIAL_STATE));
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(null);
  const logId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = []; }
  useEffect(() => () => clearTimers(), []);

  function t(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }

  function addLog(msg: string) {
    setLog((prev) => [msg, ...prev].slice(0, 12));
  }

  function reset() {
    clearTimers();
    setNodes(structuredClone(INITIAL_STATE));
    setLog([]);
    setRunning(false);
    setActiveScenario(null);
  }

  // ── Scale-out ─────────────────────────────────────────────────────────────

  function runScaleOut() {
    setRunning(true); setActiveScenario("scale-out");
    addLog("kubectl scale deployment/app --replicas=8");

    // Add pending pods distributed across nodes
    const newPods: Array<{ nodeIdx: number; pod: Pod }> = [
      { nodeIdx: 0, pod: { ...makePod(6), status: "pending" } },
      { nodeIdx: 1, pod: { ...makePod(7), status: "pending" } },
      { nodeIdx: 2, pod: { ...makePod(8), status: "pending" } },
    ];

    t(() => {
      setNodes((prev) => prev.map((n, i) => {
        const np = newPods.filter((x) => x.nodeIdx === i).map((x) => x.pod);
        return np.length ? { ...n, pods: [...n.pods, ...np] } : n;
      }));
      addLog("Scheduler: assigning 3 new pods to nodes…");
    }, 600);

    t(() => {
      setNodes((prev) => prev.map((n) => ({
        ...n,
        pods: n.pods.map((p) => p.status === "pending" ? { ...p, status: "running" } : p),
      })));
      addLog("✓ 3 pods Running — desired replicas: 8");
      setRunning(false);
    }, 2000);
  }

  // ── Node failure ──────────────────────────────────────────────────────────

  function runNodeFailure() {
    setRunning(true); setActiveScenario("node-failure");
    addLog("⚠ Node 2 heartbeat lost…");

    // Mark node 2 failed
    t(() => {
      setNodes((prev) => prev.map((n) =>
        n.id === "node-2"
          ? { ...n, status: "failed", pods: n.pods.map((p) => ({ ...p, status: "failed" })) }
          : n
      ));
      addLog("Node 2 marked NotReady — evicting pods");
    }, 800);

    // Reschedule pods from node 2 onto node 1 and 3
    t(() => {
      setNodes((prev) => {
        const failedPods = prev.find((n) => n.id === "node-2")?.pods ?? [];
        addLog(`Rescheduling ${failedPods.length} pods onto healthy nodes…`);
        return prev.map((n) => {
          if (n.id === "node-1")
            return { ...n, pods: [...n.pods, { ...failedPods[0], id: failedPods[0].id + "-r", status: "pending" }] };
          if (n.id === "node-3")
            return { ...n, pods: [...n.pods, { ...failedPods[1], id: failedPods[1].id + "-r", status: "pending" }] };
          return n;
        });
      });
    }, 1800);

    t(() => {
      setNodes((prev) => prev.map((n) => ({
        ...n,
        pods: n.pods.map((p) => p.status === "pending" ? { ...p, status: "running" } : p),
      })));
      addLog("✓ All pods Running — cluster self-healed");
      setRunning(false);
    }, 3200);
  }

  // ── Rolling deploy ────────────────────────────────────────────────────────

  function runRollingDeploy() {
    setRunning(true); setActiveScenario("rolling-deploy");
    addLog("kubectl set image deployment/app container=app:v2");
    addLog("Strategy: RollingUpdate (maxUnavailable: 1)");

    // Collect all pod ids across nodes
    const allPodIds: string[] = [];
    INITIAL_STATE.forEach((n) => n.pods.forEach((p) => allPodIds.push(p.id)));

    allPodIds.forEach((podId, i) => {
      // Terminate old pod
      t(() => {
        setNodes((prev) => prev.map((n) => ({
          ...n,
          pods: n.pods.map((p) => p.id === podId ? { ...p, status: "terminating" } : p),
        })));
        addLog(`Terminating pod ${podId.split("-")[1]} (v1)…`);
      }, i * 900);

      // Replace with v2
      t(() => {
        setNodes((prev) => prev.map((n) => ({
          ...n,
          pods: n.pods.map((p) =>
            p.id === podId ? { ...p, status: "running", version: "v2" } : p
          ),
        })));
        addLog(`✓ New pod (v2) Running`);
      }, i * 900 + 600);
    });

    t(() => {
      addLog("✓ Rolling deploy complete — all replicas on v2");
      setRunning(false);
    }, allPodIds.length * 900 + 800);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  function podColor(pod: Pod) {
    if (pod.status === "running")     return pod.version === "v2" ? "#059669" : "#6366f1";
    if (pod.status === "pending")     return "#f59e0b";
    if (pod.status === "terminating") return "#ef4444";
    if (pod.status === "failed")      return "#52525b";
    return "#27272a";
  }

  function podLabel(pod: Pod) {
    if (pod.status === "running")     return pod.version === "v2" ? "v2" : "v1";
    if (pod.status === "pending")     return "…";
    if (pod.status === "terminating") return "↓";
    if (pod.status === "failed")      return "✗";
    return "";
  }

  const SCENARIOS: Array<{ id: ScenarioId; label: string; desc: string; color: string }> = [
    { id: "scale-out",     label: "Scale out",      desc: "Scheduler adds 3 pods across nodes",             color: "text-indigo-400" },
    { id: "node-failure",  label: "Node failure",   desc: "Node 2 fails → pods rescheduled automatically",  color: "text-red-400" },
    { id: "rolling-deploy",label: "Rolling deploy", desc: "Replace v1 pods with v2 one at a time",          color: "text-emerald-400" },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* Scenario buttons */}
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map(({ id, label, desc, color }) => (
          <button
            key={id}
            onClick={() => {
              reset();
              if (id === "scale-out")      setTimeout(runScaleOut,       100);
              if (id === "node-failure")   setTimeout(runNodeFailure,    100);
              if (id === "rolling-deploy") setTimeout(runRollingDeploy,  100);
            }}
            disabled={running}
            className={`flex flex-col gap-0.5 px-3 py-2 rounded-lg text-left transition-colors border text-sm ${
              activeScenario === id
                ? "bg-zinc-700 border-zinc-500"
                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className={`font-medium ${activeScenario === id ? color : "text-zinc-200"}`}>{label}</span>
            <span className="text-[10px] text-zinc-500">{desc}</span>
          </button>
        ))}
        <button
          onClick={reset}
          className="px-3 py-2 rounded-lg text-sm text-zinc-500 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300 transition-colors self-start"
        >
          ↺ Reset
        </button>
      </div>

      {/* Cluster diagram */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        {/* Control plane */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-800">
          <div className="rounded-lg border border-indigo-800 bg-indigo-950/50 px-3 py-2 text-xs">
            <div className="text-indigo-300 font-semibold">Control Plane</div>
            <div className="text-indigo-600 font-mono text-[10px]">API Server · Scheduler · etcd</div>
          </div>
          <svg width={20} height={20}>
            <line x1={0} y1={10} x2={18} y2={10} stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,2" />
          </svg>
          <span className="text-xs text-zinc-600">manages →</span>
        </div>

        {/* Nodes */}
        <div className="grid sm:grid-cols-3 gap-3">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`rounded-xl border p-3 flex flex-col gap-2 transition-all ${
                node.status === "failed"
                  ? "border-red-800 bg-red-950/20"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">{node.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  node.status === "failed"
                    ? "bg-red-950 text-red-400 border border-red-800"
                    : "bg-emerald-950/50 text-emerald-400 border border-emerald-900"
                }`}>
                  {node.status === "failed" ? "NotReady" : "Ready"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {node.pods.map((pod) => (
                  <div
                    key={pod.id}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold transition-all"
                    style={{
                      background: podColor(pod) + "22",
                      border: `1.5px solid ${podColor(pod)}`,
                      color: podColor(pod),
                      boxShadow: pod.status === "running" ? `0 0 6px ${podColor(pod)}44` : "none",
                    }}
                    title={`${pod.name} (${pod.version}) — ${pod.status}`}
                  >
                    {podLabel(pod)}
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-zinc-600 font-mono">
                {node.pods.filter((p) => p.status === "running").length} running
                {" · "}
                {node.pods.filter((p) => p.status === "pending").length > 0 && (
                  <span className="text-amber-600">
                    {node.pods.filter((p) => p.status === "pending").length} pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pod legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-zinc-900">
          {[
            { color: "#6366f1", label: "Running (v1)" },
            { color: "#059669", label: "Running (v2)" },
            { color: "#f59e0b", label: "Pending" },
            { color: "#ef4444", label: "Terminating" },
            { color: "#52525b", label: "Failed" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <div className="w-3 h-3 rounded" style={{ background: color + "33", border: `1px solid ${color}` }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Event log */}
      {log.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-1 font-mono text-xs">
          {log.map((entry, i) => (
            <div key={i} className={`leading-snug ${
              entry.startsWith("✓") ? "text-emerald-400" :
              entry.startsWith("⚠") || entry.startsWith("Terminating") ? "text-amber-400" :
              entry.startsWith("kubectl") ? "text-indigo-400" :
              "text-zinc-400"
            }`}>
              {entry}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
