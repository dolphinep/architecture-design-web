import { DBSchema, DBTable, DBColumn, DBRelationship, ParseResult, ParseError, RelationalType } from './types';

/**
 * Parses DBML or SQL DDL markup code into a structured DBSchema with tables and relationships.
 */
export function parseDBCode(code: string): ParseResult {
  const lines = code.split('\n');
  const tables: DBTable[] = [];
  const relationships: DBRelationship[] = [];
  const errors: ParseError[] = [];

  let currentTable: DBTable | null = null;
  let inTableBlock = false;

  lines.forEach((lineRaw, idx) => {
    const lineNumber = idx + 1;
    let line = lineRaw.trim();

    // Strip comments
    if (line.startsWith('//') || line.startsWith('--')) {
      return;
    }
    const inlineCommentIdx = line.indexOf('//');
    if (inlineCommentIdx !== -1) {
      line = line.substring(0, inlineCommentIdx).trim();
    }

    if (!line) return;

    // Detect DBML Table Header: Table name { or Table schema.name as alias {
    const dbmlTableMatch = line.match(/^Table\s+([a-zA-Z0-9_.\-]+)(\s+as\s+([a-zA-Z0-9_]+))?\s*\{/i);
    // Detect SQL CREATE TABLE: CREATE TABLE name ( or CREATE TABLE schema.name (
    const sqlTableMatch = line.match(/^CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_.\-`"]+)\s*\(/i);

    if (dbmlTableMatch || sqlTableMatch) {
      if (inTableBlock && currentTable) {
        tables.push(currentTable);
      }

      const rawTableName = (dbmlTableMatch ? dbmlTableMatch[1] : sqlTableMatch![2]).replace(/[`"]/g, '');
      const alias = dbmlTableMatch ? dbmlTableMatch[3] : undefined;

      // Ensure unique table name if duplicate table headers appear
      let tableName = rawTableName;
      let counter = 2;
      while (tables.some(t => t.name.toLowerCase() === tableName.toLowerCase())) {
        tableName = `${rawTableName}_${counter}`;
        counter++;
      }

      // Assign a distinctive header color preset based on table index
      const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#3b82f6'];
      const headerColor = colors[tables.length % colors.length];

      currentTable = {
        id: `table_${tableName.toLowerCase()}_${tables.length}_${Math.random().toString(36).substr(2, 4)}`,
        name: tableName,
        alias,
        headerColor,
        columns: [],
        engineType: 'rds',
      };
      inTableBlock = true;
      return;
    }

    // Closing table block
    if (inTableBlock && (line.startsWith('}') || line.startsWith(');') || line === ')')) {
      if (currentTable) {
        tables.push(currentTable);
        currentTable = null;
      }
      inTableBlock = false;
      return;
    }

    // Parse Column inside Table block
    if (inTableBlock && currentTable) {
      const colParsed = parseColumnLine(line, currentTable.name, relationships);
      if (colParsed) {
        currentTable.columns.push(colParsed);
      }
      return;
    }

    // Parse standalone DBML Ref: Ref: table1.col1 > table2.col2 or Ref rel_name: table1.col1 - table2.col2
    const refMatch = line.match(/^(Ref\s*([a-zA-Z0-9_]+)?\s*:\s*)?([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*([><\-]+)\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i);
    if (refMatch) {
      const relName = refMatch[2];
      const fromTable = refMatch[3];
      const fromCol = refMatch[4];
      const operator = refMatch[5];
      const toTable = refMatch[6];
      const toCol = refMatch[7];

      let relType: RelationalType = 'one-to-many';
      if (operator === '>') relType = 'one-to-many';
      else if (operator === '<') relType = 'many-to-one';
      else if (operator === '-') relType = 'one-to-one';
      else if (operator === '<>') relType = 'many-to-many';

      relationships.push({
        id: `rel_${fromTable}_${fromCol}_${toTable}_${toCol}_${relationships.length}`,
        name: relName,
        fromTable,
        fromColumn: fromCol,
        toTable,
        toColumn: toCol,
        relationType: relType,
      });
      return;
    }

    // Parse SQL ALTER TABLE ADD FOREIGN KEY: ALTER TABLE posts ADD FOREIGN KEY (user_id) REFERENCES users(id)
    const alterFkMatch = line.match(/ALTER\s+TABLE\s+([a-zA-Z0-9_]+)\s+ADD\s+(CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?FOREIGN\s+KEY\s*\(([a-zA-Z0-9_]+)\)\s*REFERENCES\s+([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_]+)\)/i);
    if (alterFkMatch) {
      const fromTable = alterFkMatch[1];
      const fromCol = alterFkMatch[3];
      const toTable = alterFkMatch[4];
      const toCol = alterFkMatch[5];

      relationships.push({
        id: `rel_${fromTable}_${fromCol}_${toTable}_${toCol}_${relationships.length}`,
        fromTable,
        fromColumn: fromCol,
        toTable,
        toColumn: toCol,
        relationType: 'one-to-many',
      });
      return;
    }
  });

  // Catch unclosed table block
  if (inTableBlock && currentTable) {
    tables.push(currentTable);
  }

  // Deduplicate relationships and resolve foreign key column constraints
  const finalRels: DBRelationship[] = [];
  const relKeys = new Set<string>();

  relationships.forEach(r => {
    const key = `${r.fromTable}.${r.fromColumn}->${r.toTable}.${r.toColumn}`;
    if (!relKeys.has(key)) {
      relKeys.add(key);
      finalRels.push(r);
    }
  });

  // Tag column constraints if referenced in relationships
  tables.forEach(table => {
    table.columns.forEach(col => {
      const isFk = finalRels.some(r => r.fromTable.toLowerCase() === table.name.toLowerCase() && r.fromColumn.toLowerCase() === col.name.toLowerCase());
      if (isFk) {
        col.constraints = { ...col.constraints, isForeignKey: true };
      }
    });
  });

  return {
    schema: {
      tables,
      relationships: finalRels,
      engineType: 'rds',
    },
    errors,
  };
}

function parseColumnLine(line: string, currentTableName: string, relationships: DBRelationship[]): DBColumn | null {
  // Strip trailing commas from SQL lines
  let cleanLine = line.trim();
  if (cleanLine.endsWith(',')) {
    cleanLine = cleanLine.slice(0, -1).trim();
  }

  // Ignore constraint lines in SQL (PRIMARY KEY (...), FOREIGN KEY (...))
  if (cleanLine.match(/^(PRIMARY\s+KEY|FOREIGN\s+KEY|CONSTRAINT|KEY|INDEX)/i)) {
    return null;
  }

  // Extract square brackets DBML metadata: col_name type [pk, not null, ref: > users.id]
  const bracketMatch = cleanLine.match(/^(.*?)\s*\[(.*?)\]$/);
  let colDecl = cleanLine;
  let bracketContent = '';

  if (bracketMatch) {
    colDecl = bracketMatch[1].trim();
    bracketContent = bracketMatch[2].trim();
  }

  const parts = colDecl.split(/\s+/);
  if (parts.length < 2) return null;

  const colName = parts[0].replace(/[`"]/g, '');
  const colType = parts[1].replace(/[`"]/g, '');
  const restStr = parts.slice(2).join(' ').toUpperCase();

  const isPrimaryKey = /PRIMARY\s+KEY|\bPK\b/i.test(colDecl) || /pk|primary key/i.test(bracketContent);
  const isNotNull = /NOT\s+NULL/i.test(restStr) || /not null|nn/i.test(bracketContent);
  const isUnique = /UNIQUE/i.test(restStr) || /unique/i.test(bracketContent);
  const autoIncrement = /AUTO_INCREMENT|INCREMENT/i.test(restStr) || /increment/i.test(bracketContent);

  // Check inline DBML ref in brackets: [ref: > users.id] or [ref: - profiles.id]
  if (bracketContent) {
    const inlineRefMatch = bracketContent.match(/ref\s*:\s*([><\-]+)\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i);
    if (inlineRefMatch) {
      const operator = inlineRefMatch[1];
      const targetTable = inlineRefMatch[2];
      const targetCol = inlineRefMatch[3];

      let relType: RelationalType = 'one-to-many';
      if (operator === '>') relType = 'one-to-many';
      else if (operator === '<') relType = 'many-to-one';
      else if (operator === '-') relType = 'one-to-one';

      relationships.push({
        id: `rel_${currentTableName}_${colName}_${targetTable}_${targetCol}_${relationships.length}`,
        fromTable: currentTableName,
        fromColumn: colName,
        toTable: targetTable,
        toColumn: targetCol,
        relationType: relType,
      });
    }
  }

  // Check inline SQL REFERENCES: col_name type REFERENCES users(id)
  const sqlRefMatch = cleanLine.match(/REFERENCES\s+([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_]+)\)/i);
  if (sqlRefMatch) {
    const targetTable = sqlRefMatch[1];
    const targetCol = sqlRefMatch[2];

    relationships.push({
      id: `rel_${currentTableName}_${colName}_${targetTable}_${targetCol}_${relationships.length}`,
      fromTable: currentTableName,
      fromColumn: colName,
      toTable: targetTable,
      toColumn: targetCol,
      relationType: 'one-to-many',
    });
  }

  return {
    name: colName,
    type: colType,
    constraints: {
      isPrimaryKey: !!isPrimaryKey,
      isNotNull: !!isNotNull,
      isUnique: !!isUnique,
      autoIncrement: !!autoIncrement,
    },
  };
}
