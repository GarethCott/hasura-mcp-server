import { AbstractBaseTool } from '../base/base-tool.js';
import { ToolResult, HasuraTableArgs } from '../base/tool-types.js';
import { ValidationUtils } from '../utils/validation.js';
import { MigrationHelpers } from '../utils/migration-helpers.js';
import { hasuraService, sqlGenerator } from '../../../services/index.js';
import { PostgresService } from '../../../services/postgres-service.js';
import { IntegrationService } from '../../../services/integration-service.js';
import { TableDefinition, CreateTableParams } from '../../../types/index.js';
import { config } from '../../../config/index.js';

export class CreateTableTool extends AbstractBaseTool {
  public readonly name = 'create_table';
  public readonly description = 'Create a new table with specified columns and constraints';
  public readonly schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Table name' },
      schema: { type: 'string', description: 'Database schema (default: public)', default: 'public' },
      columns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Column name' },
            type: { type: 'string', description: 'Column data type' },
            nullable: { type: 'boolean', description: 'Whether column can be null', default: true },
            default: { type: 'string', description: 'Default value' },
            primaryKey: { type: 'boolean', description: 'Whether column is primary key', default: false },
            unique: { type: 'boolean', description: 'Whether column has unique constraint', default: false },
          },
          required: ['name', 'type'],
        },
      },
    },
    required: ['name', 'columns'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { name, schema = 'public', columns } = args as { name: string; schema?: string; columns: HasuraTableArgs['columns'] };

    // Validate required arguments
    this.validateRequiredArgs(args, ['name', 'columns']);

    // Validate table name
    const tableValidation = ValidationUtils.validateTableName(name);
    if (!tableValidation.isValid) {
      return this.createErrorResult(tableValidation.error!);
    }

    // Validate schema name
    const schemaValidation = ValidationUtils.validateSchemaName(schema);
    if (!schemaValidation.isValid) {
      return this.createErrorResult(schemaValidation.error!);
    }

    // Validate columns
    if (!Array.isArray(columns) || columns.length === 0) {
      return this.createErrorResult('At least one column is required');
    }

    for (const column of columns) {
      const columnValidation = ValidationUtils.validateColumnName(column.name);
      if (!columnValidation.isValid) {
        return this.createErrorResult(`Invalid column name "${column.name}": ${columnValidation.error}`);
      }

      const typeValidation = ValidationUtils.validateDataType(column.type);
      if (!typeValidation.isValid) {
        return this.createErrorResult(`Invalid data type "${column.type}": ${typeValidation.error}`);
      }
    }

    try {
      // Create table definition
      const tableDefinition: TableDefinition = {
        name,
        schema,
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable ?? true,
          default: col.default,
          primaryKey: col.primaryKey ?? false,
          unique: col.unique ?? false,
        })),
      };

      // Generate SQL
      const sql = sqlGenerator.generateCreateTableSql(tableDefinition);

      // Validate generated SQL
      const sqlValidation = ValidationUtils.validateSql(sql);
      if (!sqlValidation.isValid) {
        return this.createErrorResult(`Generated SQL is invalid: ${sqlValidation.errors.join(', ')}`);
      }

      // Create migration
      const migrationResult = await MigrationHelpers.createMigration(
        'create_table',
        name,
        sql,
        sqlGenerator.generateDropTableSql(name, schema),
      );

      if (!migrationResult.success) {
        return this.createErrorResult(`Failed to create migration: ${migrationResult.error}`);
      }

      // Create Hasura metadata
      const metadata = {
        table: { name, schema },
        configuration: {
          custom_root_fields: {},
          custom_column_names: {},
        },
      };

      await hasuraService.updateTableMetadata(name, schema, metadata);

      return this.createSuccessResult(
        `Table ${schema}.${name} created successfully`,
        {
          tableName: name,
          schema,
          migrationName: migrationResult.migrationName,
          sql,
          columns: tableDefinition.columns,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class AddColumnTool extends AbstractBaseTool {
  public readonly name = 'add_column';
  public readonly description = 'Add a new column to an existing table';
  public readonly schema = {
    type: 'object',
    properties: {
      tableName: { type: 'string', description: 'Name of the table' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      column: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Column name' },
          type: { type: 'string', description: 'Column data type' },
          nullable: { type: 'boolean', description: 'Whether column can be null', default: true },
          default: { type: 'string', description: 'Default value' },
        },
        required: ['name', 'type'],
      },
    },
    required: ['tableName', 'column'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { tableName, schema = 'public', column } = args as { tableName: string; schema?: string; column: HasuraTableArgs['columns'][0] };

    // Validate required arguments
    this.validateRequiredArgs(args, ['tableName', 'column']);

    // Validate table name
    const tableValidation = ValidationUtils.validateTableName(tableName);
    if (!tableValidation.isValid) {
      return this.createErrorResult(tableValidation.error!);
    }

    // Validate column
    if (!column || typeof column !== 'object') {
      return this.createErrorResult('Column definition is required');
    }

    const columnValidation = ValidationUtils.validateColumnName(column.name);
    if (!columnValidation.isValid) {
      return this.createErrorResult(`Invalid column name: ${columnValidation.error}`);
    }

    const typeValidation = ValidationUtils.validateDataType(column.type);
    if (!typeValidation.isValid) {
      return this.createErrorResult(`Invalid data type: ${typeValidation.error}`);
    }

    try {
      // Generate SQL
      const sql = sqlGenerator.generateAddColumnSql(tableName, {
        name: column.name,
        type: column.type,
        nullable: column.nullable ?? true,
        default: column.default,
      }, schema);

      // Validate generated SQL
      const sqlValidation = ValidationUtils.validateSql(sql);
      if (!sqlValidation.isValid) {
        return this.createErrorResult(`Generated SQL is invalid: ${sqlValidation.errors.join(', ')}`);
      }

      // Create migration
      const migrationResult = await MigrationHelpers.createMigration(
        'add_column',
        `${tableName}_${column.name}`,
        sql,
        sqlGenerator.generateDropColumnSql(tableName, column.name, schema),
      );

      if (!migrationResult.success) {
        return this.createErrorResult(`Failed to create migration: ${migrationResult.error}`);
      }

      return this.createSuccessResult(
        `Column ${column.name} added to table ${schema}.${tableName} successfully`,
        {
          tableName,
          schema,
          columnName: column.name,
          migrationName: migrationResult.migrationName,
          sql,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class CreateTableLiveTool extends AbstractBaseTool {
  public readonly name = 'create_table_live';
  public readonly description = 'Create table with immediate execution and migration generation';
  public readonly schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Table name' },
      columns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Column name' },
            type: { type: 'string', description: 'Column data type' },
            constraints: { type: 'string', description: 'Column constraints' },
          },
          required: ['name', 'type'],
        },
      },
      executeImmediately: { type: 'boolean', description: 'Execute immediately', default: true },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
    },
    required: ['name', 'columns'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      name,
      columns,
      schema = 'public',
      executeImmediately = true,
    } = args as {
      name: string;
      columns: Array<{ name: string; type: string; constraints?: string }>;
      schema?: string;
      executeImmediately?: boolean;
    };

    this.validateRequiredArgs(args, ['name', 'columns']);

    const tableValidation = ValidationUtils.validateTableName(name);
    if (!tableValidation.isValid) {
      return this.createErrorResult(tableValidation.error!);
    }

    if (!Array.isArray(columns) || columns.length === 0) {
      return this.createErrorResult('At least one column is required');
    }

    try {
      // Convert columns to the format expected by CreateTableParams
      const tableColumns = columns.map(col => ({
        name: col.name,
        type: col.type,
        nullable: !col.constraints?.includes('NOT NULL'),
        primaryKey: col.constraints?.includes('PRIMARY KEY') || false,
        unique: col.constraints?.includes('UNIQUE') || false,
        default: col.constraints?.match(/DEFAULT\s+(.+)/)?.[1],
      }));

      const params: CreateTableParams = {
        name,
        columns: tableColumns,
        schema,
        executeImmediately,
      };

      const integrationService = new IntegrationService(hasuraService, new PostgresService(config.postgres));
      const result = await integrationService.createTableWithMigration(params);

      if (result.error) {
        return this.createErrorResult(`Failed to create table: ${result.error}`);
      }

      return this.createSuccessResult(
        `Table ${name} created successfully`,
        {
          tableName: name,
          schema,
          executed: result.executed,
          migrationCreated: result.migrationCreated,
          metadataUpdated: result.metadataUpdated,
          preview: result.preview,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}