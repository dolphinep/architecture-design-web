/**
 * Design tokens for interactive visualizations.
 *
 * Two rules that the pre-1.1 visualizations broke constantly:
 *
 *  1. SVG text never goes below `TYPE.micro` (11px). Sub-10px labels were the single
 *     largest legibility problem — `fontSize="8"` appeared 34 times across the set.
 *  2. Structural strokes never go below `STROKE.faint` opacity. Connectors drawn at
 *     0.2–0.35 opacity read as empty space on a zinc-950 ground.
 */

/**
 * Semantic roles, not raw colours — so a diagram's meaning survives a palette
 * change. Every hue carries the same keys, so `HUE[name].glow` is always safe.
 */
export const HUE = {
  /** Default structure: nodes, neutral edges */
  neutral: { base: "#3f3f46", line: "#52525b", text: "#a1a1aa", strong: "#e4e4e7", glow: "#71717a" },
  /** The primary actor / happy path */
  primary: { strong: "#ddd6fe", base: "#7c3aed", line: "#a78bfa", text: "#c4b5fd", glow: "#8b5cf6" },
  /** Success, cache hit, healthy */
  success: { strong: "#a7f3d0", base: "#059669", line: "#34d399", text: "#6ee7b7", glow: "#10b981" },
  /** Failure, blocked, unhealthy */
  danger: { strong: "#fecaca", base: "#dc2626", line: "#f87171", text: "#fca5a5", glow: "#ef4444" },
  /** Degraded, probing, warming */
  warning: { strong: "#fde68a", base: "#d97706", line: "#fbbf24", text: "#fcd34d", glow: "#f59e0b" },
  /** Secondary data path, async, internal */
  info: { strong: "#bfdbfe", base: "#2563eb", line: "#60a5fa", text: "#93c5fd", glow: "#3b82f6" },
} as const;

export type HueName = keyof typeof HUE;

/** Surfaces, darkest to lightest. `stage` is the diagram ground. */
export const SURFACE = {
  stage: "#0a0a0b",
  raised: "#18181b",
  raisedActive: "#211f2e",
  border: "#27272a",
  borderStrong: "#3f3f46",
} as const;

/**
 * SVG type scale. Minimum is 11px — anything smaller is unreadable at 1× on a
 * laptop, which is where most of this is viewed.
 */
export const TYPE = {
  /** Smallest permitted: dense annotations, packet labels */
  micro: 11,
  /** Secondary node text, sublabels */
  small: 12,
  /** Node titles */
  body: 13,
  /** Section labels inside the stage */
  title: 15,
  /** Hero numbers */
  display: 22,
} as const;

/** Stroke weights and the minimum opacities that stay visible on `SURFACE.stage`. */
export const STROKE = {
  hairline: 1,
  thin: 1.5,
  base: 2,
  thick: 3,
  /** Dimmed-but-present structure. Never go below this for a real connector. */
  faint: 0.55,
  /** Normal structural line */
  normal: 0.8,
  /** Active / highlighted */
  full: 1,
} as const;

/** Animation timings, in ms. Keep motion under ~600ms so repeated loops don't drag. */
export const MOTION = {
  instant: 120,
  quick: 220,
  base: 350,
  slow: 600,
  /** Default interval for auto-simulation ticks */
  tick: 1100,
  /** Packet flight time across a full stage width */
  flight: 1400,
} as const;

export const EASE = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

/** Monospace stack matching the app shell (Geist Mono via CSS var). */
export const FONT_MONO = "var(--font-geist-mono), ui-monospace, monospace";
export const FONT_SANS = "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif";

/** Tailwind class fragments for the accent used by chrome components. */
export const HUE_CLASS: Record<HueName, { text: string; border: string; bg: string; dot: string }> = {
  neutral: { text: "text-zinc-300",    border: "border-zinc-700",       bg: "bg-zinc-900/60",     dot: "bg-zinc-400" },
  primary: { text: "text-violet-300",  border: "border-violet-500/40",  bg: "bg-violet-500/10",   dot: "bg-violet-400" },
  success: { text: "text-emerald-300", border: "border-emerald-500/40", bg: "bg-emerald-500/10",  dot: "bg-emerald-400" },
  danger:  { text: "text-red-300",     border: "border-red-500/40",     bg: "bg-red-500/10",      dot: "bg-red-400" },
  warning: { text: "text-amber-300",   border: "border-amber-500/40",   bg: "bg-amber-500/10",    dot: "bg-amber-400" },
  info:    { text: "text-blue-300",    border: "border-blue-500/40",    bg: "bg-blue-500/10",     dot: "bg-blue-400" },
};
