import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

export class FileSystemUtils {
  public static async readFile(filePath: string): Promise<string> {
    try {
      logger.debug(`Reading file: ${filePath}`);
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`, error);
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  public static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      logger.debug(`Writing file: ${filePath}`);
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      logger.error(`Failed to write file: ${filePath}`, error);
      throw new Error(`Failed to write file: ${filePath}`);
    }
  }

  public static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      logger.debug(`Ensuring directory exists: ${dirPath}`);
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logger.error(`Failed to create directory: ${dirPath}`, error);
      throw new Error(`Failed to create directory: ${dirPath}`);
    }
  }

  public static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  public static async listDirectory(dirPath: string): Promise<string[]> {
    try {
      logger.debug(`Listing directory: ${dirPath}`);
      return await fs.readdir(dirPath);
    } catch (error) {
      logger.error(`Failed to list directory: ${dirPath}`, error);
      throw new Error(`Failed to list directory: ${dirPath}`);
    }
  }

  public static async readJsonFile<T>(filePath: string): Promise<T> {
    try {
      const content = await this.readFile(filePath);
      return JSON.parse(content) as T;
    } catch (error) {
      logger.error(`Failed to read JSON file: ${filePath}`, error);
      throw new Error(`Failed to read JSON file: ${filePath}`);
    }
  }

  public static async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    try {
      const content = JSON.stringify(data, null, 2);
      await this.writeFile(filePath, content);
    } catch (error) {
      logger.error(`Failed to write JSON file: ${filePath}`, error);
      throw new Error(`Failed to write JSON file: ${filePath}`);
    }
  }

  public static generateTimestamp(): string {
    return new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  }

  public static joinPath(...segments: string[]): string {
    return path.join(...segments);
  }

  public static resolvePath(filePath: string): string {
    return path.resolve(filePath);
  }
} 