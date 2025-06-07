import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { config } from './config/index.js';
import { logger } from './utils/index.js';
import { resourceManager, toolManager, promptManager } from './mcp/index.js';

export class HasuraMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: config.server.name,
        version: config.server.version,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        const resources = resourceManager.getAvailableResources();
        logger.info(`Listed ${resources.length} resources`);
        return { resources };
      } catch (error) {
        logger.error('Failed to list resources', error);
        throw error;
      }
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        const { uri } = request.params;
        const { content, mimeType } = await resourceManager.getResourceContent(uri);
        logger.info(`Read resource: ${uri}`);
        
        return {
          contents: [
            {
              uri,
              mimeType,
              text: content,
            },
          ],
        };
      } catch (error) {
        logger.error(`Failed to read resource: ${request.params.uri}`, error);
        throw error;
      }
    });

    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        const tools = toolManager.getAvailableTools();
        logger.info(`Listed ${tools.length} tools`);
        return { tools };
      } catch (error) {
        logger.error('Failed to list tools', error);
        throw error;
      }
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        logger.info(`Calling tool: ${name}`, { args });
        
        const result = await toolManager.executeTool(name, args || {});
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error(`Failed to execute tool: ${request.params.name}`, error);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });

    // Prompt handlers
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      try {
        const prompts = promptManager.getAvailablePrompts();
        logger.info(`Listed ${prompts.length} prompts`);
        return { prompts };
      } catch (error) {
        logger.error('Failed to list prompts', error);
        throw error;
      }
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        logger.info(`Getting prompt: ${name}`, { args });
        
        const content = await promptManager.getPromptContent(name, args || {});
        
        return {
          description: `Generated prompt for ${name}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: content,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Failed to get prompt: ${request.params.name}`, error);
        throw error;
      }
    });
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      config.validateConfig();
      
      logger.info('Starting Hasura MCP Server', {
        name: config.server.name,
        version: config.server.version,
        hasuraEndpoint: config.hasura.endpoint,
        hasuraProjectPath: config.hasura.projectPath,
      });

      // Create transport and connect
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('Hasura MCP Server started successfully');
    } catch (error) {
      logger.error('Failed to start Hasura MCP Server', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.server.close();
      logger.info('Hasura MCP Server stopped');
    } catch (error) {
      logger.error('Failed to stop Hasura MCP Server', error);
      throw error;
    }
  }
}

// Error handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

export default HasuraMcpServer; 