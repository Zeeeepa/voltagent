/**
 * Database Migration Manager
 * 
 * Comprehensive migration system with versioning, rollback,
 * and automatic schema management
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

import type {
  Migration,
  MigrationConfig,
} from '../types';

import type {
  IMigrationManager,
  IDatabase,
  SchemaChange,
} from '../interfaces';

/**
 * Migration manager implementation
 */
export class MigrationManager implements IMigrationManager {
  private config: MigrationConfig;
  private database: IDatabase;

  constructor(database: IDatabase, config?: Partial<MigrationConfig>) {
    this.database = database;
    this.config = {
      migrationsPath: config?.migrationsPath || './migrations',
      tableName: config?.tableName || 'schema_migrations',
      autoMigrate: config?.autoMigrate || false,
      backupBeforeMigration: config?.backupBeforeMigration || true,
    };
  }

  /**
   * Load all migration files from the migrations directory
   */
  async loadMigrations(): Promise<Migration[]> {
    try {
      await this.ensureMigrationsTable();
      
      const migrationFiles = await this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();
      const appliedIds = new Set(appliedMigrations.map(m => m.id));

      const migrations: Migration[] = [];

      for (const file of migrationFiles) {
        const migration = await this.parseMigrationFile(file);
        migration.appliedAt = appliedIds.has(migration.id) 
          ? appliedMigrations.find(m => m.id === migration.id)?.appliedAt
          : undefined;
        migrations.push(migration);
      }

      // Sort by ID (timestamp-based)
      return migrations.sort((a, b) => a.id.localeCompare(b.id));
    } catch (error) {
      throw new Error(`Failed to load migrations: ${error.message}`);
    }
  }

