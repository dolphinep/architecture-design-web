import type { LessonLab } from "@/types/lesson";
import { highlightSnippet } from "./highlight";

/**
 * Pre-render syntax highlighting for every lab file (server-side, zero client cost).
 * Keys: `${stepId}:${lang|shared}:${filePath}`
 */
export async function prepareLabHtml(lab: LessonLab): Promise<Record<string, string>> {
  const entries: Array<Promise<[string, string]>> = [];

  for (const step of lab.steps) {
    for (const file of step.shared?.files ?? []) {
      entries.push(
        highlightSnippet(file.content, file.lang).then((html) => [`${step.id}:shared:${file.path}`, html])
      );
    }
    for (const [lang, content] of Object.entries(step.perLang ?? {})) {
      for (const file of content.files ?? []) {
        entries.push(
          highlightSnippet(file.content, file.lang).then((html) => [`${step.id}:${lang}:${file.path}`, html])
        );
      }
    }
  }

  return Object.fromEntries(await Promise.all(entries));
}
