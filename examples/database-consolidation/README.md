# Database Architecture Consolidation Example

This example demonstrates the comprehensive database architecture consolidation that unifies PostgreSQL, LibSQL, and Cloudflare D1 providers with advanced features.

## Features Demonstrated

- ✅ **Multi-provider database support** (PostgreSQL, LibSQL, Cloudflare D1)
- ✅ **Advanced connection pooling** with health checks
- ✅ **Comprehensive migration system** with rollback capabilities
- ✅ **Performance monitoring** and query optimization
- ✅ **Security framework** with encryption and access control
- ✅ **Backup and recovery** system
- ✅ **Schema validation** and constraint management
- ✅ **Middleware layer** for query transformation
- ✅ **Cloudflare integration** for edge deployment

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run the example
npm run start
```

## Environment Variables

```env
# PostgreSQL Configuration
POSTGRES_URL=postgresql://user:password@localhost:5432/voltagent

# LibSQL/Turso Configuration
LIBSQL_URL=libsql://your-database.turso.io
LIBSQL_AUTH_TOKEN=your-auth-token

# Cloudflare D1 Configuration
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_DATABASE_ID=your-d1-database-id

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
```

## Example Usage

See `src/index.ts` for a complete example demonstrating all features of the consolidated database architecture.

## Architecture Benefits

### Before Consolidation
- Multiple disconnected database implementations
- Duplicate schema definitions
- Inconsistent connection management
- No unified monitoring or security

### After Consolidation
- Single unified interface across all providers
- Zero code duplication
- Standardized connection pooling
- Comprehensive monitoring and security
- Consistent API contracts

