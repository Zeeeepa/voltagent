import * as fs from "fs/promises";
import * as path from "path";

/**
 * Utility functions for file operations
 */
export class FileUtils {
  /**
   * Recursively find all files in a directory
   */
  static async findFiles(
    rootPath: string,
    extensions: string[] = [],
    excludePatterns: string[] = []
  ): Promise<string[]> {
    const files: string[] = [];
    
    async function traverse(currentPath: string): Promise<void> {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const relativePath = path.relative(rootPath, fullPath);
          
          // Skip excluded patterns
          if (excludePatterns.some(pattern => this.matchesPattern(relativePath, pattern))) {
            continue;
          }
          
          if (entry.isDirectory()) {
            await traverse(fullPath);
          } else if (entry.isFile()) {
            // Check if file has desired extension
            if (extensions.length === 0 || extensions.some(ext => fullPath.endsWith(ext))) {
              files.push(relativePath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to read directory ${currentPath}:`, error);
      }
    }
    
    await traverse(rootPath);
    return files;
  }

  /**
   * Check if a file path matches a glob pattern
   */
  static matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\\/g, "\\\\")
      .replace(/\\./g, "\\\\.")
      .replace(/\\*/g, ".*")
      .replace(/\\?/g, ".")
      .replace(/\\[([^\\]]*)\\]/g, "[$1]");
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * Get file extension from file path
   */
  static getExtension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Check if a file exists
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file content safely
   */
  static async readFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get file stats
   */
  static async getStats(filePath: string): Promise<fs.Stats | null> {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      console.warn(`Failed to get stats for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if path is a directory
   */
  static async isDirectory(filePath: string): Promise<boolean> {
    const stats = await this.getStats(filePath);
    return stats?.isDirectory() || false;
  }

  /**
   * Check if path is a file
   */
  static async isFile(filePath: string): Promise<boolean> {
    const stats = await this.getStats(filePath);
    return stats?.isFile() || false;
  }

  /**
   * Normalize file path for cross-platform compatibility
   */
  static normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, "/");
  }

  /**
   * Get relative path from base to target
   */
  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to).replace(/\\/g, "/");
  }

  /**
   * Join paths in a cross-platform way
   */
  static joinPath(...paths: string[]): string {
    return path.join(...paths).replace(/\\/g, "/");
  }

  /**
   * Get directory name from file path
   */
  static getDirname(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Get base name from file path
   */
  static getBasename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }
}

