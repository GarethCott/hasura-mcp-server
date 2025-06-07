import { MigrationResult, MigrationArgs } from '../base/tool-types.js';
import { hasuraService } from '../../../services/index.js';
import { logger } from '../../../utils/index.js';

export class MigrationHelpers {
  /**
   * Create a migration with proper naming and SQL
   */
  static async createMigration(
    operationType: string,
    entityName: string,
    upSql: string,
    downSql?: string,
    customName?: string,
  ): Promise<MigrationResult> {
    try {
      const migrationName = customName || `${operationType}_${entityName}_${Date.now()}`;
      
      logger.debug(`Creating migration: ${migrationName}`);
      
      const migration = await hasuraService.createMigration(
        migrationName,
        upSql,
        downSql || '',
      );

      return {
        success: true,
        message: `Migration ${migrationName} created successfully`,
        migrationName,
        migrationPath: migration,
        sql: upSql,
      };
    } catch (error) {
      logger.error('Failed to create migration:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create migration',
      };
    }
  }

  /**
   * Create migration if requested in args
   */
  static async createMigrationIfRequested(
    args: MigrationArgs,
    operationType: string,
    entityName: string,
    upSql: string,
    downSql?: string,
  ): Promise<MigrationResult | null> {
    if (!args.createMigration) {
      return null;
    }

    return this.createMigration(
      operationType,
      entityName,
      upSql,
      downSql,
      args.migrationName,
    );
  }

  /**
   * Generate standard migration names
   */
  static generateMigrationName(operationType: string, entityName: string, suffix?: string): string {
    const timestamp = Date.now();
    const parts = [operationType, entityName];
    
    if (suffix) {
      parts.push(suffix);
    }
    
    parts.push(timestamp.toString());
    
    return parts.join('_').toLowerCase();
  }

  /**
   * Generate reverse SQL for common operations
   */
  static generateReverseSql(operationType: string, entityName: string, schema = 'public'): string {
    switch (operationType.toLowerCase()) {
      case 'create_table':
        return `DROP TABLE IF EXISTS "${schema}"."${entityName}" CASCADE;`;
      
      case 'create_function':
        return `DROP FUNCTION IF EXISTS "${schema}"."${entityName}" CASCADE;`;
      
      case 'create_trigger':
        return `DROP TRIGGER IF EXISTS "${entityName}" ON "${schema}".table_name;`;
      
      case 'create_index':
        return `DROP INDEX IF EXISTS "${schema}"."${entityName}";`;
      
      case 'add_column':
        return `ALTER TABLE "${schema}".table_name DROP COLUMN IF EXISTS "${entityName}";`;
      
      default:
        return `-- Reverse operation for ${operationType} ${entityName}`;
    }
  }

  /**
   * Validate migration parameters
   */
  static validateMigrationArgs(args: MigrationArgs): { isValid: boolean; error?: string } {
    if (args.createMigration && args.migrationName) {
      // Validate migration name format
      const validName = /^[a-zA-Z0-9_-]+$/;
      if (!validName.test(args.migrationName)) {
        return {
          isValid: false,
          error: 'Migration name must contain only letters, numbers, underscores, and hyphens',
        };
      }

      if (args.migrationName.length > 100) {
        return {
          isValid: false,
          error: 'Migration name must be less than 100 characters',
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Apply migrations to Hasura (Note: This requires Hasura CLI to be available)
   */
  static async applyMigrations(_applyMetadata = true): Promise<MigrationResult> {
    try {
      logger.info('Migration application requires Hasura CLI to be run manually');
      
      return {
        success: true,
        message: 'Migrations created successfully. Run "hasura migrate apply" to apply them.',
        data: {
          command: 'hasura migrate apply',
          note: 'Use Hasura CLI to apply migrations to the database',
        },
      };
    } catch (error) {
      logger.error('Failed to prepare migrations:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare migrations',
      };
    }
  }

  /**
   * Get migration status
   */
  static async getMigrationStatus(): Promise<MigrationResult> {
    try {
      const migrations = await hasuraService.getMigrations();
      
      return {
        success: true,
        message: `Found ${migrations.length} migrations`,
        data: migrations,
      };
    } catch (error) {
      logger.error('Failed to get migration status:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get migration status',
      };
    }
  }
} 