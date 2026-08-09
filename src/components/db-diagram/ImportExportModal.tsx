"use client";

import React, { useState } from 'react';
import { DBSchema, SavedDiagram } from '@/lib/db-diagram/types';
import { generateDBML, generateSQL, generateJSON } from '@/lib/db-diagram/generators';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: DBSchema;
  activeDiagram: SavedDiagram;
  onImportCode: (code: string) => void;
}

export default function ImportExportModal({
  isOpen,
  onClose,
  schema,
  activeDiagram,
  onImportCode,
}: ImportExportModalProps) {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'dbml' | 'postgres' | 'mysql' | 'json'>('dbml');
  const [copied, setCopied] = useState(false);

  const [importText, setImportText] = useState('');

  if (!isOpen) return null;

  const getExportContent = (): string => {
    if (exportFormat === 'dbml') return generateDBML(schema);
    if (exportFormat === 'postgres') return generateSQL(schema, 'postgres');
    if (exportFormat === 'mysql') return generateSQL(schema, 'mysql');
    return generateJSON(activeDiagram);
  };

  const handleCopy = () => {
    const text = getExportContent();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = getExportContent();
    const ext = exportFormat === 'json' ? 'json' : exportFormat === 'dbml' ? 'dbml' : 'sql';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDiagram.title.toLowerCase().replace(/\s+/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.code) {
            onImportCode(parsed.code);
            onClose();
            return;
          }
        } catch (err) {
          console.error(err);
        }
      }
      onImportCode(content);
      onClose();
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (importText.trim()) {
      onImportCode(importText.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab('export')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'export' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Export Code
            </button>
            <button
              onClick={() => setTab('import')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'import' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Import Code
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {tab === 'export' ? (
          <div className="p-5 space-y-4">
            {/* Format Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-medium">Format:</span>
              {(['dbml', 'postgres', 'mysql', 'json'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={`px-2.5 py-1 rounded text-xs uppercase font-mono transition-colors ${
                    exportFormat === fmt
                      ? 'bg-violet-950 text-violet-300 border border-violet-700'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {fmt === 'postgres' ? 'PostgreSQL' : fmt}
                </button>
              ))}
            </div>

            {/* Code Output Preview */}
            <div className="relative bg-zinc-950 border border-zinc-800 rounded-lg p-3 max-h-72 overflow-y-auto font-mono text-xs text-zinc-200">
              <pre className="whitespace-pre-wrap leading-5">{getExportContent()}</pre>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {copied ? '✓ Copied' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                Download File
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* File Upload Option */}
            <div className="p-4 border-2 border-dashed border-zinc-800 hover:border-violet-500 rounded-xl bg-zinc-950 text-center transition-colors">
              <input
                type="file"
                accept=".dbml,.sql,.json,.txt"
                onChange={handleFileUpload}
                id="file-upload"
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer space-y-1 block">
                <svg className="w-8 h-8 text-violet-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-xs font-medium text-white">Click to upload .dbml, .sql, or .json file</div>
                <div className="text-[11px] text-zinc-500">Supports DBML markup and SQL CREATE TABLE statements</div>
              </label>
            </div>

            {/* Direct Paste Area */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">Or paste markup code directly:</label>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="Table users { id int [pk] email varchar }"
                className="w-full h-36 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyImport}
                disabled={!importText.trim()}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Apply Schema
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
