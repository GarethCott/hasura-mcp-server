# Live Execution Testing Guide

## 🎯 **Overview**

This guide demonstrates how to test the enhanced PostgreSQL and Hasura tools with the new live execution capabilities. All tools now support three execution modes:

1. **Migration-only mode** (safe default)
2. **Live execution mode** (immediate + migration)
3. **Preview mode** (planning and analysis)

## 🔧 **Enhanced Tools**

### ✅ **Hasura Tools** (Enhanced)
- `create_table` - Now supports `executeImmediately`, `previewOnly`, `createMigration`
- `add_column` - Now supports `executeImmediately`, `previewOnly`, `createMigration`
- `create_table_live` - Already had live execution (unchanged)

### ✅ **PostgreSQL Tools** (Enhanced)
- `create_index` - Now supports `executeImmediately`, `previewOnly`, `createMigration`
- All other PostgreSQL tools can be enhanced following the same pattern

## 🧪 **Testing Scenarios**

### **Scenario 1: Migration-Only Mode (Safe Default)**

#### **Test: Create Table - Migration Only**
```bash
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_table",
    "arguments": {
      "name": "test_products",
      "schema": "public",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true,
          "default": "gen_random_uuid()"
        },
        {
          "name": "name",
          "type": "text",
          "nullable": false
        },
        {
          "name": "price",
          "type": "decimal(10,2)",
          "nullable": false
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "executeImmediately": false,
      "createMigration": true
    }
  }
}' | node build/index.js
```

**Expected Result:**
- ✅ Migration file created in `migrations/default/`
- ✅ Metadata file created in `metadata/databases/default/tables/`
- ❌ No database changes (table not created in DB)
- ✅ Response: `"executed": false, "migrationCreated": true`

#### **Test: Add Column - Migration Only**
```bash
echo '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "add_column",
    "arguments": {
      "tableName": "test_products",
      "schema": "public",
      "column": {
        "name": "description",
        "type": "text",
        "nullable": true
      },
      "executeImmediately": false,
      "createMigration": true
    }
  }
}' | node build/index.js
```

**Expected Result:**
- ✅ Migration file created
- ❌ No database changes
- ✅ Response: `"executed": false, "migrationCreated": true`

### **Scenario 2: Live Execution Mode (Development)**

#### **Test: Create Table - Live Execution**
```bash
echo '{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "create_table",
    "arguments": {
      "name": "test_orders",
      "schema": "public",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true,
          "default": "gen_random_uuid()"
        },
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": false
        },
        {
          "name": "total",
          "type": "decimal(10,2)",
          "nullable": false
        },
        {
          "name": "status",
          "type": "text",
          "nullable": false,
          "default": "'pending'"
        }
      ],
      "executeImmediately": true,
      "createMigration": true
    }
  }
}' | node build/index.js
```

**Expected Result:**
- ✅ Migration file created
- ✅ Metadata file created
- ✅ Table created in database immediately
- ✅ Response: `"executed": true, "migrationCreated": true`

#### **Test: Create Index - Live Execution**
```bash
echo '{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "create_index",
    "arguments": {
      "tableName": "test_orders",
      "indexName": "idx_orders_user_id",
      "schema": "public",
      "columns": ["user_id"],
      "unique": false,
      "executeImmediately": true,
      "createMigration": true
    }
  }
}' | node build/index.js
```

**Expected Result:**
- ✅ Migration file created
- ✅ Index created in database immediately
- ✅ Response: `"executed": true, "migrationCreated": true`

### **Scenario 3: Preview Mode (Planning)**

#### **Test: Preview Table Creation**
```bash
echo '{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "create_table",
    "arguments": {
      "name": "test_analytics",
      "schema": "public",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "event_name",
          "type": "text",
          "nullable": false
        },
        {
          "name": "event_data",
          "type": "jsonb",
          "nullable": true
        },
        {
          "name": "timestamp",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "previewOnly": true
    }
  }
}' | node build/index.js
```

**Expected Result:**
- ❌ No migration file created
- ❌ No database changes
- ✅ Preview with SQL and impact analysis
- ✅ Response includes `"preview"` object with SQL and warnings

#### **Test: Preview Index Creation**
```bash
echo '{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "create_index",
    "arguments": {
      "tableName": "test_analytics",
      "indexName": "idx_analytics_event_name",
      "schema": "public",
      "columns": ["event_name"],
      "type": "btree",
      "previewOnly": true
    }
  }
}' | node build/index.js
```

**Expected Result:**
- ❌ No migration file created
- ❌ No database changes
- ✅ Preview with SQL and impact analysis

### **Scenario 4: Execute-Only Mode (Quick Fixes)**

#### **Test: Create Index - Execute Only**
```bash
echo '{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "create_index",
    "arguments": {
      "tableName": "test_orders",
      "indexName": "idx_orders_status",
      "schema": "public",
      "columns": ["status"],
      "executeImmediately": true,
      "createMigration": false
    }
  }
}' | node build/index.js
```

**Expected Result:**
- ❌ No migration file created
- ✅ Index created in database immediately
- ✅ Response: `"executed": true, "migrationCreated": false`

