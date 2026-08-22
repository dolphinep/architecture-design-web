/**
 * Packet-flight model shared by every traffic visualization.
 *
 * The advance step is a pure function so it can be reasoned about and tested
 * without a DOM: `advance()` takes the current list plus elapsed ms and returns
 * the next list together with whichever packets completed this step. Side
 * effects (counters, state machines, logs) are the caller's job, applied to
 * `landed` *outside* any setState updater.
 */

export interface Flight<M = unknown> {
  id: number;
  /** Position along the route, 0 → 1 */
  t: number;
  /** ms this flight takes end to end */
  duration: number;
  /** Set once t reaches 1; counts down before the marker is dropped */
  ttl: number;
  /** ms the landed marker lingers */
  linger: number;
  landed: boolean;
  /** Caller-defined payload: outcome, route, colour, label… */
  meta: M;
}

export interface AdvanceResult<M> {
  next: Array<Flight<M>>;
  /** Flights that crossed the finish line during this step */
  landed: Array<Flight<M>>;
  /** True when nothing is left to animate */
  idle: boolean;
}

/**
 * Advance every flight by `dt` milliseconds.
 *
 * Progress is time-based rather than per-frame, so a 120 Hz display animates at
 * the same speed as a 60 Hz one — the previous fixed `t += 0.025` per frame ran
 * at double speed on high-refresh screens.
 */
export function advance<M>(flights: Array<Flight<M>>, dt: number): AdvanceResult<M> {
  const next: Array<Flight<M>> = [];
  const landed: Array<Flight<M>> = [];

  for (const f of flights) {
    if (f.landed) {
      const ttl = f.ttl - dt;
      if (ttl > 0) next.push({ ...f, ttl });
      continue;
    }

    const t = f.t + dt / Math.max(f.duration, 1);
    if (t >= 1) {
      const done = { ...f, t: 1, landed: true, ttl: f.linger };
      next.push(done);
      landed.push(done);
    } else {
      next.push({ ...f, t });
    }
  }

  return { next, landed, idle: next.length === 0 };
}

let seq = 0;

/** Create a flight. `duration` and `linger` default to sensible packet timings. */
export function flight<M>(meta: M, opts: { duration?: number; linger?: number; t?: number; landed?: boolean } = {}): Flight<M> {
  const linger = opts.linger ?? 700;
  const landed = opts.landed ?? false;
  return {
    id: seq++,
    t: opts.t ?? (landed ? 1 : 0),
    duration: opts.duration ?? 1400,
    linger,
    ttl: landed ? linger : 0,
    landed,
    meta,
  };
}

/** Fade for a landed marker, 1 → 0 across its linger window. */
export function fadeOut(f: Flight<unknown>): number {
  if (!f.landed) return 1;
  return Math.max(0, Math.min(1, f.ttl / Math.max(f.linger, 1)));
}

/** Keep the newest `n` flights — bounds unbounded auto-simulation. */
export function cap<M>(flights: Array<Flight<M>>, n: number): Array<Flight<M>> {
  return flights.length <= n ? flights : flights.slice(flights.length - n);
}

/** Ease-in-out for packet motion that should not look robotic. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
