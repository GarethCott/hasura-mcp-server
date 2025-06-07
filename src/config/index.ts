import { HasuraConfig } from '../types/index.js';

export class Config {
  private static instance: Config;
  
  public readonly hasura: HasuraConfig;
  public readonly server: {
    name: string;
    version: string;
  };

  private constructor() {
    this.hasura = {
      endpoint: process.env.HASURA_ENDPOINT || 'http://localhost:8080',
      adminSecret: process.env.HASURA_ADMIN_SECRET,
      projectPath: process.env.HASURA_PROJECT_PATH || process.cwd()
    };

    this.server = {
      name: 'Hasura MCP Server',
      version: '1.0.0'
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
      throw new Error('HASURA_ENDPOINT is required');
    }

    if (!this.hasura.projectPath) {
      throw new Error('HASURA_PROJECT_PATH is required');
    }
  }
}

export const config = Config.getInstance(); 