import type { Lesson } from "@/types/lesson";
import { redisCacheLesson } from "./redis-cache";
import { messageQueueLesson } from "./message-queue";
import { oauthLesson } from "./auth-oauth2";
import { oidcLesson } from "./auth-oidc";
import { ragLesson } from "./ai-rag";
import { aiInfraLesson } from "./ai-infra";
import { openWebUILesson } from "./ai-open-webui";
import { mcpLesson } from "./ai-mcp";

export const lessons: Lesson[] = [redisCacheLesson, messageQueueLesson, oauthLesson, oidcLesson, ragLesson, aiInfraLesson, openWebUILesson, mcpLesson];

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find((l) => l.slug === slug);
}
