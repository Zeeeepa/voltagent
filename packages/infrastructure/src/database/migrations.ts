import { Pool } from "pg";
import { SCHEMA_SQL } from "./sql";

export class MigrationManager {
  constructor(private pool: Pool) {}

  /**
   * Run all database migrations
   */
  async runMigrations(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Check if initial schema migration has been run
      const result = await client.query(
        "SELECT * FROM migrations WHERE name = $1",
        ["initial_schema"]
      );

      if (result.rows.length === 0) {
        console.log("Running initial schema migration...");
        
        // Execute the schema SQL
        await client.query(SCHEMA_SQL);
        
        // Record the migration
        await client.query(
          "INSERT INTO migrations (name) VALUES ($1)",
          ["initial_schema"]
        );
        
        console.log("Initial schema migration completed");
      } else {
        console.log("Database schema is up to date");
      }
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<string[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        "SELECT name FROM migrations ORDER BY executed_at"
      );
      return result.rows.map(row => row.name);
    } finally {
      client.release();
    }
  }

  /**
   * Reset database (for testing purposes)
   */
  async resetDatabase(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Drop all tables in reverse dependency order
      await client.query("DROP TABLE IF EXISTS codegen_prompts CASCADE");
      await client.query("DROP TABLE IF EXISTS workflow_executions CASCADE");
      await client.query("DROP TABLE IF EXISTS tasks CASCADE");
      await client.query("DROP TABLE IF EXISTS analysis_results CASCADE");
      await client.query("DROP TABLE IF EXISTS prs CASCADE");
      await client.query("DROP TABLE IF EXISTS projects CASCADE");
      await client.query("DROP TABLE IF EXISTS migrations CASCADE");
      
      // Drop the update function
      await client.query("DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE");
      
      console.log("Database reset completed");
    } catch (error) {
      console.error("Database reset failed:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

