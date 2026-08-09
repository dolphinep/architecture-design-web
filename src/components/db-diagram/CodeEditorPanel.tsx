"use client";

import React, { useState, useRef } from 'react';
import { ParseError } from '@/lib/db-diagram/types';
import { DIAGRAM_PRESETS } from '@/lib/db-diagram/presets';

interface CodeEditorPanelProps {
  code: string;
  onChange: (newCode: string) => void;
  errors: ParseError[];
  onSelectPreset: (presetId: string) => void;
  onOpenImportExport: () => void;
}

export default function CodeEditorPanel({
  code,
  onChange,
  errors,
  onSelectPreset,
  onOpenImportExport,
}: CodeEditorPanelProps) {
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');

  // Synchronize scroll position between textarea, line numbers, and syntax backdrop
  const handleScroll = () => {
    if (textareaRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
      if (backdropRef.current) {
        backdropRef.current.scrollTop = scrollTop;
        backdropRef.current.scrollLeft = scrollLeft;
      }
    }
  };

  // Insert snippet with dynamically unique table name
  const insertUniqueTable = () => {
    let tableName = 'new_table';
    let counter = 1;

    const matches = code.match(/Table\s+([a-zA-Z0-9_]+)/gi) || [];
    const existingNames = new Set(matches.map(m => m.replace(/^Table\s+/i, '').toLowerCase()));

    while (existingNames.has(tableName.toLowerCase())) {
      tableName = `new_table_${counter}`;
      counter++;
    }

    const snippet = `Table ${tableName} {\n  id integer [pk, increment]\n  name varchar [not null]\n  created_at timestamp\n}`;
    onChange(code ? `${code.trim()}\n\n${snippet}` : snippet);
  };

  const insertSnippet = (snippet: string) => {
    onChange(code ? `${code.trim()}\n\n${snippet}` : snippet);
  };

  // Syntax colorizer renderer for code editor backdrop
  const renderHighlightedLine = (lineText: string) => {
    if (!lineText) return <span>&nbsp;</span>;

    // Single line comment
    if (lineText.trim().startsWith('//') || lineText.trim().startsWith('--')) {
      return <span className="text-zinc-500 italic">{lineText}</span>;
    }

    const tokens = lineText.split(/(\s+|[{}()\[\],.:><\-]+)/);

    return tokens.map((token, i) => {
      const lower = token.toLowerCase();

      // Keywords
      if (['table', 'ref', 'as', 'create', 'alter', 'add', 'foreign', 'key', 'references', 'constraint'].includes(lower)) {
        return <span key={i} className="text-purple-400 font-semibold">{token}</span>;
      }
      // Datatypes
      if (['integer', 'int', 'varchar', 'text', 'timestamp', 'datetime', 'decimal', 'boolean', 'bigint', 'serial', 'float', 'json', 'objectid', 'document', 'string'].includes(lower)) {
        return <span key={i} className="text-sky-400">{token}</span>;
      }
      // Modifiers / Brackets
      if (['pk', 'primary', 'not', 'null', 'unique', 'increment', 'auto_increment', 'default'].includes(lower)) {
        return <span key={i} className="text-amber-300 font-medium">{token}</span>;
      }
      // Inline Ref operators
      if (['>', '<', '-', '<>'].includes(token)) {
        return <span key={i} className="text-pink-400 font-bold">{token}</span>;
      }

      return <span key={i} className="text-zinc-200">{token}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/90 border-r border-zinc-800 select-none overflow-hidden">
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-950 border-b border-zinc-800 text-xs text-zinc-400 flex-nowrap shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-semibold text-white flex items-center gap-1.5 whitespace-nowrap">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Schema Editor
          </span>
          <span className="bg-violet-950/80 text-violet-300 border border-violet-800/60 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap shrink-0">
            SQL
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Preset Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded flex items-center gap-1.5 transition-colors text-xs"
              title="Load Starter Presets"
            >
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Presets
              <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPresetsMenu && (
              <div className="absolute right-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 p-1 text-left">
                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 border-b border-zinc-800 mb-1">
                  Starter Schema Templates
                </div>
                {DIAGRAM_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset.id);
                      setShowPresetsMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-800 rounded transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-white">
                      <span>{preset.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded ${preset.category === 'RDS' ? 'bg-indigo-950 text-indigo-300' : 'bg-emerald-950 text-emerald-300'}`}>
                        {preset.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 line-clamp-1">{preset.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Import / Export Button */}
          <button
            onClick={onOpenImportExport}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded flex items-center gap-1 transition-colors text-xs"
            title="Import or Export Code"
          >
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import/Export
          </button>
        </div>
      </div>

      {/* Snippet Quick Action Bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/60 border-b border-zinc-800/80 overflow-x-auto text-[11px] shrink-0">
        <span className="text-zinc-500 font-mono text-[10px] shrink-0">+ Insert:</span>
        <button
          onClick={insertUniqueTable}
          className="px-2 py-0.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded font-mono transition-colors shrink-0"
        >
          + Table
        </button>
        <button
          onClick={() => insertSnippet('Ref: orders.user_id > users.id')}
          className="px-2 py-0.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded font-mono transition-colors shrink-0"
        >
          + Ref (1:N)
        </button>
        <button
          onClick={() => insertSnippet('Ref: profiles.user_id - users.id')}
          className="px-2 py-0.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded font-mono transition-colors shrink-0"
        >
          + Ref (1:1)
        </button>
      </div>

      {/* Code Text Area with Synchronized Line Numbers & Syntax Backdrop */}
      <div className="flex-1 relative flex overflow-hidden font-mono text-xs bg-zinc-950/40">
        {/* Synchronized Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="w-10 bg-zinc-950/90 border-r border-zinc-800/80 py-3 text-right pr-2 text-zinc-600 select-none shrink-0 overflow-hidden"
        >
          {lines.map((_, i) => (
            <div key={i} className="h-5 leading-5 text-[11px]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Editor Input Container */}
        <div className="flex-1 relative overflow-hidden">
          {/* Syntax Backdrop (scroll synced) */}
          <div
            ref={backdropRef}
            className="absolute inset-0 p-3 leading-5 pointer-events-none overflow-hidden select-none whitespace-pre font-mono text-xs"
          >
            {lines.map((line, idx) => (
              <div key={idx} className="h-5 leading-5">
                {renderHighlightedLine(line)}
              </div>
            ))}
          </div>

          {/* Textarea (Scroll Controller) */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            placeholder={`// Write DBML or SQL DDL markup here...\n\nTable users {\n  id integer [pk, increment]\n  email varchar [not null, unique]\n}\n\nTable posts {\n  id integer [pk]\n  user_id integer\n  title varchar\n}\n\nRef: posts.user_id > users.id`}
            spellCheck={false}
            className="absolute inset-0 w-full h-full bg-transparent p-3 text-transparent caret-white focus:outline-none resize-none leading-5 font-mono selection:bg-violet-900/60 selection:text-white overflow-auto"
          />
        </div>
      </div>

      {/* Validation Status Footer */}
      {errors.length > 0 && (
        <div className="p-2.5 bg-rose-950/80 border-t border-rose-800 text-rose-300 text-xs flex items-center gap-2 shrink-0">
          <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="truncate">
            <span className="font-semibold">Line {errors[0].line}:</span> {errors[0].message}
          </div>
        </div>
      )}
    </div>
  );
}
