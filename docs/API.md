# API Documentation

## Overview

The Hasura MCP Server implements the Model Context Protocol (MCP) and provides a JSON-RPC 2.0 interface for database operations. This document covers the API structure, request/response formats, and usage examples.

## Protocol

### JSON-RPC 2.0

All communication uses JSON-RPC 2.0 over stdio:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "method_name",
  "params": {
    "parameter": "value"
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Response content"
      }
    ],
    "isError": false
  }
}
```

## Core Methods

### List Tools

Get all available tools:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node build/index.js
```

**Response:**
```json
{
  "tools": [
    {
      "name": "create_table",
      "description": "Create a new table with Hasura metadata",
      "inputSchema": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "columns": {"type": "array"}
        }
      }
    }
  ]
}
```

### Call Tool

Execute a specific tool:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tool_name","arguments":{}}}' | node build/index.js
```

## Tool Categories

### 1. Table Operations

#### create_table
Create a new table with automatic Hasura metadata generation.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_table",
    "arguments": {
      "name": "users",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primaryKey": true,
          "default": "gen_random_uuid()"
        },
        {
          "name": "email",
          "type": "text",
          "nullable": false,
          "unique": true
        },
        {
          "name": "created_at",
          "type": "timestamp",
          "default": "now()"
        }
      ],
      "executeImmediately": true,
      "previewOnly": false,
      "createMigration": true
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"message\":\"Table users created successfully\",\"data\":{\"tableName\":\"users\",\"executed\":true,\"sql\":\"CREATE TABLE users...\",\"migrationName\":\"create_table_users_1234567890\"}}"
      }
    ],
    "isError": false
  }
}
```

#### add_column
Add a column to an existing table.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "add_column",
    "arguments": {
      "tableName": "users",
      "column": {
        "name": "phone",
        "type": "varchar(20)",
        "nullable": true
      },
      "executeImmediately": false,
      "previewOnly": true
    }
  }
}
```

### 2. Function Operations

#### create_function
Create PostgreSQL functions with live execution support.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "create_function",
    "arguments": {
      "name": "get_user_by_email",
      "parameters": "email_param TEXT",
      "returnType": "TABLE(id UUID, email TEXT, created_at TIMESTAMP)",
      "language": "plpgsql",
      "body": "BEGIN RETURN QUERY SELECT u.id, u.email, u.created_at FROM users u WHERE u.email = email_param; END;",
      "executeImmediately": true,
      "createMigration": true
    }
  }
}
```

### 3. Data Operations

#### insert_data
Insert data into tables with safety checks.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "insert_data",
    "arguments": {
      "table": "users",
      "data": {
        "email": "user@example.com",
        "phone": "+1234567890"
      },
      "executeImmediately": true,
      "createMigration": false
    }
  }
}
```

#### update_data
Update existing data with required WHERE clause.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "update_data",
    "arguments": {
      "table": "users",
      "data": {
        "phone": "+0987654321"
      },
      "where": "email = 'user@example.com'",
      "executeImmediately": true,
      "createMigration": false
    }
  }
}
```

#### delete_data
Delete data with mandatory WHERE clause for safety.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "delete_data",
    "arguments": {
      "table": "users",
      "where": "email = 'user@example.com'",
      "previewOnly": true
    }
  }
}
```

## Live Execution Parameters

All enhanced tools support these execution control parameters:

### executeImmediately
- **Type:** `boolean`
- **Default:** `true` (PostgreSQL tools), `false` (Hasura tools)
- **Description:** Execute SQL immediately on database

### previewOnly
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Preview changes without executing or creating migrations

### createMigration
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Create migration files for version control

## Response Formats

### Success Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"message\":\"Operation completed\",\"data\":{\"executed\":true,\"sql\":\"...\",\"migrationName\":\"...\"}}"
      }
    ],
    "isError": false
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":false,\"error\":\"Error message\"}"
      }
    ],
    "isError": true
  }
}
```

