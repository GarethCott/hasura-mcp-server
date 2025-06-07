import { BaseTool } from './base/tool-types.js';

// Hasura tools
import { CreateTableTool, AddColumnTool, CreateTableLiveTool } from './hasura/table-tools.js';
import { 
  CreateRelationshipTool, 
  CreatePermissionTool, 
  TrackTableTool, 
  UntrackTableTool,
  GenerateMigrationTool,
} from './hasura/relationship-tools.js';

// PostgreSQL tools
import { 
  ExecuteSqlTool, 
  ListTablesTool, 
  ListFunctionsTool, 
  ListTriggersTool, 
  DescribeTableTool, 
} from './postgres/core-tools.js';
import { 
  CreateFunctionTool, 
  CreateTriggerTool, 
  CreateIndexTool, 
  AlterTableTool, 
  DropFunctionTool, 
  DropTriggerTool, 
  DropIndexTool, 
} from './postgres/advanced-tools.js';
import { InsertDataTool, UpdateDataTool, DeleteDataTool } from './postgres/data-tools.js';
import { 
  AnalyzeSchemaTool, 
  ValidateSqlTool, 
  TestConnectionTool, 
  OptimizeDatabaseTool, 
} from './postgres/analysis-tools.js';
import { 
  ApplyMigrationsTool, 
  SyncSchemaTool, 
  PreviewChangesTool, 
  AnalyzeDatabaseSchemaTool, 
} from './postgres/utility-tools.js';

// Tool registry
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, BaseTool> = new Map();

  private constructor() {
    this.registerTools();
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  private registerTools(): void {
    // Hasura tools
    this.registerTool(new CreateTableTool());
    this.registerTool(new AddColumnTool());
    this.registerTool(new CreateTableLiveTool());
    this.registerTool(new CreateRelationshipTool());
    this.registerTool(new CreatePermissionTool());
    this.registerTool(new TrackTableTool());
    this.registerTool(new UntrackTableTool());
    this.registerTool(new GenerateMigrationTool());

    // PostgreSQL core tools
    this.registerTool(new ExecuteSqlTool());
    this.registerTool(new ListTablesTool());
    this.registerTool(new ListFunctionsTool());
    this.registerTool(new ListTriggersTool());
    this.registerTool(new DescribeTableTool());

    // PostgreSQL advanced tools
    this.registerTool(new CreateFunctionTool());
    this.registerTool(new CreateTriggerTool());
    this.registerTool(new CreateIndexTool());
    this.registerTool(new AlterTableTool());
    this.registerTool(new DropFunctionTool());
    this.registerTool(new DropTriggerTool());
    this.registerTool(new DropIndexTool());

    // PostgreSQL data tools
    this.registerTool(new InsertDataTool());
    this.registerTool(new UpdateDataTool());
    this.registerTool(new DeleteDataTool());

    // PostgreSQL analysis tools
    this.registerTool(new AnalyzeSchemaTool());
    this.registerTool(new ValidateSqlTool());
    this.registerTool(new TestConnectionTool());
    this.registerTool(new OptimizeDatabaseTool());

    // PostgreSQL utility tools
    this.registerTool(new ApplyMigrationsTool());
    this.registerTool(new SyncSchemaTool());
    this.registerTool(new PreviewChangesTool());
    this.registerTool(new AnalyzeDatabaseSchemaTool());
  }

  private registerTool(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  public getToolsByCategory(category: string): BaseTool[] {
    return this.getAllTools().filter(tool => {
      if (category === 'hasura') {
        return [
          'create_table', 'add_column', 'create_table_live', 'create_relationship', 'create_permission', 
          'track_table', 'untrack_table', 'generate_migration',
        ].includes(tool.name);
      }
      if (category === 'postgres') {
        return [
          // Core tools
          'execute_sql', 'list_tables', 'list_functions', 'list_triggers', 'describe_table',
          // Advanced tools
          'create_function', 'create_trigger', 'create_index', 'alter_table',
          'drop_function', 'drop_trigger', 'drop_index',
          // Data tools
          'insert_data', 'update_data', 'delete_data',
          // Analysis tools
          'analyze_schema', 'validate_sql', 'test_connection', 'optimize_database',
          // Utility tools
          'apply_migrations', 'sync_schema', 'preview_changes', 'analyze_database_schema',
        ].includes(tool.name);
      }
      return false;
    });
  }

  public getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Export the registry instance
export const toolRegistry = ToolRegistry.getInstance();

// Export all tool classes for direct use if needed
export * from './hasura/table-tools.js';
export * from './hasura/relationship-tools.js';
export * from './postgres/core-tools.js';
export * from './postgres/advanced-tools.js';
export * from './postgres/data-tools.js';
export * from './postgres/analysis-tools.js';
export * from './postgres/utility-tools.js';
export * from './base/tool-types.js';
export * from './base/base-tool.js'; 