import { Pool, PoolClient, QueryResult as PgQueryResult } from 'pg';
import {
  PostgresConfig,
  QueryResult,
  ExecutionResult,
  TransactionOperation,
  TransactionResult,
  TableInfo,
  RelationshipInfo,
  IndexInfo,
  PerformanceMetrics,
  ValidationResult,
  QueryPlan,
  TableColumn,
  ConstraintInfo,
} from '../types/index.js';
import { logger } from '../utils/index.js';

export class PostgresService {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor(config: PostgresConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: config.poolSize || 10,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });
  }

  // Core database operations
  async query(sql: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const result: PgQueryResult = await this.pool.query(sql, params);
      const executionTime = Date.now() - startTime;
      
      logger.debug(`Query executed in ${executionTime}ms:`, sql);
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        fields: result.fields.map(field => ({
          name: field.name,
          dataTypeID: field.dataTypeID,
        })),
      };
    } catch (error) {
      logger.error('Query execution failed:', error);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.query(sql, params);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        rowsAffected: result.rowCount,
        data: result.rows,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('SQL execution failed:', error);
      
      return {
        success: false,
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async transaction(operations: TransactionOperation[]): Promise<TransactionResult> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const results: QueryResult[] = [];
      
      for (const operation of operations) {
        const result: PgQueryResult = await client.query(operation.sql, operation.params);
        results.push({
          rows: result.rows,
          rowCount: result.rowCount || 0,
          fields: result.fields.map(field => ({
            name: field.name,
            dataTypeID: field.dataTypeID,
          })),
        });
      }
      
      await client.query('COMMIT');
      return { success: true, results };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed:', error);
      
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      client.release();
    }
  }

  // Schema introspection
  async getTableSchema(tableName: string, schema: string = 'public'): Promise<TableInfo> {
    const columnsQuery = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN u.column_name IS NOT NULL THEN true ELSE false END as is_unique
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1 AND tc.table_schema = $2
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'UNIQUE' AND tc.table_name = $1 AND tc.table_schema = $2
      ) u ON c.column_name = u.column_name
      WHERE c.table_name = $1 AND c.table_schema = $2
      ORDER BY c.ordinal_position;
    `;

    const columnsResult = await this.query(columnsQuery, [tableName, schema]);
    
    const columns: TableColumn[] = columnsResult.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      default: row.column_default,
      primaryKey: row.is_primary_key,
      unique: row.is_unique,
    }));

    const indexes = await this.getTableIndexes(tableName, schema);
    const constraints = await this.getTableConstraints(tableName, schema);
    const rowCount = await this.getTableRowCount(tableName, schema);

    return {
      name: tableName,
      schema,
      columns,
      indexes,
      constraints,
      rowCount,
    };
  }

  async listTables(schema: string = 'public'): Promise<string[]> {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const result = await this.query(query, [schema]);
    return result.rows.map(row => row.table_name);
  }

  async getRelationships(schema: string = 'public'): Promise<RelationshipInfo[]> {
    const query = `
      SELECT 
        tc.constraint_name,
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name as target_table,
        ccu.column_name as target_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1;
    `;

    const result = await this.query(query, [schema]);
    
    return result.rows.map(row => ({
      name: row.constraint_name,
      type: 'foreign_key' as const,
      sourceTable: row.source_table,
      targetTable: row.target_table,
      columns: { [row.source_column]: row.target_column },
    }));
  }

  async getIndexes(schema: string = 'public'): Promise<IndexInfo[]> {
    const query = `
      SELECT 
        i.relname as index_name,
        t.relname as table_name,
        ix.indisunique as is_unique,
        am.amname as index_type,
        array_agg(a.attname ORDER BY c.ordinality) as columns
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_am am ON i.relam = am.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      JOIN unnest(ix.indkey) WITH ORDINALITY AS c(attnum, ordinality) ON true
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.attnum
      WHERE n.nspname = $1 AND t.relkind = 'r'
      GROUP BY i.relname, t.relname, ix.indisunique, am.amname
      ORDER BY t.relname, i.relname;
    `;

    const result = await this.query(query, [schema]);
    
    return result.rows.map(row => ({
      name: row.index_name,
      table: row.table_name,
      columns: row.columns,
      unique: row.is_unique,
      type: row.index_type,
    }));
  }

  // Performance analysis
  async analyzePerformance(): Promise<PerformanceMetrics> {
    // Get slow queries
    const slowQueriesQuery = `
      SELECT 
        query,
        mean_exec_time as avg_time,
        calls
      FROM pg_stat_statements 
      WHERE mean_exec_time > 100
      ORDER BY mean_exec_time DESC 
      LIMIT 10;
    `;

    // Get table statistics
    const tableStatsQuery = `
      SELECT 
        schemaname || '.' || tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        n_tup_ins + n_tup_upd + n_tup_del as total_operations,
        seq_scan + idx_scan as total_scans,
        CASE WHEN seq_scan + idx_scan > 0 
          THEN round((idx_scan::numeric / (seq_scan + idx_scan)) * 100, 2) 
          ELSE 0 
        END as index_usage_pct
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 20;
    `;

    // Get connection statistics
    const connectionStatsQuery = `
      SELECT 
        state,
        count(*) as count
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY state;
    `;

    try {
      const [slowQueries, tableStats, connectionStats] = await Promise.all([
        this.query(slowQueriesQuery).catch(() => ({ rows: [] })), // pg_stat_statements might not be available
        this.query(tableStatsQuery),
        this.query(connectionStatsQuery),
      ]);

      const connStats = connectionStats.rows.reduce((acc, row) => {
        if (row.state === 'active') acc.active = row.count;
        else if (row.state === 'idle') acc.idle = row.count;
        acc.total += row.count;
        return acc;
      }, { active: 0, idle: 0, total: 0 });

      return {
        slowQueries: slowQueries.rows.map(row => ({
          query: row.query,
          avgTime: row.avg_time,
          calls: row.calls,
        })),
        tableStats: tableStats.rows.map(row => ({
          table: row.table_name,
          size: row.size,
          rowCount: row.total_operations,
          indexUsage: row.index_usage_pct,
        })),
        connectionStats: connStats,
      };
    } catch (error) {
      logger.error('Performance analysis failed:', error);
      return {
        slowQueries: [],
        tableStats: [],
        connectionStats: { active: 0, idle: 0, total: 0 },
      };
    }
  }

  async explainQuery(sql: string): Promise<QueryPlan> {
    try {
      const result = await this.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
      return {
        plan: result.rows[0]['QUERY PLAN'][0],
        executionTime: result.rows[0]['QUERY PLAN'][0]['Execution Time'],
        cost: result.rows[0]['QUERY PLAN'][0]['Total Cost'],
      };
    } catch (error) {
      logger.error('Query explain failed:', error);
      throw error;
    }
  }

  // Validation
  async validateSQL(sql: string): Promise<ValidationResult> {
    try {
      // Use EXPLAIN to validate without executing
      await this.query(`EXPLAIN ${sql}`);
      return {
        isValid: true,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      this.isConnected = true;
      return true;
    } catch (error) {
      logger.error('Connection test failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Helper methods
  private async getTableIndexes(tableName: string, schema: string): Promise<IndexInfo[]> {
    const query = `
      SELECT 
        i.relname as index_name,
        ix.indisunique as is_unique,
        am.amname as index_type,
        array_agg(a.attname ORDER BY c.ordinality) as columns
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_am am ON i.relam = am.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      JOIN unnest(ix.indkey) WITH ORDINALITY AS c(attnum, ordinality) ON true
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.attnum
      WHERE n.nspname = $1 AND t.relname = $2
      GROUP BY i.relname, ix.indisunique, am.amname;
    `;

    const result = await this.query(query, [schema, tableName]);
    
    return result.rows.map(row => ({
      name: row.index_name,
      table: tableName,
      columns: row.columns,
      unique: row.is_unique,
      type: row.index_type,
    }));
  }

  private async getTableConstraints(tableName: string, schema: string): Promise<ConstraintInfo[]> {
    const query = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        array_agg(kcu.column_name) as columns,
        ccu.table_name as referenced_table,
        array_agg(ccu.column_name) as referenced_columns
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = $1 AND tc.table_schema = $2
      GROUP BY tc.constraint_name, tc.constraint_type, ccu.table_name;
    `;

    const result = await this.query(query, [tableName, schema]);
    
    return result.rows.map(row => ({
      name: row.constraint_name,
      type: row.constraint_type.toLowerCase().replace(' ', '_') as any,
      columns: row.columns,
      referencedTable: row.referenced_table,
      referencedColumns: row.referenced_columns,
    }));
  }

  private async getTableRowCount(tableName: string, schema: string): Promise<number> {
    try {
      const result = await this.query(`SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.warn(`Could not get row count for ${schema}.${tableName}:`, error);
      return 0;
    }
  }

  // Cleanup
  async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
  }

  get connected(): boolean {
    return this.isConnected;
  }
} 