"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import {
  Excalidraw,
  exportToBlob,
  serializeAsJSON,
  convertToExcalidrawElements,
  viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Skeleton = any;
import "@excalidraw/excalidraw/index.css";

// ─── Types ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type API = any;

interface ShapeConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  width: number;
  height: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  skeleton: Record<string, any>;
}

interface SavedCanvas {
  id: string;
  name: string;
  updatedAt: number;
  data: string;
}

// ─── Shape palette ────────────────────────────────────────────────────────────

const SHAPES: ShapeConfig[] = [
  {
    id: "service",
    label: "Service",
    icon: "[ ]",
    color: "#818cf8",
    width: 130, height: 60,
    skeleton: {
      type: "rectangle",
      strokeColor: "#818cf8", backgroundColor: "#1e1b4b",
      fillStyle: "solid", strokeWidth: 2, roughness: 0,
      roundness: { type: 3 },
      label: { text: "Service", fontSize: 14 },
    },
  },
  {
    id: "database",
    label: "Database",
    icon: "DB",
    color: "#22d3ee",
    width: 110, height: 60,
    skeleton: {
      type: "rectangle",
      strokeColor: "#22d3ee", backgroundColor: "#082f49",
      fillStyle: "solid", strokeWidth: 2, roughness: 0,
      roundness: { type: 3 },
      label: { text: "Database", fontSize: 14 },
    },
  },
  {
    id: "queue",
    label: "Queue / Broker",
    icon: "≡",
    color: "#a78bfa",
    width: 140, height: 60,
    skeleton: {
      type: "rectangle",
      strokeColor: "#a78bfa", backgroundColor: "#2e1065",
      fillStyle: "solid", strokeWidth: 2, roughness: 0,
      roundness: { type: 3 },
      label: { text: "Message Broker", fontSize: 13 },
    },
  },
  {
    id: "gateway",
    label: "API Gateway",
    icon: "⟩",
    color: "#4ade80",
    width: 140, height: 70,
    skeleton: {
      type: "diamond",
      strokeColor: "#4ade80", backgroundColor: "#052e16",
      fillStyle: "solid", strokeWidth: 2, roughness: 0,
      label: { text: "API Gateway", fontSize: 13 },
    },
  },
  {
    id: "client",
    label: "Client",
    icon: "☐",
    color: "#fcd34d",
    width: 110, height: 55,
    skeleton: {
      type: "rectangle",
      strokeColor: "#fcd34d", backgroundColor: "#451a03",
      fillStyle: "solid", strokeWidth: 2, roughness: 0,
      roundness: { type: 3 },
      label: { text: "Client", fontSize: 14 },
    },
  },
  {
    id: "load-balancer",
    label: "Load Balancer",
    icon: "⊕",
    color: "#fb923c",
    width: 130, height: 60,
    skeleton: {
      type: "ellipse",
      strokeColor: "#fb923c", backgroundColor: "#431407",
      fillStyle: "solid", strokeWidth: 2, roughness: 0,
      label: { text: "Load Balancer", fontSize: 12 },
    },
  },
  {
    id: "cache",
    label: "Cache",
    icon: "⚡",
    color: "#f472b6",
    width: 110, height: 55,
    skeleton: {
      type: "rectangle",
      strokeColor: "#f472b6", backgroundColor: "#500724",
      fillStyle: "solid", strokeWidth: 2, roughness: 0,
      roundness: { type: 3 },
      strokeStyle: "dashed",
      label: { text: "Cache", fontSize: 14 },
    },
  },
  {
    id: "cdn",
    label: "CDN / Edge",
    icon: "⟳",
    color: "#2dd4bf",
    width: 130, height: 60,
    skeleton: {
      type: "rectangle",
      strokeColor: "#2dd4bf", backgroundColor: "#042f2e",
      fillStyle: "solid", strokeWidth: 2, roughness: 0,
      roundness: { type: 3 },
      label: { text: "CDN / Edge", fontSize: 13 },
    },
  },
  {
    id: "user",
    label: "User",
    icon: "⊙",
    color: "#fbbf24",
    width: 80, height: 80,
    skeleton: {
      type: "ellipse",
      strokeColor: "#fbbf24", backgroundColor: "#292524",
      fillStyle: "solid", strokeWidth: 2, roughness: 0,
      label: { text: "User", fontSize: 14 },
    },
  },
  {
    id: "external",
    label: "External API",
    icon: "↗",
    color: "#94a3b8",
    width: 130, height: 60,
    skeleton: {
      type: "rectangle",
      strokeColor: "#94a3b8", backgroundColor: "#1c1917",
      fillStyle: "solid", strokeWidth: 2, roughness: 0,
      strokeStyle: "dotted",
      roundness: { type: 3 },
      label: { text: "External API", fontSize: 13 },
    },
  },
];

