/**
 * Database migration runner for event storage system
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { DatabaseConnectionPool } from '../config';

export interface Migration {
  version: string;
  description: string;
  sql: string;
  executed_at?: Date;
}

export class MigrationRunner {
  private db: DatabaseConnectionPool;
  private migrationsPath: string;

  constructor(db: DatabaseConnectionPool, migrationsPath?: string) {
    this.db = db;
    this.migrationsPath = migrationsPath || join(__dirname, '.');
  }

  /**
   * Initialize migration tracking table
   */
  async initializeMigrationTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS voltagent_migrations (
        version VARCHAR(255) PRIMARY KEY,
        description TEXT NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum VARCHAR(255)
      )
    `;

    try {
      await this.db.query(query);
      console.log('[MigrationRunner] Migration tracking table initialized');
    } catch (error) {
      console.error('[MigrationRunner] Failed to initialize migration table:', error);
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<Migration[]> {
    try {
      const result = await this.db.query(
        'SELECT version, description, executed_at FROM voltagent_migrations ORDER BY version'
      );
      return result.rows;
    } catch (error) {
      console.error('[MigrationRunner] Failed to get executed migrations:', error);
      return [];
    }
  }

  /**
   * Check if migration has been executed
   */
  async isMigrationExecuted(version: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT 1 FROM voltagent_migrations WHERE version = $1',
        [version]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('[MigrationRunner] Failed to check migration status:', error);
      return false;
    }
  }

  /**
   * Execute a single migration
   */
  async executeMigration(migration: Migration): Promise<void> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');

      // Execute the migration SQL
      await client.query(migration.sql);

      // Record the migration as executed
      await client.query(
        'INSERT INTO voltagent_migrations (version, description) VALUES ($1, $2)',
        [migration.version, migration.description]
      );

      await client.query('COMMIT');
      console.log(`[MigrationRunner] Executed migration ${migration.version}: ${migration.description}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[MigrationRunner] Failed to execute migration ${migration.version}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    await this.initializeMigrationTable();

    // Define available migrations
    const migrations: Migration[] = [
      {
        version: '001',
        description: 'Create event storage tables',
        sql: readFileSync(join(this.migrationsPath, '001_create_events_tables.sql'), 'utf8')
      }
    ];

    console.log('[MigrationRunner] Checking for pending migrations...');

    for (const migration of migrations) {
      const isExecuted = await this.isMigrationExecuted(migration.version);
      
      if (!isExecuted) {
        console.log(`[MigrationRunner] Running migration ${migration.version}...`);
        await this.executeMigration(migration);
      } else {
        console.log(`[MigrationRunner] Migration ${migration.version} already executed`);
      }
    }

    console.log('[MigrationRunner] All migrations completed');
  }

  /**
   * Rollback a specific migration (if rollback SQL is provided)
   */
  async rollbackMigration(version: string, rollbackSql: string): Promise<void> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');

      // Execute the rollback SQL
      await client.query(rollbackSql);

      // Remove the migration record
      await client.query(
        'DELETE FROM voltagent_migrations WHERE version = $1',
        [version]
      );

      await client.query('COMMIT');
      console.log(`[MigrationRunner] Rolled back migration ${version}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[MigrationRunner] Failed to rollback migration ${version}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

