"use client";

import type { ReactNode } from "react";
import { HUE_CLASS, type HueName } from "./tokens";
import type { LogEntry } from "./hooks";

// ─── Frame ────────────────────────────────────────────────────────────────────

/**
 * Outer shell every visualization sits in. Owns the vertical rhythm so the 15
 * visualizations stop each inventing their own gaps.
 */
export function VizFrame({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

/**
 * The diagram ground. Gets a subtle grid and a top-down sheen so nodes read as
 * sitting *on* a surface rather than floating in flat black.
 *
 * `aspect` reserves height before the SVG paints, which stops the layout shift
 * the old fixed-height/overflow containers caused.
 */
export function VizStage({
  children,
  className = "",
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-zinc-800/80 ${
        pad ? "p-4 sm:p-5" : ""
      } ${className}`}
      style={{
        background:
          "radial-gradient(120% 100% at 50% 0%, #131316 0%, #0a0a0b 55%, #08080a 100%)",
      }}
    >
      {/* Structural grid — anchors the diagram without competing with it */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff08 1px, transparent 1px), linear-gradient(to bottom, #ffffff08 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(115% 90% at 50% 0%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(115% 90% at 50% 0%, #000 40%, transparent 100%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** One-line hint above the stage. Never duplicate this elsewhere in a viz. */
export function VizHint({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-zinc-500 leading-relaxed">
      {children}
    </p>
  );
}

// ─── Controls ─────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "ghost";

const BUTTON_STYLE: Record<ButtonVariant, string> = {
  primary:
    "bg-violet-600 text-white border-violet-500 hover:bg-violet-500 hover:border-violet-400 shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_4px_16px_-6px_rgba(139,92,246,0.5)]",
  secondary:
    "bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white",
  success:
    "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20 hover:border-emerald-400/60 hover:text-emerald-200",
  danger:
    "bg-red-500/10 text-red-300 border-red-500/40 hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-200",
  ghost:
    "bg-transparent text-zinc-500 border-transparent hover:text-zinc-200 hover:bg-zinc-800/60",
};

export function VizButton({
  children,
  onClick,
  variant = "secondary",
  active = false,
  disabled = false,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  /** Renders as a pressed toggle — use for the play/pause control */
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active || undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium
        transition-all duration-150 select-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
        disabled:opacity-40 disabled:pointer-events-none
        ${BUTTON_STYLE[variant]}`}
    >
      {children}
    </button>
  );
}

/** Control bar. Anything passed after a `<VizSpacer/>` is pushed to the right. */
export function VizControls({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  );
}

export function VizSpacer() {
  return <div className="flex-1 min-w-0" />;
}

// ─── Status banner ────────────────────────────────────────────────────────────

/**
 * The "what is happening right now" line. Several visualizations had a variant
 * of this; they now share one so the eye learns where to look.
 */
export function VizStatus({
  hue,
  label,
  children,
  pulse = false,
  aside,
}: {
  hue: HueName;
  label: string;
  children?: ReactNode;
  pulse?: boolean;
  aside?: ReactNode;
}) {
  const c = HUE_CLASS[hue];
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${c.border} ${c.bg}`}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {pulse && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${c.dot}`} />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${c.dot}`} />
      </span>
      <p className="text-sm min-w-0">
        <span className={`font-mono font-bold ${c.text}`}>{label}</span>
        {children && <span className="text-zinc-400"> {children}</span>}
      </p>
      {aside && <div className="ml-auto shrink-0">{aside}</div>}
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface VizStatSpec {
  label: string;
  value: ReactNode;
  hue?: HueName;
  /** Renders a threshold meter under the value: [current, limit] */
  meter?: [number, number];
  /** Small trailing note, e.g. a unit or a target */
  note?: string;
}

/**
 * Consistent metric tile. `meter` replaces the old "failures (/3)" convention —
 * progress toward a threshold is a bar, not a parenthetical.
 */
export function VizStats({ items }: { items: VizStatSpec[] }) {
  return (
    <div
      className="grid gap-2.5"
      style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}
    >
      {items.map((s) => {
        const c = HUE_CLASS[s.hue ?? "neutral"];
        const pct = s.meter ? Math.min(100, (s.meter[0] / Math.max(s.meter[1], 1)) * 100) : 0;
        return (
          <div
            key={s.label}
            className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5 flex flex-col gap-1.5"
          >
            <div className={`font-mono font-bold leading-none tabular-nums text-xl ${c.text}`}>
              {s.value}
            </div>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[11px] text-zinc-500 truncate">{s.label}</span>
              {s.note && <span className="text-[10px] font-mono text-zinc-600 shrink-0">{s.note}</span>}
            </div>
            {s.meter && (
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${c.dot}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

export function VizLegend({
  items,
}: {
  items: Array<{ hue: HueName; label: string; dashed?: boolean }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((i) => {
        const c = HUE_CLASS[i.hue];
        return (
          <span key={i.label} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
            {i.dashed ? (
              <span className={`h-0 w-4 border-t-2 border-dashed ${c.border.replace("/40", "")}`} />
            ) : (
              <span className={`h-2 w-2 rounded-full ${c.dot}`} />
            )}
            {i.label}
          </span>
        );
      })}
    </div>
  );
}

// ─── Event log ────────────────────────────────────────────────────────────────

const LOG_HUE: Record<LogEntry["hue"], string> = {
  neutral: "text-zinc-400",
  primary: "text-violet-300",
  success: "text-emerald-300",
  danger: "text-red-300",
  warning: "text-amber-300",
  info: "text-blue-300",
};

/**
 * Fixed-height event log. Height is reserved from first paint so the stage does
 * not jump when the first entry lands, and the fade uses inline opacity rather
 * than the interpolated Tailwind classes that silently did nothing before.
 */
export function VizLog({ entries, rows = 4 }: { entries: LogEntry[]; rows?: number }) {
  return (
    <div
      className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 px-3 py-2 font-mono text-[11px] flex flex-col gap-1 justify-start overflow-hidden"
      style={{ height: rows * 18 + 16 }}
    >
      {entries.length === 0 && (
        <span className="text-zinc-700 italic">waiting for events…</span>
      )}
      {entries.slice(0, rows).map((e, i) => (
        <div
          key={e.id}
          className={`${LOG_HUE[e.hue]} leading-[18px] truncate transition-opacity duration-300`}
          style={{ opacity: 1 - i * 0.22 }}
        >
          {e.text}
        </div>
      ))}
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

/**
 * Side/below panel for "you clicked a thing" detail. Renders an empty prompt
 * state instead of unmounting, so clicking around does not shift the page.
 */
export function VizDetail({
  title,
  hue = "primary",
  onClose,
  children,
  empty,
}: {
  title?: string;
  hue?: HueName;
  onClose?: () => void;
  children?: ReactNode;
  /** Shown when nothing is selected */
  empty?: ReactNode;
}) {
  const c = HUE_CLASS[hue];

  if (!title) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-xs text-zinc-600">
        {empty ?? "Select an element to inspect it."}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} px-4 py-3 flex flex-col gap-2.5`}>
      <div className="flex items-center justify-between gap-3">
        <h4 className={`font-semibold text-sm ${c.text}`}>{title}</h4>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="text-zinc-500 hover:text-zinc-200 text-xs rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70"
          >
            ✕
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/** Small labelled row used inside `VizDetail`. */
export function VizField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">{label}</span>
      <div className="text-[13px] text-zinc-300">{children}</div>
    </div>
  );
}

/** Monospace chip, for identifiers and payloads. */
export function VizChip({ children, hue = "neutral" }: { children: ReactNode; hue?: HueName }) {
  const c = HUE_CLASS[hue];
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[11px] ${c.border} ${c.bg} ${c.text}`}>
      {children}
    </span>
  );
}
