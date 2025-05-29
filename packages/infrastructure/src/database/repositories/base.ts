import { DatabaseManager } from "../manager";

export abstract class BaseRepository {
  constructor(protected db: DatabaseManager) {}

  /**
   * Execute a query with error handling
   */
  protected async executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    try {
      return await this.db.query<T>(query, params);
    } catch (error) {
      console.error(`Database query failed: ${query}`, error);
      throw error;
    }
  }

  /**
   * Execute a query and return a single result
   */
  protected async executeQuerySingle<T = any>(query: string, params?: any[]): Promise<T | null> {
    const results = await this.executeQuery<T>(query, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Convert database row to typed object with date parsing
   */
  protected parseRow<T>(row: any): T {
    const parsed = { ...row };
    
    // Convert timestamp strings to Date objects
    for (const key in parsed) {
      if (key.endsWith('_at') && typeof parsed[key] === 'string') {
        parsed[key] = new Date(parsed[key]);
      }
    }
    
    return parsed as T;
  }

  /**
   * Convert array of database rows to typed objects
   */
  protected parseRows<T>(rows: any[]): T[] {
    return rows.map(row => this.parseRow<T>(row));
  }
}

