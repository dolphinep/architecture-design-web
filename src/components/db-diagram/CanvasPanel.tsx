"use client";

import React, { useState, useRef, useEffect } from 'react';
import { DBSchema, DBTable, DBRelationship, RelationalType } from '@/lib/db-diagram/types';

interface CanvasPanelProps {
  schema: DBSchema;
  positions: Record<string, { x: number; y: number }>;
  onPositionChange: (newPositions: Record<string, { x: number; y: number }>) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onDeleteTable?: (tableName: string) => void;
  onAddColumn?: (tableName: string) => void;
  onDeleteColumn?: (tableName: string, colName: string) => void;
  onUpdateColumn?: (tableName: string, oldColName: string, newColName: string, newType: string) => void;
  onAddOrUpdateRelationship?: (fromTable: string, fromCol: string, toTable: string, toCol: string, relType: RelationalType) => void;
  onDeleteRelationship?: (fromTable: string, fromCol: string, toTable: string, toCol: string) => void;
}

export default function CanvasPanel({
  schema,
  positions,
  onPositionChange,
  canvasRef,
  onDeleteTable,
  onAddColumn,
  onDeleteColumn,
  onUpdateColumn,
  onAddOrUpdateRelationship,
  onDeleteRelationship,
}: CanvasPanelProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Smooth 60fps local table dragging state
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>(positions);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  const [hoveredRelId, setHoveredRelId] = useState<string | null>(null);
  const [collapsedTables, setCollapsedTables] = useState<Record<string, boolean>>({});

  const [showFloatingTips, setShowFloatingTips] = useState(false);

  // Inline field editing state
  const [editingCell, setEditingCell] = useState<{ tableName: string; colName: string; field: 'name' | 'type' } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Drag-to-connect relationship line state (both for + handles and dragging existing lines)
  const [connectingStart, setConnectingStart] = useState<{ tableName: string; colName: string; startX: number; startY: number; existingRel?: DBRelationship } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pendingRelation, setPendingRelation] = useState<{ fromTable: string; fromCol: string; toTable: string; toCol: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize localPositions when external positions prop updates
  useEffect(() => {
    setLocalPositions(positions);
  }, [positions]);

  const toggleCollapse = (tableName: string) => {
    setCollapsedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  };

  // Keyboard listener for Delete / Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTableId && onDeleteTable) {
          onDeleteTable(selectedTableId);
          setSelectedTableId(null);
        } else if (selectedRelId && onDeleteRelationship) {
          const rel = schema.relationships.find(r => r.id === selectedRelId);
          if (rel) {
            onDeleteRelationship(rel.fromTable, rel.fromColumn, rel.toTable, rel.toColumn);
            setSelectedRelId(null);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTableId, selectedRelId, onDeleteTable, onDeleteRelationship, schema.relationships]);

  // Initialize missing table positions in a grid layout
  useEffect(() => {
    let updated = false;
    const newPos = { ...localPositions };

    schema.tables.forEach((table, idx) => {
      if (!newPos[table.name]) {
        const colCount = 3;
        const row = Math.floor(idx / colCount);
        const col = idx % colCount;
        newPos[table.name] = {
          x: 60 + col * 280,
          y: 60 + row * 320,
        };
        updated = true;
      }
    });

    if (updated) {
      setLocalPositions(newPos);
      onPositionChange(newPos);
    }
  }, [schema.tables]);

  // Handle Canvas Mouse Events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedTableId(null);
      setSelectedRelId(null);
      setEditingCell(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const curX = (e.clientX - rect.left - pan.x) / zoom;
      const curY = (e.clientY - rect.top - pan.y) / zoom;
      setMousePos({ x: curX, y: curY });

      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      } else if (draggingTableId) {
        // Fast, smooth local state update for 60fps table drag
        setLocalPositions(prev => ({
          ...prev,
          [draggingTableId]: {
            x: Math.max(10, curX - dragOffset.x),
            y: Math.max(10, curY - dragOffset.y),
          },
        }));
      }
    }
  };

  const handleMouseUp = () => {
    if (draggingTableId) {
      // Commit position change to parent / storage ONCE when table drag finishes
      onPositionChange(localPositions);
      setDraggingTableId(null);
    }
    setIsPanning(false);
    if (connectingStart) {
      setConnectingStart(null);
    }
  };

  // Table Drag Start & Select
  const handleTableMouseDown = (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTableId(tableName);
    setSelectedRelId(null);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const curX = (e.clientX - rect.left - pan.x) / zoom;
      const curY = (e.clientY - rect.top - pan.y) / zoom;
      const pos = localPositions[tableName] || { x: 60, y: 60 };

      setDraggingTableId(tableName);
      setDragOffset({
        x: curX - pos.x,
        y: curY - pos.y,
      });
    }
  };

  // Drag Connector Start (+ handle outside table)
  const handleStartConnect = (tableName: string, colName: string, side: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const anchor = getAnchor(tableName, colName, side === 'right');
    setConnectingStart({
      tableName,
      colName,
      startX: anchor.x,
      startY: anchor.y,
    });
  };

  // Drag Existing Line to Re-connect
  const handleStartDragLine = (rel: DBRelationship, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRelId(rel.id);
    const anchor = getAnchor(rel.fromTable, rel.fromColumn, true);
    setConnectingStart({
      tableName: rel.fromTable,
      colName: rel.fromColumn,
      startX: anchor.x,
      startY: anchor.y,
      existingRel: rel,
    });
  };

  // Drop Connector on Target Column
  const handleDropConnectTarget = (targetTable: string, targetCol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingStart && connectingStart.tableName !== targetTable) {
      const relType = connectingStart.existingRel ? connectingStart.existingRel.relationType : 'one-to-many';
      if (connectingStart.existingRel && onAddOrUpdateRelationship) {
        // If re-dragging an existing line, update it directly
        onAddOrUpdateRelationship(connectingStart.tableName, connectingStart.colName, targetTable, targetCol, relType);
      } else {
        // Open modal to choose relation type for new connection
        setPendingRelation({
          fromTable: connectingStart.tableName,
          fromCol: connectingStart.colName,
          toTable: targetTable,
          toCol: targetCol,
        });
      }
    }
    setConnectingStart(null);
  };

  // Apply Selected Relationship Type
  const handleSelectRelationType = (relType: RelationalType) => {
    if (pendingRelation && onAddOrUpdateRelationship) {
      onAddOrUpdateRelationship(
        pendingRelation.fromTable,
        pendingRelation.fromCol,
        pendingRelation.toTable,
        pendingRelation.toCol,
        relType
      );
    }
    setPendingRelation(null);
  };

  const handleDeletePendingRelation = () => {
    if (pendingRelation && onDeleteRelationship) {
      onDeleteRelationship(
        pendingRelation.fromTable,
        pendingRelation.fromCol,
        pendingRelation.toTable,
        pendingRelation.toCol
      );
    }
    setPendingRelation(null);
    setSelectedRelId(null);
  };

  // Save Inline Edit
  const handleSaveFieldEdit = (table: DBTable, col: { name: string; type: string }) => {
    if (!editingCell || !onUpdateColumn) return;

    const newName = editingCell.field === 'name' ? editValue.trim() || col.name : col.name;
    const newType = editingCell.field === 'type' ? editValue.trim() || col.type : col.type;

    onUpdateColumn(table.name, col.name, newName, newType);
    setEditingCell(null);
  };

  // Auto Layout
  const autoArrange = () => {
    const newPos: Record<string, { x: number; y: number }> = {};
    const count = schema.tables.length;
    const cols = Math.ceil(Math.sqrt(count));

    schema.tables.forEach((table, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      newPos[table.name] = {
        x: 60 + c * 290,
        y: 60 + r * 340,
      };
    });
    setLocalPositions(newPos);
    onPositionChange(newPos);
    setZoom(1);
    setPan({ x: 40, y: 40 });
  };

  // Helper to compute line anchor point for a column or table
  const getAnchor = (tableName: string, colName: string, isRightSide: boolean, otherTablePos?: { x: number; y: number }) => {
    const table = schema.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
    const pos = localPositions[table?.name || tableName] || { x: 60, y: 60 };
    const isCollapsed = collapsedTables[table?.name || tableName];

    const tableWidth = 240;
    const headerHeight = 38;

    let colY = pos.y + headerHeight / 2;

    if (!isCollapsed && table) {
      let colIdx = 0;
      const idx = table.columns.findIndex(c => c.name.toLowerCase() === colName.toLowerCase());
      if (idx !== -1) colIdx = idx;
      const rowHeight = 28;
      colY = pos.y + headerHeight + colIdx * rowHeight + rowHeight / 2;
    }

    const sideX = isRightSide ? pos.x + tableWidth : pos.x;

    return { x: sideX, y: colY };
  };

  return (
    <div className="relative flex-1 h-full bg-zinc-950 overflow-hidden select-none">
      {/* Floating Toolbar Controls */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur border border-zinc-800 p-1.5 rounded-lg shadow-xl text-xs text-zinc-300">
        <button
          onClick={() => setShowFloatingTips(!showFloatingTips)}
          className={`px-2.5 py-1 rounded flex items-center gap-1 text-[11px] font-medium transition-colors ${
            showFloatingTips
              ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
          }`}
          title="Toggle Syntax Tips & Cheatsheet"
        >
          <span className="text-amber-400">💡</span>
          Tips
        </button>
        <div className="w-px h-4 bg-zinc-800 mx-0.5" />

        <button
          onClick={() => setZoom(prev => Math.min(prev + 0.15, 2.0))}
          className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
          title="Zoom In"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <span className="w-10 text-center font-mono text-[11px] text-zinc-400">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.3))}
          className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
          title="Zoom Out"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <div className="w-px h-4 bg-zinc-800 mx-0.5" />
        <button
          onClick={autoArrange}
          className="px-2.5 py-1 bg-violet-950/60 hover:bg-violet-900/60 text-violet-200 border border-violet-800/50 rounded flex items-center gap-1 text-[11px] font-medium transition-colors"
          title="Auto Arrange Layout"
        >
          <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Auto Arrange
        </button>
      </div>

      {/* Floating Syntax Tips Panel */}
      {showFloatingTips && (
        <div className="absolute top-16 right-4 z-40 w-80 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-xl p-4 shadow-2xl text-xs text-zinc-300 animate-slide-in space-y-3 font-sans max-h-[calc(100vh-10rem)] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <span className="text-amber-400">💡</span> Canvas Actions & Shortcuts
            </span>
            <button onClick={() => setShowFloatingTips(false)} className="text-zinc-500 hover:text-white">
              ✕
            </button>
          </div>

          <div className="space-y-2.5 font-mono text-[11px]">
            <div className="p-2 bg-zinc-950/80 border border-zinc-800 rounded-lg">
              <div className="text-violet-400 font-semibold mb-1 text-[11px] font-sans">Visual Relationship Actions:</div>
              <div className="text-zinc-400 font-sans text-[11px] space-y-1">
                <div>&bull; <span className="text-white font-medium">Click & drag line or badge</span> to re-route relationship line.</div>
                <div>&bull; <span className="text-white font-medium">Click + handle on column</span> to draw a relationship line.</div>
                <div>&bull; <span className="text-white font-medium">Click 1:N / 1:1 badge</span> to change cardinality or delete line.</div>
                <div>&bull; <span className="text-white font-medium">Press Del / Backspace</span> to delete selected table or line.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Relationship Type & Delete Selector Modal */}
      {pendingRelation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-84 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="font-semibold text-white">Relationship Options</span>
              <button onClick={() => setPendingRelation(null)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="text-zinc-400 text-[11px] font-mono">
              Connecting <span className="text-violet-300">{pendingRelation.fromTable}.{pendingRelation.fromCol}</span> &rarr; <span className="text-violet-300">{pendingRelation.toTable}.{pendingRelation.toCol}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'one-to-many', label: '1 : N (One-to-Many)', desc: 'foreign key > pk' },
                { type: 'one-to-one', label: '1 : 1 (One-to-One)', desc: 'unique link -' },
                { type: 'many-to-one', label: 'N : 1 (Many-to-One)', desc: 'pk < foreign key' },
                { type: 'many-to-many', label: 'N : M (Many-to-Many)', desc: 'junction link <>' },
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => handleSelectRelationType(opt.type as RelationalType)}
                  className="p-2.5 bg-zinc-950 hover:bg-violet-950/80 border border-zinc-800 hover:border-violet-600 rounded-lg text-left transition-colors group"
                >
                  <div className="font-semibold text-white group-hover:text-violet-200 text-xs">{opt.label}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex justify-end">
              <button
                onClick={handleDeletePendingRelation}
                className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800/60 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Relationship
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`w-full h-full cursor-${isPanning ? 'grabbing' : 'grab'} bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]`}
      >
        <div
          ref={canvasRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="relative w-full h-full min-w-[3000px] min-h-[3000px]"
        >
          {/* SVG Layer for Relationship Lines & Live Drag Connector */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <marker id="marker-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
              </marker>
            </defs>

            {/* Active Live Drag-to-Connect Bezier Line */}
            {connectingStart && (
              <g>
                <path
                  d={`M ${connectingStart.startX} ${connectingStart.startY} C ${connectingStart.startX + (mousePos.x > connectingStart.startX ? 100 : -100)} ${connectingStart.startY}, ${mousePos.x + (mousePos.x > connectingStart.startX ? -100 : 100)} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray="6,4"
                />
                <circle cx={mousePos.x} cy={mousePos.y} r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
              </g>
            )}

            {/* Existing Relationship Lines */}
            {schema.relationships.map((rel, relIdx) => {
              const fromTable = schema.tables.find(t => t.name.toLowerCase() === rel.fromTable.toLowerCase());
              const toTable = schema.tables.find(t => t.name.toLowerCase() === rel.toTable.toLowerCase());

              if (!fromTable || !toTable) return null;

              const fromPos = localPositions[fromTable.name] || { x: 60, y: 60 };
              const toPos = localPositions[toTable.name] || { x: 60, y: 60 };

              const start = getAnchor(rel.fromTable, rel.fromColumn, toPos.x > fromPos.x, toPos);
              const end = getAnchor(rel.toTable, rel.toColumn, fromPos.x > toPos.x, fromPos);

              const dx = Math.abs(end.x - start.x) * 0.5;
              const pathD = `M ${start.x} ${start.y} C ${start.x + (end.x > start.x ? dx : -dx)} ${start.y}, ${end.x + (end.x > start.x ? -dx : dx)} ${end.y}, ${end.x} ${end.y}`;

              const isSelected = selectedRelId === rel.id;
              const isHighlighted =
                isSelected ||
                hoveredRelId === rel.id ||
                hoveredTableId === fromTable.name ||
                hoveredTableId === toTable.name ||
                selectedTableId === fromTable.name ||
                selectedTableId === toTable.name;

              return (
                <g key={rel.id || `rel_${relIdx}`} className="transition-all duration-200">
                  {/* Invisible wide stroke for easier clicking & line dragging */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                    className="cursor-pointer pointer-events-auto"
                    onMouseDown={(e) => handleStartDragLine(rel, e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRelId(rel.id);
                      setSelectedTableId(null);
                    }}
                    onMouseEnter={() => setHoveredRelId(rel.id)}
                    onMouseLeave={() => setHoveredRelId(null)}
                  />

                  {/* Visible Curve Path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isSelected ? '#ec4899' : isHighlighted ? '#818cf8' : '#475569'}
                    strokeWidth={isSelected ? 3.5 : isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={rel.relationType === 'many-to-many' ? '4,4' : undefined}
                    className="pointer-events-none"
                  />

                  {/* Cardinality Badge (Draggable Handle & Click to Open Modal) */}
                  <g
                    className="cursor-grab pointer-events-auto"
                    onMouseDown={(e) => handleStartDragLine(rel, e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRelId(rel.id);
                      setSelectedTableId(null);
                      setPendingRelation({
                        fromTable: rel.fromTable,
                        fromCol: rel.fromColumn,
                        toTable: rel.toTable,
                        toCol: rel.toColumn,
                      });
                    }}
                  >
                    <rect
                      x={(start.x + end.x) / 2 - 16}
                      y={(start.y + end.y) / 2 - 11}
                      width="32"
                      height="22"
                      rx="5"
                      fill={isSelected ? '#831843' : '#18181b'}
                      stroke={isSelected ? '#f43f5e' : isHighlighted ? '#6366f1' : '#3f3f46'}
                      strokeWidth={isSelected ? '2' : '1'}
                    />
                    <text
                      x={(start.x + end.x) / 2}
                      y={(start.y + end.y) / 2 + 4}
                      fill={isSelected ? '#fecdd3' : '#e4e4e7'}
                      fontSize="11"
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {rel.relationType === 'one-to-one' ? '1:1' : rel.relationType === 'many-to-many' ? 'N:M' : '1:N'}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Table Cards HTML Layer */}
          {schema.tables.map((table, tIdx) => {
            const pos = localPositions[table.name] || { x: 60, y: 60 };
            const isHovered = hoveredTableId === table.name;
            const isSelected = selectedTableId === table.name;
            const isCollapsed = collapsedTables[table.name] || false;

            return (
              <div
                key={table.id || `table_node_${table.name}_${tIdx}`}
                onClick={() => {
                  setSelectedTableId(table.name);
                  setSelectedRelId(null);
                }}
                onMouseEnter={() => setHoveredTableId(table.name)}
                onMouseLeave={() => setHoveredTableId(null)}
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  width: '240px',
                }}
                className={`absolute top-0 left-0 bg-zinc-900/95 rounded-xl border ${
                  isSelected
                    ? 'border-violet-400 ring-2 ring-violet-500/50 shadow-[0_0_25px_rgba(124,58,237,0.4)] z-30'
                    : isHovered
                    ? 'border-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.3)] z-30'
                    : 'border-zinc-800 shadow-xl z-20'
                } transition-shadow duration-75 text-xs`}
              >
                {/* Table Card Header Bar */}
                <div
                  onMouseDown={(e) => handleTableMouseDown(table.name, e)}
                  style={{ backgroundColor: table.headerColor || '#6366f1' }}
                  className="px-3 py-2 text-white font-semibold flex items-center justify-between cursor-move select-none rounded-t-xl"
                >
                  <div className="flex items-center gap-2 truncate">
                    <svg className="w-4 h-4 text-white/90 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
                    </svg>
                    <span className="font-mono text-sm tracking-wide truncate">{table.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onAddColumn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddColumn(table.name);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-black/30 text-white/90 rounded transition-colors"
                        title="Add Column"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}

                    {onDeleteTable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTable(table.name);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-rose-950 text-rose-200 rounded transition-colors"
                        title="Delete Table"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(table.name);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-black/30 text-white/90 rounded transition-colors"
                      title={isCollapsed ? "Expand Table" : "Collapse Table"}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {isCollapsed ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Column Field Rows (Hidden when Collapsed) */}
                {!isCollapsed && (
                  <div className="divide-y divide-zinc-800/60 bg-zinc-900 rounded-b-xl">
                    {table.columns.map((col, cIdx) => {
                      const isPk = col.constraints?.isPrimaryKey;
                      const isFk = col.constraints?.isForeignKey;
                      const isUnique = col.constraints?.isUnique;
                      const isNotNull = col.constraints?.isNotNull;

                      const isEditingName = editingCell?.tableName === table.name && editingCell?.colName === col.name && editingCell?.field === 'name';
                      const isEditingType = editingCell?.tableName === table.name && editingCell?.colName === col.name && editingCell?.field === 'type';

                      return (
                        <div
                          key={`${col.name}_${cIdx}`}
                          onMouseUp={(e) => handleDropConnectTarget(table.name, col.name, e)}
                          className="relative px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800/60 transition-colors h-[28px] group"
                        >
                          {/* Left Connector Handle (OUTSIDE TABLE BOUNDS) */}
                          <button
                            onMouseDown={(e) => handleStartConnect(table.name, col.name, 'left', e)}
                            className="absolute -left-5 top-1 w-5 h-5 rounded-full bg-sky-500 hover:bg-sky-400 border border-zinc-900 text-white flex items-center justify-center text-[12px] font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 cursor-crosshair"
                            title="Click and drag + to link relationship"
                          >
                            +
                          </button>

                          {/* Column Name & Key Badges (Inline Editable) */}
                          <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                            {isPk && (
                              <span title="Primary Key" className="text-amber-400 font-bold text-[10px] shrink-0">
                                🔑
                              </span>
                            )}
                            {isFk && (
                              <span title="Foreign Key" className="text-sky-400 font-bold text-[10px] shrink-0">
                                🔗
                              </span>
                            )}

                            {isEditingName ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveFieldEdit(table, col)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveFieldEdit(table, col)}
                                autoFocus
                                className="bg-zinc-950 border border-violet-500 text-white font-mono text-[11px] px-1 py-0 rounded w-20 focus:outline-none"
                              />
                            ) : (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCell({ tableName: table.name, colName: col.name, field: 'name' });
                                  setEditValue(col.name);
                                }}
                                className={`font-mono text-[11px] truncate cursor-pointer hover:underline hover:text-violet-300 ${
                                  isPk ? 'font-semibold text-zinc-100' : 'text-zinc-300'
                                }`}
                                title="Click to edit column name"
                              >
                                {col.name}
                              </span>
                            )}
                          </div>

                          {/* Column Type & Constraints (Inline Editable Type) */}
                          <div className="flex items-center gap-1 shrink-0">
                            {isUnique && (
                              <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800/60 px-1 rounded font-mono">
                                UQ
                              </span>
                            )}
                            {isNotNull && !isPk && (
                              <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1 rounded font-mono">
                                NN
                              </span>
                            )}

                            {isEditingType ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveFieldEdit(table, col)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveFieldEdit(table, col)}
                                autoFocus
                                className="bg-zinc-950 border border-violet-500 text-white font-mono text-[10px] px-1 py-0 rounded w-16 focus:outline-none"
                              />
                            ) : (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCell({ tableName: table.name, colName: col.name, field: 'type' });
                                  setEditValue(col.type);
                                }}
                                className="font-mono text-[10px] text-zinc-400 hover:text-violet-300 cursor-pointer hover:underline shrink-0"
                                title="Click to edit type"
                              >
                                {col.type}
                              </span>
                            )}

                            {/* Delete Column button on hover */}
                            {onDeleteColumn && !isPk && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteColumn(table.name, col.name);
                                }}
                                className="hidden group-hover:block ml-1 text-zinc-500 hover:text-rose-400 transition-colors"
                                title="Remove Column"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Right Connector Handle (OUTSIDE TABLE BOUNDS) */}
                          <button
                            onMouseDown={(e) => handleStartConnect(table.name, col.name, 'right', e)}
                            className="absolute -right-5 top-1 w-5 h-5 rounded-full bg-sky-500 hover:bg-sky-400 border border-zinc-900 text-white flex items-center justify-center text-[12px] font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 cursor-crosshair"
                            title="Click and drag + to link relationship"
                          >
                            +
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
