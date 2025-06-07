import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { hasuraService, sqlGenerator } from '../services/index.js';
import { logger } from '../utils/index.js';
import { TableDefinition, TableColumn, RelationshipDefinition, PermissionDefinition } from '../types/index.js';

export class ToolManager {
  private static instance: ToolManager;

  private constructor() {}

  public static getInstance(): ToolManager {
    if (!ToolManager.instance) {
      ToolManager.instance = new ToolManager();
    }
    return ToolManager.instance;
  }

  public getAvailableTools(): Tool[] {
    return [
      {
        name: 'create_table',
        description: 'Create a new table with specified columns and constraints',
        inputSchema: {
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
                  unique: { type: 'boolean', description: 'Whether column has unique constraint', default: false }
                },
                required: ['name', 'type']
              }
            }
          },
          required: ['name', 'columns']
        }
      },
      {
        name: 'add_column',
        description: 'Add a new column to an existing table',
        inputSchema: {
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
                default: { type: 'string', description: 'Default value' }
              },
              required: ['name', 'type']
            }
          },
          required: ['tableName', 'column']
        }
      },
      {
        name: 'create_relationship',
        description: 'Create a relationship between tables',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: { type: 'string', description: 'Source table name' },
            schema: { type: 'string', description: 'Source table schema', default: 'public' },
            relationship: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Relationship name' },
                type: { type: 'string', enum: ['object', 'array'], description: 'Relationship type' },
                table: { type: 'string', description: 'Target table name' },
                schema: { type: 'string', description: 'Target table schema', default: 'public' },
                using: {
                  type: 'object',
                  properties: {
                    foreign_key_constraint_on: { type: 'string', description: 'Foreign key column' },
                    manual_configuration: {
                      type: 'object',
                      properties: {
                        remote_table: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            schema: { type: 'string' }
                          }
                        },
                        column_mapping: { type: 'object', description: 'Column mapping object' }
                      }
                    }
                  }
                }
              },
              required: ['name', 'type', 'table', 'using']
            }
          },
          required: ['tableName', 'relationship']
        }
      },
      {
        name: 'set_permissions',
        description: 'Set permissions for a table and role',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: { type: 'string', description: 'Table name' },
            schema: { type: 'string', description: 'Table schema', default: 'public' },
            role: { type: 'string', description: 'Role name' },
            permission: { type: 'string', enum: ['select', 'insert', 'update', 'delete'], description: 'Permission type' },
            filter: { type: 'object', description: 'Row-level security filter' },
            columns: { 
              oneOf: [
                { type: 'string', enum: ['*'] },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Allowed columns (* for all)'
            },
            check: { type: 'object', description: 'Insert/update check constraint' },
            set: { type: 'object', description: 'Preset values for insert/update' }
          },
          required: ['tableName', 'role', 'permission']
        }
      },
      {
        name: 'generate_migration',
        description: 'Generate a migration file with custom SQL',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Migration name' },
            upSql: { type: 'string', description: 'SQL for applying the migration' },
            downSql: { type: 'string', description: 'SQL for reverting the migration', default: '' }
          },
          required: ['name', 'upSql']
        }
      },
      {
        name: 'analyze_schema',
        description: 'Analyze the current database schema and provide suggestions',
        inputSchema: {
          type: 'object',
          properties: {
            schema: { type: 'string', description: 'Database schema to analyze', default: 'public' }
          }
        }
      },
      {
        name: 'apply_migrations',
        description: 'Apply pending migrations and metadata to the Hasura instance',
        inputSchema: {
          type: 'object',
          properties: {
            applyMetadata: { type: 'boolean', description: 'Whether to also apply metadata changes', default: true }
          }
        }
      }
    ];
  }

  public async executeTool(name: string, args: any): Promise<any> {
    logger.info(`Executing tool: ${name}`, { args });

    switch (name) {
      case 'create_table':
        return await this.createTable(args);
      
      case 'add_column':
        return await this.addColumn(args);
      
      case 'create_relationship':
        return await this.createRelationship(args);
      
      case 'set_permissions':
        return await this.setPermissions(args);
      
      case 'generate_migration':
        return await this.generateMigration(args);
      
      case 'analyze_schema':
        return await this.analyzeSchema(args);
      
      case 'apply_migrations':
        return await this.applyMigrations(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async createTable(args: any): Promise<any> {
    try {
      const table: TableDefinition = {
        name: args.name,
        schema: args.schema || 'public',
        columns: args.columns
      };

      // Generate SQL
      const upSql = sqlGenerator.generateCreateTableSql(table);
      const downSql = sqlGenerator.generateDropTableSql(table.name, table.schema);

      // Validate SQL
      const validation = sqlGenerator.validateSql(upSql);
      if (!validation.isValid) {
        throw new Error(`Invalid SQL generated: ${validation.errors.join(', ')}`);
      }

      // Create migration
      const migrationName = await hasuraService.createMigration(
        `create_table_${table.name}`,
        upSql,
        downSql
      );

      // Create metadata
      const metadata = {
        table: { name: table.name, schema: table.schema },
        configuration: {
          custom_root_fields: {},
          custom_column_names: {}
        }
      };

      await hasuraService.updateTableMetadata(table.name, table.schema || 'public', metadata);

      return {
        success: true,
        message: `Table ${table.schema}.${table.name} created successfully`,
        migrationName,
        sql: upSql
      };
    } catch (error) {
      logger.error('Failed to create table', error);
      throw new Error(`Failed to create table: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async addColumn(args: any): Promise<any> {
    try {
      const { tableName, schema = 'public', column } = args;

      // Generate SQL
      const upSql = sqlGenerator.generateAddColumnSql(tableName, column, schema);
      const downSql = sqlGenerator.generateDropColumnSql(tableName, column.name, schema);

      // Validate SQL
      const validation = sqlGenerator.validateSql(upSql);
      if (!validation.isValid) {
        throw new Error(`Invalid SQL generated: ${validation.errors.join(', ')}`);
      }

      // Create migration
      const migrationName = await hasuraService.createMigration(
        `add_column_${tableName}_${column.name}`,
        upSql,
        downSql
      );

      return {
        success: true,
        message: `Column ${column.name} added to ${schema}.${tableName}`,
        migrationName,
        sql: upSql
      };
    } catch (error) {
      logger.error('Failed to add column', error);
      throw new Error(`Failed to add column: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createRelationship(args: any): Promise<any> {
    try {
      const { tableName, schema = 'public', relationship } = args;

      // If using foreign key constraint, generate the foreign key SQL
      let upSql = '';
      let downSql = '';

             if (relationship.using.foreign_key_constraint_on) {
         const targetSchema = relationship.schema || 'public';
         upSql = sqlGenerator.generateAddForeignKeySql(
           tableName,
           relationship.using.foreign_key_constraint_on,
           relationship.table,
           'id', // Assuming 'id' as the referenced column
           schema,
           targetSchema
         );
        downSql = sqlGenerator.generateDropForeignKeySql(
          tableName,
          `fk_${tableName}_${relationship.using.foreign_key_constraint_on}`,
          schema
        );

        // Create migration for foreign key
        const migrationName = await hasuraService.createMigration(
          `add_relationship_${tableName}_${relationship.name}`,
          upSql,
          downSql
        );
      }

      // Update metadata with relationship
      const metadata = await hasuraService.getMetadata();
      const source = metadata.sources.find(s => s.name === 'default');
      const table = source?.tables.find(t => t.table.name === tableName && t.table.schema === schema);

      if (table) {
        if (relationship.type === 'object') {
          table.object_relationships = table.object_relationships || [];
          table.object_relationships.push(relationship);
        } else {
          table.array_relationships = table.array_relationships || [];
          table.array_relationships.push(relationship);
        }

        await hasuraService.updateTableMetadata(tableName, schema, table);
      }

      return {
        success: true,
        message: `Relationship ${relationship.name} created for ${schema}.${tableName}`,
        relationship
      };
    } catch (error) {
      logger.error('Failed to create relationship', error);
      throw new Error(`Failed to create relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async setPermissions(args: any): Promise<any> {
    try {
      const { tableName, schema = 'public', role, permission, filter, columns, check, set } = args;

      // Update metadata with permissions
      const metadata = await hasuraService.getMetadata();
      const source = metadata.sources.find(s => s.name === 'default');
      const table = source?.tables.find(t => t.table.name === tableName && t.table.schema === schema);

      if (!table) {
        throw new Error(`Table ${schema}.${tableName} not found in metadata`);
      }

      const permissionObj: any = { role };

      if (permission === 'select') {
        permissionObj.permission = { columns: columns || '*', filter: filter || {} };
        table.select_permissions = table.select_permissions || [];
        table.select_permissions.push(permissionObj);
      } else if (permission === 'insert') {
        permissionObj.permission = { 
          columns: columns || '*', 
          check: check || {},
          set: set || {}
        };
        table.insert_permissions = table.insert_permissions || [];
        table.insert_permissions.push(permissionObj);
      } else if (permission === 'update') {
        permissionObj.permission = { 
          columns: columns || '*', 
          filter: filter || {},
          check: check || {},
          set: set || {}
        };
        table.update_permissions = table.update_permissions || [];
        table.update_permissions.push(permissionObj);
      } else if (permission === 'delete') {
        permissionObj.permission = { filter: filter || {} };
        table.delete_permissions = table.delete_permissions || [];
        table.delete_permissions.push(permissionObj);
      }

      await hasuraService.updateTableMetadata(tableName, schema, table);

      return {
        success: true,
        message: `${permission} permission set for role ${role} on ${schema}.${tableName}`,
        permission: permissionObj
      };
    } catch (error) {
      logger.error('Failed to set permissions', error);
      throw new Error(`Failed to set permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateMigration(args: any): Promise<any> {
    try {
      const { name, upSql, downSql = '' } = args;

      // Validate SQL
      const validation = sqlGenerator.validateSql(upSql);
      if (!validation.isValid) {
        throw new Error(`Invalid SQL: ${validation.errors.join(', ')}`);
      }

      // Create migration
      const migrationName = await hasuraService.createMigration(name, upSql, downSql);

      return {
        success: true,
        message: `Migration ${migrationName} created successfully`,
        migrationName,
        upSql,
        downSql
      };
    } catch (error) {
      logger.error('Failed to generate migration', error);
      throw new Error(`Failed to generate migration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeSchema(args: any): Promise<any> {
    try {
      const { schema = 'public' } = args;
      
      const metadata = await hasuraService.getMetadata();
      const source = metadata.sources.find(s => s.name === 'default');
      
      if (!source) {
        throw new Error('No default source found in metadata');
      }

      const tables = source.tables.filter(t => t.table.schema === schema);
      const analysis = {
        schema,
        tableCount: tables.length,
        tables: tables.map(table => ({
          name: table.table.name,
          hasRelationships: (table.object_relationships?.length || 0) + (table.array_relationships?.length || 0) > 0,
          hasPermissions: (table.select_permissions?.length || 0) + 
                         (table.insert_permissions?.length || 0) + 
                         (table.update_permissions?.length || 0) + 
                         (table.delete_permissions?.length || 0) > 0,
          relationshipCount: (table.object_relationships?.length || 0) + (table.array_relationships?.length || 0),
          permissionCount: (table.select_permissions?.length || 0) + 
                          (table.insert_permissions?.length || 0) + 
                          (table.update_permissions?.length || 0) + 
                          (table.delete_permissions?.length || 0)
        })),
        suggestions: this.generateSuggestions(tables)
      };

      return {
        success: true,
        analysis
      };
    } catch (error) {
      logger.error('Failed to analyze schema', error);
      throw new Error(`Failed to analyze schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateSuggestions(tables: any[]): string[] {
    const suggestions: string[] = [];

    // Check for tables without permissions
    const tablesWithoutPermissions = tables.filter(t => 
      !t.select_permissions?.length && 
      !t.insert_permissions?.length && 
      !t.update_permissions?.length && 
      !t.delete_permissions?.length
    );

    if (tablesWithoutPermissions.length > 0) {
      suggestions.push(`Consider adding permissions for tables: ${tablesWithoutPermissions.map(t => t.table.name).join(', ')}`);
    }

    // Check for tables without relationships
    const tablesWithoutRelationships = tables.filter(t => 
      (!t.object_relationships || t.object_relationships.length === 0) && 
      (!t.array_relationships || t.array_relationships.length === 0)
    );

    if (tablesWithoutRelationships.length > 0) {
      suggestions.push(`Consider adding relationships for isolated tables: ${tablesWithoutRelationships.map(t => t.table.name).join(', ')}`);
    }

    // General suggestions
    if (tables.length === 0) {
      suggestions.push('Schema is empty. Consider creating some tables to get started.');
    } else if (tables.length === 1) {
      suggestions.push('Consider adding more tables and establishing relationships between them.');
    }

    return suggestions;
  }

  private async applyMigrations(args: any): Promise<any> {
    try {
      const { applyMetadata = true } = args;
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const projectPath = hasuraService.getProjectPath();
      const results: string[] = [];

      // Apply migrations
      try {
        const { stdout: migrateOutput } = await execAsync('hasura migrate apply', {
          cwd: projectPath
        });
        results.push(`Migrations applied: ${migrateOutput.trim()}`);
      } catch (error) {
        throw new Error(`Failed to apply migrations: ${error}`);
      }

      // Apply metadata if requested
      if (applyMetadata) {
        try {
          const { stdout: metadataOutput } = await execAsync('hasura metadata apply', {
            cwd: projectPath
          });
          results.push(`Metadata applied: ${metadataOutput.trim()}`);
        } catch (error) {
          throw new Error(`Failed to apply metadata: ${error}`);
        }
      }

      return {
        success: true,
        message: 'Migrations and metadata applied successfully',
        results
      };
    } catch (error) {
      logger.error('Failed to apply migrations', error);
      throw new Error(`Failed to apply migrations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const toolManager = ToolManager.getInstance(); 