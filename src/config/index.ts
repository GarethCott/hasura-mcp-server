// Load environment variables from .env file
import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { HasuraConfig, PostgresConfig } from '../types/index.js';

export class Config {
  private static instance: Config;
  
  public readonly hasura: HasuraConfig;
  public readonly postgres: PostgresConfig;
  public readonly server: {
    name: string;
    version: string;
  };
  public readonly logging: {
    level: string;
  };

  private constructor() {
    this.hasura = {
      endpoint: process.env.HASURA_ENDPOINT!,
      adminSecret: process.env.HASURA_ADMIN_SECRET,
      projectPath: process.env.HASURA_PROJECT_PATH!,
    };

    this.postgres = {
      connectionString: process.env.POSTGRES_CONNECTION_STRING!,
      poolSize: parseInt(process.env.POSTGRES_POOL_SIZE || '10'),
      idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '60000'),
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '30000'),
    };

    this.server = {
      name: 'Hasura MCP Server',
      version: '1.0.0',
    };

    this.logging = {
      level: process.env.LOG_LEVEL || 'info',
    };
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public validateConfig(): void {
    if (!this.hasura.endpoint) {
      throw new Error('HASURA_ENDPOINT environment variable is required');
    }

    if (!this.hasura.projectPath) {
      throw new Error('HASURA_PROJECT_PATH environment variable is required');
    }

    if (!this.postgres.connectionString) {
      throw new Error('POSTGRES_CONNECTION_STRING environment variable is required');
    }
  }
}

export const config = Config.getInstance(); 