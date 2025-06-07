import { AbstractBaseTool } from '../base/base-tool.js';
import { ToolResult } from '../base/tool-types.js';
import { ValidationUtils } from '../utils/validation.js';
import { PostgresService } from '../../../services/postgres-service.js';
import { SqlGenerator } from '../../../services/sql-generator.js';
import { config } from '../../../config/index.js';

export class AnalyzeSchemaTool extends AbstractBaseTool {
  public readonly name = 'analyze_schema';
  public readonly description = 'Analyze database schema for structure and relationships';
  public readonly schema = {
    type: 'object',
    properties: {
      schema: { type: 'string', description: 'Database schema to analyze', default: 'public' },
      includePerformance: { type: 'boolean', description: 'Include performance metrics', default: false },
    },
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { schema = 'public', includePerformance = false } = args as {
      schema?: string;
      includePerformance?: boolean;
    };

    const schemaValidation = ValidationUtils.validateSchemaName(schema);
    if (!schemaValidation.isValid) {
      return this.createErrorResult(schemaValidation.error!);
    }

    try {
      const postgresService = new PostgresService(config.postgres);
      const sqlGenerator = SqlGenerator.getInstance();

      // Get schema analysis
      const analysisSql = sqlGenerator.generateSchemaAnalysisSql(schema);
      const analysisResult = await postgresService.execute(analysisSql);

      if (!analysisResult.success) {
        return this.createErrorResult(`Failed to analyze schema: ${analysisResult.error}`);
      }

      let performanceMetrics;
      if (includePerformance) {
        performanceMetrics = await postgresService.analyzePerformance();
      }

      return this.createSuccessResult(
        `Schema ${schema} analyzed successfully`,
        {
          schema,
          analysis: analysisResult.data,
          ...(performanceMetrics && { performance: performanceMetrics }),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class ValidateSqlTool extends AbstractBaseTool {
  public readonly name = 'validate_sql';
  public readonly description = 'Validate SQL syntax and check for potential issues';
  public readonly schema = {
    type: 'object',
    properties: {
      sql: { type: 'string', description: 'SQL query to validate' },
    },
    required: ['sql'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { sql } = args as { sql: string };

    this.validateRequiredArgs(args, ['sql']);

    try {
      const postgresService = new PostgresService(config.postgres);
      const validation = await postgresService.validateSQL(sql);

      return this.createSuccessResult(
        validation.isValid ? 'SQL is valid' : 'SQL validation failed',
        {
          sql,
          isValid: validation.isValid,
          errors: validation.errors || [],
          warnings: validation.warnings || [],
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class TestConnectionTool extends AbstractBaseTool {
  public readonly name = 'test_connection';
  public readonly description = 'Test PostgreSQL database connection';
  public readonly schema = {
    type: 'object',
    properties: {},
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const postgresService = new PostgresService(config.postgres);
      const isConnected = await postgresService.testConnection();

      return this.createSuccessResult(
        isConnected ? 'Database connection successful' : 'Database connection failed',
        {
          connected: isConnected,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

export class OptimizeDatabaseTool extends AbstractBaseTool {
  public readonly name = 'optimize_database';
  public readonly description = 'Analyze and suggest database optimizations';
  public readonly schema = {
    type: 'object',
    properties: {
      schema: { type: 'string', description: 'Database schema to optimize', default: 'public' },
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

      // Get performance metrics
      const performance = await postgresService.analyzePerformance();

      // Get table information for optimization suggestions
      const tables = await postgresService.listTables(schema);
      const suggestions = [];

      for (const table of tables) {
        try {
          const tableInfo = await postgresService.getTableSchema(table, schema);
          
          // Basic optimization suggestions
          if ((tableInfo.rowCount || 0) > 10000 && tableInfo.indexes.length === 0) {
            suggestions.push({
              type: 'index',
              table,
              message: `Table ${table} has ${tableInfo.rowCount || 0} rows but no indexes. Consider adding indexes on frequently queried columns.`,
            });
          }

          if (tableInfo.columns.some(col => col.type === 'text' && !col.nullable)) {
            suggestions.push({
              type: 'schema',
              table,
              message: `Table ${table} has non-nullable TEXT columns. Consider using VARCHAR with appropriate length limits.`,
            });
          }
        } catch (error) {
          // Skip tables we can't analyze
          continue;
        }
      }

      return this.createSuccessResult(
        `Database optimization analysis completed for schema ${schema}`,
        {
          schema,
          performance,
          suggestions,
          tablesAnalyzed: tables.length,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
} 