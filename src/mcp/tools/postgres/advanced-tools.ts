import { AbstractBaseTool } from '../base/base-tool.js';
import { ToolResult } from '../base/tool-types.js';
import { ValidationUtils } from '../utils/validation.js';
import { MigrationHelpers } from '../utils/migration-helpers.js';
import { PostgresService } from '../../../services/postgres-service.js';
import { SqlGenerator } from '../../../services/sql-generator.js';
import { config } from '../../../config/index.js';

export class CreateFunctionTool extends AbstractBaseTool {
  public readonly name = 'create_function';
  public readonly description = 'Create a PostgreSQL function or stored procedure';
  public readonly schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Function name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      parameters: { type: 'string', description: 'Function parameters' },
      returnType: { type: 'string', description: 'Return type' },
      language: { type: 'string', description: 'Function language', default: 'plpgsql' },
      body: { type: 'string', description: 'Function body' },
      options: { type: 'string', description: 'Additional options' },
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
      createMigration: { type: 'boolean', description: 'Create migration', default: true },
    },
    required: ['name', 'parameters', 'returnType', 'body'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      name,
      schema = 'public',
      parameters,
      returnType,
      language = 'plpgsql',
      body,
      options,
      executeImmediately = true,
      previewOnly = false,
      createMigration = true,
    } = args as {
      name: string;
      schema?: string;
      parameters: string;
      returnType: string;
      language?: string;
      body: string;
      options?: string;
      executeImmediately?: boolean;
      previewOnly?: boolean;
      createMigration?: boolean;
    };

    this.validateRequiredArgs(args, ['name', 'parameters', 'returnType', 'body']);

    const nameValidation = ValidationUtils.validateTableName(name);
    if (!nameValidation.isValid) {
      return this.createErrorResult(nameValidation.error!);
    }

    try {
      const sqlGenerator = SqlGenerator.getInstance();

      const sql = sqlGenerator.generateCreateFunctionSql(
        name,
        parameters,
        returnType,
        language,
        body,
        options,
        schema,
      );

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
        migrationResult = await MigrationHelpers.createMigration(
          'create_function',
          `create_function_${name}`,
          sql,
          sqlGenerator.generateDropFunctionSql(name, schema),
        );
      }

      return this.createSuccessResult(
        `Function ${schema}.${name} ${executed ? 'created' : 'prepared for creation'}`,
        {
          functionName: name,
          schema,
          executed,
          sql,
          ...(migrationResult && { migrationName: migrationResult.migrationName }),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class CreateTriggerTool extends AbstractBaseTool {
  public readonly name = 'create_trigger';
  public readonly description = 'Create a PostgreSQL trigger on a table';
  public readonly schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Trigger name' },
      tableName: { type: 'string', description: 'Table name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      functionName: { type: 'string', description: 'Function to call' },
      when: { type: 'string', enum: ['BEFORE', 'AFTER', 'INSTEAD OF'], description: 'When to fire' },
      events: { type: 'array', items: { type: 'string' }, description: 'Events' },
      forEach: { type: 'string', enum: ['ROW', 'STATEMENT'], default: 'ROW' },
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
      createMigration: { type: 'boolean', default: true },
    },
    required: ['name', 'tableName', 'functionName', 'when', 'events'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      name,
      tableName,
      schema = 'public',
      functionName,
      when,
      events,
      forEach = 'ROW',
      executeImmediately = true,
      previewOnly = false,
      createMigration = true,
    } = args as {
      name: string;
      tableName: string;
      schema?: string;
      functionName: string;
      when: string;
      events: string[];
      forEach?: string;
      executeImmediately?: boolean;
      previewOnly?: boolean;
      createMigration?: boolean;
    };

    this.validateRequiredArgs(args, ['name', 'tableName', 'functionName', 'when', 'events']);

        try {
      const sqlGenerator = SqlGenerator.getInstance();

      const sql = sqlGenerator.generateCreateTriggerSql(
        name,
        tableName,
        functionName,
        when,
        events,
        forEach,
        undefined,
        schema,
      );

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
        migrationResult = await MigrationHelpers.createMigration(
          'create_trigger',
          `create_trigger_${name}`,
          sql,
          sqlGenerator.generateDropTriggerSql(name, tableName, schema),
        );
      }

      return this.createSuccessResult(
        `Trigger ${name} ${executed ? 'created' : 'prepared for creation'}`,
        {
          triggerName: name,
          tableName,
          schema,
          executed,
          sql,
          ...(migrationResult && { migrationName: migrationResult.migrationName }),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class CreateIndexTool extends AbstractBaseTool {
  public readonly name = 'create_index';
  public readonly description = 'Create an index on a PostgreSQL table';
  public readonly schema = {
    type: 'object',
    properties: {
      tableName: { type: 'string', description: 'Table name' },
      indexName: { type: 'string', description: 'Index name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      columns: { type: 'array', items: { type: 'string' }, description: 'Columns to index' },
      unique: { type: 'boolean', description: 'Whether index should be unique', default: false },
      type: { type: 'string', description: 'Index type (btree, hash, gin, gist)' },
      where: { type: 'string', description: 'WHERE clause for partial index' },
      executeImmediately: { 
        type: 'boolean', 
        description: 'Execute SQL immediately on database', 
        default: true,  // PostgreSQL tools default to immediate execution
      },
      previewOnly: {
        type: 'boolean',
        description: 'Preview changes without executing or creating migration',
        default: false,
      },
      createMigration: { 
        type: 'boolean', 
        description: 'Create migration file', 
        default: true,
      },
    },
    required: ['tableName', 'indexName', 'columns'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      tableName,
      indexName,
      schema = 'public',
      columns,
      unique = false,
      type,
      where,
      executeImmediately = true,
      previewOnly = false,
      createMigration = true,
    } = args as {
      tableName: string;
      indexName: string;
      schema?: string;
      columns: string[];
      unique?: boolean;
      type?: string;
      where?: string;
      executeImmediately?: boolean;
      previewOnly?: boolean;
      createMigration?: boolean;
    };

    this.validateRequiredArgs(args, ['tableName', 'indexName', 'columns']);

    const tableValidation = ValidationUtils.validateTableName(tableName);
    if (!tableValidation.isValid) {
      return this.createErrorResult(`Invalid table name: ${tableValidation.error}`);
    }

    if (!Array.isArray(columns) || columns.length === 0) {
      return this.createErrorResult('At least one column is required');
    }

    try {
      const postgresService = new PostgresService(config.postgres);
      const sqlGenerator = SqlGenerator.getInstance();

      const sql = sqlGenerator.generateCreateIndexSqlAdvanced(
        tableName,
        indexName,
        columns,
        unique,
        type,
        where,
        schema,
      );

      // Validate generated SQL
      const sqlValidation = await this.validateSQL(sql);
      if (!sqlValidation.isValid) {
        return this.createErrorResult(`Generated SQL is invalid: ${sqlValidation.errors.join(', ')}`);
      }

      // Preview mode - return preview without executing
      if (previewOnly) {
        const preview = await this.previewChanges(sql);
        return this.createSuccessResult('Preview generated', { 
          preview, 
          sql,
          indexName,
          tableName,
          schema,
        });
      }

      // Execute on database if requested
      let executed = false;
      if (executeImmediately) {
        const result = await postgresService.execute(sql);
        if (!result.success) {
          return this.createErrorResult(`Failed to create index: ${result.error}`);
        }
        executed = true;
      }

      // Create migration file if requested
      let migrationResult;
      if (createMigration) {
        migrationResult = await MigrationHelpers.createMigration(
          'create_index',
          `create_index_${indexName}`,
          sql,
          sqlGenerator.generateDropIndexSql(indexName),
        );
      }

      return this.createSuccessResult(
        `Index ${indexName} ${executed ? 'created and executed' : 'migration created'} for table ${schema}.${tableName}`,
        {
          indexName,
          tableName,
          schema,
          columns,
          unique,
          executed,
          migrationCreated: !!migrationResult,
          sql,
          ...(migrationResult && { migrationName: migrationResult.migrationName }),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class AlterTableTool extends AbstractBaseTool {
  public readonly name = 'alter_table';
  public readonly description = 'Alter a PostgreSQL table structure';
  public readonly schema = {
    type: 'object',
    properties: {
      tableName: { type: 'string', description: 'Table name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      operation: { type: 'string', description: 'ALTER operation (ADD COLUMN, DROP COLUMN, etc.)' },
      details: { type: 'string', description: 'Operation details' },
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
      createMigration: { type: 'boolean', default: true },
    },
    required: ['tableName', 'operation', 'details'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const {
      tableName,
      schema = 'public',
      operation,
      details,
      executeImmediately = true,
      previewOnly = false,
      createMigration = true,
    } = args as {
      tableName: string;
      schema?: string;
      operation: string;
      details: string;
      executeImmediately?: boolean;
      previewOnly?: boolean;
      createMigration?: boolean;
    };

    this.validateRequiredArgs(args, ['tableName', 'operation', 'details']);

    const tableValidation = ValidationUtils.validateTableName(tableName);
    if (!tableValidation.isValid) {
      return this.createErrorResult(`Invalid table name: ${tableValidation.error}`);
    }

    try {
      const sqlGenerator = SqlGenerator.getInstance();
      const sql = sqlGenerator.generateAlterTableSql(tableName, operation, details, schema);

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
        migrationResult = await MigrationHelpers.createMigration(
          'alter_table',
          `alter_table_${tableName}`,
          sql,
          '-- Add rollback SQL here',
        );
      }

      return this.createSuccessResult(
        `Table ${schema}.${tableName} ${executed ? 'altered' : 'prepared for alteration'}`,
        {
          tableName,
          schema,
          operation,
          details,
          executed,
          sql,
          ...(migrationResult && { migrationName: migrationResult.migrationName }),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class DropFunctionTool extends AbstractBaseTool {
  public readonly name = 'drop_function';
  public readonly description = 'Drop a PostgreSQL function';
  public readonly schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Function name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      createMigration: { type: 'boolean', default: true },
    },
    required: ['name'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { name, schema = 'public', createMigration = true } = args as {
      name: string;
      schema?: string;
      createMigration?: boolean;
    };

    this.validateRequiredArgs(args, ['name']);

    try {
      const postgresService = new PostgresService(config.postgres);
      const sqlGenerator = SqlGenerator.getInstance();

      const sql = sqlGenerator.generateDropFunctionSql(name, schema);

      const result = await postgresService.execute(sql);
      if (!result.success) {
        return this.createErrorResult(`Failed to drop function: ${result.error}`);
      }

      let migrationResult;
      if (createMigration) {
        migrationResult = await MigrationHelpers.createMigration(
          'drop_function',
          `drop_function_${name}`,
          sql,
          '-- Add recreation SQL here',
        );
      }

      return this.createSuccessResult(
        `Function ${schema}.${name} dropped successfully`,
        {
          functionName: name,
          schema,
          sql,
          ...(migrationResult && { migrationName: migrationResult.migrationName }),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class DropTriggerTool extends AbstractBaseTool {
  public readonly name = 'drop_trigger';
  public readonly description = 'Drop a PostgreSQL trigger';
  public readonly schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Trigger name' },
      tableName: { type: 'string', description: 'Table name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      createMigration: { type: 'boolean', default: true },
    },
    required: ['name', 'tableName'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { name, tableName, schema = 'public', createMigration = true } = args as {
      name: string;
      tableName: string;
      schema?: string;
      createMigration?: boolean;
    };

    this.validateRequiredArgs(args, ['name', 'tableName']);

    try {
      const postgresService = new PostgresService(config.postgres);
      const sqlGenerator = SqlGenerator.getInstance();

      const sql = sqlGenerator.generateDropTriggerSql(name, tableName, schema);

      const result = await postgresService.execute(sql);
      if (!result.success) {
        return this.createErrorResult(`Failed to drop trigger: ${result.error}`);
      }

      let migrationResult;
      if (createMigration) {
        migrationResult = await MigrationHelpers.createMigration(
          'drop_trigger',
          `drop_trigger_${name}`,
          sql,
          '-- Add recreation SQL here',
        );
      }

      return this.createSuccessResult(
        `Trigger ${name} dropped successfully from table ${schema}.${tableName}`,
        {
          triggerName: name,
          tableName,
          schema,
          sql,
          ...(migrationResult && { migrationName: migrationResult.migrationName }),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class DropIndexTool extends AbstractBaseTool {
  public readonly name = 'drop_index';
  public readonly description = 'Drop a PostgreSQL index';
  public readonly schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Index name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      createMigration: { type: 'boolean', default: true },
    },
    required: ['name'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { name, schema = 'public', createMigration = true } = args as {
      name: string;
      schema?: string;
      createMigration?: boolean;
    };

    this.validateRequiredArgs(args, ['name']);

    try {
      const postgresService = new PostgresService(config.postgres);
      const sqlGenerator = SqlGenerator.getInstance();

      const sql = sqlGenerator.generateDropIndexSql(name);

      const result = await postgresService.execute(sql);
      if (!result.success) {
        return this.createErrorResult(`Failed to drop index: ${result.error}`);
      }

      let migrationResult;
      if (createMigration) {
        migrationResult = await MigrationHelpers.createMigration(
          'drop_index',
          `drop_index_${name}`,
          sql,
          '-- Add recreation SQL here',
        );
      }

      return this.createSuccessResult(
        `Index ${name} dropped successfully`,
        {
          indexName: name,
          schema,
          sql,
          ...(migrationResult && { migrationName: migrationResult.migrationName }),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}