interface Props {
  tree: string;
}

export function ProjectStructureBlock({ tree }: Props) {
  const lines = tree.split("\n");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/60">
        <span className="text-xs font-mono text-zinc-500">project structure</span>
        <div className="flex gap-1 ml-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        </div>
      </div>

      {/* Tree */}
      <div className="p-4 overflow-x-auto">
        <pre className="text-[13px] leading-relaxed font-mono">
          {lines.map((line, i) => {
            const isDir  = line.trimEnd().endsWith("/") && !line.includes("#");
            const isRoot = i === 0 && line.trimEnd().endsWith("/");
            const commentIdx = line.indexOf("#");
            const code    = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
            const comment = commentIdx >= 0 ? line.slice(commentIdx) : "";

            return (
              <div key={i} className="flex items-baseline gap-0 whitespace-pre">
                <span className={
                  isRoot ? "text-violet-300 font-semibold"
                  : isDir ? "text-zinc-200"
                  : "text-zinc-400"
                }>
                  {code}
                </span>
                {comment && (
                  <span className="text-zinc-600 text-[11px]">{comment}</span>
                )}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
