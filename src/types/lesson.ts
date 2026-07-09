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
  | "persistence"
  | "sync-coupling"
  | "queue-buffer"
  | "queue-vs-pubsub"
  | "delivery-guarantees"
  | "kafka-log"
  | "kafka-partitions"
  | "consumer-groups"
  | "kafka-internals";

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
  | { kind: "flow"; steps: string[] }
  | { kind: "sequence"; title?: string; actors: string[]; steps: SequenceStep[] };

export interface SequenceStep {
  from: string;
  to: string;
  /** Short label shown above the arrow — keep under ~32 chars */
  label: string;
  /** Optional secondary annotation below the arrow */
  note?: string;
  /** "response" renders a dashed arrow; default is solid */
  style?: "request" | "response";
}

export interface LessonSlide {
  id: string;
  title: string;
  /** Structured content blocks shown in full slide mode */
  body: SlideBlock[];
  /** One short, precise line — shown in recap mode and as a footnote */
  summary: string;
  animation?: SlideAnimation;
}

// ─── Hands-on lab ─────────────────────────────────────────────────────────────

export type LabLang = "typescript" | "go" | "python";

export interface LabFile {
  /** File name shown in the header and used for download, e.g. "docker-compose.yml" */
  path: string;
  /** Shiki language id: yaml, typescript, go, python, bash, … */
  lang: string;
  content: string;
}

export interface LabStepContent {
  files?: LabFile[];
  commands?: string[];
  /** Expected terminal output, shown dimmed */
  output?: string;
}

export interface LabStep {
  id: string;
  title: string;
  /** Supports inline markup: **bold** and `code` */
  description: string;
  /** Content shown regardless of selected language track */
  shared?: LabStepContent;
  /** Content per language track */
  perLang?: Partial<Record<LabLang, LabStepContent>>;
}

export interface LessonLab {
  intro: string;
  prerequisites: string[];
  steps: LabStep[];
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
  /** Optional hands-on lab with Docker setup and runnable code */
  lab?: LessonLab;
  /** Group related lessons (e.g. "Authentication"). Lessons in the same series appear together on the listing page. */
  series?: string;
  /** Position within the series — lower numbers come first */
  seriesOrder?: number;
}
