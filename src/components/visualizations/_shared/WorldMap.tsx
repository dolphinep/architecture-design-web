"use client";

import { TYPE } from "./tokens";
import { VizText } from "./VizSvg";

/**
 * Minimal equirectangular world backdrop for geographic visualizations (CDN
 * PoPs, multi-region, anycast routing).
 *
 * The outlines are deliberately coarse — they exist to say "this is the world"
 * so distance and latency read as physical, not to be cartography. They render
 * at low opacity as context behind the actual diagram.
 */

/** Longitude/latitude → design-space x/y for a given canvas size. */
export function geo(lon: number, lat: number, w: number, h: number): [number, number] {
  return [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
}

// Coarse continental outlines as [lon, lat] rings.
const LANDMASSES: Array<Array<[number, number]>> = [
  // North America
  [[-168, 65], [-140, 70], [-95, 72], [-60, 60], [-55, 47], [-70, 42], [-80, 25],
   [-97, 18], [-105, 23], [-115, 32], [-125, 40], [-130, 55], [-150, 60]],
  // South America
  [[-80, 10], [-60, 12], [-35, -5], [-38, -23], [-55, -35], [-70, -55], [-75, -45],
   [-72, -20], [-80, -5]],
  // Europe
  [[-10, 36], [0, 44], [12, 38], [20, 40], [30, 45], [40, 48], [30, 60], [25, 70],
   [5, 60], [-5, 50]],
  // Africa
  [[-17, 15], [0, 15], [20, 32], [35, 30], [43, 12], [50, -15], [35, -25], [20, -35],
   [12, -20], [8, 5], [-10, 5]],
  // Asia
  [[30, 45], [60, 50], [90, 50], [120, 45], [140, 45], [135, 35], [120, 22], [100, 10],
   [95, 20], [78, 8], [70, 25], [50, 25], [45, 38]],
  // Australia
  [[113, -22], [130, -12], [142, -11], [150, -25], [145, -38], [130, -32], [115, -34]],
];

export function WorldMap({
  w,
  h,
  /** Draw the lat/long graticule */
  grid = true,
}: {
  w: number;
  h: number;
  grid?: boolean;
}) {
  return (
    <g aria-hidden style={{ pointerEvents: "none" }}>
      {grid && (
        <g stroke="#ffffff" strokeOpacity={0.05} strokeWidth={1}>
          {/* Meridians every 30° */}
          {Array.from({ length: 11 }, (_, i) => {
            const x = ((i + 1) / 12) * w;
            return <line key={`m${i}`} x1={x} y1={0} x2={x} y2={h} />;
          })}
          {/* Parallels every 30° */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = ((i + 1) / 6) * h;
            return <line key={`p${i}`} x1={0} y1={y} x2={w} y2={y} />;
          })}
        </g>
      )}

      {/* Equator, called out so the projection reads as a map */}
      <line
        x1={0} y1={h / 2} x2={w} y2={h / 2}
        stroke="#a78bfa" strokeOpacity={0.14} strokeWidth={1} strokeDasharray="6 6"
      />

      {LANDMASSES.map((ring, i) => (
        <path
          key={i}
          d={
            ring
              .map(([lon, lat], j) => {
                const [x, y] = geo(lon, lat, w, h);
                return `${j === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(" ") + " Z"
          }
          fill="#ffffff"
          fillOpacity={0.045}
          stroke="#ffffff"
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

/** Small caption placing the viewer, e.g. "equirectangular projection". */
export function WorldMapCaption({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <VizText x={x} y={y} size={TYPE.micro} anchor="start" fill="#3f3f46" mono>
      {children}
    </VizText>
  );
}
