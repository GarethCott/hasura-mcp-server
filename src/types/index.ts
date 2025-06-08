export interface HasuraConfig {
  endpoint: string;
  adminSecret?: string;
  projectPath: string;
}

// NEW: PostgreSQL Configuration
export interface PostgresConfig {
  connectionString: string;
  poolSize?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

// NEW: Database Connection Details
export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  primaryKey?: boolean;
  unique?: boolean;
}

export interface TableDefinition {
  name: string;
  columns: TableColumn[];
  schema?: string;
}

export interface RelationshipDefinition {
  name: string;
  type: 'object' | 'array';
  table: string;
  schema?: string;
  using: {
    foreign_key_constraint_on?: string;
    manual_configuration?: {
      remote_table: { name: string; schema?: string };
      column_mapping: Record<string, string>;
    };
  };
}

export interface PermissionDefinition {
  role: string;
  permission: 'select' | 'insert' | 'update' | 'delete';
  filter?: Record<string, unknown>;
  columns?: string[] | '*';
  check?: Record<string, unknown>;
  set?: Record<string, unknown>;
}

export interface MigrationFile {
  timestamp: string;
  name: string;
  upSql: string;
  downSql: string;
}

export interface HasuraMetadata {
  version: number;
  sources: Array<{
    name: string;
    kind: string;
    tables: Array<{
      table: { name: string; schema: string };
      configuration?: unknown;
      object_relationships?: unknown[];
      array_relationships?: unknown[];
      insert_permissions?: unknown[];
      select_permissions?: unknown[];
      update_permissions?: unknown[];
      delete_permissions?: unknown[];
    }>;
    configuration: {
      connection_info: {
        database_url: { from_env: string };
      };
    };
  }>;
}

// NEW: Enhanced Schema Analysis
export interface TableInfo {
  name: string;
  schema: string;
  columns: TableColumn[];
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
  rowCount?: number;
}

export interface RelationshipInfo {
  name: string;
  type: 'foreign_key' | 'one_to_one' | 'one_to_many' | 'many_to_many';
  sourceTable: string;
  targetTable: string;
  columns: Record<string, string>;
}

export interface IndexInfo {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: string;
}

export interface ConstraintInfo {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

export interface FunctionInfo {
  name: string;
  schema: string;
  returnType: string;
  parameters: Array<{
    name: string;
    type: string;
  }>;
}

export interface PerformanceMetrics {
  slowQueries: Array<{
    query: string;
    avgTime: number;
    calls: number;
  }>;
  tableStats: Array<{
    table: string;
    size: string;
    rowCount: number;
    indexUsage: number;
  }>;
  connectionStats: {
    active: number;
    idle: number;
    total: number;
  };
}

export interface OptimizationSuggestion {
  type: 'index' | 'query' | 'schema' | 'performance';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  sql?: string;
}

export interface SchemaAnalysis {
  tables: TableInfo[];
  relationships: RelationshipInfo[];
  indexes: IndexInfo[];
  functions: FunctionInfo[];
  performance: PerformanceMetrics;
  suggestions: OptimizationSuggestion[];
}

// NEW: Execution Results
export interface ExecutionResult {
  success: boolean;
  rowsAffected?: number;
  data?: Record<string, any>[];
  executionTime: number;
  migrationCreated?: string;
  metadataUpdated?: boolean;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface QueryResult {
  rows: Record<string, any>[];
  rowCount: number;
  fields: Array<{
    name: string;
    dataTypeID: number;
  }>;
}

export interface TransactionOperation {
  sql: string;
  params?: unknown[];
}

export interface TransactionResult {
  success: boolean;
  results: QueryResult[];
  error?: string;
}

export interface QueryPlan {
  plan: unknown;
  executionTime?: number;
  cost?: number;
}

// NEW: Integration Types
export interface CreateTableParams {
  name: string;
  columns: TableColumn[];
  schema?: string;
  executeImmediately?: boolean;
}

export interface AddColumnParams {
  table: string;
  column: TableColumn;
  schema?: string;
  executeImmediately?: boolean;
}

export interface RelationshipParams {
  name: string;
  type: 'object' | 'array';
  sourceTable: string;
  targetTable: string;
  columnMapping: Record<string, string>;
  schema?: string;
  executeImmediately?: boolean;
}

export interface IntegrationResult {
  executed: boolean;
  migrationCreated?: string;
  metadataUpdated: boolean;
  preview?: ChangePreview;
  error?: string;
}

export interface ChangePreview {
  sql: string;
  affectedTables: string[];
  estimatedImpact: string;
  warnings: string[];
}

export interface ConsistencyReport {
  consistent: boolean;
  issues: Array<{
    type: string;
    description: string;
    severity: 'error' | 'warning';
  }>;
}

export interface OptimizationReport {
  applied: OptimizationSuggestion[];
  failed: Array<{
    suggestion: OptimizationSuggestion;
    error: string;
  }>;
}

export interface SafeExecutionResult {
  success: boolean;
  migration?: string;
  rollbackPerformed?: boolean;
  error?: string;
}

export interface WorkflowResult {
  executed: boolean;
  migrationCreated?: string;
  metadataUpdated: boolean;
  preview: ChangePreview;
  error?: string;
}

// NEW: Advanced PostgreSQL Operation Types
export interface CreateFunctionParams {
  name: string;
  parameters: string;
  returnType: string;
  language: string;
  body: string;
  options?: string;
  schema?: string;
}

export interface CreateTriggerParams {
  name: string;
  tableName: string;
  functionName: string;
  when: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  forEach: 'ROW' | 'STATEMENT';
  condition?: string;
  schema?: string;
}

export interface CreateIndexParams {
  tableName: string;
  indexName: string;
  columns: string[];
  unique?: boolean;
  type?: string;
  where?: string;
  schema?: string;
}

export interface AlterTableParams {
  tableName: string;
  operation: string;
  details: string;
  schema?: string;
}

export interface InsertParams {
  table: string;
  data: Record<string, unknown>;
  schema?: string;
}

export interface UpdateParams {
  table: string;
  data: Record<string, unknown>;
  where: string;
  schema?: string;
}

export interface DeleteParams {
  table: string;
  where: string;
  schema?: string;
}

export interface MigrationInfo {
  id: string;
  name: string;
  timestamp: string;
  applied: boolean;
  sql?: string;
}

export interface TriggerInfo {
  name: string;
  table: string;
  function: string;
  when: string;
  events: string[];
  forEach: string;
  condition?: string;
} 