  /**
   * Apply a single migration
   */
  async applyMigration(migration: Migration): Promise<void> {
    // Check if already applied
    const appliedMigrations = await this.getAppliedMigrations();
    if (appliedMigrations.some(m => m.id === migration.id)) {
      console.log(`Migration ${migration.id} already applied, skipping`);
      return;
    }

    try {
      // Execute migration in a transaction
      await this.database.transaction(async (tx) => {
        // Execute the migration SQL
        await tx.execute(migration.up);

        // Record the migration as applied
        await tx.execute(
          `INSERT INTO ${this.config.tableName} (id, name, checksum, applied_at) VALUES (?, ?, ?, ?)`,
          [migration.id, migration.name, migration.checksum, new Date().toISOString()]
        );
      });

      console.log(`Applied migration: ${migration.id} - ${migration.name}`);
    } catch (error) {
      throw new Error(`Failed to apply migration ${migration.id}: ${error.message}`);
    }
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(migration: Migration): Promise<void> {
    // Check if migration is applied
    const appliedMigrations = await this.getAppliedMigrations();
    if (!appliedMigrations.some(m => m.id === migration.id)) {
      throw new Error(`Migration ${migration.id} is not applied`);
    }

    try {
      // Execute rollback in a transaction
      await this.database.transaction(async (tx) => {
        // Execute the rollback SQL
        await tx.execute(migration.down);

        // Remove the migration record
        await tx.execute(
          `DELETE FROM ${this.config.tableName} WHERE id = ?`,
          [migration.id]
        );
      });

      console.log(`Rolled back migration: ${migration.id} - ${migration.name}`);
    } catch (error) {
      throw new Error(`Failed to rollback migration ${migration.id}: ${error.message}`);
    }
  }

  /**
   * Get migration history
   */
  async getMigrationHistory(): Promise<Migration[]> {
    await this.ensureMigrationsTable();
    
    const result = await this.database.execute(
      `SELECT * FROM ${this.config.tableName} ORDER BY applied_at DESC`
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      up: '', // Not stored in history
      down: '', // Not stored in history
      checksum: row.checksum,
      appliedAt: new Date(row.applied_at),
    }));
  }

  /**
   * Generate a new migration file
   */
  async generateMigration(name: string, changes: SchemaChange[]): Promise<Migration> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const id = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}`;
    const filename = `${id}.sql`;
    const filepath = path.join(this.config.migrationsPath, filename);

    // Generate SQL from schema changes
    const upSQL = this.generateUpSQL(changes);
    const downSQL = this.generateDownSQL(changes);

    const migrationContent = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Up
${upSQL}

-- Down
${downSQL}`;

    // Ensure migrations directory exists
    await fs.mkdir(this.config.migrationsPath, { recursive: true });

    // Write migration file
    await fs.writeFile(filepath, migrationContent, 'utf8');

    const migration: Migration = {
      id,
      name,
      up: upSQL,
      down: downSQL,
      checksum: this.calculateChecksum(migrationContent),
    };

    console.log(`Generated migration: ${filepath}`);
    return migration;
  }

  // Private methods

  private async ensureMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `;

    await this.database.execute(createTableSQL);
  }

  private async getMigrationFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.migrationsPath);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Migrations directory doesn't exist
        return [];
      }
      throw error;
    }
  }

  private async getAppliedMigrations(): Promise<Migration[]> {
    try {
      const result = await this.database.execute(
        `SELECT * FROM ${this.config.tableName} ORDER BY id`
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        up: '',
        down: '',
        checksum: row.checksum,
        appliedAt: new Date(row.applied_at),
      }));
    } catch (error) {
      // Table might not exist yet
      return [];
    }
  }

  private async parseMigrationFile(filename: string): Promise<Migration> {
    const filepath = path.join(this.config.migrationsPath, filename);
    const content = await fs.readFile(filepath, 'utf8');

    // Extract ID and name from filename
    const match = filename.match(/^(.+)\.sql$/);
    if (!match) {
      throw new Error(`Invalid migration filename: ${filename}`);
    }

    const id = match[1];
    const nameMatch = id.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}_(.+)$/);
    const name = nameMatch ? nameMatch[1].replace(/_/g, ' ') : id;

    // Parse up and down sections
    const sections = this.parseMigrationSections(content);

    return {
      id,
      name,
      up: sections.up,
      down: sections.down,
      checksum: this.calculateChecksum(content),
    };
  }

  private parseMigrationSections(content: string): { up: string; down: string } {
    const lines = content.split('\n');
    let currentSection = '';
    let upSQL = '';
    let downSQL = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '-- Up') {
        currentSection = 'up';
        continue;
      } else if (trimmed === '-- Down') {
        currentSection = 'down';
        continue;
      }

      // Skip comments and empty lines
      if (trimmed.startsWith('--') || trimmed === '') {
        continue;
      }

      if (currentSection === 'up') {
        upSQL += line + '\n';
      } else if (currentSection === 'down') {
        downSQL += line + '\n';
      }
    }

    return {
      up: upSQL.trim(),
      down: downSQL.trim(),
    };
  }

  private generateUpSQL(changes: SchemaChange[]): string {
    const statements: string[] = [];

    for (const change of changes) {
      switch (change.type) {
        case 'create_table':
          if (change.schema) {
            statements.push(this.generateCreateTableSQL(change.table, change.schema));
          }
          break;
        case 'drop_table':
          statements.push(`DROP TABLE IF EXISTS "${change.table}";`);
          break;
        case 'alter_table':
          if (change.changes) {
            for (const tableChange of change.changes) {
              statements.push(this.generateAlterTableSQL(change.table, tableChange));
            }
          }
          break;
      }
    }

    return statements.join('\n\n');
  }

  private generateDownSQL(changes: SchemaChange[]): string {
    // Generate reverse operations
    const reverseChanges = [...changes].reverse();
    const statements: string[] = [];

    for (const change of reverseChanges) {
      switch (change.type) {
        case 'create_table':
          statements.push(`DROP TABLE IF EXISTS "${change.table}";`);
          break;
        case 'drop_table':
          // Can't easily reverse a drop table without the original schema
          statements.push(`-- TODO: Recreate table "${change.table}" with original schema`);
          break;
        case 'alter_table':
          // Generate reverse alter operations
          statements.push(`-- TODO: Reverse alter table operations for "${change.table}"`);
          break;
      }
    }

    return statements.join('\n\n');
  }

  private generateCreateTableSQL(tableName: string, schema: any): string {
    const columns = schema.columns.map((col: any) => {
      let sql = `"${col.name}" ${col.type}`;
      
      if (col.primaryKey) {
        sql += ' PRIMARY KEY';
      }
      
      if (!col.nullable) {
        sql += ' NOT NULL';
      }
      
      if (col.defaultValue !== undefined) {
        sql += ` DEFAULT ${this.escapeValue(col.defaultValue)}`;
      }
      
      if (col.unique) {
        sql += ' UNIQUE';
      }
      
      return sql;
    }).join(', ');

    return `CREATE TABLE "${tableName}" (${columns});`;
  }

  private generateAlterTableSQL(tableName: string, change: any): string {
    switch (change.type) {
      case 'add_column':
        return `ALTER TABLE "${tableName}" ADD COLUMN "${change.column.name}" ${change.column.type};`;
      case 'drop_column':
        return `ALTER TABLE "${tableName}" DROP COLUMN "${change.column.name}";`;
      case 'modify_column':
        return `ALTER TABLE "${tableName}" ALTER COLUMN "${change.column.name}" TYPE ${change.column.type};`;
      default:
        return `-- Unsupported change type: ${change.type}`;
    }
  }

  private escapeValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    return String(value);
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

