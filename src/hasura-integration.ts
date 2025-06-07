#!/usr/bin/env node

/**
 * Hasura MCP Integration Example
 * 
 * This file demonstrates how to create an MCP server that integrates with Hasura
 * to automatically generate migrations and metadata from AI-driven requests.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs-extra";
import * as path from "path";
import * as yaml from "js-yaml";

// Types for Hasura integration
interface TableColumn {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  primary_key?: boolean;
  unique?: boolean;
}

interface CreateTableArgs {
  name: string;
  schema?: string;
  columns: TableColumn[];
}

class HasuraIntegrationServer {
  private server: Server;
  private hasuraProjectPath: string;

  constructor(hasuraProjectPath: string) {
    this.hasuraProjectPath = hasuraProjectPath;
    this.server = new Server(
      {
        name: "Hasura Integration MCP Server",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Resources - Expose Hasura project information
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "hasura://config",
            mimeType: "application/yaml",
            name: "Hasura Configuration",
            description: "Current Hasura project configuration"
          },
          {
            uri: "hasura://migrations",
            mimeType: "application/json",
            name: "Migration History",
            description: "List of all migrations in the project"
          },
          {
            uri: "hasura://metadata",
            mimeType: "application/json",
            name: "Metadata Structure",
            description: "Current metadata structure"
          }
        ]
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const url = new URL(request.params.uri);
      
      switch (url.pathname) {
        case "/config":
          return this.getHasuraConfig();
        case "/migrations":
          return this.getMigrationHistory();
        case "/metadata":
          return this.getMetadataStructure();
        default:
          throw new Error(`Unknown resource: ${url.pathname}`);
      }
    });

    // Tools - Hasura operations
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "create_hasura_table",
            description: "Create a new table with Hasura migration and metadata",
            inputSchema: {
              type: "object",
              properties: {
                name: { 
                  type: "string", 
                  description: "Table name" 
                },
                schema: { 
                  type: "string", 
                  description: "Database schema name", 
                  default: "public" 
                },
                columns: {
                  type: "array",
                  description: "Table columns definition",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Column name" },
                      type: { type: "string", description: "PostgreSQL data type" },
                      nullable: { type: "boolean", default: true },
                      default: { type: "string", description: "Default value" },
                      primary_key: { type: "boolean", default: false },
                      unique: { type: "boolean", default: false }
                    },
                    required: ["name", "type"]
                  }
                }
              },
              required: ["name", "columns"]
            }
          },
          {
            name: "add_hasura_relationship",
            description: "Add a relationship between tables in Hasura metadata",
            inputSchema: {
              type: "object",
              properties: {
                from_table: { type: "string", description: "Source table name" },
                from_schema: { type: "string", default: "public" },
                to_table: { type: "string", description: "Target table name" },
                to_schema: { type: "string", default: "public" },
                relationship_type: { 
                  type: "string", 
                  enum: ["object", "array"],
                  description: "Type of relationship (object for many-to-one, array for one-to-many)"
                },
                name: { type: "string", description: "Relationship name" },
                foreign_key_column: { type: "string", description: "Foreign key column name" }
              },
              required: ["from_table", "to_table", "relationship_type", "name", "foreign_key_column"]
            }
          },
          {
            name: "generate_hasura_permissions",
            description: "Generate role-based permissions for a table",
            inputSchema: {
              type: "object",
              properties: {
                table: { type: "string", description: "Table name" },
                schema: { type: "string", default: "public" },
                role: { type: "string", description: "User role" },
                operations: {
                  type: "array",
                  items: { type: "string", enum: ["select", "insert", "update", "delete"] },
                  description: "Allowed operations"
                },
                row_filter: { 
                  type: "object", 
                  description: "Row-level security filter" 
                },
                column_permissions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Allowed columns"
                }
              },
              required: ["table", "role", "operations"]
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "create_hasura_table":
          return this.createHasuraTable(request.params.arguments as unknown as CreateTableArgs);
        case "add_hasura_relationship":
          return this.addHasuraRelationship(request.params.arguments as any);
        case "generate_hasura_permissions":
          return this.generateHasuraPermissions(request.params.arguments as any);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });

    // Prompts - AI-assisted schema generation
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: "design_database_schema",
            description: "Design a complete database schema from requirements",
            arguments: [
              {
                name: "requirements",
                description: "Natural language description of the application requirements",
                required: true
              }
            ]
          },
          {
            name: "optimize_hasura_setup",
            description: "Analyze and suggest optimizations for current Hasura setup"
          }
        ]
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      switch (request.params.name) {
        case "design_database_schema":
          return this.designDatabaseSchemaPrompt(request.params.arguments?.requirements as string);
        case "optimize_hasura_setup":
          return this.optimizeHasuraSetupPrompt();
        default:
          throw new Error(`Unknown prompt: ${request.params.name}`);
      }
    });
  }

  // Resource handlers
  private async getHasuraConfig() {
    const configPath = path.join(this.hasuraProjectPath, "config.yaml");
    
    try {
      const config = await fs.readFile(configPath, "utf-8");
      return {
        contents: [{
          uri: "hasura://config",
          mimeType: "application/yaml",
          text: config
        }]
      };
    } catch (error) {
      throw new Error(`Failed to read Hasura config: ${error}`);
    }
  }

  private async getMigrationHistory() {
    const migrationsPath = path.join(this.hasuraProjectPath, "migrations", "default");
    
    try {
      const migrationDirs = await fs.readdir(migrationsPath);
      const migrations = [];

      for (const dir of migrationDirs) {
        const migrationPath = path.join(migrationsPath, dir);
        const stat = await fs.stat(migrationPath);
        
        if (stat.isDirectory()) {
          const upSqlPath = path.join(migrationPath, "up.sql");
          const downSqlPath = path.join(migrationPath, "down.sql");
          
          const upSql = await fs.readFile(upSqlPath, "utf-8").catch(() => "");
          const downSql = await fs.readFile(downSqlPath, "utf-8").catch(() => "");
          
          migrations.push({
            timestamp: dir.split("_")[0],
            name: dir.split("_").slice(1).join("_"),
            directory: dir,
            upSql,
            downSql
          });
        }
      }

      return {
        contents: [{
          uri: "hasura://migrations",
          mimeType: "application/json",
          text: JSON.stringify(migrations.sort((a, b) => a.timestamp.localeCompare(b.timestamp)), null, 2)
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: "hasura://migrations",
          mimeType: "application/json",
          text: JSON.stringify([], null, 2)
        }]
      };
    }
  }

  private async getMetadataStructure() {
    const metadataPath = path.join(this.hasuraProjectPath, "metadata");
    
    try {
      const structure = await this.readDirectoryStructure(metadataPath);
      return {
        contents: [{
          uri: "hasura://metadata",
          mimeType: "application/json",
          text: JSON.stringify(structure, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Failed to read metadata structure: ${error}`);
    }
  }

  // Tool handlers
  private async createHasuraTable(args: CreateTableArgs) {
    const schema = args.schema || "public";
    const timestamp = Date.now() * 1000; // Nanosecond timestamp for Hasura
    const migrationName = `create_table_${schema}_${args.name}`;
    const migrationDir = `${timestamp}_${migrationName}`;

    try {
      // Generate SQL for migration
      const upSql = this.generateCreateTableSQL(args.name, schema, args.columns);
      const downSql = `DROP TABLE IF EXISTS ${schema}.${args.name};`;

      // Create migration directory and files
      const migrationPath = path.join(
        this.hasuraProjectPath,
        "migrations",
        "default",
        migrationDir
      );

      await fs.ensureDir(migrationPath);
      await fs.writeFile(path.join(migrationPath, "up.sql"), upSql);
      await fs.writeFile(path.join(migrationPath, "down.sql"), downSql);

      // Create table metadata
      await this.createTableMetadata(args.name, schema);

      return {
        content: [{
          type: "text",
          text: `✅ Successfully created table ${schema}.${args.name}\n\n` +
                `📁 Migration: ${migrationDir}\n` +
                `📄 Files created:\n` +
                `  - migrations/default/${migrationDir}/up.sql\n` +
                `  - migrations/default/${migrationDir}/down.sql\n` +
                `  - metadata/databases/default/tables/${schema}_${args.name}.yaml\n\n` +
                `🔧 Next steps:\n` +
                `  1. Run: hasura migrate apply\n` +
                `  2. Run: hasura metadata apply\n` +
                `  3. Add relationships and permissions as needed`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to create table: ${error}`
        }],
        isError: true
      };
    }
  }

  private async addHasuraRelationship(args: {
    from_table: string;
    from_schema?: string;
    to_table: string;
    to_schema?: string;
    relationship_type: "object" | "array";
    name: string;
    foreign_key_column: string;
  }) {
    const fromSchema = args.from_schema || "public";
    const toSchema = args.to_schema || "public";

    try {
      await this.addRelationshipToMetadata(
        args.from_table,
        fromSchema,
        args.relationship_type,
        args.name,
        args.to_table,
        toSchema,
        args.foreign_key_column
      );

      return {
        content: [{
          type: "text",
          text: `✅ Successfully created ${args.relationship_type} relationship "${args.name}"\n\n` +
                `🔗 From: ${fromSchema}.${args.from_table}\n` +
                `🔗 To: ${toSchema}.${args.to_table}\n` +
                `🔑 Foreign Key: ${args.foreign_key_column}\n\n` +
                `🔧 Next step: Run 'hasura metadata apply' to apply changes`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to create relationship: ${error}`
        }],
        isError: true
      };
    }
  }

  private async generateHasuraPermissions(args: {
    table: string;
    schema?: string;
    role: string;
    operations: string[];
    row_filter?: any;
    column_permissions?: string[];
  }) {
    const schema = args.schema || "public";

    try {
      const permissions: any = {};

      args.operations.forEach(operation => {
        permissions[operation] = {
          columns: args.column_permissions || "*",
          filter: args.row_filter || {}
        };

        // Add operation-specific defaults
        if (operation === "insert") {
          permissions[operation].check = args.row_filter || {};
        }
      });

      await this.addPermissionsToMetadata(args.table, schema, args.role, permissions);

      return {
        content: [{
          type: "text",
          text: `✅ Successfully added permissions for role "${args.role}" on ${schema}.${args.table}\n\n` +
                `🔐 Operations: ${args.operations.join(", ")}\n` +
                `📋 Columns: ${args.column_permissions ? args.column_permissions.join(", ") : "All"}\n` +
                `🔍 Row Filter: ${JSON.stringify(args.row_filter || {}, null, 2)}\n\n` +
                `🔧 Next step: Run 'hasura metadata apply' to apply changes`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to add permissions: ${error}`
        }],
        isError: true
      };
    }
  }

  // Prompt handlers
  private async designDatabaseSchemaPrompt(requirements: string) {
    const currentMigrations = await this.getMigrationHistory();
    
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Design a complete database schema for the following requirements:\n\n"${requirements}"\n\n` +
                  `Current migration history:\n${currentMigrations.contents[0].text}\n\n` +
                  `Please provide a step-by-step plan using the available tools:\n` +
                  `1. create_hasura_table - for each table needed\n` +
                  `2. add_hasura_relationship - for relationships between tables\n` +
                  `3. generate_hasura_permissions - for role-based access control\n\n` +
                  `Consider:\n` +
                  `- Proper normalization\n` +
                  `- Primary and foreign keys\n` +
                  `- Appropriate data types\n` +
                  `- Security and permissions\n` +
                  `- Relationships between entities`
          }
        }
      ]
    };
  }

  private async optimizeHasuraSetupPrompt() {
    const config = await this.getHasuraConfig();
    const migrations = await this.getMigrationHistory();
    const metadata = await this.getMetadataStructure();

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Analyze the current Hasura setup and suggest optimizations:\n\n` +
                  `Configuration:\n${config.contents[0].text}\n\n` +
                  `Migrations:\n${migrations.contents[0].text}\n\n` +
                  `Metadata Structure:\n${metadata.contents[0].text}\n\n` +
                  `Please analyze and suggest improvements for:\n` +
                  `1. Database schema design\n` +
                  `2. Index recommendations\n` +
                  `3. Permission structure\n` +
                  `4. Relationship optimization\n` +
                  `5. Security enhancements\n` +
                  `6. Performance considerations`
          }
        }
      ]
    };
  }

  // Helper methods
  private generateCreateTableSQL(tableName: string, schema: string, columns: TableColumn[]): string {
    const columnDefs = columns.map(col => {
      let def = `    ${col.name} ${col.type}`;
      
      if (col.default) {
        def += ` DEFAULT ${col.default}`;
      }
      
      if (!col.nullable) {
        def += " NOT NULL";
      }
      
      return def;
    }).join(",\n");
    
    let sql = `-- Create table ${schema}.${tableName}\n`;
    sql += `CREATE TABLE ${schema}.${tableName} (\n${columnDefs}\n);\n\n`;
    
    // Add constraints
    const primaryKeys = columns.filter(col => col.primary_key);
    if (primaryKeys.length > 0) {
      const pkColumns = primaryKeys.map(col => col.name).join(", ");
      sql += `-- Add primary key constraint\n`;
      sql += `ALTER TABLE ONLY ${schema}.${tableName}\n    ADD CONSTRAINT ${tableName}_pkey PRIMARY KEY (${pkColumns});\n\n`;
    }
    
    const uniqueColumns = columns.filter(col => col.unique);
    uniqueColumns.forEach(col => {
      sql += `-- Add unique constraint for ${col.name}\n`;
      sql += `ALTER TABLE ONLY ${schema}.${tableName}\n    ADD CONSTRAINT ${tableName}_${col.name}_key UNIQUE (${col.name});\n\n`;
    });
    
    return sql;
  }

  private async createTableMetadata(tableName: string, schema: string) {
    const tableMetadata = {
      table: {
        name: tableName,
        schema: schema
      },
      object_relationships: [],
      array_relationships: [],
      insert_permissions: [],
      select_permissions: [],
      update_permissions: [],
      delete_permissions: []
    };
    
    const metadataPath = path.join(
      this.hasuraProjectPath,
      "metadata",
      "databases",
      "default",
      "tables"
    );
    
    await fs.ensureDir(metadataPath);
    
    // Write table metadata file
    const tableFile = `${schema}_${tableName}.yaml`;
    await fs.writeFile(
      path.join(metadataPath, tableFile),
      yaml.dump(tableMetadata, { indent: 2 })
    );
    
    // Update tables.yaml
    await this.updateTablesYaml(tableFile);
  }

  private async updateTablesYaml(tableFile: string) {
    const tablesYamlPath = path.join(
      this.hasuraProjectPath,
      "metadata",
      "databases",
      "default",
      "tables",
      "tables.yaml"
    );
    
    let tables: string[] = [];
    
    try {
      const content = await fs.readFile(tablesYamlPath, "utf-8");
      tables = yaml.load(content) as string[] || [];
    } catch (error) {
      // File doesn't exist, start with empty array
    }
    
    const includeStatement = `!include ${tableFile}`;
    if (!tables.includes(includeStatement)) {
      tables.push(includeStatement);
      await fs.writeFile(tablesYamlPath, yaml.dump(tables, { indent: 2 }));
    }
  }

  private async addRelationshipToMetadata(
    fromTable: string,
    fromSchema: string,
    relationshipType: "object" | "array",
    name: string,
    toTable: string,
    toSchema: string,
    foreignKeyColumn: string
  ) {
    const metadataPath = path.join(
      this.hasuraProjectPath,
      "metadata",
      "databases",
      "default",
      "tables",
      `${fromSchema}_${fromTable}.yaml`
    );
    
    const content = await fs.readFile(metadataPath, "utf-8");
    const metadata = yaml.load(content) as any;
    
    const relationship = {
      name,
      using: {
        foreign_key_constraint_on: relationshipType === "object" 
          ? foreignKeyColumn
          : {
              column: foreignKeyColumn,
              table: {
                name: toTable,
                schema: toSchema
              }
            }
      }
    };
    
    if (relationshipType === "object") {
      metadata.object_relationships = metadata.object_relationships || [];
      metadata.object_relationships.push(relationship);
    } else {
      metadata.array_relationships = metadata.array_relationships || [];
      metadata.array_relationships.push(relationship);
    }
    
    await fs.writeFile(metadataPath, yaml.dump(metadata, { indent: 2 }));
  }

  private async addPermissionsToMetadata(
    tableName: string,
    schema: string,
    role: string,
    permissions: any
  ) {
    const metadataPath = path.join(
      this.hasuraProjectPath,
      "metadata",
      "databases",
      "default",
      "tables",
      `${schema}_${tableName}.yaml`
    );
    
    const content = await fs.readFile(metadataPath, "utf-8");
    const metadata = yaml.load(content) as any;
    
    // Add permissions for each operation
    Object.entries(permissions).forEach(([operation, permission]) => {
      const permissionKey = `${operation}_permissions`;
      metadata[permissionKey] = metadata[permissionKey] || [];
      
      // Remove existing permission for this role
      metadata[permissionKey] = metadata[permissionKey].filter(
        (p: any) => p.role !== role
      );
      
      // Add new permission
      metadata[permissionKey].push({
        role,
        permission
      });
    });
    
    await fs.writeFile(metadataPath, yaml.dump(metadata, { indent: 2 }));
  }

  private async readDirectoryStructure(dirPath: string): Promise<any> {
    const structure: any = {};
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          structure[item] = await this.readDirectoryStructure(itemPath);
        } else {
          // For YAML files, include their content
          if (item.endsWith('.yaml') || item.endsWith('.yml')) {
            try {
              const content = await fs.readFile(itemPath, 'utf-8');
              structure[item] = yaml.load(content);
            } catch (error) {
              structure[item] = `Error reading file: ${error}`;
            }
          } else {
            structure[item] = `File (${stat.size} bytes)`;
          }
        }
      }
    } catch (error) {
      return `Error reading directory: ${error}`;
    }
    
    return structure;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Main execution
async function main() {
  const hasuraProjectPath = process.env.HASURA_PROJECT_PATH || process.cwd();
  
  // Verify this is a Hasura project
  const configPath = path.join(hasuraProjectPath, "config.yaml");
  if (!await fs.pathExists(configPath)) {
    process.stderr.write("❌ Error: No Hasura project found at the specified path.\n");
    process.stderr.write("Please ensure you're running from a Hasura project directory or set HASURA_PROJECT_PATH environment variable.\n");
    process.stderr.write(`Current path: ${hasuraProjectPath}\n`);
    process.exit(1);
  }
  
  process.stderr.write("🚀 Starting Hasura MCP Integration Server...\n");
  process.stderr.write(`📁 Hasura Project Path: ${hasuraProjectPath}\n`);
  
  const server = new HasuraIntegrationServer(hasuraProjectPath);
  await server.start();
}

main().catch((error) => {
  process.stderr.write(`💥 Server error: ${error}\n`);
  process.exit(1);
}); 