// ─── Templates ────────────────────────────────────────────────────────────────

// Arrow helper — explicit points avoid Excalidraw's "not normalized" error
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function arr(x1: number, y1: number, x2: number, y2: number): any {
  return {
    type: "arrow",
    x: x1, y: y1,
    points: [[0, 0], [x2 - x1, y2 - y1]],
    strokeColor: "#52525b", strokeWidth: 1.5, roughness: 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEMPLATES: Array<{ id: string; label: string; elements: any[] }> = [
  {
    id: "microservices",
    label: "Microservices",
    elements: [
      // Client  (right-edge center: 160, 247)
      { type: "rectangle", x: 60,  y: 220, width: 100, height: 55,
        strokeColor: "#fcd34d", backgroundColor: "#451a03", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Client", fontSize: 13 } },
      // API Gateway diamond  (left: 240,230  right: 380,230)
      { type: "diamond",   x: 240, y: 190, width: 140, height: 80,
        strokeColor: "#4ade80", backgroundColor: "#052e16", fillStyle: "solid", strokeWidth: 2, roughness: 0,
        label: { text: "API Gateway", fontSize: 12 } },
      // Services  (left-edge centers: 480,127 / 480,242 / 480,357)
      { type: "rectangle", x: 480, y: 100, width: 130, height: 55,
        strokeColor: "#818cf8", backgroundColor: "#1e1b4b", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "User Service", fontSize: 12 } },
      { type: "rectangle", x: 480, y: 215, width: 130, height: 55,
        strokeColor: "#818cf8", backgroundColor: "#1e1b4b", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Order Service", fontSize: 12 } },
      { type: "rectangle", x: 480, y: 330, width: 130, height: 55,
        strokeColor: "#818cf8", backgroundColor: "#1e1b4b", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Pay Service", fontSize: 12 } },
      // Databases  (left-edge centers: 690,134 / 690,248)
      { type: "rectangle", x: 690, y: 110, width: 110, height: 48,
        strokeColor: "#22d3ee", backgroundColor: "#082f49", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Users DB", fontSize: 12 } },
      { type: "rectangle", x: 690, y: 224, width: 110, height: 48,
        strokeColor: "#22d3ee", backgroundColor: "#082f49", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Orders DB", fontSize: 12 } },
      // Arrows
      arr(160, 247,  240, 230),   // client → gateway
      arr(380, 230,  480, 127),   // gateway → svc-a
      arr(380, 230,  480, 242),   // gateway → svc-b
      arr(380, 230,  480, 357),   // gateway → svc-c
      arr(610, 127,  690, 134),   // svc-a → db-a
      arr(610, 242,  690, 248),   // svc-b → db-b
    ],
  },
  {
    id: "event-driven",
    label: "Event-Driven",
    elements: [
      // Producers  (right-edge centers: 180,157 / 180,277)
      { type: "rectangle", x: 60,  y: 130, width: 120, height: 55,
        strokeColor: "#818cf8", backgroundColor: "#1e1b4b", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Producer A", fontSize: 13 } },
      { type: "rectangle", x: 60,  y: 250, width: 120, height: 55,
        strokeColor: "#818cf8", backgroundColor: "#1e1b4b", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Producer B", fontSize: 13 } },
      // Broker  (left: 280,200  right: 430,200)
      { type: "rectangle", x: 280, y: 170, width: 150, height: 60,
        strokeColor: "#a78bfa", backgroundColor: "#2e1065", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Kafka / Broker", fontSize: 12 } },
      // Consumers  (left-edge centers: 540,117 / 540,222 / 540,327)
      { type: "rectangle", x: 540, y: 90,  width: 130, height: 55,
        strokeColor: "#4ade80", backgroundColor: "#052e16", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Consumer A", fontSize: 12 } },
      { type: "rectangle", x: 540, y: 195, width: 130, height: 55,
        strokeColor: "#4ade80", backgroundColor: "#052e16", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Consumer B", fontSize: 12 } },
      { type: "rectangle", x: 540, y: 300, width: 130, height: 55,
        strokeColor: "#4ade80", backgroundColor: "#052e16", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Consumer C", fontSize: 12 } },
      // Arrows
      arr(180, 157,  280, 200),   // prod-a → broker
      arr(180, 277,  280, 200),   // prod-b → broker
      arr(430, 200,  540, 117),   // broker → con-a
      arr(430, 200,  540, 222),   // broker → con-b
      arr(430, 200,  540, 327),   // broker → con-c
    ],
  },
  {
    id: "clean-arch",
    label: "Clean Architecture",
    elements: [
      // Outer ring: Frameworks & Drivers
      { type: "rectangle", x: 60,  y: 60,  width: 560, height: 380,
        strokeColor: "#22d3ee", backgroundColor: "#082f4920", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 } },
      { type: "text", x: 82, y: 82, text: "Frameworks & Drivers", fontSize: 13,
        strokeColor: "#22d3ee" },
      // Interface Adapters
      { type: "rectangle", x: 130, y: 120, width: 420, height: 265,
        strokeColor: "#818cf8", backgroundColor: "#1e1b4b30", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 } },
      { type: "text", x: 152, y: 138, text: "Interface Adapters", fontSize: 12,
        strokeColor: "#818cf8" },
      // Use Cases
      { type: "rectangle", x: 200, y: 175, width: 280, height: 165,
        strokeColor: "#a78bfa", backgroundColor: "#2e106530", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 } },
      { type: "text", x: 220, y: 192, text: "Use Cases", fontSize: 12,
        strokeColor: "#a78bfa" },
      // Entities (core)
      { type: "rectangle", x: 265, y: 225, width: 150, height: 80,
        strokeColor: "#4ade80", backgroundColor: "#052e16", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Entities", fontSize: 14 } },
    ],
  },
  {
    id: "api-gateway",
    label: "API Gateway",
    elements: [
      // Clients  (right-edge centers: 150,117 / 150,222)
      { type: "rectangle", x: 40,  y: 90,  width: 110, height: 55,
        strokeColor: "#fcd34d", backgroundColor: "#451a03", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Web App", fontSize: 13 } },
      { type: "rectangle", x: 40,  y: 195, width: 110, height: 55,
        strokeColor: "#fcd34d", backgroundColor: "#451a03", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Mobile App", fontSize: 12 } },
      // Gateway diamond  (left: 230,165  right: 400,165)
      { type: "diamond",   x: 230, y: 115, width: 170, height: 100,
        strokeColor: "#4ade80", backgroundColor: "#052e16", fillStyle: "solid", strokeWidth: 2, roughness: 0,
        label: { text: "API Gateway", fontSize: 13 } },
      // Auth + Rate-limit annotations
      { type: "rectangle", x: 235, y: 268, width: 110, height: 44,
        strokeColor: "#f472b6", backgroundColor: "#500724", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        strokeStyle: "dashed", label: { text: "Auth", fontSize: 12 } },
      { type: "rectangle", x: 385, y: 10,  width: 110, height: 44,
        strokeColor: "#fb923c", backgroundColor: "#431407", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        strokeStyle: "dashed", label: { text: "Rate Limiter", fontSize: 11 } },
      // Backend services  (left-edge centers: 510,107 / 510,207 / 510,307)
      { type: "rectangle", x: 510, y: 80,  width: 120, height: 55,
        strokeColor: "#818cf8", backgroundColor: "#1e1b4b", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Users API", fontSize: 13 } },
      { type: "rectangle", x: 510, y: 180, width: 120, height: 55,
        strokeColor: "#818cf8", backgroundColor: "#1e1b4b", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Orders API", fontSize: 13 } },
      { type: "rectangle", x: 510, y: 280, width: 120, height: 55,
        strokeColor: "#818cf8", backgroundColor: "#1e1b4b", fillStyle: "solid", strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: "Products API", fontSize: 12 } },
      // Arrows
      arr(150, 117,  230, 165),   // web → gateway
      arr(150, 222,  230, 165),   // mobile → gateway
      arr(400, 165,  510, 107),   // gateway → users-api
      arr(400, 165,  510, 207),   // gateway → orders-api
      arr(400, 165,  510, 307),   // gateway → products-api
    ],
  },
];

// ─── Multi-canvas storage ─────────────────────────────────────────────────────

const LS_CANVASES_KEY = "arch-design-canvases-v1";
const LS_DRAFT_KEY = "arch-design-draft-v1";
const MAX_CANVASES = 20;

function listCanvases(): SavedCanvas[] {
  try {
    const raw = localStorage.getItem(LS_CANVASES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistCanvases(list: SavedCanvas[]): void {
  try {
    localStorage.setItem(LS_CANVASES_KEY, JSON.stringify(list));
  } catch {}
}

function saveCanvas(id: string | null, name: string, data: string): SavedCanvas[] {
  const list = listCanvases();
  const now = Date.now();
  const newId = id ?? crypto.randomUUID();
  const idx = list.findIndex((c) => c.id === newId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], name, updatedAt: now, data };
  } else {
    list.unshift({ id: newId, name, updatedAt: now, data });
  }
  const sorted = list.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CANVASES);
  persistCanvases(sorted);
  return sorted;
}

function deleteCanvas(id: string): SavedCanvas[] {
  const list = listCanvases().filter((c) => c.id !== id);
  persistCanvases(list);
  return list;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadDraft(): any {
  try {
    const draft = localStorage.getItem(LS_DRAFT_KEY);
    if (draft) return JSON.parse(draft);
    // Migrate from the previous single-canvas key
    const legacy = localStorage.getItem("arch-design-canvas-v1");
    if (legacy) {
      localStorage.setItem(LS_DRAFT_KEY, legacy);
      localStorage.removeItem("arch-design-canvas-v1");
      return JSON.parse(legacy);
    }
    return null;
  } catch { return null; }
}

function formatAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CanvasClient() {
  const apiRef = useRef<API>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"shapes" | "saved">("shapes");
  const [savedCanvases, setSavedCanvases] = useState<SavedCanvas[]>(() => listCanvases());
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);

  // Save-name inline input state
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState("");

  const initialData = useMemo(() => loadDraft(), []);

  // Auto-save draft to localStorage on every change (debounced 400ms)
  const handleChange = useCallback(
    (elements: readonly unknown[], appState: unknown) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          const json = serializeAsJSON(
            elements as Parameters<typeof serializeAsJSON>[0],
            appState as Parameters<typeof serializeAsJSON>[1],
            {},
            "local"
          );
          localStorage.setItem(LS_DRAFT_KEY, json);
        } catch {}
      }, 400);
    },
    []
  );

  // Add a shape to the center of the current viewport
  const addShape = useCallback((shape: ShapeConfig) => {
    const api = apiRef.current;
    if (!api) return;
    const appState = api.getAppState();
    const { x, y } = viewportCoordsToSceneCoords(
      { clientX: (appState.width ?? 800) / 2, clientY: (appState.height ?? 600) / 2 },
      appState
    );
    const els = convertToExcalidrawElements(
      [{ ...shape.skeleton, x: x - shape.width / 2, y: y - shape.height / 2 } as Skeleton],
      { regenerateIds: true }
    );
    api.updateScene({ elements: [...api.getSceneElements(), ...els] });
    api.scrollToContent(els, { animate: false, fitToContent: false });
  }, []);

  // Load a template (replaces current canvas)
  const loadTemplate = useCallback((templateId: string) => {
    const api = apiRef.current;
    if (!api) return;
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const els = convertToExcalidrawElements(template.elements as Skeleton[], { regenerateIds: false });
    api.updateScene({ elements: els });
    setTimeout(() => api.scrollToContent(els, { animate: true, fitToContent: true }), 50);
    setActiveTemplate(templateId);
    setActiveCanvasId(null);
  }, []);

  // Load a named saved canvas
  const loadSavedCanvas = useCallback((canvas: SavedCanvas) => {
    const api = apiRef.current;
    if (!api) return;
    try {
      const parsed = JSON.parse(canvas.data);
      api.updateScene({ elements: parsed.elements ?? [] });
      setActiveCanvasId(canvas.id);
      setActiveTemplate(null);
    } catch {}
  }, []);

  // Core save — shared between the input form and the keyboard shortcut
  const doSave = useCallback((id: string | null, name: string) => {
    const api = apiRef.current;
    if (!api || !name) return;
    const data = serializeAsJSON(
      api.getSceneElements() as Parameters<typeof serializeAsJSON>[0],
      api.getAppState() as Parameters<typeof serializeAsJSON>[1],
      {},
      "local"
    );
    const updated = saveCanvas(id, name, data);
    setSavedCanvases(updated);
    if (!id) setActiveCanvasId(updated[0].id);
  }, []);

  const commitSave = useCallback(() => {
    const trimmed = saveName.trim();
    if (!trimmed) return;
    doSave(activeCanvasId, trimmed);
    setShowSaveInput(false);
    setSaveName("");
  }, [activeCanvasId, doSave, saveName]);

  const cancelSave = useCallback(() => {
    setShowSaveInput(false);
    setSaveName("");
  }, []);

  // Save button — silent update if already named, prompt only for new canvases
  const handleSaveClick = useCallback(() => {
    if (activeCanvasId) {
      const current = savedCanvases.find((c) => c.id === activeCanvasId);
      if (current) { doSave(activeCanvasId, current.name); return; }
    }
    setSaveName("");
    setShowSaveInput(true);
  }, [activeCanvasId, doSave, savedCanvases]);

  // Cmd+S / Ctrl+S — save silently if named, open input if new
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (activeCanvasId) {
          const current = listCanvases().find((c) => c.id === activeCanvasId);
          if (current) { doSave(activeCanvasId, current.name); return; }
        }
        // No existing name — open the input
        setSaveName("");
        setShowSaveInput(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeCanvasId, doSave]);

  // Delete a named canvas
  const handleDeleteCanvas = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const updated = deleteCanvas(id);
      setSavedCanvases(updated);
      if (activeCanvasId === id) setActiveCanvasId(null);
    },
    [activeCanvasId]
  );

  // Export PNG
  const exportPNG = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    const blob = await exportToBlob({
      elements: api.getSceneElements(),
      appState: { ...api.getAppState(), exportBackground: true },
      files: null,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "architecture.png";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Export JSON (.excalidraw)
  const exportJSON = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const json = serializeAsJSON(api.getSceneElements(), api.getAppState(), {}, "local");
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "architecture.excalidraw";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // New blank canvas — resets state without touching the saved list
  const newCanvas = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    api.updateScene({ elements: [] });
    setActiveTemplate(null);
    setActiveCanvasId(null);
    setShowSaveInput(false);
    setSaveName("");
    localStorage.removeItem(LS_DRAFT_KEY);
    setSidebarTab("shapes");
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    api.updateScene({ elements: [] });
    setActiveTemplate(null);
    setActiveCanvasId(null);
    localStorage.removeItem(LS_DRAFT_KEY);
  }, []);

  const atLimit = savedCanvases.length >= MAX_CANVASES;

  return (
    <div
      style={{ height: "calc(100dvh - 56px)" }}
      className="flex overflow-hidden bg-zinc-950"
    >
      {/* ── Sidebar ── */}
      <aside className="w-44 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden">

        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-zinc-800">
          <button
            onClick={() => setSidebarTab("shapes")}
            className={`flex-1 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
              sidebarTab === "shapes"
                ? "text-zinc-200 border-b-2 border-violet-500"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            Shapes
          </button>
          <button
            onClick={() => setSidebarTab("saved")}
            className={`flex-1 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
              sidebarTab === "saved"
                ? "text-zinc-200 border-b-2 border-violet-500"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            Saved{savedCanvases.length > 0 && ` (${savedCanvases.length})`}
          </button>
        </div>

        {sidebarTab === "shapes" ? (
          <>
            <div className="flex flex-col gap-0.5 p-1.5 overflow-y-auto flex-1">
              {SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => addShape(shape)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs hover:bg-zinc-800 transition-colors group"
                >
                  <span
                    className="text-sm font-mono w-5 text-center shrink-0 opacity-80"
                    style={{ color: shape.color }}
                  >
                    {shape.icon}
                  </span>
                  <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors leading-tight">
                    {shape.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="px-3 py-3 border-t border-zinc-800 shrink-0">
              <p className="text-[9px] text-zinc-700 leading-relaxed">
                Click a shape to place it at the center of the canvas.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* localStorage notice */}
            <div className="px-3 py-2.5 border-b border-zinc-800 bg-zinc-900/40 shrink-0">
              <p className="text-[9px] text-zinc-500 leading-relaxed">
                Saved in browser localStorage — data stays on this device only and may be cleared by the browser.
              </p>
            </div>

            {/* Canvas list */}
            <div className="flex-1 overflow-y-auto">
              {savedCanvases.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-[10px] text-zinc-600">No saved canvases yet.</p>
                  <p className="text-[9px] text-zinc-700 mt-1">Use the Save button to store your work.</p>
                </div>
              ) : (
                savedCanvases.map((canvas) => (
                  <button
                    key={canvas.id}
                    onClick={() => loadSavedCanvas(canvas)}
                    className={`group w-full flex items-start gap-1.5 px-3 py-2.5 border-b border-zinc-900 text-left hover:bg-zinc-900/60 transition-colors ${
                      activeCanvasId === canvas.id ? "bg-zinc-900" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs truncate leading-snug ${
                          activeCanvasId === canvas.id ? "text-violet-300" : "text-zinc-300"
                        }`}
                      >
                        {canvas.name}
                      </p>
                      <p className="text-[9px] text-zinc-600 mt-0.5">{formatAge(canvas.updatedAt)}</p>
                    </div>
                    <span
                      role="button"
                      onClick={(e) => handleDeleteCanvas(e, canvas.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-colors text-xs pt-0.5 shrink-0 select-none"
                      title="Delete"
                    >
                      ✕
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Limit notice */}
            <div className="px-3 py-2 border-t border-zinc-800 shrink-0">
              <p className={`text-[9px] leading-relaxed ${atLimit ? "text-amber-600/80" : "text-zinc-700"}`}>
                {atLimit
                  ? "Limit reached (20/20). Saving a new canvas will drop the oldest."
                  : `${savedCanvases.length} / ${MAX_CANVASES} canvases stored.`}
              </p>
            </div>
          </>
        )}
      </aside>

      {/* ── Canvas area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="h-10 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center gap-2 px-3 overflow-x-auto">
          <button
            onClick={newCanvas}
            className="px-2.5 py-1 rounded-lg text-xs border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors shrink-0"
          >
            + New
          </button>
          <span className="text-zinc-800 shrink-0">|</span>
          <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest shrink-0">
            Templates:
          </span>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => loadTemplate(t.id)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-colors shrink-0 ${
                activeTemplate === t.id
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {/* Save flow */}
            {showSaveInput ? (
              <>
                <input
                  autoFocus
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitSave();
                    if (e.key === "Escape") cancelSave();
                  }}
                  placeholder="Canvas name…"
                  className="px-2 py-1 rounded-lg text-xs border border-violet-700 bg-zinc-900 text-zinc-200 placeholder:text-zinc-600 focus:outline-none w-32"
                />
                <button
                  onClick={commitSave}
                  disabled={!saveName.trim()}
                  className="px-2.5 py-1 rounded-lg text-xs border border-violet-600 bg-violet-700/30 text-violet-300 hover:bg-violet-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={cancelSave}
                  className="px-1.5 py-1 text-zinc-600 hover:text-zinc-400 transition-colors text-xs"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                onClick={handleSaveClick}
                title="Save canvas (⌘S)"
                className="px-2.5 py-1 rounded-lg text-xs border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-violet-700 hover:text-violet-400 transition-colors"
              >
                Save
              </button>
            )}

            <button
              onClick={exportPNG}
              className="px-2.5 py-1 rounded-lg text-xs border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
            >
              ↓ PNG
            </button>
            <button
              onClick={exportJSON}
              className="px-2.5 py-1 rounded-lg text-xs border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
            >
              ↓ JSON
            </button>
            <button
              onClick={clearCanvas}
              className="px-2.5 py-1 rounded-lg text-xs border border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-red-800/60 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Excalidraw canvas */}
        <div className="flex-1 relative">
          <Excalidraw
            excalidrawAPI={(api: API) => { apiRef.current = api; }}
            theme="dark"
            initialData={initialData}
            onChange={handleChange}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: false,
                toggleTheme: false,
              },
            }}
          />
        </div>

      </div>
    </div>
  );
}
