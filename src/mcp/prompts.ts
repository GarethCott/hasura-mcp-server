import { Prompt } from '@modelcontextprotocol/sdk/types.js';
import { hasuraService } from '../services/index.js';
import { logger } from '../utils/index.js';

export class PromptManager {
  private static instance: PromptManager;

  private constructor() {}

  public static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  public getAvailablePrompts(): Prompt[] {
    return [
      {
        name: 'generate_schema',
        description: 'Generate a database schema from a natural language description',
        arguments: [
          {
            name: 'description',
            description: 'Natural language description of the desired schema',
            required: true,
          },
          {
            name: 'domain',
            description: 'Application domain (e.g., e-commerce, blog, social media)',
            required: false,
          },
        ],
      },
      {
        name: 'optimize_schema',
        description: 'Analyze and suggest optimizations for the current schema',
        arguments: [
          {
            name: 'focus',
            description: 'Focus area for optimization (performance, relationships, permissions)',
            required: false,
          },
        ],
      },
      {
        name: 'generate_api_schema',
        description: 'Generate a schema suitable for a specific API pattern',
        arguments: [
          {
            name: 'api_type',
            description: 'Type of API (REST, GraphQL, real-time)',
            required: true,
          },
          {
            name: 'use_case',
            description: 'Primary use case for the API',
            required: true,
          },
        ],
      },
      {
        name: 'migration_strategy',
        description: 'Generate a migration strategy for schema changes',
        arguments: [
          {
            name: 'current_schema',
            description: 'Description of current schema state',
            required: true,
          },
          {
            name: 'target_schema',
            description: 'Description of desired schema state',
            required: true,
          },
        ],
      },
    ];
  }

