"use client";

import type { JSX } from "react";
import type { SlideAnimation } from "@/types/lesson";
import { AnimationFrame } from "./AnimationFrame";
import { DBOverloadViz } from "./DBOverloadViz";
import { SpeedCompareViz } from "./SpeedCompareViz";
import { CacheFlowViz } from "./CacheFlowViz";
import { TTLViz } from "./TTLViz";
import { LRUViz } from "./LRUViz";
import { WriteStrategyViz } from "./WriteStrategyViz";
import { RedisStructuresViz } from "./RedisStructuresViz";
import { CacheOptionsViz } from "./CacheOptionsViz";
import { EventLoopViz } from "./EventLoopViz";
import { PersistenceViz } from "./PersistenceViz";

export function SlideAnimationView({ animation }: { animation: SlideAnimation }): JSX.Element | null {
  const view = renderAnimation(animation);
  return view ? <AnimationFrame>{view}</AnimationFrame> : null;
}

function renderAnimation(animation: SlideAnimation): JSX.Element | null {
  switch (animation) {
    case "db-overload":      return <DBOverloadViz />;
    case "speed-compare":    return <SpeedCompareViz />;
    case "hit-miss":         return <CacheFlowViz mode="hit-miss" />;
    case "cache-aside":      return <CacheFlowViz mode="cache-aside" />;
    case "stale":            return <CacheFlowViz mode="stale" />;
    case "ttl":              return <TTLViz />;
    case "lru":              return <LRUViz />;
    case "write-strategies": return <WriteStrategyViz />;
    case "redis-structures": return <RedisStructuresViz />;
    case "cache-options":    return <CacheOptionsViz />;
    case "event-loop":       return <EventLoopViz />;
    case "persistence":      return <PersistenceViz />;
    default:                 return null;
  }
}
