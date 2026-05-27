export type Category = "architecture" | "infrastructure" | "cloud" | "networking";

export type CodeLanguage = "typescript" | "go" | "rust";

export interface CodeExample {
  language: CodeLanguage;
  label: string;
  code: string;
}

export interface PatternCode {
  projectStructure: string;
  examples: CodeExample[];
}

export type Complexity = "beginner" | "intermediate" | "advanced";

export type Level = "code" | "service" | "system" | "infrastructure" | "network";

export interface RealWorldExample {
  company: string;
  usage: string;
}

export interface TradeOff {
  pro: string;
  con: string;
}

export interface Principle {
  slug: string;
  name: string;
  category: Category;
  complexity: Complexity;
  /** 1–5 stars: industry adoption score */
  popularity: number;
  summary: string;
  description: string;
  whyItMatters: string;
  whenToUse: string[];
  whenNotToUse: string[];
  tradeoffs: TradeOff[];
  realWorld: RealWorldExample[];
  related: string[];
  tags: string[];
  /** Where in the stack this pattern operates */
  level: Level;
  /** true = interactive visualization available */
  implemented: boolean;
  year?: number;
  /** Sub-group within a level, e.g. "oop" | "solid" | "functional" | "general" | "design-patterns" */
  group?: string;
}
