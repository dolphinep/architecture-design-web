"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { parseDBCode } from '@/lib/db-diagram/parser';
import { DIAGRAM_PRESETS } from '@/lib/db-diagram/presets';
import {
  loadSavedDiagrams,
  saveDiagram,
  deleteDiagram,
  duplicateDiagram,
  renameDiagram,
  getActiveDiagramId,
  MAX_DIAGRAM_LIMIT,
} from '@/lib/db-diagram/storage';
import { SavedDiagram, RelationalType } from '@/lib/db-diagram/types';
import { exportCanvasToImage, copyCanvasToClipboard } from '@/lib/db-diagram/exportUtils';
import {
  deleteTableFromCode,
  addColumnToTableInCode,
  deleteColumnFromTableInCode,
  updateColumnInCode,
  addOrUpdateRelationshipInCode,
  deleteRelationshipFromCode,
} from '@/lib/db-diagram/codeUtils';

import CodeEditorPanel from './CodeEditorPanel';
import CanvasPanel from './CanvasPanel';
import DiagramManagerModal from './DiagramManagerModal';
import ImportExportModal from './ImportExportModal';

export default function DBDiagramClient() {
  const [diagrams, setDiagrams] = useState<SavedDiagram[]>([]);
  const [activeDiagram, setActiveDiagram] = useState<SavedDiagram | null>(null);

  const [code, setCode] = useState<string>('');
  const [title, setTitle] = useState<string>('Untitled Diagram');
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  const [viewMode, setViewMode] = useState<'split' | 'canvas' | 'code'>('split');
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load saved diagrams on mount
  useEffect(() => {
    const loaded = loadSavedDiagrams();
    setDiagrams(loaded);

    const activeId = getActiveDiagramId();
    let current = loaded.find(d => d.id === activeId);

    if (!current) {
      if (loaded.length > 0) {
        current = loaded[0];
      } else {
        // Initialize default starter template if fresh session
        const starterCode = DIAGRAM_PRESETS[0].code;
        const res = saveDiagram({
          title: 'E-Commerce Schema',
          code: starterCode,
        });
        if (res.diagram) {
          current = res.diagram;
          setDiagrams([current]);
        }
      }
    }

    if (current) {
      setActiveDiagram(current);
      setCode(current.code);
      setTitle(current.title);
      setPositions(current.positions || {});
    }
  }, []);

  // Parse markup code into structured schema
  const { schema, errors } = useMemo(() => {
    return parseDBCode(code);
  }, [code]);

  // Handle position changes and auto-save code updates
  const handlePositionChange = (newPositions: Record<string, { x: number; y: number }>) => {
    setPositions(newPositions);
    if (activeDiagram) {
      saveDiagram({
        id: activeDiagram.id,
        title,
        code,
        positions: newPositions,
      });
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (activeDiagram) {
      saveDiagram({
        id: activeDiagram.id,
        title,
        code: newCode,
        positions,
      });
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (activeDiagram) {
      saveDiagram({
        id: activeDiagram.id,
        title: newTitle,
        code,
        positions,
      });
    }
  };

  // Preset Selection
  const handleSelectPreset = (presetId: string) => {
    const preset = DIAGRAM_PRESETS.find(p => p.id === presetId);
    if (preset) {
      handleCodeChange(preset.code);
      showToast(`Loaded ${preset.name} template`);
    }
  };

  // Canvas Visual Editing Callbacks
  const handleDeleteTableFromCanvas = (tableName: string) => {
    const updatedCode = deleteTableFromCode(code, tableName);
    handleCodeChange(updatedCode);
    showToast(`Deleted table '${tableName}'`);
  };

  const handleAddColumnFromCanvas = (tableName: string) => {
    const updatedCode = addColumnToTableInCode(code, tableName);
    handleCodeChange(updatedCode);
    showToast(`Added column to '${tableName}'`);
  };

  const handleDeleteColumnFromCanvas = (tableName: string, colName: string) => {
    const updatedCode = deleteColumnFromTableInCode(code, tableName, colName);
    handleCodeChange(updatedCode);
    showToast(`Removed column '${colName}' from '${tableName}'`);
  };

  const handleUpdateColumnFromCanvas = (tableName: string, oldColName: string, newColName: string, newType: string) => {
    const updatedCode = updateColumnInCode(code, tableName, oldColName, newColName, newType);
    handleCodeChange(updatedCode);
    showToast(`Updated column '${newColName}' in '${tableName}'`);
  };

  const handleAddOrUpdateRelationshipFromCanvas = (
    fromTable: string,
    fromCol: string,
    toTable: string,
    toCol: string,
    relType: RelationalType
  ) => {
    const updatedCode = addOrUpdateRelationshipInCode(code, fromTable, fromCol, toTable, toCol, relType);
    handleCodeChange(updatedCode);
    showToast(`Linked ${fromTable}.${fromCol} (${relType}) ${toTable}.${toCol}`);
  };

  const handleDeleteRelationshipFromCanvas = (
    fromTable: string,
    fromCol: string,
    toTable: string,
    toCol: string
  ) => {
    const updatedCode = deleteRelationshipFromCode(code, fromTable, fromCol, toTable, toCol);
    handleCodeChange(updatedCode);
    showToast(`Removed relationship between ${fromTable}.${fromCol} and ${toTable}.${toCol}`);
  };

  // Diagram Manager Actions
  const handleSelectDiagram = (diagram: SavedDiagram) => {
    setActiveDiagram(diagram);
    setCode(diagram.code);
    setTitle(diagram.title);
    setPositions(diagram.positions || {});
  };

  const handleNewDiagram = () => {
    const defaultCode = DIAGRAM_PRESETS[0].code;
    const res = saveDiagram({
      title: `Diagram ${diagrams.length + 1}`,
      code: defaultCode,
    });

    if (res.success && res.diagram) {
      setDiagrams(loadSavedDiagrams());
      handleSelectDiagram(res.diagram);
      setShowManagerModal(false);
      showToast('Created new diagram');
    } else if (res.error) {
      showToast(res.error);
    }
  };

  const handleDuplicateDiagram = (id: string) => {
    const dup = duplicateDiagram(id);
    if (dup) {
      setDiagrams(loadSavedDiagrams());
      showToast('Diagram duplicated');
    }
  };

  const handleDeleteDiagram = (id: string) => {
    const updated = deleteDiagram(id);
    setDiagrams(updated);
    if (updated.length > 0) {
      handleSelectDiagram(updated[0]);
    }
    showToast('Diagram deleted');
  };

  const handleRenameDiagram = (id: string, newTitle: string) => {
    const updated = renameDiagram(id, newTitle);
    setDiagrams(updated);
    if (activeDiagram && activeDiagram.id === id) {
      setTitle(newTitle);
    }
  };

  // PNG / JPEG Export Handlers
  const handleCopyImage = async (format: 'png' | 'jpeg') => {
    if (!canvasRef.current) return;
    showToast('Rasterizing canvas for clipboard...');
    const ok = await copyCanvasToClipboard(canvasRef.current, format);
    setShowExportMenu(false);
    if (ok) {
      showToast(`Copied ${format.toUpperCase()} to clipboard!`);
    } else {
      showToast('Clipboard copy failed. Try download option.');
    }
  };

  const handleDownloadImage = async (format: 'png' | 'jpeg') => {
    if (!canvasRef.current) return;
    showToast(`Exporting ${format.toUpperCase()} image...`);
    await exportCanvasToImage(canvasRef.current, format, title.toLowerCase().replace(/\s+/g, '-'));
    setShowExportMenu(false);
    showToast(`Downloaded ${format.toUpperCase()}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-zinc-950 overflow-hidden">
      {/* Top Application Bar */}
      <div className="h-12 bg-zinc-950 border-b border-zinc-800 px-4 flex items-center justify-between text-xs select-none">
        {/* Title Input & Save Status */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            className="bg-transparent text-white font-semibold text-sm focus:outline-none focus:bg-zinc-900 border border-transparent hover:border-zinc-800 focus:border-violet-500 rounded px-2 py-1 transition-all"
            placeholder="Untitled Diagram"
          />
          <span className="text-[11px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Auto-saved
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Diagrams Manager Button */}
          <button
            onClick={() => setShowManagerModal(true)}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-lg flex items-center gap-1.5 font-medium transition-colors"
          >
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Diagrams ({diagrams.length}/{MAX_DIAGRAM_LIMIT})
          </button>

          {/* Export Image Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg flex items-center gap-1.5 font-semibold shadow-lg shadow-violet-900/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Export Image
              <svg className="w-3 h-3 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 p-1 text-left">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 border-b border-zinc-800 mb-1">
                  COPY TO CLIPBOARD
                </div>
                <button
                  onClick={() => handleCopyImage('png')}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-800 text-zinc-200 rounded text-xs transition-colors flex items-center justify-between"
                >
                  <span>Copy PNG Image</span>
                  <span className="text-[10px] text-zinc-500 font-mono">PNG</span>
                </button>

                <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 border-b border-zinc-800 my-1">
                  DOWNLOAD FILE
                </div>
                <button
                  onClick={() => handleDownloadImage('png')}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-800 text-zinc-200 rounded text-xs transition-colors flex items-center justify-between"
                >
                  <span>Download PNG</span>
                  <span className="text-[10px] text-zinc-500 font-mono">.png</span>
                </button>
                <button
                  onClick={() => handleDownloadImage('jpeg')}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-800 text-zinc-200 rounded text-xs transition-colors flex items-center justify-between"
                >
                  <span>Download JPEG</span>
                  <span className="text-[10px] text-zinc-500 font-mono">.jpg</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-zinc-800 mx-1" />

          {/* View Mode Split Controls */}
          <div className="bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'split' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'canvas' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Canvas Only
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'code' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Code Only
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Editor Panel */}
        {(viewMode === 'split' || viewMode === 'code') && (
          <div className={`${viewMode === 'code' ? 'w-full' : 'w-[420px] shrink-0'} h-full`}>
            <CodeEditorPanel
              code={code}
              onChange={handleCodeChange}
              errors={errors}
              onSelectPreset={handleSelectPreset}
              onOpenImportExport={() => setShowImportExportModal(true)}
            />
          </div>
        )}

        {/* Right Canvas Panel */}
        {(viewMode === 'split' || viewMode === 'canvas') && (
          <div className="flex-1 h-full relative">
            <CanvasPanel
              schema={schema}
              positions={positions}
              onPositionChange={handlePositionChange}
              canvasRef={canvasRef}
              onDeleteTable={handleDeleteTableFromCanvas}
              onAddColumn={handleAddColumnFromCanvas}
              onDeleteColumn={handleDeleteColumnFromCanvas}
              onUpdateColumn={handleUpdateColumnFromCanvas}
              onAddOrUpdateRelationship={handleAddOrUpdateRelationshipFromCanvas}
              onDeleteRelationship={handleDeleteRelationshipFromCanvas}
            />
          </div>
        )}
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 border border-violet-500/80 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 animate-slide-in">
          <span className="w-2 h-2 rounded-full bg-violet-400" />
          {toastMessage}
        </div>
      )}

      {/* Modals */}
      <DiagramManagerModal
        isOpen={showManagerModal}
        onClose={() => setShowManagerModal(false)}
        savedDiagrams={diagrams}
        activeDiagramId={activeDiagram?.id || null}
        onSelectDiagram={handleSelectDiagram}
        onNewDiagram={handleNewDiagram}
        onDuplicateDiagram={handleDuplicateDiagram}
        onDeleteDiagram={handleDeleteDiagram}
        onRenameDiagram={handleRenameDiagram}
      />

      {activeDiagram && (
        <ImportExportModal
          isOpen={showImportExportModal}
          onClose={() => setShowImportExportModal(false)}
          schema={schema}
          activeDiagram={activeDiagram}
          onImportCode={handleCodeChange}
        />
      )}
    </div>
  );
}
