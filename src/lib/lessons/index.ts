import type { Lesson } from "@/types/lesson";
import { redisCacheLesson } from "./redis-cache";

export const lessons: Lesson[] = [redisCacheLesson];

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find((l) => l.slug === slug);
}
