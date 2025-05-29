#!/usr/bin/env node

/**
 * Migration CLI script for VoltAgent database
 * Phase 1.3: Setup Database Event Storage System
 * 
 * Usage:
 *   node scripts/migrate.js
 *   npm run migrate
 */

const { runMigrationsFromEnv } = require('../dist/database/migrations/runner');

async function main() {
  console.log('🚀 Starting VoltAgent database migrations...');
  
  try {
    await runMigrationsFromEnv();
    console.log('✅ Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();

