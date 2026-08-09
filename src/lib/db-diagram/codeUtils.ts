import { RelationalType } from './types';

/**
 * Code manipulation utilities for bidirectional canvas-to-code editing.
 */

export function deleteTableFromCode(code: string, tableName: string): string {
  const lines = code.split('\n');
  const newLines: string[] = [];

  let inTargetTable = false;
  const targetLower = tableName.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check table start
    const tableMatch = trimmed.match(/^Table\s+([a-zA-Z0-9_.\-]+)/i);
    const sqlTableMatch = trimmed.match(/^CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_.\-`"]+)/i);

    const name = tableMatch ? tableMatch[1] : sqlTableMatch ? sqlTableMatch[2].replace(/[`"]/g, '') : null;

    if (name && name.toLowerCase() === targetLower) {
      inTargetTable = true;
      continue;
    }

    if (inTargetTable) {
      if (trimmed.startsWith('}') || trimmed.startsWith(');') || trimmed === ')') {
        inTargetTable = false;
      }
      continue;
    }

    // Filter out relationship refs referencing this table
    const refMatch = trimmed.match(/^(Ref\s*([a-zA-Z0-9_]+)?\s*:\s*)?([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*([><\-]+)\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i);
    if (refMatch) {
      const fromT = refMatch[3].toLowerCase();
      const toT = refMatch[6].toLowerCase();
      if (fromT === targetLower || toT === targetLower) {
        continue;
      }
    }

    newLines.push(line);
  }

  return newLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function addColumnToTableInCode(code: string, tableName: string): string {
  const lines = code.split('\n');
  const newLines: string[] = [];

  let inserted = false;
  const targetLower = tableName.toLowerCase();
  let inTargetTable = false;
  let colCounter = 1;

  // Count existing columns in table to generate new_col_1
  lines.forEach(l => {
    if (l.trim().match(/new_column_/i)) colCounter++;
  });

  const newColName = `new_column_${colCounter}`;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const tableMatch = trimmed.match(/^Table\s+([a-zA-Z0-9_.\-]+)/i);
    if (tableMatch && tableMatch[1].toLowerCase() === targetLower) {
      inTargetTable = true;
    }

    if (inTargetTable && (trimmed.startsWith('}') || trimmed.startsWith(');') || trimmed === ')')) {
      newLines.push(`  ${newColName} varchar`);
      inserted = true;
      inTargetTable = false;
    }

    newLines.push(line);
  }

  if (!inserted) {
    // If table wasn't found in DBML format, append simple DBML block
    newLines.push(`\nTable ${tableName} {\n  id integer [pk]\n  ${newColName} varchar\n}`);
  }

  return newLines.join('\n');
}

export function deleteColumnFromTableInCode(code: string, tableName: string, colName: string): string {
  const lines = code.split('\n');
  const newLines: string[] = [];

  const targetTableLower = tableName.toLowerCase();
  const targetColLower = colName.toLowerCase();
  let inTargetTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const tableMatch = trimmed.match(/^Table\s+([a-zA-Z0-9_.\-]+)/i);
    if (tableMatch && tableMatch[1].toLowerCase() === targetTableLower) {
      inTargetTable = true;
    }

    if (inTargetTable) {
      if (trimmed.startsWith('}') || trimmed.startsWith(');') || trimmed === ')') {
        inTargetTable = false;
      } else {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 1 && parts[0].replace(/[`"]/g, '').toLowerCase() === targetColLower) {
          // Skip this column line
          continue;
        }
      }
    }

    newLines.push(line);
  }

  return newLines.join('\n');
}

export function updateColumnInCode(
  code: string,
  tableName: string,
  oldColName: string,
  newColName: string,
  newType: string
): string {
  const lines = code.split('\n');
  const newLines: string[] = [];

  const targetTableLower = tableName.toLowerCase();
  const targetColLower = oldColName.toLowerCase();
  let inTargetTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const tableMatch = trimmed.match(/^Table\s+([a-zA-Z0-9_.\-]+)/i);
    if (tableMatch && tableMatch[1].toLowerCase() === targetTableLower) {
      inTargetTable = true;
    }

    if (inTargetTable) {
      if (trimmed.startsWith('}') || trimmed.startsWith(');') || trimmed === ')') {
        inTargetTable = false;
      } else {
        const bracketMatch = line.match(/\[(.*?)\]/);
        const bracketStr = bracketMatch ? ` [${bracketMatch[1]}]` : '';

        const parts = trimmed.split(/\s+/);
        if (parts.length >= 1 && parts[0].replace(/[`"]/g, '').toLowerCase() === targetColLower) {
          const indent = line.match(/^\s*/)?.[0] || '  ';
          newLines.push(`${indent}${newColName} ${newType}${bracketStr}`);
          continue;
        }
      }
    }

    // Also update any Ref lines that refer to oldColName
    const refMatch = line.match(/^(Ref\s*([a-zA-Z0-9_]+)?\s*:\s*)?([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*([><\-]+)\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i);
    if (refMatch) {
      let updatedLine = line;
      if (refMatch[3].toLowerCase() === targetTableLower && refMatch[4].toLowerCase() === targetColLower) {
        updatedLine = updatedLine.replace(`${refMatch[3]}.${refMatch[4]}`, `${refMatch[3]}.${newColName}`);
      }
      if (refMatch[6].toLowerCase() === targetTableLower && refMatch[7].toLowerCase() === targetColLower) {
        updatedLine = updatedLine.replace(`${refMatch[6]}.${refMatch[7]}`, `${refMatch[6]}.${newColName}`);
      }
      newLines.push(updatedLine);
      continue;
    }

    newLines.push(line);
  }

  return newLines.join('\n');
}

export function addOrUpdateRelationshipInCode(
  code: string,
  fromTable: string,
  fromCol: string,
  toTable: string,
  toCol: string,
  relType: RelationalType
): string {
  let op = '>';
  if (relType === 'one-to-one') op = '-';
  else if (relType === 'many-to-one') op = '<';
  else if (relType === 'many-to-many') op = '<>';

  const lines = code.split('\n');
  const newLines: string[] = [];
  let updated = false;

  const fTL = fromTable.toLowerCase();
  const fCL = fromCol.toLowerCase();
  const tTL = toTable.toLowerCase();
  const tCL = toCol.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const refMatch = line.trim().match(/^(Ref\s*([a-zA-Z0-9_]+)?\s*:\s*)?([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*([><\-]+)\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i);
    if (refMatch) {
      const fromMatch = refMatch[3].toLowerCase() === fTL && refMatch[4].toLowerCase() === fCL && refMatch[6].toLowerCase() === tTL && refMatch[7].toLowerCase() === tCL;
      const reverseMatch = refMatch[3].toLowerCase() === tTL && refMatch[4].toLowerCase() === tCL && refMatch[6].toLowerCase() === fTL && refMatch[7].toLowerCase() === fCL;

      if (fromMatch || reverseMatch) {
        newLines.push(`Ref: ${fromTable}.${fromCol} ${op} ${toTable}.${toCol}`);
        updated = true;
        continue;
      }
    }
    newLines.push(line);
  }

  if (!updated) {
    newLines.push(`\nRef: ${fromTable}.${fromCol} ${op} ${toTable}.${toCol}`);
  }

  return newLines.join('\n');
}

export function deleteRelationshipFromCode(
  code: string,
  fromTable: string,
  fromCol: string,
  toTable: string,
  toCol: string
): string {
  const lines = code.split('\n');
  const newLines: string[] = [];

  const fTL = fromTable.toLowerCase();
  const fCL = fromCol.toLowerCase();
  const tTL = toTable.toLowerCase();
  const tCL = toCol.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const refMatch = line.trim().match(/^(Ref\s*([a-zA-Z0-9_]+)?\s*:\s*)?([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*([><\-]+)\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i);
    if (refMatch) {
      const fromMatch = refMatch[3].toLowerCase() === fTL && refMatch[4].toLowerCase() === fCL && refMatch[6].toLowerCase() === tTL && refMatch[7].toLowerCase() === tCL;
      const reverseMatch = refMatch[3].toLowerCase() === tTL && refMatch[4].toLowerCase() === tCL && refMatch[6].toLowerCase() === fTL && refMatch[7].toLowerCase() === fCL;

      if (fromMatch || reverseMatch) {
        continue;
      }
    }
    newLines.push(line);
  }

  return newLines.join('\n');
}
