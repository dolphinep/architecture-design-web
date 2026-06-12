export type SlideAnimation =
  | "db-overload"
  | "speed-compare"
  | "hit-miss"
  | "cache-aside"
  | "stale"
  | "ttl"
  | "lru"
  | "write-strategies"
  | "redis-structures"
  | "cache-options"
  | "event-loop"
  | "persistence";

export type Accent = "violet" | "emerald" | "cyan" | "amber" | "red" | "zinc";

/** Inline markup supported in all text fields: **bold highlight** and `code` */
export type SlideBlock =
  | { kind: "text"; text: string }
  | {
      kind: "points";
      items: Array<{ label?: string; accent?: Accent; text: string }>;
    }
  | {
      kind: "stats";
      items: Array<{ value: string; label: string; accent?: Accent }>;
    }
  | {
      kind: "compare";
      cards: Array<{ title: string; accent: Accent; points: string[] }>;
    }
  | { kind: "flow"; steps: string[] };

export interface LessonSlide {
  id: string;
  title: string;
  /** Structured content blocks shown in full slide mode */
  body: SlideBlock[];
  /** One short, precise line — shown in recap mode and as a footnote */
  summary: string;
  animation?: SlideAnimation;
}

export interface Lesson {
  slug: string;
  title: string;
  description: string;
  /** e.g. "~8 min" */
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  tags: string[];
  slides: LessonSlide[];
}
