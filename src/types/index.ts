export interface HasuraConfig {
  endpoint: string;
  adminSecret?: string;
  projectPath: string;
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
  filter?: Record<string, any>;
  columns?: string[] | '*';
  check?: Record<string, any>;
  set?: Record<string, any>;
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
      configuration?: any;
      object_relationships?: any[];
      array_relationships?: any[];
      insert_permissions?: any[];
      select_permissions?: any[];
      update_permissions?: any[];
      delete_permissions?: any[];
    }>;
    configuration: {
      connection_info: {
        database_url: { from_env: string };
      };
    };
  }>;
}

export interface SchemaAnalysis {
  tables: Array<{
    name: string;
    schema: string;
    columns: TableColumn[];
    relationships: RelationshipDefinition[];
    permissions: PermissionDefinition[];
  }>;
  suggestions: string[];
} 