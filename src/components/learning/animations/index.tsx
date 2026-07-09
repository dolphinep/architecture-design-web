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
import { SyncCouplingViz } from "./SyncCouplingViz";
import { QueueBufferViz } from "./QueueBufferViz";
import { QueuePubSubViz } from "./QueuePubSubViz";
import { DeliveryViz } from "./DeliveryViz";
import { KafkaLogViz } from "./KafkaLogViz";
import { KafkaPartitionsViz } from "./KafkaPartitionsViz";
import { ConsumerGroupsViz } from "./ConsumerGroupsViz";
import { KafkaInternalsViz } from "./KafkaInternalsViz";
import { RAGPipelineViz } from "./RAGPipelineViz";
import { VectorSearchViz } from "./VectorSearchViz";
import { LLMInferenceViz } from "./LLMInferenceViz";

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
    case "sync-coupling":      return <SyncCouplingViz />;
    case "queue-buffer":       return <QueueBufferViz />;
    case "queue-vs-pubsub":    return <QueuePubSubViz />;
    case "delivery-guarantees": return <DeliveryViz />;
    case "kafka-log":          return <KafkaLogViz />;
    case "kafka-partitions":   return <KafkaPartitionsViz />;
    case "consumer-groups":    return <ConsumerGroupsViz />;
    case "kafka-internals":    return <KafkaInternalsViz />;
    case "rag-pipeline":       return <RAGPipelineViz />;
    case "vector-search":      return <VectorSearchViz />;
    case "llm-inference":      return <LLMInferenceViz />;
    default:                 return null;
  }
}
