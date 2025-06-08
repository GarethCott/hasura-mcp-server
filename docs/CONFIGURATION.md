# Configuration Guide

## Overview

This guide covers how to configure and set up the Hasura MCP Server for different environments and use cases.

## Environment Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Hasura CLI (optional, for migration management)
- TypeScript (for development)

### Installation

```bash
# Clone and install dependencies
git clone <repository>
cd mcp
npm install

# Build the project
npm run build
```

## Database Configuration

### PostgreSQL Connection

The server requires a PostgreSQL connection string. Set this via command line:

```bash
node build/index.js "postgresql://username:password@localhost:5432/database"
```

### Connection String Format

```
postgresql://[user[:password]@][host][:port][/dbname][?param1=value1&...]
```

**Examples:**
```bash
# Local development
postgresql://postgres:password@localhost:5432/myapp

# Production with SSL
postgresql://user:pass@prod-host:5432/myapp?sslmode=require

# Connection pooling
postgresql://user:pass@localhost:5432/myapp?max_connections=20
```

## Hasura Integration

### Basic Setup

```bash
# With Hasura endpoint and admin secret
node build/index.js "postgresql://..." \
  --hasura-endpoint="http://localhost:8080" \
  --hasura-admin-secret="your-admin-secret"
```

### Environment Variables

You can also use environment variables:

```bash
export HASURA_ENDPOINT="http://localhost:8080"
export HASURA_ADMIN_SECRET="your-admin-secret"
export DATABASE_URL="postgresql://..."

node build/index.js $DATABASE_URL \
  --hasura-endpoint=$HASURA_ENDPOINT \
  --hasura-admin-secret=$HASURA_ADMIN_SECRET
```

## Configuration Options

### Server Configuration

The server can be configured through the `src/config/index.ts` file:

```typescript
export const config = {
  postgres: {
    // PostgreSQL connection settings
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production',
    max: 20, // Connection pool size
  },
  hasura: {
    // Hasura settings
    endpoint: process.env.HASURA_ENDPOINT,
    adminSecret: process.env.HASURA_ADMIN_SECRET,
    timeout: 30000,
  },
  server: {
    // MCP Server settings
    name: 'Hasura MCP Server',
    version: '0.1.0',
    logLevel: 'info',
  }
};
```

### Migration Settings

Configure migration behavior:

```typescript
export const migrationConfig = {
  // Directory for migration files
  migrationsDir: './migrations',
  
  // Hasura project directory
  hasuraProjectDir: './hasura',
  
  // Auto-apply migrations in development
  autoApply: process.env.NODE_ENV === 'development',
  
  // Create rollback SQL
  generateRollback: true,
};
```

## Development vs Production

### Development Configuration

```bash
# Development with auto-execution
export NODE_ENV=development
export LOG_LEVEL=debug

node build/index.js "postgresql://localhost:5432/dev_db" \
  --hasura-endpoint="http://localhost:8080" \
  --hasura-admin-secret="dev-secret"
```

**Development Features:**
- Live execution enabled by default
- Detailed logging
- Auto-migration application
- Hot reload support

### Production Configuration

```bash
# Production with safety features
export NODE_ENV=production
export LOG_LEVEL=warn

node build/index.js "postgresql://prod-host:5432/prod_db?sslmode=require" \
  --hasura-endpoint="https://hasura.example.com" \
  --hasura-admin-secret="$HASURA_ADMIN_SECRET"
```

**Production Features:**
- Migration-only mode by default
- Reduced logging
- SSL enforcement
- Connection pooling

## Security Configuration

### Database Security

```bash
# Use SSL connections
postgresql://user:pass@host:5432/db?sslmode=require

# Connection limits
postgresql://user:pass@host:5432/db?max_connections=10&idle_timeout=30
```

### Hasura Security

```bash
# Use HTTPS endpoints
--hasura-endpoint="https://secure-hasura.example.com"

# Strong admin secrets
--hasura-admin-secret="$(openssl rand -base64 32)"
```

### Network Security

- Use VPC/private networks
- Implement IP whitelisting
- Enable database SSL
- Use secrets management

## Logging Configuration

### Log Levels

```typescript
export const logConfig = {
  level: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
  format: 'json', // json, text
  destination: process.env.LOG_FILE || 'stdout',
};
```

### Custom Logging

```typescript
import { logger } from './utils/logger';

// Log levels
logger.debug('Debug information');
logger.info('General information');
logger.warn('Warning message');
logger.error('Error occurred');
```

## Performance Tuning

### Connection Pooling

```typescript
export const poolConfig = {
  max: 20,           // Maximum connections
  min: 5,            // Minimum connections
  idle: 10000,       // Idle timeout (ms)
  acquire: 60000,    // Acquire timeout (ms)
  evict: 1000,       // Eviction interval (ms)
};
```

### Query Optimization

```typescript
export const queryConfig = {
  timeout: 30000,    // Query timeout (ms)
  retries: 3,        // Retry attempts
  batchSize: 100,    // Batch operation size
};
```

## Monitoring Configuration

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/health

# Database connectivity check
curl http://localhost:3000/health/db

# Hasura connectivity check
curl http://localhost:3000/health/hasura
```

### Metrics Collection

```typescript
export const metricsConfig = {
  enabled: true,
  endpoint: '/metrics',
  interval: 60000,   // Collection interval (ms)
  retention: 86400,  // Data retention (seconds)
};
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check database connectivity
   psql "postgresql://user:pass@host:5432/db"
   ```

2. **Hasura Authentication**
   ```bash
   # Verify admin secret
   curl -H "X-Hasura-Admin-Secret: your-secret" \
        http://localhost:8080/v1/version
   ```

3. **Migration Errors**
   ```bash
   # Check Hasura CLI
   hasura version
   
   # Verify project structure
   ls -la hasura/
   ```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
export DEBUG=mcp:*

node build/index.js "postgresql://..." --debug
```

## Example Configurations

### Docker Compose

```yaml
version: '3.8'
services:
  mcp-server:
    build: .
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/app
      - HASURA_ENDPOINT=http://hasura:8080
      - HASURA_ADMIN_SECRET=secret
      - NODE_ENV=production
    depends_on:
      - db
      - hasura
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  template:
    spec:
      containers:
      - name: mcp-server
        image: mcp-server:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: HASURA_ADMIN_SECRET
          valueFrom:
            secretKeyRef:
              name: hasura-secret
              key: admin-secret
```

## Best Practices

1. **Use environment variables** for sensitive configuration
2. **Enable SSL** in production environments
3. **Implement connection pooling** for better performance
4. **Monitor database connections** and query performance
5. **Use migration-only mode** in production
6. **Implement proper logging** and monitoring
7. **Regular backup** of migration files and metadata 