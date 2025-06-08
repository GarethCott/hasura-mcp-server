# Hasura MCP Server with PostgreSQL Integration

A comprehensive Model Context Protocol (MCP) server that enables AI assistants to automatically generate Hasura migrations, manage metadata, and execute PostgreSQL operations directly from natural language descriptions.

## ✨ Key Features

🚀 **Live Execution Modes**: Choose between safe migration-only, immediate execution, or preview-only modes  
🔄 **Unified Workflows**: Seamlessly coordinate Hasura migrations with PostgreSQL operations  
🛡️ **Safety First**: Built-in SQL validation, transaction safety, and rollback capabilities  
📊 **Real-time Analysis**: Live schema analysis and performance optimization suggestions  
🎯 **Production Ready**: 31 database tools with flexible execution options  

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) folder:

- **[Tools Reference](./docs/TOOLS_REFERENCE.md)** - Complete guide to all 31 tools and live execution capabilities
- **[API Documentation](./docs/API.md)** - JSON-RPC interface, request/response formats, and SDK examples
- **[Configuration Guide](./docs/CONFIGURATION.md)** - Setup, environment variables, and deployment options
- **[Live Execution Testing Guide](./docs/LIVE_EXECUTION_TESTING_GUIDE.md)** - Testing workflows and examples

## 🚀 Quick Start

### 1. Installation

```bash
cd mcp
npm install
npm run build
```

### 2. Basic Usage

```bash
# Run with PostgreSQL only
node build/index.js "postgresql://user:password@localhost:5432/database"

# Run with Hasura integration
node build/index.js "postgresql://user:password@localhost:5432/database" \
  --hasura-endpoint="http://localhost:8080" \
  --hasura-admin-secret="your-admin-secret"
```

### 3. Test Connection

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test_connection","arguments":{}}}' | node build/index.js "postgresql://..."
```

## 🎛️ Live Execution Modes

**9 enhanced tools** support three execution modes:

1. **Preview Mode** (`previewOnly: true`) - Analyze impact without changes
2. **Migration-Only Mode** (`executeImmediately: false`) - Create migrations only (safe default)
3. **Live Execution Mode** (`executeImmediately: true`) - Execute immediately + create migrations

### Enhanced Tools with Live Execution ⚡

- `create_table` - Table creation with metadata
- `add_column` - Column addition with validation
- `create_index` - Index creation with optimization
- `create_function` - PostgreSQL function creation
- `create_trigger` - Database trigger management
- `alter_table` - Table structure modification
- `insert_data` - Data insertion with safety checks
- `update_data` - Data updates with WHERE validation
- `delete_data` - Data deletion with mandatory WHERE clause

## 🏗️ Architecture

This MCP server follows a modular architecture with clear separation of concerns:

```
src/
├── types/           # TypeScript interfaces and type definitions
├── config/          # Configuration management and environment variables
├── utils/           # Utility functions (logging, file system operations)
├── services/        # Business logic services
│   ├── hasura-service.ts      # Hasura project operations
│   ├── postgres-service.ts    # PostgreSQL database operations
│   ├── integration-service.ts # Unified Hasura + PostgreSQL workflows
│   └── sql-generator.ts       # SQL generation and validation
├── mcp/             # MCP protocol implementations
│   ├── resources.ts         # MCP resources (data exposure)
│   ├── tools.ts            # MCP tools (actions/functions)
│   └── prompts.ts          # MCP prompts (AI assistance)
├── server.ts        # Main MCP server implementation
└── index.ts         # Application entry point
```

## 🚀 Features

### 🎛️ Three Execution Modes

All enhanced tools support flexible execution modes:

1. **Preview Mode** (`previewOnly: true`) - Analyze SQL and show impact without making changes
2. **Migration-Only Mode** (`executeImmediately: false`) - Create migration files only (safe default for Hasura tools)
3. **Live Execution Mode** (`executeImmediately: true`) - Execute SQL immediately AND create migrations (default for PostgreSQL tools)

### Resources
Expose both Hasura project and live PostgreSQL data to AI assistants:

**Hasura Resources:**
- **hasura://config** - Project configuration
- **hasura://metadata** - Complete metadata including tables, relationships, permissions
- **hasura://migrations** - All migration files
- **hasura://schema** - Current database schema structure
- **hasura://project-info** - General project information

**PostgreSQL Resources:**
- **postgres://live-schema** - Real-time database schema from PostgreSQL
- **postgres://performance** - Live performance analysis and optimization suggestions
- **postgres://connection-status** - Current PostgreSQL connection status and configuration

### Tools (31 Total)

**Enhanced Hasura Tools (8 total, 2 enhanced):**
- **create_table** ✨ - Create tables with flexible execution modes
- **add_column** ✨ - Add columns with live execution options
- **create_relationship** - Define relationships between tables
- **set_permissions** - Configure role-based permissions
- **generate_migration** - Create custom migration files
- **apply_migrations** - Apply pending migrations and metadata to Hasura instance
- **remove_column** - Remove columns from tables
- **drop_table** - Drop tables safely

**Enhanced PostgreSQL Tools (23 total, 1 enhanced):**
- **create_index** ✨ - Create indexes with execution control
- **execute_sql** - Execute SQL directly against PostgreSQL with optional migration creation
- **validate_sql** - Validate SQL syntax and safety before execution
- **analyze_schema** - Analyze database schema for optimization opportunities
- **create_table_live** - Create table with immediate execution and migration generation
- **preview_changes** - Preview what changes SQL will make without executing
- **rollback_migration** - Rollback a migration from both database and files
- **sync_schema** - Synchronize database schema with Hasura metadata
- **optimize_database** - Apply optimization suggestions to improve performance
- **list_tables** - List all tables in the database
- **describe_table** - Get detailed table structure
- **list_indexes** - List all indexes
- **analyze_performance** - Analyze query performance
- **backup_schema** - Create schema backups
- **restore_schema** - Restore from backups
- **create_view** - Create database views
- **drop_view** - Drop database views
- **create_function** - Create PostgreSQL functions
- **drop_function** - Drop PostgreSQL functions
- **create_trigger** - Create database triggers
- **drop_trigger** - Drop database triggers
- **vacuum_analyze** - Optimize database performance
- **check_constraints** - Validate database constraints

### Prompts
AI-assisted schema generation and optimization:
- **generate_schema** - Generate database schema from natural language
- **optimize_schema** - Analyze and suggest schema improvements
- **generate_api_schema** - Create API-optimized schemas
- **migration_strategy** - Plan complex schema migrations

## 📦 Installation

1. **Clone and install dependencies:**
   ```bash
   cd mcp
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your configuration:
   export HASURA_ENDPOINT="https://your-hasura-endpoint.hasura.app"
   export HASURA_ADMIN_SECRET="your-admin-secret"
   export HASURA_PROJECT_PATH="/path/to/your/hasura/project"
   export POSTGRES_CONNECTION_STRING="postgresql://user:password@host:port/database"
   export LOG_LEVEL="INFO"  # Optional: DEBUG, INFO, WARN, ERROR
   ```

## 🔧 Configuration

The server uses environment variables for configuration:

| Variable | Description | Required |
|----------|-------------|----------|
| `HASURA_ENDPOINT` | Hasura GraphQL endpoint | ✅ Yes |
| `HASURA_ADMIN_SECRET` | Hasura admin secret | No |
| `HASURA_PROJECT_PATH` | Path to Hasura project directory | ✅ Yes |
| `POSTGRES_CONNECTION_STRING` | PostgreSQL connection string | ✅ Yes |
| `POSTGRES_POOL_SIZE` | Connection pool size | No (default: 10) |
| `POSTGRES_IDLE_TIMEOUT` | Idle connection timeout (ms) | No (default: 60000) |
| `POSTGRES_CONNECTION_TIMEOUT` | Connection timeout (ms) | No (default: 30000) |
| `LOG_LEVEL` | Logging level | No (default: info) |

## 🏃‍♂️ Usage

### Running the Server

```bash
# Development
npm run dev

