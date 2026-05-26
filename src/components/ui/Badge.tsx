import { CATEGORY_META, COMPLEXITY_META, LEVEL_META, LEVELS } from "@/lib/registry";
import type { Category, Complexity, Level } from "@/types/principle";

export function CategoryBadge({ category }: { category: Category }) {
  const { color, icon } = CATEGORY_META[category];
  const label = category.charAt(0).toUpperCase() + category.slice(1);
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${color}`}>
      <span className="text-[10px]">{icon}</span>
      {label}
    </span>
  );
}

export function ComplexityBadge({ complexity }: { complexity: Complexity }) {
  const { color } = COMPLEXITY_META[complexity];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${color}`}>
      {complexity}
    </span>
  );
}

export function LevelBadge({ level }: { level: Level }) {
  const meta = LEVEL_META[level];
  const def = LEVELS.find((l) => l.value === level);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${meta.bg} ${meta.border} ${meta.color}`}
      title={meta.desc}
    >
      <span className="font-mono text-[10px] opacity-70">{def?.icon}</span>
      {def?.label ?? level}
    </span>
  );
}

export function PopularityStars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Popularity: ${value}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`text-xs ${i < value ? "text-amber-400" : "text-zinc-700"}`}
        >
          ★
        </span>
      ))}
      <span className="text-xs text-zinc-600 ml-1 font-mono">{value}/5</span>
    </span>
  );
}
