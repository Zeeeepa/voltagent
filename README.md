# Cloudflare Postgres Setup for Codegen

This tool automates the setup of your local PostgreSQL database to be accessible by Codegen through Cloudflare Workers, providing a secure bridge between your local database and Codegen's AI agents.

## 🚀 Quick Start

### Prerequisites

1. **PostgreSQL 17** installed at `C:\Program Files\PostgreSQL\17` (Windows)
2. **Python 3.7+** installed
3. **Cloudflare account** with API access
4. **Domain configured** in Cloudflare (for custom worker URL)

### Environment Variables

Set these environment variables or the script will use the provided defaults:

```bash
CLOUDFLARE_API_TOKEN=eae82cf159577a8838cc83612104c09c5a0d6
CLOUDFLARE_ACCOUNT_ID=2b2a1d3effa7f7fe4fe2a8c4e48681e3
CLOUDFLARE_WORKER_NAME=neon-db
CLOUDFLARE_WORKER_URL=https://neon-db.pixeliumperfecto.workers.dev
```

### Installation & Setup

#### Option 1: Windows Batch Script (Recommended)
```cmd
# Clone or download the files
# Run the batch script
setup_postgres.bat
```

#### Option 2: Manual Python Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Run the setup script
python cloudflare_postgres_setup.py
```

## 🔧 What This Tool Does

### 1. Database Setup
- ✅ Checks if PostgreSQL is running locally
- ✅ Creates a dedicated database: `codegen_db`
- ✅ Creates a read-only user: `codegen_user`
- ✅ Sets up proper permissions (SELECT only for security)
- ✅ Generates secure random password

### 2. Cloudflare Worker Deployment
- ✅ Checks if worker already exists
- ✅ Creates new worker if needed
- ✅ Deploys proxy worker with health endpoints
- ✅ Tests worker accessibility

### 3. Configuration Management
- ✅ Saves all credentials to `.env` file
- ✅ Provides connection strings for Codegen
- ✅ Shows comprehensive status report

## 📊 Output Example

```
============================================================
🐘 Cloudflare Postgres Exposure Setup for Codegen 🚀
============================================================

🔍 Step 1: Checking PostgreSQL server...
✅ PostgreSQL server is running

🔧 Step 2: Setting up database and user...
📦 Creating database: codegen_db
👤 Creating user: codegen_user
✅ Database and user setup completed

☁️ Step 3: Checking Cloudflare Worker...
📝 Cloudflare Worker 'neon-db' does not exist
🚀 Creating Cloudflare Worker...
✅ Cloudflare Worker 'neon-db' created successfully

🧪 Step 4: Testing worker deployment...
🧪 Testing worker at: https://neon-db.pixeliumperfecto.workers.dev
✅ Worker is accessible and healthy

💾 Step 5: Saving configuration...
✅ Environment variables saved to .env

============================================================
📊 SETUP STATUS REPORT
============================================================

🐘 DATABASE STATUS:
   Host: localhost
   Port: 5432
   Database: codegen_db
   User: codegen_user
   Password: a1b2c3d4e5f6g7h8
   SSL Mode: prefer
   Status: ✅ CONNECTED

☁️ CLOUDFLARE STATUS:
   Worker Name: neon-db
   Worker URL: https://neon-db.pixeliumperfecto.workers.dev
   Account ID: 2b2a1d3effa7f7fe4fe2a8c4e48681e3
   Status: ✅ WORKER ACCESSIBLE

🤖 CODEGEN INTEGRATION:
   Copy these values to Codegen Postgres settings:
   Host: localhost
   Port: 5432
   Database: codegen_db
   Username: codegen_user
   Password: a1b2c3d4e5f6g7h8
   SSL Mode: prefer

📁 FILES CREATED:
   .env file: C:\path\to\your\project\.env

🔗 USEFUL URLS:
   Worker Health: https://neon-db.pixeliumperfecto.workers.dev/health
   Worker DB Info: https://neon-db.pixeliumperfecto.workers.dev/db-info

============================================================

🎉 Setup completed successfully!
💡 You can now use these credentials in Codegen's Postgres integration
```

## 🔐 Security Features

- **Read-Only Access**: Database user only has SELECT permissions
- **Secure Passwords**: Auto-generated random passwords
- **SSL Preferred**: Connections use SSL when available
- **Environment Variables**: Sensitive data stored in `.env` file
- **Worker Proxy**: Cloudflare Worker acts as secure proxy

## 🔗 Codegen Integration

After running the setup, use these credentials in Codegen's Postgres settings:

1. Go to Codegen Settings → Integrations → Postgres
2. Add new credential with these values:
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: `codegen_db`
   - **Username**: `codegen_user`
   - **Password**: (from output or `.env` file)
   - **SSL Mode**: `prefer`

## 🛠️ Troubleshooting

### PostgreSQL Not Running
```bash
# Start PostgreSQL service (Windows)
net start postgresql-x64-17

# Or start via Services.msc
```

### Connection Issues
- Verify PostgreSQL is accepting connections on port 5432
- Check Windows Firewall settings
- Ensure `pg_hba.conf` allows local connections

### Cloudflare Worker Issues
- Verify API token has Workers:Edit permissions
- Check account ID is correct
- Ensure domain is properly configured in Cloudflare

### Permission Errors
- Run as Administrator if needed
- Check PostgreSQL user permissions
- Verify Python has write access to current directory

## 📁 Generated Files

- **`.env`**: Environment variables and database credentials
- **`cloudflare_postgres_setup.py`**: Main setup script
- **`requirements.txt`**: Python dependencies
- **`setup_postgres.bat`**: Windows batch script for easy setup

## 🔄 Re-running Setup

The script is idempotent - you can run it multiple times safely:
- Existing database and user won't be recreated
- Existing Cloudflare Worker will be detected
- Configuration will be updated with current values

## 🌐 Worker Endpoints

Your Cloudflare Worker provides these endpoints:

- **`/health`**: Health check and status
- **`/db-info`**: Database connection information
- **`/`**: General worker information

## 📞 Support

If you encounter issues:

1. Check the detailed output for specific error messages
2. Verify all prerequisites are met
3. Ensure environment variables are set correctly
4. Check PostgreSQL and Cloudflare service status

## 🔒 Security Notes

- This setup is designed for **development use**
- For production, consider additional security measures:
  - IP whitelisting
  - VPN access
  - More restrictive database permissions
  - Regular credential rotation