# Production
npm start

# Or run directly
node build/index.js
```

### Claude Desktop Integration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "hasura": {
      "command": "node",
      "args": ["/path/to/hasura-mcp-server/mcp/build/index.js"],
      "env": {
        "HASURA_ENDPOINT": "https://your-hasura-endpoint.hasura.app",
        "HASURA_ADMIN_SECRET": "your-admin-secret",
        "HASURA_PROJECT_PATH": "/path/to/your/hasura/project",
        "POSTGRES_CONNECTION_STRING": "postgresql://user:password@host:port/database"
      }
    }
  }
}
```

### Example Interactions

#### 1. Create a Blog Schema
```
Use the generate_schema prompt with:
- description: "A blog platform with users, posts, comments, and categories"
- domain: "blog"
```

#### 2. Create Table with Live Execution (Enhanced)
```
Use the create_table tool with flexible execution:
{
  "name": "users",
  "columns": [
    {"name": "id", "type": "uuid", "constraints": "PRIMARY KEY DEFAULT gen_random_uuid()"},
    {"name": "email", "type": "text", "constraints": "UNIQUE NOT NULL"},
    {"name": "name", "type": "text", "constraints": "NOT NULL"},
    {"name": "created_at", "type": "timestamptz", "constraints": "DEFAULT now()"}
  ],
  "executeImmediately": true,    // Execute SQL immediately
  "previewOnly": false,          // Actually make changes
  "createMigration": true        // Also create migration file
}
```

#### 3. Preview Changes Before Execution
```
Use the create_table tool in preview mode:
{
  "name": "posts",
  "columns": [
    {"name": "id", "type": "uuid", "constraints": "PRIMARY KEY DEFAULT gen_random_uuid()"},
    {"name": "title", "type": "text", "constraints": "NOT NULL"},
    {"name": "content", "type": "text"}
  ],
  "previewOnly": true           // Just show what would happen
}
```

