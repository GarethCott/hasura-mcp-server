import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { hasuraService, PostgresService, IntegrationService } from '../services/index.js';
import { logger } from '../utils/index.js';
import { config } from '../config/index.js';

export class ResourceManager {
  private static instance: ResourceManager;
  private postgresService: PostgresService;
  private integrationService: IntegrationService;

  private constructor() {
    this.postgresService = new PostgresService(config.postgres);
    this.integrationService = new IntegrationService(hasuraService, this.postgresService);
  }

  public static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  public getAvailableResources(): Resource[] {
    return [
      {
        uri: 'hasura://config',
        name: 'Hasura Configuration',
        description: 'Current Hasura project configuration',
        mimeType: 'application/yaml',
      },
      {
        uri: 'hasura://metadata',
        name: 'Hasura Metadata',
        description: 'Complete Hasura metadata including tables, relationships, and permissions',
        mimeType: 'application/json',
      },
      {
        uri: 'hasura://migrations',
        name: 'Hasura Migrations',
        description: 'All migration files in the project',
        mimeType: 'application/json',
      },
      {
        uri: 'hasura://schema',
        name: 'Database Schema',
        description: 'Current database schema structure',
        mimeType: 'application/json',
      },
      {
        uri: 'hasura://project-info',
        name: 'Project Information',
        description: 'General information about the Hasura project',
        mimeType: 'application/json',
      },
      // PostgreSQL Resources
      {
        uri: 'postgres://live-schema',
        name: 'Live PostgreSQL Schema',
        description: 'Real-time database schema from PostgreSQL',
        mimeType: 'application/json',
      },
      {
        uri: 'postgres://performance',
        name: 'Database Performance Metrics',
        description: 'Live performance analysis and optimization suggestions',
        mimeType: 'application/json',
      },
      {
        uri: 'postgres://connection-status',
        name: 'PostgreSQL Connection Status',
        description: 'Current PostgreSQL connection status and configuration',
        mimeType: 'application/json',
      },
    ];
  }

  public async getResourceContent(uri: string): Promise<{ content: string; mimeType: string }> {
    logger.info(`Fetching resource: ${uri}`);

    switch (uri) {
      case 'hasura://config':
        return await this.getConfigResource();
      
      case 'hasura://metadata':
        return await this.getMetadataResource();
      
      case 'hasura://migrations':
        return await this.getMigrationsResource();
      
      case 'hasura://schema':
        return await this.getSchemaResource();
      
      case 'hasura://project-info':
        return await this.getProjectInfoResource();
      
      // PostgreSQL Resources
      case 'postgres://live-schema':
        return await this.getLiveSchemaResource();
      
      case 'postgres://performance':
        return await this.getPerformanceResource();
      
      case 'postgres://connection-status':
        return await this.getConnectionStatusResource();
      
      default:
        throw new Error(`Unknown resource URI: ${uri}`);
    }
  }

  private async getConfigResource(): Promise<{ content: string; mimeType: string }> {
    try {
      const config = await hasuraService.getConfig();
      return {
        content: JSON.stringify(config, null, 2),
        mimeType: 'application/json',
      };
    } catch (error) {
      logger.error('Failed to get config resource', error);
      throw new Error('Failed to retrieve Hasura configuration');
    }
  }

  private async getMetadataResource(): Promise<{ content: string; mimeType: string }> {
    try {
      const metadata = await hasuraService.getMetadata();
      return {
        content: JSON.stringify(metadata, null, 2),
        mimeType: 'application/json',
      };
    } catch (error) {
      logger.error('Failed to get metadata resource', error);
      throw new Error('Failed to retrieve Hasura metadata');
    }
  }

  private async getMigrationsResource(): Promise<{ content: string; mimeType: string }> {
    try {
      const migrations = await hasuraService.getMigrations();
      return {
        content: JSON.stringify(migrations, null, 2),
        mimeType: 'application/json',
      };
    } catch (error) {
      logger.error('Failed to get migrations resource', error);
      throw new Error('Failed to retrieve Hasura migrations');
    }
  }

  private async getSchemaResource(): Promise<{ content: string; mimeType: string }> {
    try {
      const metadata = await hasuraService.getMetadata();
      
      // Extract schema information from metadata with proper null checks
      const schema = {
        sources: (metadata.sources || []).map(source => ({
          name: source?.name || 'unknown',
          kind: source?.kind || 'unknown',
          tables: (source?.tables || []).map(table => ({
            name: table?.table?.name || 'unknown',
            schema: table?.table?.schema || 'public',
            relationships: {
              object: table?.object_relationships || [],
              array: table?.array_relationships || [],
            },
            permissions: {
              select: table?.select_permissions || [],
              insert: table?.insert_permissions || [],
              update: table?.update_permissions || [],
              delete: table?.delete_permissions || [],
            },
          })),
        })),
      };

      return {
        content: JSON.stringify(schema, null, 2),
        mimeType: 'application/json',
      };
    } catch (error) {
      logger.error('Failed to get schema resource', error);
      throw new Error('Failed to retrieve database schema');
    }
  }

