"use client";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStats, VizLegend, VizLog,
  VizSvg, VizText, VizEdge, VizPacket,
  WorldMap, geo,
  useFlights, useInterval, useOnScreen, useReducedMotion, useEventLog,
  fadeOut, easeInOut,
  HUE, TYPE, STROKE, MOTION, type HueName, type Flight,
} from "./_shared";

const W = 760;
const H = 380;

const TTL_S = 10;
const USER_DOT_FILL = "#27272a";

interface PoPSpec {
  id: string;
  city: string;
  region: string;
  lon: number;
  lat: number;
  /** Where the requesting user sits, relative to the PoP */
  userLon: number;
  userLat: number;
  /** Round-trip to the origin, ms — the cost a cache miss pays */
  originRttMs: number;
}

const POPS: PoPSpec[] = [
  { id: "london",   city: "London",    region: "eu-west",   lon:   -0.1, lat:  51.5, userLon: -14, userLat:  41, originRttMs:  78 },
  { id: "tokyo",    city: "Tokyo",     region: "ap-east",   lon:  139.7, lat:  35.7, userLon: 124, userLat:  24, originRttMs: 168 },
  { id: "saopaulo", city: "São Paulo", region: "sa-east",   lon:  -46.6, lat: -23.5, userLon: -62, userLat: -36, originRttMs: 122 },
  { id: "sydney",   city: "Sydney",    region: "ap-south",  lon:  151.2, lat: -33.9, userLon: 137, userLat: -44, originRttMs: 214 },
];

const ORIGIN = { city: "Origin", region: "us-east-1", lon: -78, lat: 38 };

interface CacheState {
  cached: boolean;
  ttl: number;
  hits: number;
  misses: number;
}

const FRESH: Record<string, CacheState> = Object.fromEntries(
  POPS.map((p) => [p.id, { cached: false, ttl: 0, hits: 0, misses: 0 }])
);

type Leg = "user-to-pop" | "pop-to-origin" | "origin-to-pop";

interface Hop {
  popId: string;
  leg: Leg;
  hit: boolean;
}

const LEG_HUE: Record<Leg, HueName> = {
  "user-to-pop": "primary",
  "pop-to-origin": "danger",
  "origin-to-pop": "warning",
};

