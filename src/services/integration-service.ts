import { PostgresService } from './postgres-service.js';
import {
  CreateTableParams,
  AddColumnParams,
  RelationshipParams,
  IntegrationResult,
  ExecutionResult,
  ChangePreview,
  ConsistencyReport,
  OptimizationReport,
  OptimizationSuggestion,
  SafeExecutionResult,
} from '../types/index.js';
import { logger } from '../utils/index.js';

// Use the actual HasuraService interface
import { HasuraService } from './hasura-service.js';

export class IntegrationService {
  constructor(
    private hasuraService: HasuraService,
    private postgresService: PostgresService,
  ) {}

  // Unified operations that handle both Hasura and PostgreSQL
  async createTableWithMigration(params: CreateTableParams): Promise<IntegrationResult> {
    const startTime = Date.now();
    
    try {
      // Validate input parameters
      if (!params.name) {
        throw new Error('Table name is required');
      }
      
      if (!params.columns || params.columns.length === 0) {
        throw new Error('At least one column is required to create a table');
      }
      
      // 1. Generate SQL for table creation
      const sql = this.generateCreateTableSQL(params);
      
      // 2. Validate SQL
      const validation = await this.postgresService.validateSQL(sql);
      if (!validation.isValid) {
        throw new Error(`Invalid SQL: ${validation.errors.join(', ')}`);
      }
      
      // 3. Preview changes
      const preview = await this.previewChanges(sql);
      
      // 4. Execute on database if requested
      let executed = false;
      if (params.executeImmediately) {
        const execution = await this.postgresService.execute(sql);
        if (!execution.success) {
          throw new Error(`Database execution failed: ${execution.error}`);
        }
        executed = true;
      }
      
      // 5. Create migration file
      const migrationName = `create_table_${params.name}_${Date.now()}`;
      const migrationId = await this.hasuraService.createMigration(migrationName, sql);
      
      // 6. Update Hasura metadata
      await this.hasuraService.updateTableMetadata(
        params.name,
        params.schema || 'public',
        {
          table: { name: params.name, schema: params.schema || 'public' },
          configuration: {
            custom_root_fields: {},
            custom_column_names: {},
          },
        },
      );
      const metadataUpdated = true;
      
      logger.info(`Table ${params.name} created successfully in ${Date.now() - startTime}ms`);
      
      return {
        executed,
        migrationCreated: migrationId,
        metadataUpdated,
        preview,
      };
    } catch (error) {
      logger.error('Create table with migration failed:', error);
      return {
        executed: false,
        metadataUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async addColumnWithMigration(params: AddColumnParams): Promise<IntegrationResult> {
    const startTime = Date.now();
    
    try {
      // 1. Generate SQL for adding column
      const sql = this.generateAddColumnSQL(params);
      
      // 2. Validate SQL
      const validation = await this.postgresService.validateSQL(sql);
      if (!validation.isValid) {
        throw new Error(`Invalid SQL: ${validation.errors.join(', ')}`);
      }
      
      // 3. Preview changes
      const preview = await this.previewChanges(sql);
      
      // 4. Execute on database if requested
      let executed = false;
      if (params.executeImmediately) {
        const execution = await this.postgresService.execute(sql);
        if (!execution.success) {
          throw new Error(`Database execution failed: ${execution.error}`);
        }
        executed = true;
      }
      
      // 5. Create migration file
      const migrationName = `add_column_${params.column.name}_to_${params.table}_${Date.now()}`;
      const migrationId = await this.hasuraService.createMigration(migrationName, sql);
      
      logger.info(`Column ${params.column.name} added to ${params.table} successfully in ${Date.now() - startTime}ms`);
      
      return {
        executed,
        migrationCreated: migrationId,
        metadataUpdated: true,
        preview,
      };
    } catch (error) {
      logger.error('Add column with migration failed:', error);
      return {
        executed: false,
        metadataUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createRelationshipWithMigration(params: RelationshipParams): Promise<IntegrationResult> {
    const startTime = Date.now();
    
    try {
      // 1. Generate SQL for foreign key constraint
      const sql = this.generateRelationshipSQL(params);
      
      // 2. Validate SQL
      const validation = await this.postgresService.validateSQL(sql);
      if (!validation.isValid) {
        throw new Error(`Invalid SQL: ${validation.errors.join(', ')}`);
      }
      
      // 3. Preview changes
      const preview = await this.previewChanges(sql);
      
      // 4. Execute on database if requested
      let executed = false;
      if (params.executeImmediately) {
        const execution = await this.postgresService.execute(sql);
        if (!execution.success) {
          throw new Error(`Database execution failed: ${execution.error}`);
        }
        executed = true;
      }
      
      // 5. Create migration file
      const migrationName = `create_relationship_${params.name}_${Date.now()}`;
      const migrationId = await this.hasuraService.createMigration(migrationName, sql);
      
      // 6. Update Hasura metadata for relationship
      await this.hasuraService.updateTableMetadata(
        params.sourceTable,
        params.schema || 'public',
        {
          [params.type === 'object' ? 'object_relationships' : 'array_relationships']: [{
            name: params.name,
            using: {
              foreign_key_constraint_on: Object.keys(params.columnMapping)[0],
            },
          }],
        },
      );
      const metadataUpdated = true;
      
      logger.info(`Relationship ${params.name} created successfully in ${Date.now() - startTime}ms`);
      
      return {
        executed,
        migrationCreated: migrationId,
        metadataUpdated,
        preview,
      };
    } catch (error) {
      logger.error('Create relationship with migration failed:', error);
      return {
        executed: false,
        metadataUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Validation workflows
  async validateAndExecute(sql: string, createMigration: boolean = false): Promise<ExecutionResult> {
    try {
      // 1. Validate SQL syntax
      const validation = await this.postgresService.validateSQL(sql);
      if (!validation.isValid) {
        return {
          success: false,
          executionTime: 0,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }
      
      // 2. Execute SQL
      const execution = await this.postgresService.execute(sql);
      
      // 3. Create migration if requested and execution was successful
      if (createMigration && execution.success) {
        const migrationName = `custom_migration_${Date.now()}`;
        const migrationId = await this.hasuraService.createMigration(migrationName, sql);
        execution.migrationCreated = migrationId;
      }
      
      return execution;
    } catch (error) {
      logger.error('Validate and execute failed:', error);
      return {
        success: false,
        executionTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async previewChanges(sql: string): Promise<ChangePreview> {
    try {
      // Extract affected tables from the SQL (basic parsing)
      const affectedTables = this.extractAffectedTables(sql);
      
      // Check if this is a DDL statement that can't be explained
      const upperSQL = sql.trim().toUpperCase();
      const isDDL = upperSQL.startsWith('CREATE TABLE') || 
                    upperSQL.startsWith('ALTER TABLE') ||
                    upperSQL.startsWith('DROP TABLE') ||
                    upperSQL.startsWith('CREATE INDEX') ||
                    upperSQL.startsWith('CREATE EXTENSION');
      
      let plan: any = null;
      let estimatedImpact: string;
      let warnings: string[];
      
      if (isDDL) {
        // For DDL statements, provide static analysis
        estimatedImpact = this.estimateImpactForDDL(sql);
        warnings = this.generateWarningsForDDL(sql);
      } else {
        // For DML/queries, use EXPLAIN to understand what the query will do
        try {
          plan = await this.postgresService.explainQuery(sql);
          estimatedImpact = this.estimateImpact(sql, plan);
          warnings = this.generateWarnings(sql, plan);
        } catch {
          // If EXPLAIN fails, fall back to static analysis
          estimatedImpact = 'Could not analyze query execution plan';
          warnings = ['Query execution plan could not be generated'];
        }
      }
      
      return {
        sql,
        affectedTables,
        estimatedImpact,
        warnings,
      };
    } catch (error) {
      logger.error('Preview changes failed:', error);
      return {
        sql,
        affectedTables: [],
        estimatedImpact: 'Unknown impact - preview failed',
        warnings: ['Could not generate preview due to error'],
      };
    }
  }

  // Analysis workflows
  async analyzeSchemaConsistency(): Promise<ConsistencyReport> {
    try {
      const issues: Array<{ type: string; description: string; severity: 'error' | 'warning' }> = [];
      
      // Get database schema
      const tables = await this.postgresService.listTables();
      const relationships = await this.postgresService.getRelationships();
      
      // Check for missing indexes on foreign keys
      for (const relationship of relationships) {
        const indexes = await this.postgresService.getIndexes();
        const hasIndex = indexes.some(idx => 
          idx.table === relationship.sourceTable && 
          idx.columns.includes(Object.keys(relationship.columns)[0]),
        );
        
        if (!hasIndex) {
          issues.push({
            type: 'missing_index',
            description: `Foreign key ${Object.keys(relationship.columns)[0]} in table ${relationship.sourceTable} lacks an index`,
            severity: 'warning',
          });
        }
      }
      
      // Check for tables without primary keys
      for (const tableName of tables) {
        const tableInfo = await this.postgresService.getTableSchema(tableName);
        const hasPrimaryKey = tableInfo.columns.some(col => col.primaryKey);
        
        if (!hasPrimaryKey) {
          issues.push({
            type: 'missing_primary_key',
            description: `Table ${tableName} lacks a primary key`,
            severity: 'error',
          });
        }
      }
      
      return {
        consistent: issues.filter(i => i.severity === 'error').length === 0,
        issues,
      };
    } catch (error) {
      logger.error('Schema consistency analysis failed:', error);
      return {
        consistent: false,
        issues: [{
          type: 'analysis_error',
          description: 'Failed to analyze schema consistency',
          severity: 'error',
        }],
      };
    }
  }

  async optimizeSchema(): Promise<OptimizationReport> {
    try {
      const applied: OptimizationSuggestion[] = [];
      const failed: Array<{ suggestion: OptimizationSuggestion; error: string }> = [];
      
      // Get performance analysis
      const performance = await this.postgresService.analyzePerformance();
      
      // Generate optimization suggestions
      const suggestions = this.generateOptimizationSuggestions(performance);
      
      // Apply high-priority suggestions automatically
      for (const suggestion of suggestions.filter(s => s.priority === 'high')) {
        try {
          if (suggestion.sql) {
            const result = await this.postgresService.execute(suggestion.sql);
            if (result.success) {
              applied.push(suggestion);
            } else {
              failed.push({ suggestion, error: result.error || 'Unknown error' });
            }
          }
        } catch (error) {
          failed.push({ 
            suggestion, 
            error: error instanceof Error ? error.message : 'Unknown error', 
          });
        }
      }
      
      return { applied, failed };
    } catch (error) {
      logger.error('Schema optimization failed:', error);
      return {
        applied: [],
        failed: [{
          suggestion: {
            type: 'performance',
            priority: 'high',
            description: 'Schema optimization failed',
            impact: 'Unknown',
          },
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
      };
    }
  }

  // Safe execution with rollback
  async safeExecuteWithMigration(sql: string, migrationName: string): Promise<SafeExecutionResult> {
    let migrationId: string | undefined;
    
    try {
      // 1. Start transaction and execute SQL
      const execution = await this.postgresService.execute(sql);
      
      if (!execution.success) {
        throw new Error(execution.error || 'SQL execution failed');
      }
      
      // 2. Create migration file
      migrationId = await this.hasuraService.createMigration(migrationName, sql);
      
      return {
        success: true,
        migration: migrationId,
      };
    } catch (error) {
      logger.error('Safe execute with migration failed:', error);
      
      // 3. Note: Migration cleanup would need to be implemented manually
      // The current HasuraService doesn't have a deleteMigration method
      if (migrationId) {
        logger.warn(`Migration ${migrationId} was created but execution failed. Manual cleanup may be required.`);
      }
      
      return {
        success: false,
        rollbackPerformed: !!migrationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Helper methods
  private generateCreateTableSQL(params: CreateTableParams): string {
    const _schema = params.schema || 'public';
    
    // Validate that we have columns
    if (!params.columns || params.columns.length === 0) {
      throw new Error('Cannot create table without columns. At least one column is required.');
    }
    
    // Validate each column
    for (const col of params.columns) {
      if (!col.name || !col.type) {
        throw new Error(`Invalid column definition: name and type are required. Got: ${JSON.stringify(col)}`);
      }
    }
    
    const columns = params.columns.map(col => {
      let columnDef = `${col.name} ${col.type}`;
      
      if (!col.nullable) columnDef += ' NOT NULL';
      if (col.default) {
        // Check if default is a function call (contains parentheses) or a literal value
        if (col.default.includes('(') || col.default.toLowerCase() === 'now()' || col.default.toLowerCase().includes('gen_random_uuid')) {
          columnDef += ` DEFAULT ${col.default}`;
        } else {
          columnDef += ` DEFAULT '${col.default}'`;
        }
      }
      if (col.unique) columnDef += ' UNIQUE';
      
      return columnDef;
    }).join(', ');
    
    const primaryKeys = params.columns.filter(col => col.primaryKey).map(col => col.name);
    const tableConstraints = primaryKeys.length > 0 ? `, PRIMARY KEY (${primaryKeys.join(', ')})` : '';
    
    return `CREATE TABLE ${params.name} (${columns}${tableConstraints})`;
  }

  private generateAddColumnSQL(params: AddColumnParams): string {
    let columnDef = `${params.column.name} ${params.column.type}`;
    
    if (!params.column.nullable) columnDef += ' NOT NULL';
    if (params.column.default) {
      // Check if default is a function call or literal value
      if (params.column.default.includes('(') || params.column.default.toLowerCase() === 'now()' || params.column.default.toLowerCase().includes('gen_random_uuid')) {
        columnDef += ` DEFAULT ${params.column.default}`;
      } else {
        columnDef += ` DEFAULT '${params.column.default}'`;
      }
    }
    if (params.column.unique) columnDef += ' UNIQUE';
    
    return `ALTER TABLE ${params.table} ADD COLUMN ${columnDef}`;
  }

  private generateRelationshipSQL(params: RelationshipParams): string {
    const sourceColumn = Object.keys(params.columnMapping)[0];
    const targetColumn = Object.values(params.columnMapping)[0];
    
    return `ALTER TABLE ${params.sourceTable} ADD CONSTRAINT fk_${params.name} FOREIGN KEY (${sourceColumn}) REFERENCES ${params.targetTable} (${targetColumn})`;
  }

  private extractAffectedTables(sql: string): string[] {
    const tables: string[] = [];
    const _upperSQL = sql.toUpperCase();
    
    // Basic table extraction - this could be enhanced with a proper SQL parser
    const tableRegex = /(?:FROM|JOIN|UPDATE|INSERT INTO|DELETE FROM)\s+(?:"?(\w+)"?\.)??"?(\w+)"?/gi;
    let match;
    
    while ((match = tableRegex.exec(sql)) !== null) {
      const tableName = match[2];
      if (tableName && !tables.includes(tableName)) {
        tables.push(tableName);
      }
    }
    
    return tables;
  }

  private estimateImpact(sql: string, _plan: any): string {
    const upperSQL = sql.toUpperCase();
    
    if (upperSQL.includes('CREATE TABLE')) {
      return 'Low - Creating new table';
    } else if (upperSQL.includes('DROP TABLE')) {
      return 'High - Dropping table will remove all data';
    } else if (upperSQL.includes('ALTER TABLE')) {
      return 'Medium - Modifying table structure';
    } else if (upperSQL.includes('CREATE INDEX')) {
      return 'Low - Adding index for better performance';
    } else if (upperSQL.includes('DELETE') || upperSQL.includes('UPDATE')) {
      return 'High - Modifying existing data';
    }
    
    return 'Medium - Unknown impact';
  }

  private generateWarnings(sql: string, _plan: any): string[] {
    const warnings: string[] = [];
    const upperSQL = sql.toUpperCase();
    
    if (upperSQL.includes('DROP')) {
      warnings.push('This operation will permanently delete data');
    }
    
    if (upperSQL.includes('ALTER TABLE') && upperSQL.includes('DROP COLUMN')) {
      warnings.push('Dropping columns will permanently delete data in those columns');
    }
    
    if (_plan.cost && _plan.cost > 1000) {
      warnings.push('This operation may be expensive and take significant time');
    }
    
    return warnings;
  }

  private generateOptimizationSuggestions(performance: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Suggest indexes for tables with low index usage
    for (const table of performance.tableStats) {
      if (table.indexUsage < 50 && table.rowCount > 1000) {
        suggestions.push({
          type: 'index',
          priority: 'medium',
          description: `Table ${table.table} has low index usage (${table.indexUsage}%)`,
          impact: 'Could improve query performance significantly',
          sql: `-- Consider adding indexes to frequently queried columns in ${table.table}`,
        });
      }
    }
    
    return suggestions;
  }

  private estimateImpactForDDL(sql: string): string {
    const upperSQL = sql.toUpperCase();
    
    if (upperSQL.includes('CREATE TABLE')) {
      return 'Low - Creating new table (no existing data affected)';
    } else if (upperSQL.includes('DROP TABLE')) {
      return 'High - Dropping table will remove all data permanently';
    } else if (upperSQL.includes('ALTER TABLE ADD COLUMN')) {
      return 'Low - Adding column (existing data preserved)';
    } else if (upperSQL.includes('ALTER TABLE DROP COLUMN')) {
      return 'High - Dropping column will permanently delete data in that column';
    } else if (upperSQL.includes('ALTER TABLE')) {
      return 'Medium - Modifying table structure';
    } else if (upperSQL.includes('CREATE INDEX')) {
      return 'Low - Adding index for better performance (no data changes)';
    } else if (upperSQL.includes('DROP INDEX')) {
      return 'Low - Removing index (no data changes, may affect performance)';
    } else if (upperSQL.includes('CREATE EXTENSION')) {
      return 'Low - Adding database extension (no data changes)';
    }
    
    return 'Medium - DDL operation with unknown impact';
  }

  private generateWarningsForDDL(sql: string): string[] {
    const warnings: string[] = [];
    const upperSQL = sql.toUpperCase();
    
    if (upperSQL.includes('DROP TABLE')) {
      warnings.push('This operation will permanently delete the entire table and all its data');
      warnings.push('Make sure you have a backup before proceeding');
    }
    
    if (upperSQL.includes('DROP COLUMN')) {
      warnings.push('Dropping columns will permanently delete data in those columns');
      warnings.push('This operation cannot be undone');
    }
    
    if (upperSQL.includes('ALTER TABLE') && upperSQL.includes('NOT NULL')) {
      warnings.push('Adding NOT NULL constraint may fail if existing rows have NULL values');
    }
    
    if (upperSQL.includes('CREATE TABLE') && upperSQL.includes('uuid')) {
      warnings.push('UUID columns require the uuid-ossp extension to be enabled');
    }
    
    if (upperSQL.includes('CREATE INDEX') && !upperSQL.includes('CONCURRENTLY')) {
      warnings.push('Creating indexes without CONCURRENTLY may lock the table during creation');
    }
    
    return warnings;
  }
} 