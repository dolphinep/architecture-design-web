"use client";

import React, { useState } from 'react';
import { SavedDiagram } from '@/lib/db-diagram/types';
import { MAX_DIAGRAM_LIMIT } from '@/lib/db-diagram/storage';

interface DiagramManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedDiagrams: SavedDiagram[];
  activeDiagramId: string | null;
  onSelectDiagram: (diagram: SavedDiagram) => void;
  onNewDiagram: () => void;
  onDuplicateDiagram: (id: string) => void;
  onDeleteDiagram: (id: string) => void;
  onRenameDiagram: (id: string, newTitle: string) => void;
}

export default function DiagramManagerModal({
  isOpen,
  onClose,
  savedDiagrams,
  activeDiagramId,
  onSelectDiagram,
  onNewDiagram,
  onDuplicateDiagram,
  onDeleteDiagram,
  onRenameDiagram,
}: DiagramManagerModalProps) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  if (!isOpen) return null;

  const filtered = savedDiagrams.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  const handleStartRename = (diagram: SavedDiagram) => {
    setEditingId(diagram.id);
    setEditingTitle(diagram.title);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameDiagram(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8z" />
              </svg>
              Diagram Manager
            </h2>
            <p className="text-xs text-zinc-400">
              Saved Local Storage Diagrams ({savedDiagrams.length} / {MAX_DIAGRAM_LIMIT})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNewDiagram}
              disabled={savedDiagrams.length >= MAX_DIAGRAM_LIMIT}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              + New Diagram
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/50">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter saved diagrams by name..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Diagrams List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">
              No diagrams found. Click "+ New Diagram" to create one.
            </div>
          ) : (
            filtered.map(diagram => {
              const isActive = diagram.id === activeDiagramId;
              const isEditing = editingId === diagram.id;

              return (
                <div
                  key={diagram.id}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-violet-950/40 border-violet-700/60'
                      : 'bg-zinc-950/50 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-violet-900/50 text-violet-300' : 'bg-zinc-800 text-zinc-400'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveRename(diagram.id)}
                          onBlur={() => handleSaveRename(diagram.id)}
                          autoFocus
                          className="bg-zinc-900 border border-violet-500 text-white rounded px-2 py-0.5 text-xs font-medium w-full focus:outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">{diagram.title}</span>
                          {isActive && (
                            <span className="bg-violet-950 text-violet-300 border border-violet-800/50 text-[10px] px-1.5 py-0.2 rounded font-mono">
                              Active
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                        Updated {new Date(diagram.updatedAt).toLocaleDateString()} at {new Date(diagram.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onSelectDiagram(diagram);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleStartRename(diagram)}
                      className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                      title="Rename"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDuplicateDiagram(diagram.id)}
                      className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                      title="Duplicate"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeleteDiagram(diagram.id)}
                      className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