export function CDNViz() {
  const [cache, setCache] = useState<Record<string, CacheState>>(() => structuredClone(FRESH));
  const [running, setRunning] = useState(false);

  const { entries, push, clear: clearLog } = useEventLog(6);
  /** Mirror of `cache` for reads inside callbacks — see `request`. */
  const cacheRef = useRef(cache);
  useEffect(() => { cacheRef.current = cache; }, [cache]);
  const { ref: hostRef, onScreen } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  // Positions are derived once — they are pure geography.
  const pos = useMemo(() => {
    const map: Record<string, { pop: [number, number]; user: [number, number] }> = {
      origin: { pop: geo(ORIGIN.lon, ORIGIN.lat, W, H), user: [0, 0] },
    };
    for (const p of POPS) {
      map[p.id] = { pop: geo(p.lon, p.lat, W, H), user: geo(p.userLon, p.userLat, W, H) };
    }
    return map;
  }, []);

  const { flights, launch, clear: clearFlights } = useFlights<Hop>({
    active: onScreen,
    max: 12,
    reduced,
    onLand: (f) => {
      const { popId, leg } = f.meta;
      const pop = POPS.find((p) => p.id === popId)!;

      if (leg === "pop-to-origin") {
        // Origin answers and the PoP fills its cache on the way back.
        launch({ popId, leg: "origin-to-pop", hit: false }, { duration: MOTION.flight, linger: 350 });
        return;
      }
      if (leg === "origin-to-pop") {
        // Update the ref alongside state so a TTL tick or request landing in the
        // same frame cannot read a stale cache.
        const next = {
          ...cacheRef.current,
          [popId]: { ...cacheRef.current[popId], cached: true, ttl: TTL_S },
        };
        cacheRef.current = next;
        setCache(next);
        push(`↓ ${pop.city} filled from origin — TTL ${TTL_S}s`, "warning");
      }
    },
  });

  // TTL expiry. A plain timer, so it still works under reduced motion.
  useInterval(onScreen, 1000, () => {
    const prev = cacheRef.current;
    const expired: string[] = [];
    let changed = false;
    const next: Record<string, CacheState> = {};

    for (const [id, s] of Object.entries(prev)) {
      if (s.cached && s.ttl <= 1) {
        next[id] = { ...s, cached: false, ttl: 0 };
        expired.push(id);
        changed = true;
      } else if (s.cached) {
        next[id] = { ...s, ttl: s.ttl - 1 };
        changed = true;
      } else {
        next[id] = s;
      }
    }

    if (!changed) return;
    cacheRef.current = next;
    setCache(next);
    for (const id of expired) {
      push(`⏱ ${POPS.find((p) => p.id === id)!.city} cache expired`, "neutral");
    }
  });

  const request = useCallback((popId?: string) => {
    const pop = popId
      ? POPS.find((p) => p.id === popId)!
      : POPS[Math.floor(Math.random() * POPS.length)];

    // Decide from the ref, then update state. Launching packets or pushing log
    // entries from inside a setState updater would fire them twice whenever
    // React replays the updater.
    const hit = cacheRef.current[pop.id].cached;

    launch({ popId: pop.id, leg: "user-to-pop", hit }, { duration: MOTION.base, linger: 300 });

    if (hit) {
      push(`✓ HIT ${pop.city} — served at the edge`, "success");
      const next = { ...cacheRef.current, [pop.id]: { ...cacheRef.current[pop.id], hits: cacheRef.current[pop.id].hits + 1 } };
      cacheRef.current = next;
      setCache(next);
      return;
    }

    push(`✗ MISS ${pop.city} — ${pop.originRttMs}ms to origin`, "danger");
    const missed = { ...cacheRef.current, [pop.id]: { ...cacheRef.current[pop.id], misses: cacheRef.current[pop.id].misses + 1 } };
    cacheRef.current = missed;
    setCache(missed);
    // Origin fetch starts once the first leg has visibly arrived.
    setTimeout(() => {
      launch({ popId: pop.id, leg: "pop-to-origin", hit: false }, { duration: MOTION.flight, linger: 300 });
    }, reduced ? 0 : MOTION.base);
  }, [launch, push, reduced]);

  useInterval(running && onScreen, 1200, () => request());

  const totals = Object.values(cache).reduce(
    (a, s) => ({ hits: a.hits + s.hits, misses: a.misses + s.misses }),
    { hits: 0, misses: 0 }
  );
  const served = totals.hits + totals.misses;
  const hitRate = served ? Math.round((totals.hits / served) * 100) : 0;
  const warmCount = Object.values(cache).filter((s) => s.cached).length;
  // Weighted saving: every hit avoids one origin round trip.
  const avgOriginRtt = Math.round(POPS.reduce((a, p) => a + p.originRttMs, 0) / POPS.length);

  function reset() {
    const fresh = structuredClone(FRESH);
    cacheRef.current = fresh;
    setCache(fresh);
    setRunning(false);
    clearFlights();
    clearLog();
  }

  function legPath(h: Hop): [[number, number], [number, number]] {
    const p = pos[h.popId];
    if (h.leg === "user-to-pop") return [p.user, p.pop];
    if (h.leg === "pop-to-origin") return [p.pop, pos.origin.pop];
    return [pos.origin.pop, p.pop];
  }

  return (
    <VizFrame>
      <VizControls>
        <VizButton variant={running ? "secondary" : "primary"} active={running} onClick={() => setRunning((r) => !r)}>
          {running ? "❙❙ Pause" : "▶ Auto requests"}
        </VizButton>
        {POPS.map((p) => (
          <VizButton key={p.id} onClick={() => request(p.id)} title={`Request from a user near ${p.city}`}>
            {p.city}
          </VizButton>
        ))}
        <VizSpacer />
        <VizButton variant="ghost" onClick={reset}>↺ Purge cache</VizButton>
      </VizControls>

      <div ref={hostRef}>
        <VizStage pad={false}>
          <VizSvg
            w={W} h={H}
            label="Four CDN points of presence around the world, caching content from a single origin in us-east-1"
          >
            <WorldMap w={W} h={H} />

            {/* Backhaul: every PoP can reach the origin */}
            {POPS.map((p) => (
              <VizEdge
                key={p.id}
                from={pos[p.id].pop}
                to={pos.origin.pop}
                hue="neutral"
                dashed
                dimmed={cache[p.id].cached}
              />
            ))}

            {/* Last mile: user → nearest PoP */}
            {POPS.map((p) => (
              <VizEdge key={`u-${p.id}`} from={pos[p.id].user} to={pos[p.id].pop} hue="neutral" />
            ))}

            {/* Packets */}
            {flights.map((f: Flight<Hop>) => {
              const [a, b] = legPath(f.meta);
              const t = easeInOut(f.t);
              const hue = f.meta.leg === "user-to-pop"
                ? (f.meta.hit ? "success" : "primary")
                : LEG_HUE[f.meta.leg];
              return (
                <VizPacket
                  key={f.id}
                  x={a[0] + (b[0] - a[0]) * t}
                  y={a[1] + (b[1] - a[1]) * t}
                  hue={hue}
                  r={5}
                  opacity={f.landed ? fadeOut(f) : 1}
                />
              );
            })}

            {/* Origin */}
            <g>
              <rect
                x={pos.origin.pop[0] - 44} y={pos.origin.pop[1] - 16}
                width={88} height={32} rx={8}
                fill="url(#viz-node)" stroke={HUE.warning.base} strokeWidth={STROKE.base}
              />
              <VizText x={pos.origin.pop[0]} y={pos.origin.pop[1] - 4} size={TYPE.small} weight={700} hue="warning">
                {ORIGIN.city}
              </VizText>
              <VizText x={pos.origin.pop[0]} y={pos.origin.pop[1] + 8} size={TYPE.micro} mono fill="#a16207">
                {ORIGIN.region}
              </VizText>
            </g>

            {/* PoPs */}
            {POPS.map((p) => {
              const s = cache[p.id];
              const [x, y] = pos[p.id].pop;
              const hue: HueName = s.cached ? "success" : "neutral";
              return (
                <g key={p.id}>
                  {s.cached && (
                    <circle cx={x} cy={y} r={17} fill={HUE.success.glow} opacity={0.12} />
                  )}
                  <circle
                    cx={x} cy={y} r={11}
                    fill="url(#viz-node)"
                    stroke={HUE[hue].line}
                    strokeWidth={s.cached ? STROKE.base : STROKE.thin}
                    filter={s.cached ? "url(#viz-glow)" : undefined}
                  />
                  <VizText x={x} y={y} size={TYPE.micro} weight={700} mono
                           fill={s.cached ? HUE.success.text : HUE.neutral.text}>
                    {s.cached ? "✓" : "·"}
                  </VizText>
                  <VizText x={x} y={y - 22} size={TYPE.small} weight={600} fill={HUE.neutral.strong}>
                    {p.city}
                  </VizText>
                  <VizText x={x} y={y + 24} size={TYPE.micro} mono hue={s.cached ? "success" : "neutral"}>
                    {s.cached ? `TTL ${s.ttl}s` : "cold"}
                  </VizText>
                </g>
              );
            })}

            {/* Users — the dot plus its last-mile line is self-explanatory, and
                the city buttons above already name each location. */}
            {POPS.map((p) => {
              const [x, y] = pos[p.id].user;
              return (
                <circle
                  key={`user-${p.id}`}
                  cx={x} cy={y} r={4.5}
                  fill={USER_DOT_FILL} stroke={HUE.neutral.line} strokeWidth={STROKE.hairline}
                />
              );
            })}

            <VizText x={12} y={H - 12} size={TYPE.micro} anchor="start" fill="#3f3f46" mono>
              equirectangular · origin round trip {avgOriginRtt}ms avg
            </VizText>
          </VizSvg>
        </VizStage>
      </div>

      <VizStats
        items={[
          { label: "requests served", value: served, hue: "primary" },
          { label: "edge hit rate", value: `${hitRate}%`, hue: hitRate >= 50 ? "success" : "warning", meter: [totals.hits, Math.max(served, 1)] },
          { label: "warm PoPs", value: `${warmCount}/${POPS.length}`, hue: "success", meter: [warmCount, POPS.length] },
          { label: "origin fetches", value: totals.misses, hue: "danger" },
        ]}
      />

      <VizLog entries={entries} rows={4} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <VizLegend
          items={[
            { hue: "success", label: "cache hit" },
            { hue: "primary", label: "request to edge" },
            { hue: "danger", label: "miss → origin" },
            { hue: "warning", label: "origin fill" },
          ]}
        />
        <VizHint>Request the same city twice — the second one never leaves the continent.</VizHint>
      </div>
    </VizFrame>
  );
}