### Preview Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"message\":\"Preview generated\",\"data\":{\"preview\":{\"sql\":\"CREATE TABLE...\",\"affectedTables\":[\"users\"],\"estimatedImpact\":\"Low\"},\"sql\":\"CREATE TABLE...\"}}"
      }
    ],
    "isError": false
  }
}
```

## Error Handling

### Common Error Types

1. **Validation Errors**
   ```json
   {"success": false, "error": "Missing required arguments: name, columns"}
   ```

2. **SQL Execution Errors**
   ```json
   {"success": false, "error": "Execution failed: relation 'users' already exists"}
   ```

3. **Connection Errors**
   ```json
   {"success": false, "error": "Database connection failed"}
   ```

4. **Migration Errors**
   ```json
   {"success": false, "error": "Migration creation failed: Invalid SQL syntax"}
   ```

## Batch Operations

### Multiple Tool Calls

You can send multiple requests in sequence:

```bash
# Create table
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_table","arguments":{"name":"users","columns":[{"name":"id","type":"uuid","primaryKey":true}]}}}' | node build/index.js

# Add column
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"add_column","arguments":{"tableName":"users","column":{"name":"email","type":"text"}}}}' | node build/index.js

# Insert data
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"insert_data","arguments":{"table":"users","data":{"email":"test@example.com"}}}}' | node build/index.js
```

## Authentication

### Database Authentication

Authentication is handled through the PostgreSQL connection string:

```bash
node build/index.js "postgresql://username:password@host:5432/database"
```

### Hasura Authentication

Hasura authentication uses admin secret:

```bash
node build/index.js "postgresql://..." --hasura-admin-secret="your-secret"
```

## Rate Limiting

The server implements basic rate limiting:

- **Connection pooling:** Maximum 20 concurrent connections
- **Query timeout:** 30 seconds per query
- **Batch size:** Maximum 100 operations per batch

## Best Practices

### 1. Use Preview Mode First

```bash
# Always preview before executing
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"alter_table","arguments":{"tableName":"users","operation":"DROP COLUMN","details":"old_column","previewOnly":true}}}' | node build/index.js
```

### 2. Handle Errors Gracefully

```javascript
const response = JSON.parse(result);
if (response.result.isError) {
  const error = JSON.parse(response.result.content[0].text);
  console.error('Operation failed:', error.error);
}
```

### 3. Use Migration Mode in Production

```bash
# Production: Create migrations only
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_table","arguments":{"name":"users","columns":[...],"executeImmediately":false,"createMigration":true}}}' | node build/index.js
```

### 4. Validate Input Data

```javascript
// Validate before sending
const args = {
  table: 'users',
  data: { email: 'valid@example.com' },
  where: 'id = $1' // Use parameterized queries
};
```

## SDK Integration

### Node.js Example

```javascript
import { spawn } from 'child_process';

class HasuraMCPClient {
  constructor(databaseUrl, hasuraEndpoint, adminSecret) {
    this.process = spawn('node', [
      'build/index.js',
      databaseUrl,
      `--hasura-endpoint=${hasuraEndpoint}`,
      `--hasura-admin-secret=${adminSecret}`
    ]);
  }

  async callTool(name, arguments) {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments }
    };

    return new Promise((resolve, reject) => {
      this.process.stdin.write(JSON.stringify(request) + '\n');
      
      this.process.stdout.once('data', (data) => {
        try {
          const response = JSON.parse(data.toString());
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}

// Usage
const client = new HasuraMCPClient(
  'postgresql://localhost:5432/mydb',
  'http://localhost:8080',
  'admin-secret'
);

const result = await client.callTool('create_table', {
  name: 'users',
  columns: [{ name: 'id', type: 'uuid', primaryKey: true }]
});
```

## Debugging

### Enable Debug Mode

```bash
export DEBUG=mcp:*
export LOG_LEVEL=debug
node build/index.js "postgresql://..." --debug
```

### Trace Requests

```bash
# Add request tracing
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test_connection","arguments":{}}}' | node build/index.js 2>&1 | tee debug.log
``` 