  private async getProjectInfoResource(): Promise<{ content: string; mimeType: string }> {
    try {
      const config = await hasuraService.getConfig();
      const migrations = await hasuraService.getMigrations();
      const metadata = await hasuraService.getMetadata();

      const projectInfo = {
        projectPath: hasuraService.getProjectPath(),
        endpoint: hasuraService.getEndpoint(),
        configVersion: config?.version || 'unknown',
        totalMigrations: migrations?.length || 0,
        totalTables: (metadata?.sources || []).reduce((acc, source) => acc + (source?.tables?.length || 0), 0),
        sources: (metadata?.sources || []).map(source => ({
          name: source?.name || 'unknown',
          kind: source?.kind || 'unknown',
          tableCount: source?.tables?.length || 0,
        })),
        lastMigration: migrations && migrations.length > 0 ? migrations[migrations.length - 1] : null,
      };

      return {
        content: JSON.stringify(projectInfo, null, 2),
        mimeType: 'application/json',
      };
    } catch (error) {
      logger.error('Failed to get project info resource', error);
      throw new Error('Failed to retrieve project information');
    }
  }

  // PostgreSQL Resource Methods
  private async getLiveSchemaResource(): Promise<{ content: string; mimeType: string }> {
    try {
      const tables = await this.postgresService.listTables();
      const relationships = await this.postgresService.getRelationships();
      const indexes = await this.postgresService.getIndexes();

      // Get detailed table information
      const tableDetails = await Promise.all(
        tables.map(tableName => this.postgresService.getTableSchema(tableName)),
      );

      const liveSchema = {
        timestamp: new Date().toISOString(),
        database: 'PostgreSQL',
        tableCount: tables.length,
        tables: tableDetails,
        relationships,
        indexes,
        summary: {
          totalTables: tables.length,
          totalRelationships: relationships.length,
          totalIndexes: indexes.length,
          tablesWithoutPrimaryKey: tableDetails.filter(t => !t.columns.some(c => c.primaryKey)).length,
        },
      };

      return {
        content: JSON.stringify(liveSchema, null, 2),
        mimeType: 'application/json',
      };
    } catch (error) {
      logger.error('Failed to get live schema resource', error);
      throw new Error('Failed to retrieve live PostgreSQL schema');
    }
  }

  private async getPerformanceResource(): Promise<{ content: string; mimeType: string }> {
    try {
      const performance = await this.postgresService.analyzePerformance();
      const optimization = await this.integrationService.optimizeSchema();

      const performanceData = {
        timestamp: new Date().toISOString(),
        metrics: performance,
        optimization: {
          applied: optimization.applied,
          failed: optimization.failed,
          appliedCount: optimization.applied.length,
          failedCount: optimization.failed.length,
        },
      };

      return {
        content: JSON.stringify(performanceData, null, 2),
        mimeType: 'application/json',
      };
    } catch (error) {
      logger.error('Failed to get performance resource', error);
      throw new Error('Failed to retrieve database performance metrics');
    }
  }

  private async getConnectionStatusResource(): Promise<{ content: string; mimeType: string }> {
    try {
      const isConnected = await this.postgresService.testConnection();
      
      const connectionStatus = {
        timestamp: new Date().toISOString(),
        connected: isConnected,
        configuration: {
          host: config.postgres.connectionString.includes('@') 
            ? config.postgres.connectionString.split('@')[1]?.split('/')[0] 
            : 'localhost',
          poolSize: config.postgres.poolSize,
          idleTimeout: config.postgres.idleTimeoutMillis,
          connectionTimeout: config.postgres.connectionTimeoutMillis,
        },
        status: isConnected ? 'Connected' : 'Disconnected',
      };

      return {
        content: JSON.stringify(connectionStatus, null, 2),
        mimeType: 'application/json',
      };
    } catch (error) {
      logger.error('Failed to get connection status resource', error);
      return {
        content: JSON.stringify({
          timestamp: new Date().toISOString(),
          connected: false,
          status: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }, null, 2),
        mimeType: 'application/json',
      };
    }
  }
}

export const resourceManager = ResourceManager.getInstance(); 