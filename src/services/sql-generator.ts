import { TableDefinition, TableColumn, RelationshipDefinition, PermissionDefinition } from '../types/index.js';
import { logger } from '../utils/index.js';

export class SqlGenerator {
  private static instance: SqlGenerator;

  private constructor() {}

  public static getInstance(): SqlGenerator {
    if (!SqlGenerator.instance) {
      SqlGenerator.instance = new SqlGenerator();
    }
    return SqlGenerator.instance;
  }

  public generateCreateTableSql(table: TableDefinition): string {
    const schema = table.schema || 'public';
    const columns = table.columns.map(col => this.generateColumnDefinition(col)).join(',\n  ');
    
    const primaryKeys = table.columns.filter(col => col.primaryKey).map(col => col.name);
    const primaryKeyConstraint = primaryKeys.length > 0 
      ? `,\n  PRIMARY KEY (${primaryKeys.join(', ')})` 
      : '';

    const uniqueConstraints = table.columns
      .filter(col => col.unique && !col.primaryKey)
      .map(col => `,\n  UNIQUE (${col.name})`)
      .join('');

    return `CREATE TABLE ${schema}.${table.name} (
  ${columns}${primaryKeyConstraint}${uniqueConstraints}
);`;
  }

  public generateDropTableSql(tableName: string, schema: string = 'public'): string {
    return `DROP TABLE IF EXISTS ${schema}.${tableName} CASCADE;`;
  }

  public generateAddColumnSql(tableName: string, column: TableColumn, schema: string = 'public'): string {
    const columnDef = this.generateColumnDefinition(column);
    return `ALTER TABLE ${schema}.${tableName} ADD COLUMN ${columnDef};`;
  }

  public generateDropColumnSql(tableName: string, columnName: string, schema: string = 'public'): string {
    return `ALTER TABLE ${schema}.${tableName} DROP COLUMN IF EXISTS ${columnName};`;
  }

  public generateAddForeignKeySql(
    tableName: string,
    columnName: string,
    referencedTable: string,
    referencedColumn: string,
    schema: string = 'public',
    referencedSchema: string = 'public'
  ): string {
    const constraintName = `fk_${tableName}_${columnName}`;
    return `ALTER TABLE ${schema}.${tableName} 
ADD CONSTRAINT ${constraintName} 
FOREIGN KEY (${columnName}) 
REFERENCES ${referencedSchema}.${referencedTable}(${referencedColumn});`;
  }

  public generateDropForeignKeySql(tableName: string, constraintName: string, schema: string = 'public'): string {
    return `ALTER TABLE ${schema}.${tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`;
  }

  public generateCreateIndexSql(
    tableName: string,
    columnNames: string[],
    indexName?: string,
    unique: boolean = false,
    schema: string = 'public'
  ): string {
    const actualIndexName = indexName || `idx_${tableName}_${columnNames.join('_')}`;
    const uniqueKeyword = unique ? 'UNIQUE ' : '';
    return `CREATE ${uniqueKeyword}INDEX ${actualIndexName} ON ${schema}.${tableName} (${columnNames.join(', ')});`;
  }

  public generateDropIndexSql(indexName: string): string {
    return `DROP INDEX IF EXISTS ${indexName};`;
  }

  public generateInsertSql(tableName: string, data: Record<string, any>, schema: string = 'public'): string {
    const columns = Object.keys(data);
    const values = columns.map(col => this.formatValue(data[col]));
    
    return `INSERT INTO ${schema}.${tableName} (${columns.join(', ')}) 
VALUES (${values.join(', ')});`;
  }

  public generateUpdateSql(
    tableName: string,
    data: Record<string, any>,
    whereClause: string,
    schema: string = 'public'
  ): string {
    const setClause = Object.entries(data)
      .map(([col, val]) => `${col} = ${this.formatValue(val)}`)
      .join(', ');
    
    return `UPDATE ${schema}.${tableName} 
SET ${setClause} 
WHERE ${whereClause};`;
  }

  public generateDeleteSql(tableName: string, whereClause: string, schema: string = 'public'): string {
    return `DELETE FROM ${schema}.${tableName} WHERE ${whereClause};`;
  }

  public generateSelectSql(
    tableName: string,
    columns: string[] = ['*'],
    whereClause?: string,
    orderBy?: string,
    limit?: number,
    schema: string = 'public'
  ): string {
    let sql = `SELECT ${columns.join(', ')} FROM ${schema}.${tableName}`;
    
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    
    return sql + ';';
  }

  private generateColumnDefinition(column: TableColumn): string {
    let definition = `${column.name} ${this.mapDataType(column.type)}`;
    
    if (!column.nullable) {
      definition += ' NOT NULL';
    }
    
    if (column.default !== undefined) {
      definition += ` DEFAULT ${this.formatValue(column.default)}`;
    }
    
    return definition;
  }

  private mapDataType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'TEXT',
      'text': 'TEXT',
      'varchar': 'VARCHAR',
      'char': 'CHAR',
      'integer': 'INTEGER',
      'int': 'INTEGER',
      'bigint': 'BIGINT',
      'smallint': 'SMALLINT',
      'decimal': 'DECIMAL',
      'numeric': 'NUMERIC',
      'real': 'REAL',
      'double': 'DOUBLE PRECISION',
      'float': 'REAL',
      'boolean': 'BOOLEAN',
      'bool': 'BOOLEAN',
      'date': 'DATE',
      'time': 'TIME',
      'timestamp': 'TIMESTAMP',
      'timestamptz': 'TIMESTAMPTZ',
      'uuid': 'UUID',
      'json': 'JSON',
      'jsonb': 'JSONB',
      'array': 'TEXT[]',
      'serial': 'SERIAL',
      'bigserial': 'BIGSERIAL'
    };

    return typeMap[type.toLowerCase()] || type.toUpperCase();
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    
    return value.toString();
  }

  public validateSql(sql: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic SQL validation
    if (!sql.trim()) {
      errors.push('SQL cannot be empty');
    }
    
    // Check for potentially dangerous operations
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /TRUNCATE\s+TABLE/i,
      /DELETE\s+FROM\s+\w+\s*;?\s*$/i, // DELETE without WHERE
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        errors.push('Potentially dangerous SQL operation detected');
        break;
      }
    }
    
    // Check for basic syntax issues
    const openParens = (sql.match(/\(/g) || []).length;
    const closeParens = (sql.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      errors.push('Mismatched parentheses');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public generateSchemaAnalysisSql(schema: string = 'public'): string {
    return `
SELECT 
  t.table_name,
  t.table_schema,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  tc.constraint_type,
  kcu.constraint_name
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
LEFT JOIN information_schema.table_constraints tc ON t.table_name = tc.table_name AND t.table_schema = tc.table_schema
LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE t.table_schema = '${schema}'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;
    `.trim();
  }
}

export const sqlGenerator = SqlGenerator.getInstance(); 