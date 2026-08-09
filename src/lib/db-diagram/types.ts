export type RelationalType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

export type DBEngineType = 'rds' | 'nosql';

export interface ColumnConstraint {
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isNotNull?: boolean;
  defaultValue?: string;
  autoIncrement?: boolean;
}

export interface DBColumn {
  name: string;
  type: string;
  constraints?: ColumnConstraint;
  note?: string;
}

export interface DBTable {
  id: string;
  name: string;
  schema?: string;
  alias?: string;
  headerColor?: string;
  columns: DBColumn[];
  x?: number;
  y?: number;
  note?: string;
  engineType?: DBEngineType; // RDS first, extensible to NoSQL later
}

export interface DBRelationship {
  id: string;
  name?: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationType: RelationalType;
  onDelete?: string;
  onUpdate?: string;
}

export interface DBSchema {
  tables: DBTable[];
  relationships: DBRelationship[];
  engineType: DBEngineType;
}

export interface SavedDiagram {
  id: string;
  title: string;
  code: string;
  engineType: DBEngineType;
  positions: Record<string, { x: number; y: number }>;
  createdAt: number;
  updatedAt: number;
}

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  schema: DBSchema;
  errors: ParseError[];
}
