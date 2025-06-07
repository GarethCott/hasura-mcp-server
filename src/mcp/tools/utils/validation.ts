import { ValidationResult } from '../base/tool-types.js';
import { sqlGenerator } from '../../../services/index.js';

export class ValidationUtils {
  /**
   * Validate SQL syntax and safety
   */
  static validateSql(sql: string): ValidationResult {
    try {
      const validation = sqlGenerator.validateSql(sql);
      
      return {
        success: validation.isValid,
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: [],
        message: validation.isValid ? 'SQL is valid' : 'SQL validation failed',
      };
    } catch (error) {
      return {
        success: false,
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: [],
        error: 'SQL validation failed',
      };
    }
  }

  /**
   * Validate table name format
   */
  static validateTableName(tableName: string): { isValid: boolean; error?: string } {
    if (!tableName || typeof tableName !== 'string') {
      return { isValid: false, error: 'Table name is required and must be a string' };
    }

    if (tableName.length === 0) {
      return { isValid: false, error: 'Table name cannot be empty' };
    }

    // Check for valid PostgreSQL identifier
    const validIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validIdentifier.test(tableName)) {
      return { isValid: false, error: 'Table name must be a valid PostgreSQL identifier' };
    }

    // Check for reserved keywords (basic list)
    const reservedKeywords = [
      'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter',
      'table', 'index', 'view', 'function', 'trigger', 'user', 'role',
      'database', 'schema', 'column', 'constraint', 'primary', 'foreign',
      'key', 'unique', 'not', 'null', 'default', 'check', 'references',
    ];

    if (reservedKeywords.includes(tableName.toLowerCase())) {
      return { isValid: false, error: `"${tableName}" is a reserved keyword` };
    }

    return { isValid: true };
  }

  /**
   * Validate column name format
   */
  static validateColumnName(columnName: string): { isValid: boolean; error?: string } {
    if (!columnName || typeof columnName !== 'string') {
      return { isValid: false, error: 'Column name is required and must be a string' };
    }

    if (columnName.length === 0) {
      return { isValid: false, error: 'Column name cannot be empty' };
    }

    // Check for valid PostgreSQL identifier
    const validIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validIdentifier.test(columnName)) {
      return { isValid: false, error: 'Column name must be a valid PostgreSQL identifier' };
    }

    return { isValid: true };
  }

  /**
   * Validate schema name format
   */
  static validateSchemaName(schemaName: string): { isValid: boolean; error?: string } {
    if (!schemaName || typeof schemaName !== 'string') {
      return { isValid: false, error: 'Schema name is required and must be a string' };
    }

    if (schemaName.length === 0) {
      return { isValid: false, error: 'Schema name cannot be empty' };
    }

    // Check for valid PostgreSQL identifier
    const validIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validIdentifier.test(schemaName)) {
      return { isValid: false, error: 'Schema name must be a valid PostgreSQL identifier' };
    }

    return { isValid: true };
  }

  /**
   * Validate function name format
   */
  static validateFunctionName(functionName: string): { isValid: boolean; error?: string } {
    if (!functionName || typeof functionName !== 'string') {
      return { isValid: false, error: 'Function name is required and must be a string' };
    }

    if (functionName.length === 0) {
      return { isValid: false, error: 'Function name cannot be empty' };
    }

    // Check for valid PostgreSQL identifier
    const validIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validIdentifier.test(functionName)) {
      return { isValid: false, error: 'Function name must be a valid PostgreSQL identifier' };
    }

    return { isValid: true };
  }

  /**
   * Validate PostgreSQL data type
   */
  static validateDataType(dataType: string): { isValid: boolean; error?: string } {
    if (!dataType || typeof dataType !== 'string') {
      return { isValid: false, error: 'Data type is required and must be a string' };
    }

    const validTypes = [
      'text', 'varchar', 'char', 'character',
      'integer', 'int', 'bigint', 'smallint', 'serial', 'bigserial',
      'decimal', 'numeric', 'real', 'double precision', 'float',
      'boolean', 'bool',
      'date', 'time', 'timestamp', 'timestamptz', 'interval',
      'uuid', 'json', 'jsonb',
      'bytea', 'bit', 'varbit',
      'inet', 'cidr', 'macaddr',
      'point', 'line', 'lseg', 'box', 'path', 'polygon', 'circle',
      'tsvector', 'tsquery',
    ];

    const baseType = dataType.toLowerCase().split('(')[0].trim();
    
    if (!validTypes.includes(baseType) && !baseType.endsWith('[]')) {
      return { isValid: false, error: `"${dataType}" is not a valid PostgreSQL data type` };
    }

    return { isValid: true };
  }

  /**
   * Validate WHERE clause for safety
   */
  static validateWhereClause(whereClause: string): { isValid: boolean; error?: string } {
    if (!whereClause || typeof whereClause !== 'string') {
      return { isValid: false, error: 'WHERE clause is required and must be a string' };
    }

    if (whereClause.trim().length === 0) {
      return { isValid: false, error: 'WHERE clause cannot be empty' };
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /;\s*drop\s+/i,
      /;\s*delete\s+/i,
      /;\s*truncate\s+/i,
      /;\s*alter\s+/i,
      /;\s*create\s+/i,
      /--/,
      /\/\*/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(whereClause)) {
        return { isValid: false, error: 'WHERE clause contains potentially dangerous SQL' };
      }
    }

    return { isValid: true };
  }
} 