import { AbstractBaseTool } from '../base/base-tool.js';
import { ToolResult } from '../base/tool-types.js';
import { ValidationUtils } from '../utils/validation.js';
import { PostgresService } from '../../../services/postgres-service.js';
import { SqlGenerator } from '../../../services/sql-generator.js';
import { config } from '../../../config/index.js';

export class InsertDataTool extends AbstractBaseTool {
  public readonly name = 'insert_data';
  public readonly description = 'Insert data into a PostgreSQL table';
  public readonly schema = {
    type: 'object',
    properties: {
      table: { type: 'string', description: 'Table name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      data: { type: 'object', description: 'Data to insert as key-value pairs' },
    },
    required: ['table', 'data'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { table, schema = 'public', data } = args as {
      table: string;
      schema?: string;
      data: Record<string, unknown>;
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
      const postgresService = new PostgresService(config.postgres);
      const sqlGenerator = SqlGenerator.getInstance();

      const sql = sqlGenerator.generateInsertDataSql(table, data, schema);
      const result = await postgresService.execute(sql);

      if (!result.success) {
        return this.createErrorResult(`Failed to insert data: ${result.error}`);
      }

      return this.createSuccessResult(
        `Data inserted successfully into ${schema}.${table}`,
        {
          table,
          schema,
          rowsAffected: result.rowsAffected || 0,
          insertedData: data,
          sql,
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
    },
    required: ['table', 'data', 'where'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { table, schema = 'public', data, where } = args as {
      table: string;
      schema?: string;
      data: Record<string, unknown>;
      where: string;
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
      const postgresService = new PostgresService(config.postgres);
      const sqlGenerator = SqlGenerator.getInstance();

      const sql = sqlGenerator.generateUpdateDataSql(table, data, where, schema);
      const result = await postgresService.execute(sql);

      if (!result.success) {
        return this.createErrorResult(`Failed to update data: ${result.error}`);
      }

      return this.createSuccessResult(
        `Data updated successfully in ${schema}.${table}`,
        {
          table,
          schema,
          rowsAffected: result.rowsAffected || 0,
          updatedData: data,
          whereClause: where,
          sql,
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
    },
    required: ['table', 'where'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { table, schema = 'public', where } = args as {
      table: string;
      schema?: string;
      where: string;
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
      const postgresService = new PostgresService(config.postgres);
      const sqlGenerator = SqlGenerator.getInstance();

      const sql = sqlGenerator.generateDeleteDataSql(table, where, schema);
      const result = await postgresService.execute(sql);

      if (!result.success) {
        return this.createErrorResult(`Failed to delete data: ${result.error}`);
      }

      return this.createSuccessResult(
        `Data deleted successfully from ${schema}.${table}`,
        {
          table,
          schema,
          rowsAffected: result.rowsAffected || 0,
          whereClause: where,
          sql,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
} 