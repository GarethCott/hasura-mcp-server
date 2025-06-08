import { AbstractBaseTool } from '../base/base-tool.js';
import { ToolResult } from '../base/tool-types.js';
import { ValidationUtils } from '../utils/validation.js';
import { SqlGenerator } from '../../../services/sql-generator.js';

export class InsertDataTool extends AbstractBaseTool {
  public readonly name = 'insert_data';
  public readonly description = 'Insert data into a PostgreSQL table';
  public readonly schema = {
    type: 'object',
    properties: {
      table: { type: 'string', description: 'Table name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      data: { type: 'object', description: 'Data to insert as key-value pairs' },
      executeImmediately: { 
        type: 'boolean', 
        description: 'Execute SQL immediately on database', 
        default: true,
      },
      previewOnly: {
        type: 'boolean',
        description: 'Preview changes without executing',
        default: false,
      },
      createMigration: { 
        type: 'boolean', 
        description: 'Create migration file', 
        default: false,
      },
    },
    required: ['table', 'data'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { table, schema = 'public', data, executeImmediately = true, previewOnly = false, createMigration = false } = args as {
      table: string;
      schema?: string;
      data: Record<string, unknown>;
      executeImmediately?: boolean;
      previewOnly?: boolean;
      createMigration?: boolean;
    };

    this.validateRequiredArgs(args, ['table', 'data']);

    const tableValidation = ValidationUtils.validateTableName(table);
    if (!tableValidation.isValid) {
      return this.createErrorResult(tableValidation.error!);
    }

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return this.createErrorResult('Data object is required and cannot be empty');
    }

    try {
      const sqlGenerator = SqlGenerator.getInstance();
      const sql = sqlGenerator.generateInsertDataSql(table, data, schema);

      // Preview mode - show what would happen
      if (previewOnly) {
        const preview = await this.previewChanges(sql);
        return this.createSuccessResult('Preview generated', { preview, sql });
      }

      let executed = false;
      let executionResult = null;

      // Execute if requested
      if (executeImmediately) {
        const result = await this.executeSQL(sql);
        if (!result.success) {
          return this.createErrorResult(`Execution failed: ${result.error}`);
        }
        executed = true;
        executionResult = result;
      }

      // Create migration if requested
      let migrationResult;
      if (createMigration) {
        const MigrationHelpers = await import('../utils/migration-helpers.js').then(m => m.MigrationHelpers);
        migrationResult = await MigrationHelpers.createMigration(
          'insert_data',
          `insert_data_${table}`,
          sql,
          `-- Revert: Delete inserted data from ${schema}.${table}`,
        );
      }

      return this.createSuccessResult(
        `Data ${executed ? 'inserted' : 'prepared for insertion'} into ${schema}.${table}`,
        {
          table,
          schema,
          executed,
          rowsAffected: executed ? executionResult?.rowsAffected || 0 : 0,
          insertedData: data,
          sql,
          ...(migrationResult && { migrationName: migrationResult.migrationName }),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class UpdateDataTool extends AbstractBaseTool {
  public readonly name = 'update_data';
  public readonly description = 'Update data in a PostgreSQL table';
  public readonly schema = {
    type: 'object',
    properties: {
      table: { type: 'string', description: 'Table name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      data: { type: 'object', description: 'Data to update as key-value pairs' },
      where: { type: 'string', description: 'WHERE clause condition' },
      executeImmediately: { 
        type: 'boolean', 
        description: 'Execute SQL immediately on database', 
        default: true,
      },
      previewOnly: {
        type: 'boolean',
        description: 'Preview changes without executing',
        default: false,
      },
      createMigration: { 
        type: 'boolean', 
        description: 'Create migration file', 
        default: false,
      },
    },
    required: ['table', 'data', 'where'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { table, schema = 'public', data, where, executeImmediately = true, previewOnly = false, createMigration = false } = args as {
      table: string;
      schema?: string;
      data: Record<string, unknown>;
      where: string;
      executeImmediately?: boolean;
      previewOnly?: boolean;
      createMigration?: boolean;
    };

    this.validateRequiredArgs(args, ['table', 'data', 'where']);

    const tableValidation = ValidationUtils.validateTableName(table);
    if (!tableValidation.isValid) {
      return this.createErrorResult(tableValidation.error!);
    }

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return this.createErrorResult('Data object is required and cannot be empty');
    }

    if (!where || typeof where !== 'string' || where.trim().length === 0) {
      return this.createErrorResult('WHERE clause is required for safety');
    }

    try {
      const sqlGenerator = SqlGenerator.getInstance();
      const sql = sqlGenerator.generateUpdateDataSql(table, data, where, schema);

      // Preview mode - show what would happen
      if (previewOnly) {
        const preview = await this.previewChanges(sql);
        return this.createSuccessResult('Preview generated', { preview, sql });
      }

      let executed = false;
      let executionResult = null;

      // Execute if requested
      if (executeImmediately) {
        const result = await this.executeSQL(sql);
        if (!result.success) {
          return this.createErrorResult(`Execution failed: ${result.error}`);
        }
        executed = true;
        executionResult = result;
      }

      // Create migration if requested
      let migrationResult;
      if (createMigration) {
        const MigrationHelpers = await import('../utils/migration-helpers.js').then(m => m.MigrationHelpers);
        migrationResult = await MigrationHelpers.createMigration(
          'update_data',
          `update_data_${table}`,
          sql,
          '-- Revert: Manual rollback required for data updates',
        );
      }

      return this.createSuccessResult(
        `Data ${executed ? 'updated' : 'prepared for update'} in ${schema}.${table}`,
        {
          table,
          schema,
          executed,
          rowsAffected: executed ? executionResult?.rowsAffected || 0 : 0,
          updatedData: data,
          whereClause: where,
          sql,
          ...(migrationResult && { migrationName: migrationResult.migrationName }),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class DeleteDataTool extends AbstractBaseTool {
  public readonly name = 'delete_data';
  public readonly description = 'Delete data from a PostgreSQL table';
  public readonly schema = {
    type: 'object',
    properties: {
      table: { type: 'string', description: 'Table name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      where: { type: 'string', description: 'WHERE clause condition (required for safety)' },
      executeImmediately: { 
        type: 'boolean', 
        description: 'Execute SQL immediately on database', 
        default: true,
      },
      previewOnly: {
        type: 'boolean',
        description: 'Preview changes without executing',
        default: false,
      },
      createMigration: { 
        type: 'boolean', 
        description: 'Create migration file', 
        default: false,
      },
    },
    required: ['table', 'where'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { table, schema = 'public', where, executeImmediately = true, previewOnly = false, createMigration = false } = args as {
      table: string;
      schema?: string;
      where: string;
      executeImmediately?: boolean;
      previewOnly?: boolean;
      createMigration?: boolean;
    };

    this.validateRequiredArgs(args, ['table', 'where']);

    const tableValidation = ValidationUtils.validateTableName(table);
    if (!tableValidation.isValid) {
      return this.createErrorResult(tableValidation.error!);
    }

    if (!where || typeof where !== 'string' || where.trim().length === 0) {
      return this.createErrorResult('WHERE clause is required for safety - use "1=1" to delete all rows if intended');
    }

    try {
      const sqlGenerator = SqlGenerator.getInstance();
      const sql = sqlGenerator.generateDeleteDataSql(table, where, schema);

      // Preview mode - show what would happen
      if (previewOnly) {
        const preview = await this.previewChanges(sql);
        return this.createSuccessResult('Preview generated', { preview, sql });
      }

      let executed = false;
      let executionResult = null;

      // Execute if requested
      if (executeImmediately) {
        const result = await this.executeSQL(sql);
        if (!result.success) {
          return this.createErrorResult(`Execution failed: ${result.error}`);
        }
        executed = true;
        executionResult = result;
      }

      // Create migration if requested
      let migrationResult;
      if (createMigration) {
        const MigrationHelpers = await import('../utils/migration-helpers.js').then(m => m.MigrationHelpers);
        migrationResult = await MigrationHelpers.createMigration(
          'delete_data',
          `delete_data_${table}`,
          sql,
          '-- Revert: Manual rollback required for data deletions',
        );
      }

      return this.createSuccessResult(
        `Data ${executed ? 'deleted' : 'prepared for deletion'} from ${schema}.${table}`,
        {
          table,
          schema,
          executed,
          rowsAffected: executed ? executionResult?.rowsAffected || 0 : 0,
          whereClause: where,
          sql,
          ...(migrationResult && { migrationName: migrationResult.migrationName }),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
} 