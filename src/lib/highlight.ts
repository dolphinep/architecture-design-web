import { codeToHtml } from "shiki";
import type { CodeLanguage } from "@/types/principle";

const SHIKI_LANG: Record<CodeLanguage, string> = {
  typescript: "typescript",
  go:         "go",
  rust:       "rust",
};

export async function highlightCode(code: string, language: CodeLanguage): Promise<string> {
  return codeToHtml(code, {
    lang: SHIKI_LANG[language] ?? "text",
    theme: "one-dark-pro",
    colorReplacements: {
      "#282c34": "transparent", // let our zinc-950 wrapper show through
    },
  });
}

/** Generic variant for lab files — accepts any shiki language id (yaml, python, bash, …) */
export async function highlightSnippet(code: string, lang: string): Promise<string> {
  return codeToHtml(code, {
    lang,
    theme: "one-dark-pro",
    colorReplacements: {
      "#282c34": "transparent",
    },
  });
}
