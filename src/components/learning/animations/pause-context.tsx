"use client";

import { createContext, useContext, useRef } from "react";

export const AnimPauseContext = createContext(false);

/** Current paused state — re-renders the consumer on change */
export function useAnimPaused(): boolean {
  return useContext(AnimPauseContext);
}

/**
 * Paused state mirrored into a ref — read this inside setInterval/setTimeout
 * callbacks so ticks see the live value without re-subscribing timers.
 */
export function useAnimPausedRef(): React.RefObject<boolean> {
  const paused = useContext(AnimPauseContext);
  const ref = useRef(paused);
  ref.current = paused;
  return ref;
}
