"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";
import { advance, cap, flight, type Flight } from "./flight";

/**
 * `useLayoutEffect` on the client, `useEffect` on the server — avoids React's
 * SSR warning while still running before paint in the browser.
 */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Keeps a ref pointing at the latest value without touching it during render.
 * Syncing in a layout effect means the ref is current before any paint, rAF
 * callback, or timer fires.
 */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useIsoLayoutEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * True when the user has asked for reduced motion. Visualizations should skip
 * packet flight and pulse effects and jump straight to end state.
 *
 * A media query is external state, so it is read through `useSyncExternalStore`
 * rather than mirrored into component state via an effect.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false // server: assume motion is fine, then correct on hydration
  );
}

/**
 * requestAnimationFrame loop that only runs while `active`.
 *
 * The pre-1.1 visualizations each ran an unconditional rAF loop calling setState
 * every frame for the lifetime of the page — burning a render per frame even when
 * nothing was moving. This runs only when there is something to animate.
 *
 * The callback receives delta-ms, so animation speed is frame-rate independent
 * (the old fixed `progress + 0.025` per frame ran ~2× faster on a 120Hz display).
 */
export function useRafLoop(active: boolean, cb: (deltaMs: number) => void) {
  const cbRef = useLatest(cb);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(now - last, 64); // clamp after tab-switch stalls
      last = now;
      cbRef.current(delta);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, cbRef]);
}

/** setInterval that respects `active` and always sees the latest callback. */
export function useInterval(active: boolean, ms: number, cb: () => void) {
  const cbRef = useLatest(cb);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => cbRef.current(), ms);
    return () => clearInterval(id);
  }, [active, ms, cbRef]);
}

/**
 * Observes an element and reports whether it is on screen. Used to pause
 * simulations that scrolled out of view.
 *
 * Defaults to `true` so a visualization is never dead on arrival in an
 * environment without IntersectionObserver.
 */
export function useOnScreen<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, onScreen };
}

/**
 * Bounded event log with a stable identity per entry, so consumers can fade by
 * index without generating Tailwind classes dynamically (`opacity-${n}` never
 * worked — those classes are not in the compiled stylesheet).
 */
export interface LogEntry {
  id: number;
  text: string;
  hue: "neutral" | "primary" | "success" | "danger" | "warning" | "info";
}

export function useEventLog(max = 6) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const push = useCallback(
    (text: string, hue: LogEntry["hue"] = "neutral") => {
      setEntries((prev) => {
        const id = nextId.current++;
        return [{ id, text, hue }, ...prev].slice(0, max);
      });
    },
    [max]
  );

  const clear = useCallback(() => setEntries([]), []);

  return { entries, push, clear };
}

// ─── Flights ──────────────────────────────────────────────────────────────────


/**
 * Manages a list of in-flight packets: spawn, time-based advance, and a callback
 * for each one that lands.
 *
 * The list is held in a ref as the animation source of truth and mirrored into
 * state for rendering. That split matters — advancing inside a setState updater
 * would make landing side effects fire twice under StrictMode replay, and a
 * ref-only list would not re-render.
 */
export type LaunchFn<M> = (meta: M, opts?: { duration?: number; linger?: number }) => Flight<M>;

export function useFlights<M>({
  active = true,
  max = 10,
  reduced = false,
  onLand,
}: {
  /** Gate the rAF loop, e.g. on visibility */
  active?: boolean;
  /** Cap concurrent flights so auto-simulation stays bounded */
  max?: number;
  /** When true, packets land immediately instead of animating */
  reduced?: boolean;
  /**
   * Called once per landing. Receives `launch` so a landing can start the next
   * leg (bus fan-out, origin fetch, response hop) without the caller needing a
   * ref back into this hook.
   */
  onLand?: (f: Flight<M>, launch: LaunchFn<M>) => void;
}) {
  const [flights, setFlights] = useState<Array<Flight<M>>>([]);
  const ref = useRef<Array<Flight<M>>>([]);
  const onLandRef = useLatest(onLand);
  /** Declared before `launch` so the self-reference has no temporal dead zone. */
  const launchRef = useRef<LaunchFn<M> | null>(null);

  const commit = useCallback((next: Array<Flight<M>>) => {
    ref.current = next;
    setFlights(next);
  }, []);

  const launch = useCallback<LaunchFn<M>>(
    (meta, opts) => {
      const f = reduced
        ? flight(meta, { ...opts, landed: true, t: 1 })
        : flight(meta, opts);
      commit(cap([...ref.current, f], max));
      // With motion off there is no flight to watch, so land it at once.
      if (reduced && launchRef.current) onLandRef.current?.(f, launchRef.current);
      return f;
    },
    [commit, max, reduced, onLandRef]
  );

  useIsoLayoutEffect(() => {
    launchRef.current = launch;
  }, [launch]);

  const clear = useCallback(() => commit([]), [commit]);

  useRafLoop(active && flights.length > 0 && !reduced, (dt) => {
    const { next, landed } = advance(ref.current, dt);
    commit(next);
    // Side effects run outside the state update, once per landing.
    for (const f of landed) {
      if (launchRef.current) onLandRef.current?.(f, launchRef.current);
    }
  });

  return { flights, launch, clear };
}
