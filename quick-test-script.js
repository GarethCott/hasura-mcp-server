#!/usr/bin/env node

/**
 * Quick Test Script for Hasura PostgreSQL MCP Server
 * 
 * This script demonstrates how to test your MCP server tools programmatically.
 * You can run individual tests or the complete test suite.
 * 
 * Usage:
 *   node quick-test-script.js --test=connection
 *   node quick-test-script.js --test=create-table
 *   node quick-test-script.js --test=all
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configurations
const tests = {
  connection: {
    name: 'Test Database Connection',
    tool: 'test_connection',
    arguments: {}
  },
  
  listTables: {
    name: 'List Existing Tables',
    tool: 'list_tables',
    arguments: {
      schema: 'public'
    }
  },
  
  createUsersTable: {
    name: 'Create Users Table',
    tool: 'create_table',
    arguments: {
      name: 'users',
      schema: 'public',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          nullable: false,
          primaryKey: true,
          default: 'gen_random_uuid()'
        },
        {
          name: 'email',
          type: 'text',
          nullable: false,
          unique: true
        },
        {
          name: 'name',
          type: 'text',
          nullable: true
        },
        {
          name: 'created_at',
          type: 'timestamp with time zone',
          nullable: false,
          default: 'now()'
        }
      ]
    }
  },
  
  createPostsTable: {
    name: 'Create Posts Table',
    tool: 'create_table',
    arguments: {
      name: 'posts',
      schema: 'public',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          nullable: false,
          primaryKey: true,
          default: 'gen_random_uuid()'
        },
        {
          name: 'title',
          type: 'text',
          nullable: false
        },
        {
          name: 'content',
          type: 'text',
          nullable: true
        },
        {
          name: 'user_id',
          type: 'uuid',
          nullable: false
        },
        {
          name: 'published',
          type: 'boolean',
          nullable: false,
          default: 'false'
        },
        {
          name: 'created_at',
          type: 'timestamp with time zone',
          nullable: false,
          default: 'now()'
        }
      ]
    }
  },
  
  addColumn: {
    name: 'Add Avatar URL Column to Users',
    tool: 'add_column',
    arguments: {
      tableName: 'users',
      schema: 'public',
      column: {
        name: 'avatar_url',
        type: 'text',
        nullable: true
      }
    }
  },
  
  createIndex: {
    name: 'Create Index on Posts User ID',
    tool: 'create_index',
    arguments: {
      tableName: 'posts',
      indexName: 'idx_posts_user_id',
      schema: 'public',
      columns: ['user_id'],
      createMigration: true
    }
  },
  
  createRelationship: {
    name: 'Create Posts-Users Relationship',
    tool: 'create_relationship',
    arguments: {
      fromTable: 'posts',
      fromSchema: 'public',
      toTable: 'users',
      toSchema: 'public',
      relationshipType: 'object',
      name: 'author',
      foreignKeyColumn: 'user_id',
      referenceColumn: 'id'
    }
  },
  
  insertData: {
    name: 'Insert Sample Users',
    tool: 'insert_data',
    arguments: {
      tableName: 'users',
      schema: 'public',
      data: [
        {
          email: 'john@example.com',
          name: 'John Doe'
        },
        {
          email: 'jane@example.com',
          name: 'Jane Smith'
        }
      ]
    }
  },
  
  setPermissions: {
    name: 'Set User Permissions',
    tool: 'create_permission',
    arguments: {
      table: 'users',
      schema: 'public',
      role: 'user',
      permissions: {
        select: {
          columns: ['id', 'email', 'name', 'avatar_url'],
          filter: {
            id: {
              _eq: 'X-Hasura-User-Id'
            }
          }
        },
        update: {
          columns: ['name', 'avatar_url'],
          filter: {
            id: {
              _eq: 'X-Hasura-User-Id'
            }
          }
        }
      }
    }
  },
  
  analyzeSchema: {
    name: 'Analyze Database Schema',
    tool: 'analyze_schema',
    arguments: {
      schema: 'public'
    }
  },
  
  applyMigrations: {
    name: 'Apply All Migrations',
    tool: 'apply_migrations',
    arguments: {}
  }
};

// Test sequences
const testSequences = {
  basic: ['connection', 'listTables'],
  tables: ['createUsersTable', 'createPostsTable', 'addColumn'],
  relationships: ['createIndex', 'createRelationship'],
  data: ['insertData', 'setPermissions'],
  analysis: ['analyzeSchema'],
  migration: ['applyMigrations'],
  all: [
    'connection',
    'listTables', 
    'createUsersTable',
    'createPostsTable',
    'addColumn',
    'createIndex',
    'createRelationship',
    'insertData',
    'setPermissions',
    'analyzeSchema',
    'applyMigrations'
  ]
};

class MCPTester {
  constructor(mcpServerPath = './build/index.js') {
    this.mcpServerPath = mcpServerPath;
    this.results = [];
  }

  async runTest(testKey) {
    const test = tests[testKey];
    if (!test) {
      throw new Error(`Test '${testKey}' not found`);
    }

    console.log(`\n🧪 Running: ${test.name}`);
    console.log(`📋 Tool: ${test.tool}`);
    console.log(`📝 Arguments:`, JSON.stringify(test.arguments, null, 2));

    try {
      const result = await this.callMCPTool(test.tool, test.arguments);
      console.log(`✅ Success:`, result);
      this.results.push({ test: testKey, success: true, result });
      return result;
    } catch (error) {
      console.log(`❌ Error:`, error.message);
      this.results.push({ test: testKey, success: false, error: error.message });
      throw error;
    }
  }

  async runTestSequence(sequenceName) {
    const sequence = testSequences[sequenceName];
    if (!sequence) {
      throw new Error(`Test sequence '${sequenceName}' not found`);
    }

    console.log(`\n🚀 Running test sequence: ${sequenceName}`);
    console.log(`📋 Tests: ${sequence.join(', ')}`);

    for (const testKey of sequence) {
      try {
        await this.runTest(testKey);
        // Add a small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`⚠️  Test '${testKey}' failed, continuing with next test...`);
      }
    }

    this.printSummary();
  }

  async callMCPTool(toolName, args) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.mcpServerPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`MCP server exited with code ${code}. Stderr: ${stderr}`));
          return;
        }

        try {
          // Parse the JSON-RPC response
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const response = JSON.parse(lastLine);
          
          if (response.error) {
            reject(new Error(response.error.message || 'Unknown error'));
          } else {
            resolve(response.result);
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError.message}. Output: ${stdout}`));
        }
      });

      // Send the JSON-RPC request
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      child.stdin.write(JSON.stringify(request) + '\n');
      child.stdin.end();
    });
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.results.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.test}: ${r.error}`));
    }
    
    console.log('\n🎯 Success Rate:', `${Math.round((successful / this.results.length) * 100)}%`);
  }

  listAvailableTests() {
    console.log('\n📋 Available Tests:');
    console.log('==================');
    Object.keys(tests).forEach(key => {
      console.log(`  ${key}: ${tests[key].name}`);
    });

    console.log('\n📋 Available Test Sequences:');
    console.log('============================');
    Object.keys(testSequences).forEach(key => {
      console.log(`  ${key}: [${testSequences[key].join(', ')}]`);
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const testArg = args.find(arg => arg.startsWith('--test='));
  const helpArg = args.includes('--help') || args.includes('-h');

  const tester = new MCPTester();

  if (helpArg) {
    console.log(`
🧪 Hasura PostgreSQL MCP Server Test Script

Usage:
  node quick-test-script.js --test=<test-name>
  node quick-test-script.js --test=<sequence-name>
  node quick-test-script.js --help

Examples:
  node quick-test-script.js --test=connection
  node quick-test-script.js --test=createUsersTable
  node quick-test-script.js --test=basic
  node quick-test-script.js --test=all

Options:
  --help, -h    Show this help message
`);
    tester.listAvailableTests();
    return;
  }

  if (!testArg) {
    console.log('❌ Please specify a test to run with --test=<test-name>');
    console.log('Use --help to see available tests');
    return;
  }

  const testName = testArg.split('=')[1];

  try {
    if (testSequences[testName]) {
      await tester.runTestSequence(testName);
    } else if (tests[testName]) {
      await tester.runTest(testName);
      tester.printSummary();
    } else {
      console.log(`❌ Test '${testName}' not found`);
      tester.listAvailableTests();
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MCPTester, tests, testSequences }; 