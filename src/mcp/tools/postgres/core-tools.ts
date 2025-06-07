import { AbstractBaseTool } from '../base/base-tool.js';
import { ToolResult } from '../base/tool-types.js';
import { ValidationUtils } from '../utils/validation.js';
import { MigrationHelpers } from '../utils/migration-helpers.js';
import { PostgresService } from '../../../services/postgres-service.js';
import { config } from '../../../config/index.js';

export class ExecuteSqlTool extends AbstractBaseTool {
  public readonly name = 'execute_sql';
  public readonly description = 'Execute raw SQL query with optional migration creation';
  public readonly schema = {
    type: 'object',
    properties: {
      sql: { type: 'string', description: 'SQL query to execute' },
      createMigration: { type: 'boolean', description: 'Whether to create a migration', default: false },
      migrationName: { type: 'string', description: 'Name for the migration' },
    },
    required: ['sql'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { sql, createMigration = false, migrationName } = args as { sql: string; createMigration?: boolean; migrationName?: string };

    this.validateRequiredArgs(args, ['sql']);

    const sqlValidation = ValidationUtils.validateSql(sql);
    if (!sqlValidation.isValid) {
      return this.createErrorResult(`Invalid SQL: ${sqlValidation.errors.join(', ')}`);
    }

    try {
      const postgresService = new PostgresService(config.postgres);
      const result = await postgresService.execute(sql);

      let migrationResult;
      if (createMigration) {
        const name = migrationName || 'custom_sql';
        migrationResult = await MigrationHelpers.createMigration(
          'execute_sql',
          name,
          sql,
          '-- Add rollback SQL here',
        );

        if (!migrationResult.success) {
          return this.createErrorResult(`SQL executed but migration creation failed: ${migrationResult.error}`);
        }
      }

      return this.createSuccessResult(
        'SQL executed successfully',
        {
          rowsAffected: result.rowsAffected || 0,
          ...(migrationResult && { migrationName: migrationResult.migrationName }),
          sql,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class ListTablesTool extends AbstractBaseTool {
  public readonly name = 'list_tables';
  public readonly description = 'List all tables in the database or specific schema';
  public readonly schema = {
    type: 'object',
    properties: {
      schema: { type: 'string', description: 'Database schema to list tables from', default: 'public' },
    },
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { schema = 'public' } = args as { schema?: string };

    const schemaValidation = ValidationUtils.validateSchemaName(schema);
    if (!schemaValidation.isValid) {
      return this.createErrorResult(schemaValidation.error!);
    }

    try {
      const postgresService = new PostgresService(config.postgres);
      const tables = await postgresService.listTables(schema);

      return this.createSuccessResult(
        `Found ${tables.length} tables in schema ${schema}`,
        {
          schema,
          tables,
          count: tables.length,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class ListFunctionsTool extends AbstractBaseTool {
  public readonly name = 'list_functions';
  public readonly description = 'List all functions in a PostgreSQL schema';
  public readonly schema = {
    type: 'object',
    properties: {
      schema: { type: 'string', description: 'Database schema', default: 'public' },
    },
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { schema = 'public' } = args as { schema?: string };

    const schemaValidation = ValidationUtils.validateSchemaName(schema);
    if (!schemaValidation.isValid) {
      return this.createErrorResult(schemaValidation.error!);
    }

    try {
      const postgresService = new PostgresService(config.postgres);
      const functions = await postgresService.listFunctions(schema);

      return this.createSuccessResult(
        `Found ${functions.length} functions in schema ${schema}`,
        {
          schema,
          functions,
          count: functions.length,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class ListTriggersTool extends AbstractBaseTool {
  public readonly name = 'list_triggers';
  public readonly description = 'List all triggers in a PostgreSQL schema';
  public readonly schema = {
    type: 'object',
    properties: {
      schema: { type: 'string', description: 'Database schema', default: 'public' },
    },
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { schema = 'public' } = args as { schema?: string };

    const schemaValidation = ValidationUtils.validateSchemaName(schema);
    if (!schemaValidation.isValid) {
      return this.createErrorResult(schemaValidation.error!);
    }

    try {
      const postgresService = new PostgresService(config.postgres);
      const triggers = await postgresService.listTriggers(schema);

      return this.createSuccessResult(
        `Found ${triggers.length} triggers in schema ${schema}`,
        {
          schema,
          triggers,
          count: triggers.length,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class DescribeTableTool extends AbstractBaseTool {
  public readonly name = 'describe_table';
  public readonly description = 'Get detailed information about a table structure';
  public readonly schema = {
    type: 'object',
    properties: {
      tableName: { type: 'string', description: 'Table name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
    },
    required: ['tableName'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { tableName, schema = 'public' } = args as { tableName: string; schema?: string };

    this.validateRequiredArgs(args, ['tableName']);

    const tableValidation = ValidationUtils.validateTableName(tableName);
    if (!tableValidation.isValid) {
      return this.createErrorResult(tableValidation.error!);
    }

    try {
      const postgresService = new PostgresService(config.postgres);
      const tableInfo = await postgresService.getTableSchema(tableName, schema);

      return this.createSuccessResult(
        `Table ${schema}.${tableName} description retrieved`,
        {
          tableName,
          tableSchema: schema,
          ...tableInfo,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}