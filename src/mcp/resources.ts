import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { hasuraService } from '../services/index.js';
import { logger } from '../utils/index.js';

export class ResourceManager {
  private static instance: ResourceManager;

  private constructor() {}

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
        mimeType: 'application/yaml'
      },
      {
        uri: 'hasura://metadata',
        name: 'Hasura Metadata',
        description: 'Complete Hasura metadata including tables, relationships, and permissions',
        mimeType: 'application/json'
      },
      {
        uri: 'hasura://migrations',
        name: 'Hasura Migrations',
        description: 'All migration files in the project',
        mimeType: 'application/json'
      },
      {
        uri: 'hasura://schema',
        name: 'Database Schema',
        description: 'Current database schema structure',
        mimeType: 'application/json'
      },
      {
        uri: 'hasura://project-info',
        name: 'Project Information',
        description: 'General information about the Hasura project',
        mimeType: 'application/json'
      }
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
      
      default:
        throw new Error(`Unknown resource URI: ${uri}`);
    }
  }

  private async getConfigResource(): Promise<{ content: string; mimeType: string }> {
    try {
      const config = await hasuraService.getConfig();
      return {
        content: JSON.stringify(config, null, 2),
        mimeType: 'application/json'
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
        mimeType: 'application/json'
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
        mimeType: 'application/json'
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
              array: table?.array_relationships || []
            },
            permissions: {
              select: table?.select_permissions || [],
              insert: table?.insert_permissions || [],
              update: table?.update_permissions || [],
              delete: table?.delete_permissions || []
            }
          }))
        }))
      };

      return {
        content: JSON.stringify(schema, null, 2),
        mimeType: 'application/json'
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
          tableCount: source?.tables?.length || 0
        })),
        lastMigration: migrations && migrations.length > 0 ? migrations[migrations.length - 1] : null
      };

      return {
        content: JSON.stringify(projectInfo, null, 2),
        mimeType: 'application/json'
      };
    } catch (error) {
      logger.error('Failed to get project info resource', error);
      throw new Error('Failed to retrieve project information');
    }
  }
}

export const resourceManager = ResourceManager.getInstance(); 