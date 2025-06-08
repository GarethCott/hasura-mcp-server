# Hasura MCP Server - Tools Reference

## Overview

The Hasura MCP Server provides 31 comprehensive database management tools that combine PostgreSQL operations with Hasura metadata management. This reference documents all available tools and their capabilities.

## 🚀 Live Execution Capabilities

**9 tools** support advanced live execution modes with three execution options:

### Execution Modes

1. **Preview Mode** (`previewOnly: true`)
   - Shows SQL and impact analysis
   - No database changes
   - No migration files
   - Perfect for planning and validation

2. **Migration-Only Mode** (Default - Safe)
   - Creates migration files
   - Creates metadata files  
   - No database changes
   - Perfect for production workflows

3. **Live Execution Mode** (Development)
   - Executes SQL immediately
   - Creates migration files
   - Creates metadata files
   - Perfect for development workflows

## 📋 Complete Tool Inventory

### ✅ Hasura Operations (8 tools)

#### `create_table` ⚡ *Live Execution*
Create tables with automatic Hasura metadata generation.
```json
{
  "name": "users",
  "columns": [{"name": "id", "type": "uuid", "primaryKey": true}],
  "executeImmediately": true,
  "previewOnly": false,
  "createMigration": true
}
```

#### `add_column` ⚡ *Live Execution*
Add columns to existing tables with metadata updates.
```json
{
  "tableName": "users",
  "column": {"name": "email", "type": "text"},
  "executeImmediately": false,
  "previewOnly": true
}
```

#### `create_table_live`
Original live execution tool for table creation.

#### `create_relationship`
Create table relationships in Hasura metadata.

#### `set_permissions`
Set role-based permissions for tables.

#### `generate_migration`
Generate custom migrations with Hasura CLI.

#### `analyze_schema`
Analyze database schema and generate insights.

#### `apply_migrations`
Apply pending migrations to database.

### ✅ PostgreSQL Core Operations (5 tools)

#### `execute_sql`
Execute SQL with optional migration creation.

#### `test_connection`
Test PostgreSQL database connection.

#### `list_tables`
List all tables in specified schema.

#### `list_functions`
List all functions in specified schema.

#### `describe_table`
Get detailed table information including columns, constraints, and indexes.

### ✅ PostgreSQL Advanced Operations (7 tools)

#### `create_function` ⚡ *Live Execution*
Create PostgreSQL functions and stored procedures.
```json
{
  "name": "get_user_email",
  "parameters": "user_id UUID",
  "returnType": "TEXT",
  "language": "plpgsql",
  "body": "BEGIN RETURN (SELECT email FROM users WHERE id = user_id); END;",
  "executeImmediately": true,
  "previewOnly": false,
  "createMigration": true
}
```

#### `create_trigger` ⚡ *Live Execution*
Create database triggers with function integration.
```json
{
  "name": "update_timestamp",
  "tableName": "users",
  "functionName": "update_modified_column",
  "when": "BEFORE",
  "events": ["UPDATE"],
  "forEach": "ROW",
  "executeImmediately": true,
  "previewOnly": false,
  "createMigration": true
}
```

#### `create_index` ⚡ *Live Execution*
Create database indexes with advanced options.
```json
{
  "tableName": "users",
  "indexName": "idx_users_email",
  "columns": ["email"],
  "unique": true,
  "executeImmediately": true,
  "previewOnly": false,
  "createMigration": true
}
```

#### `alter_table` ⚡ *Live Execution*
Alter table structure with live execution support.
```json
{
  "tableName": "users",
  "operation": "ADD COLUMN",
  "details": "phone VARCHAR(20)",
  "executeImmediately": false,
  "previewOnly": true,
  "createMigration": true
}
```

#### `drop_function`
Drop PostgreSQL functions with migration support.

#### `drop_trigger`
Drop database triggers with migration support.

#### `drop_index`
Drop database indexes with migration support.

### ✅ PostgreSQL Data Operations (3 tools)

#### `insert_data` ⚡ *Live Execution*
Insert data into tables with migration support.
```json
{
  "table": "users",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "executeImmediately": true,
  "previewOnly": false,
  "createMigration": false
}
```

#### `update_data` ⚡ *Live Execution*
Update existing data with safety checks.
```json
{
  "table": "users",
  "data": {"email": "newemail@example.com"},
  "where": "id = '123e4567-e89b-12d3-a456-426614174000'",
  "executeImmediately": true,
  "previewOnly": false,
  "createMigration": false
}
```

#### `delete_data` ⚡ *Live Execution*
Delete data with required WHERE clause for safety.
```json
{
  "table": "users",
  "where": "email IS NULL",
  "executeImmediately": false,
  "previewOnly": true,
  "createMigration": false
}
```

### ✅ PostgreSQL Analysis & Utility (8 tools)

#### `analyze_database_schema`
Advanced schema analysis with optimization suggestions.

#### `validate_sql`
Validate SQL syntax and safety before execution.

#### `preview_changes`
Preview SQL changes without execution.

#### `sync_schema`
Synchronize database schema with Hasura metadata.

#### `optimize_database`
Apply database optimization suggestions.

#### `list_triggers`
List all triggers in specified schema.

#### `backup_schema`
Backup schema definitions to files.

#### `restore_schema`
Restore schema from backup files.

## 🔧 Usage Examples

### Development Workflow
```bash
# 1. Preview changes first
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_function","arguments":{"name":"test_func","parameters":"","returnType":"TEXT","language":"sql","body":"SELECT 'hello'","previewOnly":true}}}' | node build/index.js

# 2. Execute with migration
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_function","arguments":{"name":"test_func","parameters":"","returnType":"TEXT","language":"sql","body":"SELECT 'hello'","executeImmediately":true,"createMigration":true}}}' | node build/index.js
```

### Production Workflow
```bash
# Create migration only (safe default)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"alter_table","arguments":{"tableName":"users","operation":"ADD COLUMN","details":"phone VARCHAR(20)","executeImmediately":false,"createMigration":true}}}' | node build/index.js
```

## 🛡️ Safety Features

- **Required WHERE clauses** for data modification operations
- **SQL validation** before execution
- **Preview mode** for impact analysis
- **Migration file creation** for version control
- **Rollback SQL generation** where possible
- **Type validation** for all parameters

## 📚 Additional Resources

- [Live Execution Testing Guide](./LIVE_EXECUTION_TESTING_GUIDE.md)
- [API Documentation](./API.md)
- [Configuration Guide](./CONFIGURATION.md) 