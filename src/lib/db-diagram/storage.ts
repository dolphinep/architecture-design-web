import { SavedDiagram, DBEngineType } from './types';

const STORAGE_KEY = 'arch_db_diagrams_v1';
const ACTIVE_DIAGRAM_KEY = 'arch_db_active_diagram_id_v1';
export const MAX_DIAGRAM_LIMIT = 50;

/**
 * Retrieves all saved diagrams from LocalStorage, sorted by updatedAt descending.
 */
export function loadSavedDiagrams(): SavedDiagram[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDiagram[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch (err) {
    console.error('Failed to load saved DB diagrams:', err);
    return [];
  }
}

/**
 * Saves or updates a diagram in LocalStorage.
 * Enforces the maximum 50 diagram cap rule.
 */
export function saveDiagram(
  data: Partial<SavedDiagram> & { title: string; code: string }
): { success: boolean; diagram?: SavedDiagram; error?: string } {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window not defined' };
  }

  try {
    const diagrams = loadSavedDiagrams();
    const now = Date.now();
    let targetDiagram: SavedDiagram;

    const existingIdx = data.id ? diagrams.findIndex(d => d.id === data.id) : -1;

    if (existingIdx !== -1) {
      // Update existing diagram
      targetDiagram = {
        ...diagrams[existingIdx],
        title: data.title || diagrams[existingIdx].title,
        code: data.code,
        engineType: data.engineType || diagrams[existingIdx].engineType || 'rds',
        positions: data.positions || diagrams[existingIdx].positions || {},
        updatedAt: now,
      };
      diagrams[existingIdx] = targetDiagram;
    } else {
      // Check 50 diagram cap before adding a new one
      if (diagrams.length >= MAX_DIAGRAM_LIMIT) {
        return {
          success: false,
          error: `Storage limit reached (${MAX_DIAGRAM_LIMIT} diagrams max). Please delete an old diagram to create a new one.`,
        };
      }

      targetDiagram = {
        id: `diagram_${now}_${Math.random().toString(36).substr(2, 6)}`,
        title: data.title || 'Untitled Diagram',
        code: data.code,
        engineType: data.engineType || 'rds',
        positions: data.positions || {},
        createdAt: now,
        updatedAt: now,
      };
      diagrams.unshift(targetDiagram);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
    setActiveDiagramId(targetDiagram.id);
    return { success: true, diagram: targetDiagram };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Deletes a diagram by ID.
 */
export function deleteDiagram(id: string): SavedDiagram[] {
  if (typeof window === 'undefined') return [];
  const diagrams = loadSavedDiagrams().filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));

  if (getActiveDiagramId() === id) {
    if (diagrams.length > 0) {
      setActiveDiagramId(diagrams[0].id);
    } else {
      localStorage.removeItem(ACTIVE_DIAGRAM_KEY);
    }
  }

  return diagrams;
}

/**
 * Duplicates a diagram by ID.
 */
export function duplicateDiagram(id: string): SavedDiagram | null {
  const diagrams = loadSavedDiagrams();
  const source = diagrams.find(d => d.id === id);
  if (!source) return null;

  const result = saveDiagram({
    title: `${source.title} (Copy)`,
    code: source.code,
    engineType: source.engineType,
    positions: source.positions,
  });

  return result.diagram || null;
}

/**
 * Renames a diagram by ID.
 */
export function renameDiagram(id: string, newTitle: string): SavedDiagram[] {
  const diagrams = loadSavedDiagrams();
  const target = diagrams.find(d => d.id === id);
  if (target) {
    target.title = newTitle;
    target.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
  }
  return loadSavedDiagrams();
}

/**
 * Gets active diagram ID from LocalStorage.
 */
export function getActiveDiagramId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_DIAGRAM_KEY);
}

/**
 * Sets active diagram ID in LocalStorage.
 */
export function setActiveDiagramId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_DIAGRAM_KEY, id);
}