#### 4. Safe Migration-Only Mode
```
Use the add_column tool in safe mode:
{
  "tableName": "users",
  "column": {
    "name": "last_login",
    "type": "timestamptz",
    "constraints": "DEFAULT now()"
  },
  "executeImmediately": false,  // Only create migration file
  "createMigration": true       // Safe for production workflows
}
```

#### 5. Create Index with Live Execution
```
Use the create_index tool (PostgreSQL default: immediate execution):
{
  "tableName": "users",
  "indexName": "idx_users_email",
  "columns": ["email"],
  "unique": true,
  "executeImmediately": true,   // Default for PostgreSQL tools
  "createMigration": true
}
```

#### 6. Execute SQL with Migration
```
Use the execute_sql tool with:
{
  "sql": "ALTER TABLE users ADD COLUMN profile_image_url text",
  "createMigration": true,
  "migrationName": "add_profile_image_url"
}
```

#### 7. Validate Before Executing
```
Use the validate_sql tool to check SQL safety:
{
  "sql": "CREATE INDEX CONCURRENTLY idx_posts_created_at ON posts(created_at)"
}
```

#### 8. Analyze Performance
```
Use the analyze_schema tool to get optimization suggestions:
{
  "includePerformance": true
}
```

#### 9. Apply Changes to Hasura
```
Use the apply_migrations tool to push all changes live:
{
  "applyMetadata": true
}
```

This will automatically run `hasura migrate apply` and `hasura metadata apply` for you!

## 🎯 Current Status

**Production Ready**: 31 database tools with live execution capabilities
- ✅ **3 Enhanced Tools**: `create_table`, `add_column`, `create_index` with flexible execution modes
- ✅ **Pattern Established**: Clear architecture for enhancing remaining tools
- ✅ **Safety Features**: Preview mode, validation, transaction safety
- ✅ **Unified Workflows**: Seamless Hasura + PostgreSQL coordination
- ✅ **Build Status**: Compiles successfully, core functionality tested

**Next Enhancement Targets**:
- `drop_table`, `remove_column`, `create_relationship` (Hasura tools)
- `execute_sql`, `create_view`, `create_function` (PostgreSQL tools)

## 🧩 Module Details

### Types (`src/types/`)
Centralized TypeScript interfaces for:
- Hasura configuration and metadata structures
- Table, column, and relationship definitions
- Permission and migration types
- Schema analysis results

### Configuration (`src/config/`)
- Singleton configuration manager
- Environment variable validation
- Default value handling

### Utilities (`src/utils/`)
- **Logger**: Structured logging with configurable levels
- **FileSystemUtils**: File operations with error handling
- Path manipulation and JSON file handling

### Services (`src/services/`)
- **HasuraService**: Hasura project operations (config, metadata, migrations)
- **PostgresService**: Direct PostgreSQL database operations and analysis
- **IntegrationService**: Unified workflows coordinating Hasura and PostgreSQL
- **SqlGenerator**: SQL generation, validation, and formatting

### MCP Implementation (`src/mcp/`)
- **ResourceManager**: Exposes Hasura data as MCP resources
- **ToolManager**: Implements MCP tools for Hasura operations
- **PromptManager**: Provides AI-assisted prompts for schema work

## 🔍 Development

### Project Structure Benefits
- **Modularity**: Each module has a single responsibility
- **Testability**: Easy to unit test individual components
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add new features without affecting existing code
- **Integration**: Unified workflows combining Hasura and PostgreSQL operations
- **Safety**: Environment-only configuration with no default fallbacks

### Adding New Features

1. **New Tool**: Add to `src/mcp/tools.ts`
2. **New Resource**: Add to `src/mcp/resources.ts`
3. **New Prompt**: Add to `src/mcp/prompts.ts`
4. **New Service**: Create in `src/services/`
5. **New Types**: Add to `src/types/`

### Error Handling
- Comprehensive error logging
- Graceful error responses to MCP clients
- Input validation and SQL safety checks
- Transaction rollback on failures
- Automatic cleanup of partial operations

## 🧪 Testing

### MCP Inspector
Test your server interactively:
```bash
npm run inspector
```
Then open http://127.0.0.1:6274 to test resources, tools, and prompts.

### Manual Testing
```bash
# Run tests (when implemented)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📝 Best Practices

### SQL Generation
- Input validation and sanitization
- SQL injection prevention
- Reversible migrations (up/down SQL)
- Transaction safety

### File Operations
- Atomic file writes
- Directory creation with proper permissions
- Error handling for file system operations

### Logging
- Structured logging with context
- Configurable log levels
- Error tracking with stack traces

## 🤝 Contributing

1. Follow the modular architecture
2. Add proper TypeScript types
3. Include error handling
4. Update documentation
5. Test your changes

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

- [Model Context Protocol](https://github.com/modelcontextprotocol/specification)
- [Hasura GraphQL Engine](https://hasura.io/)
- [Claude Desktop](https://claude.ai/desktop)
