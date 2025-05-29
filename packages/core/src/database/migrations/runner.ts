import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Migration runner for VoltAgent database
 * Phase 1.3: Setup Database Event Storage System
 */

export interface MigrationConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export class MigrationRunner {
  private pool: Pool;
  private migrationsPath: string;

  constructor(config: MigrationConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    });
    
    this.migrationsPath = __dirname;
  }

  /**
   * Initialize the migrations table
   */
  private async initializeMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await this.pool.query(query);
  }

  /**
   * Check if a migration has been executed
   */
  private async isMigrationExecuted(migrationName: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM schema_migrations WHERE migration_name = $1',
      [migrationName]
    );
    
    return result.rows.length > 0;
  }

  /**
   * Mark a migration as executed
   */
  private async markMigrationExecuted(migrationName: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
      [migrationName]
    );
  }

  /**
   * Execute a single migration file
   */
  private async executeMigration(migrationFile: string): Promise<void> {
    const migrationPath = join(this.migrationsPath, migrationFile);
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Execute the migration in a transaction
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute the migration SQL
      await client.query(migrationSQL);
      
      // Mark as executed
      await client.query(
        'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
        [migrationFile]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${migrationFile} executed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration ${migrationFile} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('🚀 Starting database migrations...');
      
      // Initialize migrations table
      await this.initializeMigrationsTable();
      
      // Define migration files in order
      const migrationFiles = [
        '001_initial_schema.sql',
        '002_indexes.sql',
        '003_constraints.sql'
      ];
      
      for (const migrationFile of migrationFiles) {
        const isExecuted = await this.isMigrationExecuted(migrationFile);
        
        if (!isExecuted) {
          await this.executeMigration(migrationFile);
        } else {
          console.log(`⏭️  Migration ${migrationFile} already executed, skipping`);
        }
      }
      
      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ Database connection successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<Array<{ name: string; executed_at: string }>> {
    const result = await this.pool.query(
      'SELECT migration_name as name, executed_at FROM schema_migrations ORDER BY executed_at'
    );
    
    return result.rows;
  }
}

/**
 * CLI runner for migrations
 */
export async function runMigrationsFromEnv(): Promise<void> {
  const config: MigrationConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'voltagent',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true'
  };

  const runner = new MigrationRunner(config);
  
  try {
    await runner.testConnection();
    await runner.runMigrations();
  } finally {
    await runner.close();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrationsFromEnv().catch(console.error);
}

