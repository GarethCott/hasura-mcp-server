import yaml from 'js-yaml';
import { config } from '../config/index.js';
import { logger, FileSystemUtils } from '../utils/index.js';
import { HasuraMetadata, MigrationFile } from '../types/index.js';

export class HasuraService {
  private static instance: HasuraService;

  private constructor() {}

  public static getInstance(): HasuraService {
    if (!HasuraService.instance) {
      HasuraService.instance = new HasuraService();
    }
    return HasuraService.instance;
  }

  public async getConfig(): Promise<any> {
    try {
      const configPath = FileSystemUtils.joinPath(config.hasura.projectPath, 'config.yaml');
      const configContent = await FileSystemUtils.readFile(configPath);
      return yaml.load(configContent);
    } catch (error) {
      logger.error('Failed to read Hasura config', error);
      throw new Error('Failed to read Hasura config');
    }
  }

  public async getMetadata(): Promise<HasuraMetadata> {
    try {
      const metadataPath = FileSystemUtils.joinPath(config.hasura.projectPath, 'metadata', 'databases', 'default', 'tables');
      
      if (!(await FileSystemUtils.directoryExists(metadataPath))) {
        logger.warn('Metadata directory not found, returning empty metadata');
        return this.createEmptyMetadata();
      }

      const tables = await this.loadTablesMetadata(metadataPath);
      
      return {
        version: 3,
        sources: [{
          name: 'default',
          kind: 'postgres',
          tables,
          configuration: {
            connection_info: {
              database_url: { from_env: 'HASURA_GRAPHQL_DATABASE_URL' }
            }
          }
        }]
      };
    } catch (error) {
      logger.error('Failed to read Hasura metadata', error);
      throw new Error('Failed to read Hasura metadata');
    }
  }

  private async loadTablesMetadata(metadataPath: string): Promise<any[]> {
    const tables: any[] = [];
    
    try {
      const tableFiles = await FileSystemUtils.listDirectory(metadataPath);
      
      for (const file of tableFiles) {
        if (file.endsWith('.yaml')) {
          const tablePath = FileSystemUtils.joinPath(metadataPath, file);
          const tableContent = await FileSystemUtils.readFile(tablePath);
          const tableMetadata = yaml.load(tableContent);
          tables.push(tableMetadata);
        }
      }
    } catch (error) {
      logger.warn('Failed to load some table metadata files', error);
    }

    return tables;
  }

  private createEmptyMetadata(): HasuraMetadata {
    return {
      version: 3,
      sources: [{
        name: 'default',
        kind: 'postgres',
        tables: [],
        configuration: {
          connection_info: {
            database_url: { from_env: 'HASURA_GRAPHQL_DATABASE_URL' }
          }
        }
      }]
    };
  }

  public async getMigrations(): Promise<MigrationFile[]> {
    try {
      const migrationsPath = FileSystemUtils.joinPath(config.hasura.projectPath, 'migrations', 'default');
      
      if (!(await FileSystemUtils.directoryExists(migrationsPath))) {
        logger.warn('Migrations directory not found');
        return [];
      }

      const migrationDirs = await FileSystemUtils.listDirectory(migrationsPath);
      const migrations: MigrationFile[] = [];

      for (const dir of migrationDirs) {
        const migrationPath = FileSystemUtils.joinPath(migrationsPath, dir);
        
        if (await FileSystemUtils.directoryExists(migrationPath)) {
          const upSqlPath = FileSystemUtils.joinPath(migrationPath, 'up.sql');
          const downSqlPath = FileSystemUtils.joinPath(migrationPath, 'down.sql');

          let upSql = '';
          let downSql = '';

          if (await FileSystemUtils.fileExists(upSqlPath)) {
            upSql = await FileSystemUtils.readFile(upSqlPath);
          }

          if (await FileSystemUtils.fileExists(downSqlPath)) {
            downSql = await FileSystemUtils.readFile(downSqlPath);
          }

          const parts = dir.split('_');
          const timestamp = parts[0];
          const name = parts.slice(1).join('_');

          migrations.push({
            timestamp,
            name,
            upSql,
            downSql
          });
        }
      }

      return migrations.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    } catch (error) {
      logger.error('Failed to read migrations', error);
      throw new Error('Failed to read migrations');
    }
  }

  public async createMigration(name: string, upSql: string, downSql: string = ''): Promise<string> {
    try {
      const timestamp = FileSystemUtils.generateTimestamp();
      const migrationName = `${timestamp}_${name}`;
      const migrationPath = FileSystemUtils.joinPath(
        config.hasura.projectPath,
        'migrations',
        'default',
        migrationName
      );

      await FileSystemUtils.ensureDirectory(migrationPath);

      const upSqlPath = FileSystemUtils.joinPath(migrationPath, 'up.sql');
      const downSqlPath = FileSystemUtils.joinPath(migrationPath, 'down.sql');

      await FileSystemUtils.writeFile(upSqlPath, upSql);
      await FileSystemUtils.writeFile(downSqlPath, downSql);

      logger.info(`Created migration: ${migrationName}`);
      return migrationName;
    } catch (error) {
      logger.error('Failed to create migration', error);
      throw new Error('Failed to create migration');
    }
  }

  public async updateTableMetadata(tableName: string, schema: string, metadata: any): Promise<void> {
    try {
      const metadataPath = FileSystemUtils.joinPath(
        config.hasura.projectPath,
        'metadata',
        'databases',
        'default',
        'tables'
      );

      await FileSystemUtils.ensureDirectory(metadataPath);

      const fileName = `${schema}_${tableName}.yaml`;
      const filePath = FileSystemUtils.joinPath(metadataPath, fileName);

      const yamlContent = yaml.dump(metadata, { 
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });

      await FileSystemUtils.writeFile(filePath, yamlContent);
      logger.info(`Updated metadata for table: ${schema}.${tableName}`);
    } catch (error) {
      logger.error(`Failed to update metadata for table: ${schema}.${tableName}`, error);
      throw new Error(`Failed to update metadata for table: ${schema}.${tableName}`);
    }
  }

  public getProjectPath(): string {
    return config.hasura.projectPath;
  }

  public getEndpoint(): string {
    return config.hasura.endpoint;
  }
}

export const hasuraService = HasuraService.getInstance(); 