"use client";

import type { ReactNode } from "react";
import { HUE, STROKE, TYPE, FONT_MONO, FONT_SANS, type HueName } from "./tokens";

// ─── Canvas ───────────────────────────────────────────────────────────────────

/**
 * Responsive SVG canvas.
 *
 * Two problems this solves:
 *
 *  1. The pre-1.1 visualizations hardcoded `width="600"` inside a ~540px
 *     container, so diagrams were clipped or crammed left with dead space.
 *  2. Scaling a viewBox to fit any container scales the *text* too — a 780-unit
 *     diagram in a 259px mobile column renders an 11px label at 3.7px. So the
 *     canvas refuses to shrink past `minWidth` and the stage scrolls instead.
 *     `minWidth` defaults to the width that keeps `TYPE.micro` at ~9.5px.
 */
export function VizSvg({
  w,
  h,
  children,
  label,
  className = "",
  minWidth,
}: {
  /** viewBox width — the design-space width, not pixels */
  w: number;
  /** viewBox height */
  h: number;
  children: ReactNode;
  /** Accessible description of what the diagram shows */
  label: string;
  className?: string;
  /** Narrowest rendered width before the container scrolls. */
  minWidth?: number;
}) {
  const floor = minWidth ?? Math.round(w * (9.5 / TYPE.micro));

  return (
    <div className="overflow-x-auto overflow-y-hidden -mx-1 px-1">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
        className={`w-full h-auto block ${className}`}
        style={{ minWidth: floor, maxHeight: h * 1.15 }}
      >
        <VizDefs />
        {children}
      </svg>
    </div>
  );
}

/** Shared markers, gradients, and filters. Ids are namespaced with `viz-`. */
export function VizDefs() {
  return (
    <defs>
      {(Object.keys(HUE) as HueName[]).map((name) => (
        <marker
          key={name}
          id={`viz-arrow-${name}`}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L7,3 L0,6 Z" fill={HUE[name].line} />
        </marker>
      ))}

      {/* Soft glow for active nodes and packets */}
      <filter id="viz-glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="3.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="viz-glow-strong" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Top-lit node fill, so boxes read as raised surfaces */}
      <linearGradient id="viz-node" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#26262b" />
        <stop offset="100%" stopColor="#17171a" />
      </linearGradient>

      <linearGradient id="viz-node-active" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2e2a45" />
        <stop offset="100%" stopColor="#1c1930" />
      </linearGradient>
    </defs>
  );
}

// ─── Text ─────────────────────────────────────────────────────────────────────

/**
 * SVG label with the type floor enforced. Passing a size below `TYPE.micro`
 * is clamped rather than honoured — that floor is the whole point.
 */
export function VizText({
  x,
  y,
  children,
  size = TYPE.small,
  hue,
  fill,
  weight,
  anchor = "middle",
  mono = false,
  opacity,
  className,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  hue?: HueName;
  fill?: string;
  weight?: number | string;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  opacity?: number;
  className?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={fill ?? (hue ? HUE[hue].text : HUE.neutral.text)}
      fontSize={Math.max(size, TYPE.micro)}
      fontWeight={weight}
      fontFamily={mono ? FONT_MONO : FONT_SANS}
      opacity={opacity}
      className={className}
      style={{ pointerEvents: "none" }}
      dominantBaseline="middle"
    >
      {children}
    </text>
  );
}

// ─── Node ─────────────────────────────────────────────────────────────────────

/**
 * Standard box node: title, optional sublabel and footnote, hover/active/dimmed
 * states, and keyboard focus when interactive.
 */
export function VizNode({
  x,
  y,
  w,
  h,
  title,
  sublabel,
  footnote,
  hue = "neutral",
  active = false,
  dimmed = false,
  onClick,
  ariaLabel,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sublabel?: string;
  footnote?: string;
  hue?: HueName;
  active?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const c = HUE[hue];
  const interactive = Boolean(onClick);
  const cx = x + w / 2;

  // Vertically centre whatever combination of lines is present
  const lines = 1 + (sublabel ? 1 : 0) + (footnote ? 1 : 0);
  const step = 15;
  const top = y + h / 2 - ((lines - 1) * step) / 2;

  return (
    <g
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? ariaLabel ?? title : undefined}
      aria-pressed={interactive ? active : undefined}
      opacity={dimmed ? 0.3 : 1}
      style={{
        cursor: interactive ? "pointer" : undefined,
        transition: "opacity 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        outline: "none",
      }}
      className={interactive ? "viz-node-interactive" : undefined}
    >
      {active && (
        <rect
          x={x - 3}
          y={y - 3}
          width={w + 6}
          height={h + 6}
          rx={13}
          fill="none"
          stroke={c.line}
          strokeWidth={STROKE.hairline}
          opacity={0.35}
        />
      )}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={active ? "url(#viz-node-active)" : "url(#viz-node)"}
        stroke={active ? c.line : c.base}
        strokeWidth={active ? STROKE.base : STROKE.thin}
        strokeOpacity={active ? 1 : 0.75}
      />
      <VizText x={cx} y={top} size={TYPE.body} weight={600} fill={HUE.neutral.strong}>
        {title}
      </VizText>
      {sublabel && (
        <VizText x={cx} y={top + step} size={TYPE.micro} fill={HUE.neutral.text}>
          {sublabel}
        </VizText>
      )}
      {footnote && (
        <VizText
          x={cx}
          y={top + step * (sublabel ? 2 : 1)}
          size={TYPE.micro}
          hue={hue}
          mono
        >
          {footnote}
        </VizText>
      )}
    </g>
  );
}

