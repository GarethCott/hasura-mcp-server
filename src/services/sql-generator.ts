import { TableDefinition, TableColumn } from '../types/index.js';

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
    referencedSchema: string = 'public',
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
    schema: string = 'public',
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
    schema: string = 'public',
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
    schema: string = 'public',
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
      definition += ` DEFAULT ${this.formatDefaultValue(column.default)}`;
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
      'bigserial': 'BIGSERIAL',
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

  private formatDefaultValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'string') {
      // Check if it's a function call (contains parentheses) or special keywords
      if (value.includes('(') || 
          value.toLowerCase() === 'now()' || 
          value.toLowerCase().includes('gen_random_uuid') ||
          value.toLowerCase() === 'current_timestamp' ||
          value.toLowerCase() === 'current_date' ||
          value.toLowerCase() === 'current_time') {
        return value; // Return function calls without quotes
      }
      return `'${value.replace(/'/g, "''")}'`; // Return literals with quotes
    }
    
    // For non-strings, use the regular formatValue method
    return this.formatValue(value);
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
      errors,
    };
  }

  public generateSchemaAnalysisSql(schema: string = 'public'): string {
    return `
      SELECT 
        t.table_name,
        t.table_type,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = '${schema}'
      ORDER BY t.table_name, c.ordinal_position;
    `;
  }

  // NEW: Advanced PostgreSQL SQL Generation Methods
  public generateCreateFunctionSql(
    name: string,
    parameters: string,
    returnType: string,
    language: string,
    body: string,
    options?: string,
    schema: string = 'public',
  ): string {
    return `
CREATE OR REPLACE FUNCTION ${schema}.${name}(${parameters})
RETURNS ${returnType}
LANGUAGE ${language}
${options || ''}
AS $$
${body}
$$;`;
  }

  public generateDropFunctionSql(name: string, schema: string = 'public'): string {
    return `DROP FUNCTION IF EXISTS ${schema}.${name} CASCADE;`;
  }

  public generateCreateTriggerSql(
    name: string,
    tableName: string,
    functionName: string,
    when: string,
    events: string[],
    forEach: string,
    condition?: string,
    schema: string = 'public',
  ): string {
    const eventsStr = events.join(' OR ');
    const conditionClause = condition ? `WHEN (${condition})` : '';
    
    return `
CREATE TRIGGER ${name}
${when} ${eventsStr} ON ${schema}.${tableName}
FOR EACH ${forEach}
${conditionClause}
EXECUTE FUNCTION ${schema}.${functionName}();`;
  }

  public generateDropTriggerSql(name: string, tableName: string, schema: string = 'public'): string {
    return `DROP TRIGGER IF EXISTS ${name} ON ${schema}.${tableName};`;
  }

  public generateCreateIndexSqlAdvanced(
    tableName: string,
    indexName: string,
    columns: string[],
    unique?: boolean,
    type?: string,
    where?: string,
    schema: string = 'public',
  ): string {
    const uniqueClause = unique ? 'UNIQUE' : '';
    const typeClause = type ? `USING ${type}` : '';
    const whereClause = where ? `WHERE ${where}` : '';
    const columnsStr = columns.map(col => `"${col}"`).join(', ');
    
    return `
CREATE ${uniqueClause} INDEX ${indexName}
ON ${schema}.${tableName} ${typeClause}
(${columnsStr})
${whereClause};`;
  }

  public generateAlterTableSql(
    tableName: string,
    operation: string,
    details: string,
    schema: string = 'public',
  ): string {
    return `ALTER TABLE ${schema}.${tableName} ${operation} ${details};`;
  }

  public generateInsertDataSql(table: string, data: Record<string, any>, schema: string = 'public'): string {
    const columns = Object.keys(data);
    const values = Object.values(data).map(val => this.formatValue(val));
    const columnNames = columns.map(col => `"${col}"`).join(', ');
    
    return `INSERT INTO ${schema}.${table} (${columnNames}) VALUES (${values.join(', ')}) RETURNING *;`;
  }

  public generateUpdateDataSql(
    table: string,
    data: Record<string, any>,
    where: string,
    schema: string = 'public',
  ): string {
    const setClause = Object.entries(data)
      .map(([col, val]) => `"${col}" = ${this.formatValue(val)}`)
      .join(', ');
    
    return `UPDATE ${schema}.${table} SET ${setClause} WHERE ${where} RETURNING *;`;
  }

  public generateDeleteDataSql(table: string, where?: string, schema: string = 'public'): string {
    const whereClause = where ? `WHERE ${where}` : '';
    return `DELETE FROM ${schema}.${table} ${whereClause} RETURNING *;`;
  }
}

export const sqlGenerator = SqlGenerator.getInstance(); 