import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolResult, ToolContext } from './tool-types.js';
import { logger } from '../../../utils/index.js';

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

  // Utility method to get Tool definition for MCP
  public getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.schema,
    };
  }
} 