// ─── Edge ─────────────────────────────────────────────────────────────────────

/**
 * Quadratic control point for a bowed edge. Shared by `VizEdge` and
 * `pointOnEdge` so a packet always travels along the line that is drawn — the
 * two must not compute the curve independently.
 */
export function edgeControl(
  from: [number, number],
  to: [number, number],
  curve: number
): [number, number] {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  if (curve === 0) return [mx, my];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  return [mx + (-dy / len) * curve, my + (dx / len) * curve];
}

/** Position at `t` (0→1) along an edge, following its bow if it has one. */
export function pointOnEdge(
  from: [number, number],
  to: [number, number],
  curve: number,
  t: number
): [number, number] {
  if (curve === 0) return lerp(from, to, t);
  const [qx, qy] = edgeControl(from, to, curve);
  const u = 1 - t;
  // Quadratic Bézier B(t) = u²·P0 + 2ut·Q + t²·P1
  return [
    u * u * from[0] + 2 * u * t * qx + t * t * to[0],
    u * u * from[1] + 2 * u * t * qy + t * t * to[1],
  ];
}

/**
 * Connector between two points. Defaults to a visible weight — the old set drew
 * these at 0.2–0.35 opacity, which vanished against the stage.
 */
export function VizEdge({
  from,
  to,
  hue = "neutral",
  dashed = false,
  arrow = false,
  active = false,
  dimmed = false,
  curve = 0,
  label,
}: {
  from: [number, number];
  to: [number, number];
  hue?: HueName;
  dashed?: boolean;
  arrow?: boolean;
  active?: boolean;
  dimmed?: boolean;
  /** Perpendicular bow, in design units. 0 = straight line. */
  curve?: number;
  label?: string;
}) {
  const c = HUE[hue];
  const [x1, y1] = from;
  const [x2, y2] = to;

  const [qx, qy] = edgeControl(from, to, curve);
  const d = curve === 0
    ? `M ${x1} ${y1} L ${x2} ${y2}`
    : `M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}`;
  // Label sits at the curve's actual midpoint, not the chord's
  const [mx, my] = pointOnEdge(from, to, curve, 0.5);

  return (
    <g
      opacity={dimmed ? 0.22 : 1}
      style={{ transition: "opacity 220ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <path
        d={d}
        fill="none"
        stroke={c.line}
        strokeWidth={active ? STROKE.base : STROKE.thin}
        strokeOpacity={active ? STROKE.full : STROKE.normal}
        strokeDasharray={dashed ? "5 4" : undefined}
        strokeLinecap="round"
        markerEnd={arrow ? `url(#viz-arrow-${hue})` : undefined}
      />
      {label && (
        <>
          <rect
            x={mx - label.length * 3.1 - 4}
            y={my - 8}
            width={label.length * 6.2 + 8}
            height={16}
            rx={4}
            fill="#0a0a0b"
            opacity={0.85}
          />
          <VizText x={mx} y={my} size={TYPE.micro} hue={hue} mono>
            {label}
          </VizText>
        </>
      )}
    </g>
  );
}

// ─── Packet ───────────────────────────────────────────────────────────────────

/** A travelling dot, optionally labelled. Used for every traffic animation. */
export function VizPacket({
  x,
  y,
  hue = "primary",
  r = 5,
  label,
  opacity = 1,
}: {
  x: number;
  y: number;
  hue?: HueName;
  r?: number;
  label?: string;
  opacity?: number;
}) {
  const c = HUE[hue];
  return (
    <g opacity={opacity} style={{ pointerEvents: "none" }}>
      <circle cx={x} cy={y} r={r} fill={c.line} filter="url(#viz-glow)" />
      {label && (
        <VizText x={x + r + 5} y={y} size={TYPE.micro} hue={hue} mono anchor="start">
          {label}
        </VizText>
      )}
    </g>
  );
}

/** Interpolate along a straight edge. */
export function lerp(from: [number, number], to: [number, number], t: number): [number, number] {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}