## 🔍 **Verification Commands**

### **Check Database State**
```bash
# List tables to verify creation
echo '{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "list_tables",
    "arguments": {
      "schema": "public"
    }
  }
}' | node build/index.js
```

### **Check Migration Files**
```bash
# List migration files
ls -la /Users/garethcottrell/Documents/QLTech/hasura-mcp-server/hasura/qltech-mcp/migrations/default/

# Check latest migration content
cat /Users/garethcottrell/Documents/QLTech/hasura-mcp-server/hasura/qltech-mcp/migrations/default/*/up.sql | tail -20
```

### **Check Metadata Files**
```bash
# List metadata files
ls -la /Users/garethcottrell/Documents/QLTech/hasura-mcp-server/hasura/qltech-mcp/metadata/databases/default/tables/

# Check tables.yaml
cat /Users/garethcottrell/Documents/QLTech/hasura-mcp-server/hasura/qltech-mcp/metadata/databases/default/tables/tables.yaml
```

## 🎯 **Advanced Testing Scenarios**

### **Scenario 5: Error Handling**

#### **Test: Invalid SQL Preview**
```bash
echo '{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "create_table",
    "arguments": {
      "name": "invalid-table-name!",
      "columns": [
        {
          "name": "id",
          "type": "invalid_type"
        }
      ],
      "previewOnly": true
    }
  }
}' | node build/index.js
```

**Expected Result:**
- ✅ Validation errors returned
- ❌ No preview generated
- ✅ Clear error messages

#### **Test: Database Connection Failure**
```bash
# Test with invalid database config (temporarily modify .env)
echo '{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "create_table",
    "arguments": {
      "name": "test_connection",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primaryKey": true
        }
      ],
      "executeImmediately": true
    }
  }
}' | node build/index.js
```

### **Scenario 6: Performance Testing**

#### **Test: Large Table Creation**
```bash
echo '{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "create_table",
    "arguments": {
      "name": "test_large_table",
      "columns": [
        {"name": "id", "type": "uuid", "primaryKey": true},
        {"name": "col1", "type": "text"},
        {"name": "col2", "type": "text"},
        {"name": "col3", "type": "text"},
        {"name": "col4", "type": "text"},
        {"name": "col5", "type": "text"},
        {"name": "col6", "type": "integer"},
        {"name": "col7", "type": "decimal(10,2)"},
        {"name": "col8", "type": "timestamptz"},
        {"name": "col9", "type": "jsonb"},
        {"name": "col10", "type": "boolean"}
      ],
      "executeImmediately": true,
      "createMigration": true
    }
  }
}' | node build/index.js
```

## 📊 **Expected Results Summary**

### **Migration-Only Mode**
- ✅ Files created: Migration + Metadata
- ❌ Database changes: None
- 🔒 Safety: High (no immediate impact)
- 🎯 Use case: Production deployments

### **Live Execution Mode**
- ✅ Files created: Migration + Metadata
- ✅ Database changes: Immediate
- 🔒 Safety: Medium (immediate impact)
- 🎯 Use case: Development workflows

### **Preview Mode**
- ❌ Files created: None
- ❌ Database changes: None
- ✅ Analysis: SQL + Impact + Warnings
- 🔒 Safety: High (no changes)
- 🎯 Use case: Planning and analysis

### **Execute-Only Mode**
- ❌ Files created: None
- ✅ Database changes: Immediate
- 🔒 Safety: Low (no version control)
- 🎯 Use case: Quick fixes and testing

## 🚀 **Quick Test Script**

Create a test script to run all scenarios:

```bash
#!/bin/bash

echo "🧪 Testing Live Execution Capabilities..."

echo "📋 1. Testing Migration-Only Mode..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_table","arguments":{"name":"test_migration_only","columns":[{"name":"id","type":"uuid","primaryKey":true}],"executeImmediately":false,"createMigration":true}}}' | node build/index.js

echo "🚀 2. Testing Live Execution Mode..."
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_table","arguments":{"name":"test_live_execution","columns":[{"name":"id","type":"uuid","primaryKey":true}],"executeImmediately":true,"createMigration":true}}}' | node build/index.js

echo "👁️ 3. Testing Preview Mode..."
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_table","arguments":{"name":"test_preview","columns":[{"name":"id","type":"uuid","primaryKey":true}],"previewOnly":true}}}' | node build/index.js

echo "⚡ 4. Testing Execute-Only Mode..."
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"create_index","arguments":{"tableName":"test_live_execution","indexName":"idx_test","columns":["id"],"executeImmediately":true,"createMigration":false}}}' | node build/index.js

echo "✅ Testing complete!"
```

## 🎯 **Success Criteria**

- ✅ All execution modes work as expected
- ✅ Migration files created when requested
- ✅ Database changes occur when requested
- ✅ Preview mode provides useful analysis
- ✅ Error handling works correctly
- ✅ Performance is acceptable
- ✅ Backward compatibility maintained

This enhancement provides maximum flexibility while maintaining safety through sensible defaults! 🚀 