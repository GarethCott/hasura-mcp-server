import fs from 'fs/promises';
import { AbstractBaseTool } from '../base/base-tool.js';
import { ToolResult, HasuraRelationshipArgs, HasuraPermissionArgs } from '../base/tool-types.js';
import { ValidationUtils } from '../utils/validation.js';
import { MigrationHelpers } from '../utils/migration-helpers.js';
import { hasuraService } from '../../../services/index.js';
import { FileSystemUtils } from '../../../utils/index.js';

export class CreateRelationshipTool extends AbstractBaseTool {
  public readonly name = 'create_relationship';
  public readonly description = 'Create a relationship between tables in Hasura';
  public readonly schema = {
    type: 'object',
    properties: {
      tableName: { type: 'string', description: 'Source table name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      relationship: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Relationship name' },
          type: { type: 'string', enum: ['object', 'array'], description: 'Relationship type' },
          table: { type: 'string', description: 'Target table name' },
          schema: { type: 'string', description: 'Target table schema' },
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
                      schema: { type: 'string' },
                    },
                    required: ['name'],
                  },
                  column_mapping: { type: 'object', description: 'Column mapping' },
                },
                required: ['remote_table', 'column_mapping'],
              },
            },
          },
        },
        required: ['name', 'type', 'table', 'using'],
      },
    },
    required: ['tableName', 'relationship'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { tableName, schema = 'public', relationship } = args as { 
      tableName: string; 
      schema?: string; 
      relationship: HasuraRelationshipArgs['relationship'] 
    };

    // Validate required arguments
    this.validateRequiredArgs(args, ['tableName', 'relationship']);

    // Validate table name
    const tableValidation = ValidationUtils.validateTableName(tableName);
    if (!tableValidation.isValid) {
      return this.createErrorResult(tableValidation.error!);
    }

    // Validate relationship
    if (!relationship || typeof relationship !== 'object') {
      return this.createErrorResult('Relationship definition is required');
    }

    const relationshipValidation = ValidationUtils.validateTableName(relationship.name);
    if (!relationshipValidation.isValid) {
      return this.createErrorResult(`Invalid relationship name: ${relationshipValidation.error}`);
    }

         try {
       // Create relationship metadata
       const relationshipMetadata = {
         table: { name: tableName, schema },
         object_relationships: relationship.type === 'object' ? [relationship] : [],
         array_relationships: relationship.type === 'array' ? [relationship] : [],
       };

       await hasuraService.updateTableMetadata(tableName, schema, relationshipMetadata);

       return this.createSuccessResult(
         `Relationship ${relationship.name} created successfully`,
         {
           tableName,
           schema,
           relationshipName: relationship.name,
           relationshipType: relationship.type,
           targetTable: relationship.table,
         },
       );
     } catch (error) {
       return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
     }
  }
}

