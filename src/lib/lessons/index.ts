import type { Lesson } from "@/types/lesson";
import { redisCacheLesson } from "./redis-cache";
import { messageQueueLesson } from "./message-queue";
import { oauthLesson } from "./auth-oauth2";
import { oidcLesson } from "./auth-oidc";

export const lessons: Lesson[] = [redisCacheLesson, messageQueueLesson, oauthLesson, oidcLesson];

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find((l) => l.slug === slug);
}