  public async getPromptContent(name: string, args: Record<string, string>): Promise<string> {
    logger.info(`Generating prompt: ${name}`, { args });

    switch (name) {
      case 'generate_schema':
        return await this.generateSchemaPrompt(args);
      
      case 'optimize_schema':
        return await this.optimizeSchemaPrompt(args);
      
      case 'generate_api_schema':
        return await this.generateApiSchemaPrompt(args);
      
      case 'migration_strategy':
        return await this.migrationStrategyPrompt(args);
      
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  private async generateSchemaPrompt(args: Record<string, string>): Promise<string> {
    const { description, domain } = args;
    
    const currentMetadata = await hasuraService.getMetadata();
    const existingTables = currentMetadata.sources[0]?.tables.map(t => t.table.name) || [];

    return `# Database Schema Generation

## Task
Generate a comprehensive database schema based on the following description:

**Description:** ${description}
${domain ? `**Domain:** ${domain}` : ''}

## Current State
${existingTables.length > 0 
  ? `Existing tables: ${existingTables.join(', ')}`
  : 'No existing tables in the database'
}

## Requirements
1. Design normalized tables with appropriate relationships
2. Include proper data types for all columns
3. Define primary keys and foreign keys
4. Consider indexing for performance
5. Include basic permissions for common roles (user, admin)
6. Ensure data integrity with constraints

## Output Format
Please provide:
1. **Tables**: List each table with columns, data types, and constraints
2. **Relationships**: Define foreign key relationships between tables
3. **Permissions**: Suggest role-based permissions for each table
4. **Migrations**: SQL statements to create the schema

## Best Practices
- Use consistent naming conventions (snake_case)
- Include created_at and updated_at timestamps where appropriate
- Consider soft deletes with deleted_at columns
- Use UUIDs for primary keys when appropriate
- Include proper indexes for query performance

## Example Response Format
\`\`\`
Tables:
- users: id (uuid, primary), email (text, unique), name (text), created_at (timestamp)
- posts: id (uuid, primary), user_id (uuid, foreign key), title (text), content (text), created_at (timestamp)

Relationships:
- posts.user_id -> users.id (many-to-one)

Permissions:
- users table: admin (all), user (select own records)
- posts table: admin (all), user (select all, insert/update own)
\`\`\``;
  }

  private async optimizeSchemaPrompt(args: Record<string, string>): Promise<string> {
    const { focus } = args;
    
    const metadata = await hasuraService.getMetadata();
    const migrations = await hasuraService.getMigrations();
    
    const tables = metadata.sources[0]?.tables || [];
    const tableInfo = tables.map(table => ({
      name: table.table.name,
      schema: table.table.schema,
      relationships: (table.object_relationships?.length || 0) + (table.array_relationships?.length || 0),
      permissions: (table.select_permissions?.length || 0) + 
                  (table.insert_permissions?.length || 0) + 
                  (table.update_permissions?.length || 0) + 
                  (table.delete_permissions?.length || 0),
    }));

    return `# Schema Optimization Analysis

## Current Schema Overview
**Total Tables:** ${tables.length}
**Total Migrations:** ${migrations.length}
${focus ? `**Focus Area:** ${focus}` : ''}

## Table Analysis
${tableInfo.map(table => 
  `- **${table.name}** (${table.schema}): ${table.relationships} relationships, ${table.permissions} permissions`,
).join('\n')}

## Optimization Areas to Consider

### Performance
- Analyze query patterns and add appropriate indexes
- Consider partitioning for large tables
- Review and optimize foreign key constraints
- Evaluate need for materialized views

### Relationships
- Ensure all logical relationships are properly defined
- Check for missing foreign key constraints
- Consider adding computed fields for common queries
- Review relationship naming for consistency

### Permissions
- Implement role-based access control (RBAC)
- Add row-level security where appropriate
- Review and minimize permission scope
- Consider audit trails for sensitive operations

### Data Integrity
- Add check constraints for data validation
- Implement proper null constraints
- Consider unique constraints for business rules
- Add triggers for complex business logic

## Analysis Request
Please analyze the current schema and provide specific recommendations for:

1. **Missing Indexes**: Suggest indexes based on likely query patterns
2. **Relationship Gaps**: Identify missing relationships between tables
3. **Permission Issues**: Highlight tables without proper permissions
4. **Performance Concerns**: Point out potential bottlenecks
5. **Best Practice Violations**: Note any schema design issues

## Output Format
Provide actionable recommendations with:
- Specific SQL statements for improvements
- Reasoning for each suggestion
- Priority level (High/Medium/Low)
- Expected impact on performance/security`;
  }

  private async generateApiSchemaPrompt(args: Record<string, string>): Promise<string> {
    const { api_type, use_case } = args;
    
    return `# API-Optimized Schema Generation

## API Requirements
**API Type:** ${api_type}
**Use Case:** ${use_case}

## Schema Design Considerations

### For GraphQL APIs
- Design tables with GraphQL queries in mind
- Optimize for nested relationship queries
- Consider connection patterns for pagination
- Plan for real-time subscriptions if needed

### For REST APIs
- Design resources that map well to REST endpoints
- Consider embedding vs. linking strategies
- Plan for efficient filtering and sorting
- Design for stateless operations

### For Real-time APIs
- Include timestamp fields for change tracking
- Consider event sourcing patterns
- Plan for conflict resolution in concurrent updates
- Design for efficient subscription filtering

## Common API Schema Patterns

### Authentication & Authorization
- User management with roles and permissions
- API key or token-based authentication
- Session management if needed

### Data Relationships
- Efficient foreign key relationships
- Consider denormalization for read-heavy APIs
- Plan for eager vs. lazy loading

### Audit & Monitoring
- Request logging and analytics
- Rate limiting data structures
- Error tracking and monitoring

## Task
Design a database schema optimized for a ${api_type} API with the following use case: ${use_case}

## Requirements
1. **Core Entities**: Define the main business entities
2. **API Endpoints**: Consider how tables map to API endpoints
3. **Query Patterns**: Optimize for expected query patterns
4. **Performance**: Include appropriate indexes and constraints
5. **Security**: Implement proper permissions and access control
6. **Scalability**: Consider future growth and scaling needs

## Output Format
Please provide:
1. **Schema Design**: Tables, columns, and relationships
2. **API Mapping**: How tables relate to API endpoints
3. **Query Optimization**: Suggested indexes and query patterns
4. **Security Model**: Permissions and access control strategy
5. **Migration Plan**: SQL to implement the schema`;
  }

  private async migrationStrategyPrompt(args: Record<string, string>): Promise<string> {
    const { current_schema, target_schema } = args;
    
    const migrations = await hasuraService.getMigrations();
    const currentMetadata = await hasuraService.getMetadata();
    
    return `# Migration Strategy Planning

## Current State
**Existing Migrations:** ${migrations.length}
**Current Tables:** ${currentMetadata.sources[0]?.tables.length || 0}

## Migration Context
**Current Schema:** ${current_schema}
**Target Schema:** ${target_schema}

## Migration Strategy Considerations

### Safety First
- Always create reversible migrations (up/down SQL)
- Test migrations on staging environment first
- Consider data migration impact on production
- Plan for rollback scenarios

### Data Preservation
- Identify data that needs to be preserved
- Plan for data transformation if needed
- Consider temporary tables for complex migrations
- Backup critical data before major changes

### Downtime Minimization
- Use online schema changes where possible
- Consider blue-green deployment strategies
- Plan migrations during low-traffic periods
- Use feature flags for application changes

### Performance Impact
- Analyze impact on existing queries
- Consider index rebuilding time
- Plan for lock duration on large tables
- Monitor performance during migration

## Migration Types

### Additive Changes (Low Risk)
- Adding new tables
- Adding new columns (nullable)
- Adding new indexes
- Adding new permissions

### Modification Changes (Medium Risk)
- Changing column types
- Adding constraints to existing columns
- Modifying relationships
- Changing permissions

### Destructive Changes (High Risk)
- Dropping tables or columns
- Changing primary keys
- Removing constraints
- Data type changes with potential data loss

## Task
Create a detailed migration strategy to transform the current schema to the target schema.

## Required Output
1. **Migration Steps**: Ordered list of migration operations
2. **Risk Assessment**: Risk level for each step
3. **Rollback Plan**: How to reverse each migration
4. **Data Migration**: Scripts for data transformation
5. **Testing Strategy**: How to validate each step
6. **Timeline**: Estimated duration for each migration

## Migration Template
\`\`\`
Step 1: [Description]
Risk: [Low/Medium/High]
SQL: [Migration SQL]
Rollback: [Rollback SQL]
Validation: [How to test]
Duration: [Estimated time]
\`\`\``;
  }
}

export const promptManager = PromptManager.getInstance(); 