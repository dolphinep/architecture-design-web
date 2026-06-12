"use client";

import { useState } from "react";
import type { LessonLab, LabLang, LabStepContent, LabFile } from "@/types/lesson";

const LANGS: Array<{ value: LabLang; label: string }> = [
  { value: "typescript", label: "TypeScript" },
  { value: "go", label: "Go" },
  { value: "python", label: "Python" },
];

/** Inline markup: **bold** and `code` */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold text-zinc-100">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code key={i} className="font-mono text-[0.85em] text-violet-300 bg-violet-500/10 border border-violet-500/15 rounded px-1 py-px">
              {part.slice(1, -1)}
            </code>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function CopyButton({ text, label = "copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
        copied
          ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
          : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
      }`}
    >
      {copied ? "copied ✓" : label}
    </button>
  );
}

function downloadFile(file: LabFile) {
  const blob = new Blob([file.content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.path;
  a.click();
  URL.revokeObjectURL(url);
}

function FileBlock({ file, html }: { file: LabFile; html?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/70 bg-zinc-900/40">
        <span className="font-mono text-xs text-zinc-400">{file.path}</span>
        <div className="flex items-center gap-1.5">
          <CopyButton text={file.content} />
          <button
            onClick={() => downloadFile(file)}
            className="px-2 py-0.5 rounded text-[10px] font-mono border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
          >
            ↓ download
          </button>
        </div>
      </div>
      {html ? (
        <div
          className="overflow-x-auto text-[13px] leading-relaxed [&>pre]:!bg-transparent [&>pre]:p-4 [&>pre]:m-0 [&_code]:font-mono"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono text-zinc-300">
          {file.content}
        </pre>
      )}
    </div>
  );
}

function CommandBlock({ commands }: { commands: string[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/60">
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">terminal</span>
        <CopyButton text={commands.join("\n")} label="copy all" />
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        {commands.map((cmd, i) => (
          <div key={i} className="group flex items-start gap-2">
            <span className="text-emerald-500 font-mono text-[13px] select-none shrink-0">$</span>
            <code className="font-mono text-[13px] text-zinc-200 leading-relaxed flex-1 break-all">{cmd}</code>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <CopyButton text={cmd} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputBlock({ output }: { output: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-950 px-3 py-2.5">
      <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest mb-1.5">expected output</p>
      <pre className="font-mono text-[12px] leading-relaxed text-zinc-500 whitespace-pre-wrap">{output}</pre>
    </div>
  );
}

function StepContent({ content, htmlMap, stepId, lang }: {
  content: LabStepContent;
  htmlMap: Record<string, string>;
  stepId: string;
  lang: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {content.files?.map((file) => (
        <FileBlock key={file.path} file={file} html={htmlMap[`${stepId}:${lang}:${file.path}`]} />
      ))}
      {content.commands && <CommandBlock commands={content.commands} />}
      {content.output && <OutputBlock output={content.output} />}
    </div>
  );
}

export function LabView({ lab, htmlMap }: { lab: LessonLab; htmlMap: Record<string, string> }) {
  const [lang, setLang] = useState<LabLang>("typescript");

  return (
    <div className="flex flex-col gap-6">
      {/* Intro */}
      <p className="text-zinc-400 leading-relaxed">{lab.intro}</p>

      {/* Prereqs + language picker */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">you'll need</p>
          <ul className="flex flex-col gap-1">
            {lab.prerequisites.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="text-emerald-500 text-xs mt-0.5 shrink-0">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:w-52">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">your language</p>
          <div className="flex sm:flex-col gap-1.5">
            {LANGS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLang(l.value)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors text-left ${
                  lang === l.value
                    ? "bg-violet-600 border-violet-500 text-white"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Steps */}
      <ol className="flex flex-col gap-8">
        {lab.steps.map((step, i) => {
          const langContent = step.perLang?.[lang];
          return (
            <li key={step.id} className="flex gap-4">
              {/* Step number + connector */}
              <div className="flex flex-col items-center shrink-0">
                <span className="w-8 h-8 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-mono text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                {i < lab.steps.length - 1 && <span className="w-px flex-1 bg-zinc-800 mt-2" />}
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-3 pb-2">
                <div>
                  <h3 className="font-semibold text-zinc-100">{step.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed mt-1">
                    <Inline text={step.description} />
                  </p>
                </div>

                {step.shared && (
                  <StepContent content={step.shared} htmlMap={htmlMap} stepId={step.id} lang="shared" />
                )}
                {langContent && (
                  <StepContent content={langContent} htmlMap={htmlMap} stepId={step.id} lang={lang} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
