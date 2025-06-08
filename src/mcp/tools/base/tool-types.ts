import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Base tool execution result
export interface ToolResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

// Tool execution context
export interface ToolContext {
  toolName: string;
  args: Record<string, unknown>;
  timestamp: Date;
}

// Base tool interface
export interface BaseTool {
  name: string;
  description: string;
  schema: Tool['inputSchema'];
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

// Tool category types
export type ToolCategory = 'hasura' | 'postgres' | 'utility';

// Tool registration interface
export interface ToolRegistration {
  category: ToolCategory;
  tools: BaseTool[];
}

// Common argument types
export interface SchemaArgs {
  schema?: string;
}

export interface MigrationArgs {
  createMigration?: boolean;
  migrationName?: string;
}

export interface TableArgs extends SchemaArgs {
  tableName: string;
}

export interface ColumnArgs extends TableArgs {
  columnName: string;
}

// Hasura-specific types
export interface HasuraTableArgs extends TableArgs {
  columns: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    default?: string;
    primaryKey?: boolean;
    unique?: boolean;
  }>;
}

export interface HasuraRelationshipArgs extends TableArgs {
  relationship: {
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
  };
}

export interface HasuraPermissionArgs extends TableArgs {
  role: string;
  permission: 'select' | 'insert' | 'update' | 'delete';
  filter?: Record<string, unknown>;
  columns?: string[] | '*';
  check?: Record<string, unknown>;
  set?: Record<string, unknown>;
}

// PostgreSQL-specific types
export interface PostgresFunctionArgs extends SchemaArgs, MigrationArgs {
  name: string;
  parameters: string;
  returnType: string;
  language: string;
  body: string;
  options?: string;
}

export interface PostgresTriggerArgs extends SchemaArgs, MigrationArgs {
  name: string;
  tableName: string;
  functionName: string;
  when: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  forEach: 'ROW' | 'STATEMENT';
  condition?: string;
}

export interface PostgresIndexArgs extends SchemaArgs, MigrationArgs {
  tableName: string;
  indexName: string;
  columns: string[];
  unique?: boolean;
  type?: string;
  where?: string;
}

export interface PostgresAlterTableArgs extends SchemaArgs, MigrationArgs {
  tableName: string;
  operation: string;
  details: string;
}

export interface PostgresDataArgs extends SchemaArgs {
  table: string;
  data?: Record<string, unknown>;
  where?: string;
}

// SQL execution types
export interface SqlExecutionArgs extends MigrationArgs {
  sql: string;
}

export interface SqlValidationArgs {
  sql: string;
}

// Schema analysis types
export interface SchemaAnalysisArgs extends SchemaArgs {
  includePerformance?: boolean;
}

// Migration types
export interface MigrationGenerationArgs {
  name: string;
  upSql: string;
  downSql?: string;
}

export interface MigrationApplicationArgs {
  applyMetadata?: boolean;
}

// Utility result types
export interface ValidationResult extends ToolResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AnalysisResult extends ToolResult {
  tables: unknown[];
  relationships: unknown[];
  suggestions: unknown[];
}

export interface ConnectionResult extends ToolResult {
  connected: boolean;
  connectionInfo?: {
    host: string;
    database: string;
    user: string;
  };
}

export interface MigrationResult extends ToolResult {
  migrationName?: string;
  migrationPath?: string;
  sql?: string;
}

export interface ExecutionResult extends ToolResult {
  rowsAffected?: number;
  executionTime?: number;
  migrationCreated?: string;
}

// Enhanced execution options for live execution
export interface ExecutionOptions {
  executeImmediately?: boolean;
  previewOnly?: boolean;
  createMigration?: boolean;
}

// Change preview interface
export interface ChangePreview {
  sql: string;
  affectedTables: string[];
  estimatedImpact: string;
  warnings: string[];
  executionPlan?: unknown;
}

// Enhanced tool execution result
export interface ToolExecutionResult extends ToolResult {
  executed: boolean;
  migrationCreated: boolean;
  sql: string;
  migrationName?: string;
  preview?: ChangePreview;
  executionTime?: number;
} 