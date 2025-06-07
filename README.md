# Hasura MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to automatically generate Hasura migrations and metadata from natural language descriptions.

## 🏗️ Architecture

This MCP server follows a modular architecture with clear separation of concerns:

```
src/
├── types/           # TypeScript interfaces and type definitions
├── config/          # Configuration management and environment variables
├── utils/           # Utility functions (logging, file system operations)
├── services/        # Business logic services
│   ├── hasura-service.ts    # Hasura project operations
│   └── sql-generator.ts     # SQL generation and validation
├── mcp/             # MCP protocol implementations
│   ├── resources.ts         # MCP resources (data exposure)
│   ├── tools.ts            # MCP tools (actions/functions)
│   └── prompts.ts          # MCP prompts (AI assistance)
├── server.ts        # Main MCP server implementation
└── index.ts         # Application entry point
```

## 🚀 Features

### Resources
Expose Hasura project data to AI assistants:
- **hasura://config** - Project configuration
- **hasura://metadata** - Complete metadata including tables, relationships, permissions
- **hasura://migrations** - All migration files
- **hasura://schema** - Current database schema structure
- **hasura://project-info** - General project information

### Tools
Enable AI assistants to perform Hasura operations:
- **create_table** - Create new tables with columns and constraints
- **add_column** - Add columns to existing tables
- **create_relationship** - Define relationships between tables
- **set_permissions** - Configure role-based permissions
- **generate_migration** - Create custom migration files
- **analyze_schema** - Analyze schema and provide optimization suggestions
- **apply_migrations** - Apply pending migrations and metadata to Hasura instance

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
   export HASURA_ENDPOINT="https://your-hasura-endpoint.hasura.app"
   export HASURA_ADMIN_SECRET="your-admin-secret"
   export HASURA_PROJECT_PATH="/path/to/your/hasura/project"
   export LOG_LEVEL="INFO"  # Optional: DEBUG, INFO, WARN, ERROR
   ```

## 🔧 Configuration

The server uses environment variables for configuration:

| Variable | Description | Default |
|----------|-------------|---------|
| `HASURA_ENDPOINT` | Hasura GraphQL endpoint | `http://localhost:8080` |
| `HASURA_ADMIN_SECRET` | Hasura admin secret | None |
| `HASURA_PROJECT_PATH` | Path to Hasura project directory
| `LOG_LEVEL` | Logging level | `INFO` |

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
        "HASURA_PROJECT_PATH": "/path/to/your/hasura/project"
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

#### 2. Add a New Table
```
Use the create_table tool with:
{
  "name": "users",
  "columns": [
    {"name": "id", "type": "uuid", "primaryKey": true},
    {"name": "email", "type": "text", "unique": true},
    {"name": "name", "type": "text"},
    {"name": "created_at", "type": "timestamp", "default": "now()"}
  ]
}
```

#### 3. Set Permissions
```
Use the set_permissions tool with:
{
  "tableName": "users",
  "role": "user",
  "permission": "select",
  "filter": {"id": {"_eq": "X-Hasura-User-Id"}},
  "columns": ["id", "name", "email"]
}
```

#### 4. Apply Changes
```
Use the apply_migrations tool to push all changes live:
{
  "applyMetadata": true
}
```

This will automatically run `hasura migrate apply` and `hasura metadata apply` for you!

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
