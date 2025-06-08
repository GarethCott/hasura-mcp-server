import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolResult, ToolContext, ExecutionOptions, ChangePreview } from './tool-types.js';
import { logger } from '../../../utils/index.js';
import { ValidationUtils } from '../utils/validation.js';
import { PostgresService } from '../../../services/postgres-service.js';
import { IntegrationService } from '../../../services/integration-service.js';
import { hasuraService } from '../../../services/index.js';
import { config } from '../../../config/index.js';

export abstract class AbstractBaseTool implements BaseTool {
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly schema: Tool['inputSchema'];

  protected createContext(args: Record<string, unknown>): ToolContext {
    return {
      toolName: this.name,
      args,
      timestamp: new Date(),
    };
  }

  protected createSuccessResult(message: string, data?: unknown): ToolResult {
    return {
      success: true,
      message,
      data,
    };
  }

  protected createErrorResult(error: string | Error): ToolResult {
    const errorMessage = error instanceof Error ? error.message : error;
    logger.error(`Tool ${this.name} failed:`, errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }

  protected validateRequiredArgs(args: Record<string, unknown>, required: string[]): void {
    const missing = required.filter(key => args[key] === undefined || args[key] === null);
    if (missing.length > 0) {
      throw new Error(`Missing required arguments: ${missing.join(', ')}`);
    }
  }

  protected logExecution(context: ToolContext, result: ToolResult): void {
    const duration = Date.now() - context.timestamp.getTime();
    
    if (result.success) {
      logger.info(`Tool ${context.toolName} executed successfully in ${duration}ms`);
    } else {
      logger.error(`Tool ${context.toolName} failed after ${duration}ms: ${result.error}`);
    }
  }

  public async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const context = this.createContext(args);
    
    try {
      logger.debug(`Executing tool ${this.name} with args:`, args);
      
      const result = await this.executeImpl(args);
      this.logExecution(context, result);
      
      return result;
    } catch (error) {
      const errorResult = this.createErrorResult(error instanceof Error ? error : new Error(String(error)));
      this.logExecution(context, errorResult);
      
      return errorResult;
    }
  }

  protected abstract executeImpl(args: Record<string, unknown>): Promise<ToolResult>;

  // Common execution methods for enhanced tools
  protected async validateSQL(sql: string): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const validation = ValidationUtils.validateSql(sql);
      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'SQL validation failed'],
      };
    }
  }

  protected async previewChanges(sql: string): Promise<ChangePreview> {
    try {
      const postgresService = new PostgresService(config.postgres);
      const integrationService = new IntegrationService(hasuraService, postgresService);
      return await integrationService.previewChanges(sql);
    } catch (error) {
      return {
        sql,
        affectedTables: [],
        estimatedImpact: 'Unknown',
        warnings: [error instanceof Error ? error.message : 'Preview failed'],
      };
    }
  }

  protected async executeSQL(sql: string): Promise<{ success: boolean; error?: string; rowsAffected?: number }> {
    try {
      const postgresService = new PostgresService(config.postgres);
      return await postgresService.execute(sql);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SQL execution failed',
      };
    }
  }

  protected extractExecutionOptions(args: Record<string, unknown>): ExecutionOptions {
    return {
      executeImmediately: args.executeImmediately as boolean ?? false,
      previewOnly: args.previewOnly as boolean ?? false,
      createMigration: args.createMigration as boolean ?? true,
    };
  }

  // Utility method to get Tool definition for MCP
  public getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.schema,
    };
  }
} 