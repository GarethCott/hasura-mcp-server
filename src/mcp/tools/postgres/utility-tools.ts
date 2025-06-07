import { AbstractBaseTool } from '../base/base-tool.js';
import { ToolResult } from '../base/tool-types.js';
import { ValidationUtils } from '../utils/validation.js';
import { PostgresService } from '../../../services/postgres-service.js';
import { hasuraService } from '../../../services/index.js';
import { config } from '../../../config/index.js';

export class ApplyMigrationsTool extends AbstractBaseTool {
  public readonly name = 'apply_migrations';
  public readonly description = 'Apply pending Hasura migrations to the database';
  public readonly schema = {
    type: 'object',
    properties: {
      applyMetadata: { type: 'boolean', description: 'Apply metadata after migrations', default: true },
    },
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { applyMetadata = true } = args as { applyMetadata?: boolean };

    try {
      // Get pending migrations
      const migrations = await hasuraService.getMigrations();
      
      if (migrations.length === 0) {
        return this.createSuccessResult(
          'No migrations to apply',
          { migrationsApplied: 0 },
        );
      }

      const postgresService = new PostgresService(config.postgres);
      const appliedMigrations = [];

      // Apply each migration
      for (const migration of migrations) {
        if (migration.upSql) {
          const result = await postgresService.execute(migration.upSql);
          if (!result.success) {
            return this.createErrorResult(`Failed to apply migration ${migration.name}: ${result.error}`);
          }
          appliedMigrations.push(migration.name);
        }
      }

      return this.createSuccessResult(
        `Applied ${appliedMigrations.length} migrations successfully`,
        {
          migrationsApplied: appliedMigrations.length,
          appliedMigrations,
          applyMetadata,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class SyncSchemaTool extends AbstractBaseTool {
  public readonly name = 'sync_schema';
  public readonly description = 'Synchronize database schema with Hasura metadata';
  public readonly schema = {
    type: 'object',
    properties: {
      schema: { type: 'string', description: 'Database schema to sync', default: 'public' },
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

      // Get current database tables
      const dbTables = await postgresService.listTables(schema);

      // Get Hasura metadata
      const metadata = await hasuraService.getMetadata();
      const hasuraTables = metadata.sources[0]?.tables?.map(t => t.table.name) || [];

      // Find differences
      const missingInHasura = dbTables.filter(table => !hasuraTables.includes(table));
      const missingInDb = hasuraTables.filter(table => !dbTables.includes(table));

      return this.createSuccessResult(
        'Schema synchronization analysis completed',
        {
          schema,
          databaseTables: dbTables,
          hasuraTables,
          missingInHasura,
          missingInDb,
          inSync: missingInHasura.length === 0 && missingInDb.length === 0,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class PreviewChangesTool extends AbstractBaseTool {
  public readonly name = 'preview_changes';
  public readonly description = 'Preview changes that would be made by a SQL operation';
  public readonly schema = {
    type: 'object',
    properties: {
      sql: { type: 'string', description: 'SQL to preview' },
    },
    required: ['sql'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { sql } = args as { sql: string };

    this.validateRequiredArgs(args, ['sql']);

    // Validate SQL
    const sqlValidation = ValidationUtils.validateSql(sql);
    if (!sqlValidation.isValid) {
      return this.createErrorResult(`Invalid SQL: ${sqlValidation.errors.join(', ')}`);
    }

    try {
      const postgresService = new PostgresService(config.postgres);

      // For SELECT queries, we can safely execute them
      if (sql.trim().toLowerCase().startsWith('select')) {
        const result = await postgresService.execute(sql);
        return this.createSuccessResult(
          'Query preview executed successfully',
          {
            sql,
            preview: result.data,
            rowCount: result.rowsAffected || 0,
          },
        );
      }

      // For other queries, use EXPLAIN to show execution plan
      const explainSql = `EXPLAIN ${sql}`;
      const explainResult = await postgresService.execute(explainSql);

      if (!explainResult.success) {
        return this.createErrorResult(`Failed to preview changes: ${explainResult.error}`);
      }

      return this.createSuccessResult(
        'SQL execution plan generated',
        {
          sql,
          executionPlan: explainResult.data,
          note: 'This is a preview only - no changes were made to the database',
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class AnalyzeDatabaseSchemaTool extends AbstractBaseTool {
  public readonly name = 'analyze_database_schema';
  public readonly description = 'Comprehensive analysis of database schema structure';
  public readonly schema = {
    type: 'object',
    properties: {
      schema: { type: 'string', description: 'Database schema to analyze', default: 'public' },
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

      // Get comprehensive schema information
      const tables = await postgresService.listTables(schema);
      const functions = await postgresService.listFunctions(schema);
      const triggers = await postgresService.listTriggers(schema);

      const tableDetails = [];
      for (const table of tables) {
        try {
          const tableInfo = await postgresService.getTableSchema(table, schema);
          tableDetails.push(tableInfo);
        } catch (error) {
          // Skip tables we can't analyze
          continue;
        }
      }

      // Calculate statistics
      const totalColumns = tableDetails.reduce((sum, table) => sum + table.columns.length, 0);
      const totalIndexes = tableDetails.reduce((sum, table) => sum + table.indexes.length, 0);
      const totalRows = tableDetails.reduce((sum, table) => sum + (table.rowCount || 0), 0);

      return this.createSuccessResult(
        `Database schema analysis completed for ${schema}`,
        {
          schema,
          summary: {
            tables: tables.length,
            functions: functions.length,
            triggers: triggers.length,
            totalColumns,
            totalIndexes,
            totalRows,
          },
          tables: tableDetails,
          functions,
          triggers,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
} 