export class CreatePermissionTool extends AbstractBaseTool {
  public readonly name = 'create_permission';
  public readonly description = 'Create permissions for a table in Hasura';
  public readonly schema = {
    type: 'object',
    properties: {
      tableName: { type: 'string', description: 'Table name' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
      role: { type: 'string', description: 'Role name' },
      permission: { 
        type: 'string', 
        enum: ['select', 'insert', 'update', 'delete'], 
        description: 'Permission type',
      },
      filter: { type: 'object', description: 'Row-level security filter' },
      columns: { 
        type: 'array', 
        items: { type: 'string' }, 
        description: 'Allowed columns (or "*" for all)',
      },
      check: { type: 'object', description: 'Insert/update check constraint' },
      set: { type: 'object', description: 'Column preset values' },
    },
    required: ['tableName', 'role', 'permission'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { tableName, schema = 'public', role, permission, filter, columns, check, set } = args as {
      tableName: string;
      schema?: string;
      role: string;
      permission: HasuraPermissionArgs['permission'];
      filter?: Record<string, unknown>;
      columns?: string[] | '*';
      check?: Record<string, unknown>;
      set?: Record<string, unknown>;
    };

    // Validate required arguments
    this.validateRequiredArgs(args, ['tableName', 'role', 'permission']);

    // Validate table name
    const tableValidation = ValidationUtils.validateTableName(tableName);
    if (!tableValidation.isValid) {
      return this.createErrorResult(tableValidation.error!);
    }

    // Validate role name
    if (!role || typeof role !== 'string' || role.trim().length === 0) {
      return this.createErrorResult('Role name is required');
    }

         try {
       // Create permission metadata
       const permissionMetadata = {
         table: { name: tableName, schema },
         [`${permission}_permissions`]: [{
           role,
           permission: {
             filter: filter || {},
             columns: columns || '*',
             ...(check && { check }),
             ...(set && { set }),
           },
         }],
       };

       await hasuraService.updateTableMetadata(tableName, schema, permissionMetadata);

       return this.createSuccessResult(
         `Permission ${permission} for role ${role} created successfully`,
         {
           tableName,
           schema,
           role,
           permission,
         },
       );
     } catch (error) {
       return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
     }
  }
}

export class TrackTableTool extends AbstractBaseTool {
  public readonly name = 'track_table';
  public readonly description = 'Track an existing table in Hasura GraphQL API';
  public readonly schema = {
    type: 'object',
    properties: {
      tableName: { type: 'string', description: 'Table name to track' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
    },
    required: ['tableName'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { tableName, schema = 'public' } = args as { tableName: string; schema?: string };

    // Validate required arguments
    this.validateRequiredArgs(args, ['tableName']);

    // Validate table name
    const tableValidation = ValidationUtils.validateTableName(tableName);
    if (!tableValidation.isValid) {
      return this.createErrorResult(tableValidation.error!);
    }

         try {
       // Create basic table metadata for tracking
       const tableMetadata = {
         table: { name: tableName, schema },
         configuration: {
           custom_root_fields: {},
           custom_column_names: {},
         },
       };

       await hasuraService.updateTableMetadata(tableName, schema, tableMetadata);

       return this.createSuccessResult(
         `Table ${schema}.${tableName} tracked successfully`,
         {
           tableName,
           schema,
         },
       );
     } catch (error) {
       return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
     }
  }
}

export class UntrackTableTool extends AbstractBaseTool {
  public readonly name = 'untrack_table';
  public readonly description = 'Untrack a table from Hasura GraphQL API';
  public readonly schema = {
    type: 'object',
    properties: {
      tableName: { type: 'string', description: 'Table name to untrack' },
      schema: { type: 'string', description: 'Database schema', default: 'public' },
    },
    required: ['tableName'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { tableName, schema = 'public' } = args as { tableName: string; schema?: string };

    // Validate required arguments
    this.validateRequiredArgs(args, ['tableName']);

    // Validate table name
    const tableValidation = ValidationUtils.validateTableName(tableName);
    if (!tableValidation.isValid) {
      return this.createErrorResult(tableValidation.error!);
    }

         try {
       // Remove table metadata to untrack
       const metadataPath = FileSystemUtils.joinPath(
         hasuraService.getProjectPath(),
         'metadata',
         'databases',
         'default',
         'tables',
         `${schema}_${tableName}.yaml`,
       );

       if (await FileSystemUtils.fileExists(metadataPath)) {
         await fs.unlink(metadataPath);
       }

       return this.createSuccessResult(
         `Table ${schema}.${tableName} untracked successfully`,
         {
           tableName,
           schema,
         },
       );
     } catch (error) {
       return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
     }
  }
}

export class GenerateMigrationTool extends AbstractBaseTool {
  public readonly name = 'generate_migration';
  public readonly description = 'Generate a new Hasura migration file';
  public readonly schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Migration name' },
      upSql: { type: 'string', description: 'Up migration SQL' },
      downSql: { type: 'string', description: 'Down migration SQL' },
    },
    required: ['name', 'upSql'],
  } as const;

  protected async executeImpl(args: Record<string, unknown>): Promise<ToolResult> {
    const { name, upSql, downSql = '' } = args as {
      name: string;
      upSql: string;
      downSql?: string;
    };

    this.validateRequiredArgs(args, ['name', 'upSql']);

    const nameValidation = ValidationUtils.validateTableName(name);
    if (!nameValidation.isValid) {
      return this.createErrorResult(nameValidation.error!);
    }

    const sqlValidation = ValidationUtils.validateSql(upSql);
    if (!sqlValidation.isValid) {
      return this.createErrorResult(`Invalid up SQL: ${sqlValidation.errors.join(', ')}`);
    }

    if (downSql) {
      const downSqlValidation = ValidationUtils.validateSql(downSql);
      if (!downSqlValidation.isValid) {
        return this.createErrorResult(`Invalid down SQL: ${downSqlValidation.errors.join(', ')}`);
      }
    }

    try {
      const migrationResult = await MigrationHelpers.createMigration(
        'manual',
        name,
        upSql,
        downSql,
      );

      if (!migrationResult.success) {
        return this.createErrorResult(`Failed to create migration: ${migrationResult.error}`);
      }

      return this.createSuccessResult(
        `Migration ${migrationResult.migrationName} created successfully`,
        {
          migrationName: migrationResult.migrationName,
          upSql,
          downSql,
        },
      );
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}