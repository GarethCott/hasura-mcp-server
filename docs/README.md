# Hasura MCP Server Documentation

Welcome to the comprehensive documentation for the Hasura MCP Server. This documentation covers everything you need to know to use, configure, and integrate the server.

## 📖 Documentation Overview

### 🚀 Getting Started

- **[Main README](../README.md)** - Project overview and quick start guide
- **[Configuration Guide](./CONFIGURATION.md)** - Setup, environment variables, and deployment

### 🔧 Usage & Reference

- **[Tools Reference](./TOOLS_REFERENCE.md)** - Complete guide to all 31 tools and live execution capabilities
- **[API Documentation](./API.md)** - JSON-RPC interface, request/response formats, and SDK examples
- **[Live Execution Testing Guide](./LIVE_EXECUTION_TESTING_GUIDE.md)** - Testing workflows and examples

## 🎯 Quick Navigation

### For Developers
- Start with [Configuration Guide](./CONFIGURATION.md) for setup
- Reference [Tools Reference](./TOOLS_REFERENCE.md) for available operations
- Use [API Documentation](./API.md) for integration details

### For Testing
- Follow [Live Execution Testing Guide](./LIVE_EXECUTION_TESTING_GUIDE.md) for comprehensive testing
- Check [Tools Reference](./TOOLS_REFERENCE.md) for tool-specific examples

### For Integration
- Review [API Documentation](./API.md) for JSON-RPC protocol details
- See [Configuration Guide](./CONFIGURATION.md) for environment setup
- Use [Tools Reference](./TOOLS_REFERENCE.md) for tool schemas and parameters

## 🚀 Key Features Covered

### Live Execution Modes
All documentation covers the three execution modes:
- **Preview Mode** - Analyze changes without execution
- **Migration-Only Mode** - Create migrations safely
- **Live Execution Mode** - Execute immediately with migrations

### Tool Categories
Documentation covers all 31 tools across categories:
- **Hasura Operations** (8 tools) - Table management and metadata
- **PostgreSQL Core** (5 tools) - Basic database operations
- **PostgreSQL Advanced** (7 tools) - Functions, triggers, indexes
- **Data Operations** (3 tools) - Insert, update, delete with safety
- **Analysis & Utility** (8 tools) - Schema analysis and optimization

### Safety Features
- SQL validation and safety checks
- Required WHERE clauses for data modifications
- Preview mode for impact analysis
- Migration file creation for version control
- Rollback SQL generation

## 📋 Documentation Standards

All documentation follows these standards:
- **Complete examples** with request/response formats
- **Safety considerations** and best practices
- **Error handling** and troubleshooting
- **Production deployment** guidance
- **Development workflow** recommendations

## 🔗 External Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Hasura Documentation](https://hasura.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 📝 Contributing

When updating documentation:
1. Keep examples current and tested
2. Include both development and production scenarios
3. Document safety considerations
4. Provide troubleshooting guidance
5. Update this index when adding new docs 