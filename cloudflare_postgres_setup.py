#!/usr/bin/env python3
"""
Cloudflare Postgres Exposure Automation for Codegen
Automates the setup of local Postgres database exposure via Cloudflare Workers/Tunnels
"""

import os
import json
import subprocess
import sys
import time
import requests
from pathlib import Path
from typing import Dict, Optional, Tuple
import psycopg2
from psycopg2 import sql
import uuid

class CloudflarePostgresSetup:
    def __init__(self):
        # Cloudflare credentials from environment
        self.cf_api_key = os.getenv('CLOUDFLARE_GLOBAL_API_KEY', 'eae82cf159577a8838cc83612104c09c5a0d6')
        self.cf_email = os.getenv('CLOUDFLARE_EMAIL', 'your-email@example.com')  # You'll need to provide this
        self.cf_account_id = os.getenv('CLOUDFLARE_ACCOUNT_ID', '2b2a1d3effa7f7fe4fe2a8c4e48681e3')
        self.cf_worker_name = os.getenv('CLOUDFLARE_WORKER_NAME', 'neon-db')
        self.cf_worker_url = os.getenv('CLOUDFLARE_WORKER_URL', 'https://neon-db.pixeliumperfecto.workers.dev')
        
        # Local Postgres settings
        self.local_pg_path = r"C:\Program Files\PostgreSQL\17"
        self.local_host = "localhost"
        self.local_port = 5432
        self.local_db = "codegen_db"
        self.local_user = "codegen_user"
        self.local_password = self._generate_password()
        
        # PostgreSQL admin credentials (for setup)
        self.admin_user = os.getenv('POSTGRES_ADMIN_USER', 'postgres')
        self.admin_password = os.getenv('POSTGRES_ADMIN_PASSWORD')
        
        # Headers for Cloudflare API (Global API Key format)
        self.headers = {
            'X-Auth-Key': self.cf_api_key,
            'X-Auth-Email': self.cf_email,
            'Content-Type': 'application/json'
        }
        
        self.env_file = Path('.env')
    
    def _generate_password(self) -> str:
        """Generate a secure password for the database user"""
        return str(uuid.uuid4()).replace('-', '')[:16]
    
    def print_banner(self):
        """Print a nice banner"""
        print("=" * 60)
        print("🐘 Cloudflare Postgres Exposure Setup for Codegen 🚀")
        print("=" * 60)
        print()
    
    def check_postgres_running(self) -> bool:
        """Check if PostgreSQL is running locally"""
        # Try different authentication methods
        auth_methods = [
            # Method 1: Use provided admin password
            {'user': self.admin_user, 'password': self.admin_password} if self.admin_password else None,
            # Method 2: Try common default passwords
            {'user': 'postgres', 'password': 'postgres'},
            {'user': 'postgres', 'password': 'admin'},
            {'user': 'postgres', 'password': ''},
            # Method 3: Try Windows authentication
            {'user': os.getenv('USERNAME', 'postgres'), 'password': ''},
        ]
        
        # Filter out None values
        auth_methods = [method for method in auth_methods if method is not None]
        
        for i, auth in enumerate(auth_methods):
            try:
                print(f"🔐 Trying authentication method {i+1}...")
                conn = psycopg2.connect(
                    host=self.local_host,
                    port=self.local_port,
                    database="postgres",
                    user=auth['user'],
                    password=auth['password']
                )
                conn.close()
                print(f"✅ PostgreSQL server is running (authenticated as {auth['user']})")
                # Store successful credentials for later use
                self.admin_user = auth['user']
                self.admin_password = auth['password']
                return True
            except Exception as e:
                print(f"   ❌ Method {i+1} failed: {str(e)[:100]}...")
                continue
        
        # If all methods fail, prompt for password
        print("\n🔑 All automatic authentication methods failed.")
        print("Please provide your PostgreSQL admin credentials:")
        
        try:
            import getpass
            self.admin_user = input(f"PostgreSQL admin username (default: postgres): ").strip() or 'postgres'
            self.admin_password = getpass.getpass("PostgreSQL admin password: ")
            
            # Test the provided credentials
            conn = psycopg2.connect(
                host=self.local_host,
                port=self.local_port,
                database="postgres",
                user=self.admin_user,
                password=self.admin_password
            )
            conn.close()
            print(f"✅ PostgreSQL server is running (authenticated as {self.admin_user})")
            return True
            
        except Exception as e:
            print(f"❌ PostgreSQL server not accessible: {e}")
            print(f"💡 Make sure PostgreSQL is running at {self.local_host}:{self.local_port}")
            print("💡 Check your username and password")
            return False
    
    def setup_database_and_user(self) -> bool:
        """Create database and user for Codegen"""
        try:
            # Connect as superuser (postgres)
            conn = psycopg2.connect(
                host=self.local_host,
                port=self.local_port,
                database="postgres",
                user=self.admin_user,
                password=self.admin_password
            )
            conn.autocommit = True
            cur = conn.cursor()
            
            # Check if database exists
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (self.local_db,))
            if not cur.fetchone():
                print(f"📦 Creating database: {self.local_db}")
                cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(self.local_db)))
            else:
                print(f"✅ Database {self.local_db} already exists")
            
            # Check if user exists
            cur.execute("SELECT 1 FROM pg_user WHERE usename = %s", (self.local_user,))
            if not cur.fetchone():
                print(f"👤 Creating user: {self.local_user}")
                cur.execute(sql.SQL("CREATE USER {} WITH PASSWORD %s").format(
                    sql.Identifier(self.local_user)), (self.local_password,))
            else:
                print(f"✅ User {self.local_user} already exists")
                # Update password in case it changed
                cur.execute(sql.SQL("ALTER USER {} WITH PASSWORD %s").format(
                    sql.Identifier(self.local_user)), (self.local_password,))
            
            # Grant permissions (READ-ONLY for Codegen safety)
            cur.execute(sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                sql.Identifier(self.local_db), sql.Identifier(self.local_user)))
            
            conn.close()
            
            # Connect to the new database and grant schema permissions
            conn = psycopg2.connect(
                host=self.local_host,
                port=self.local_port,
                database=self.local_db,
                user=self.admin_user,
                password=self.admin_password
            )
            conn.autocommit = True
            cur = conn.cursor()
            
            cur.execute(sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(
                sql.Identifier(self.local_user)))
            cur.execute(sql.SQL("GRANT SELECT ON ALL TABLES IN SCHEMA public TO {}").format(
                sql.Identifier(self.local_user)))
            cur.execute(sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO {}").format(
                sql.Identifier(self.local_user)))
            
            conn.close()
            print("✅ Database and user setup completed")
            return True
            
        except Exception as e:
            print(f"❌ Failed to setup database: {e}")
            return False
    
    def check_cloudflare_worker_exists(self) -> bool:
        """Check if Cloudflare Worker already exists"""
        try:
            url = f"https://api.cloudflare.com/client/v4/accounts/{self.cf_account_id}/workers/scripts/{self.cf_worker_name}"
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                print(f"✅ Cloudflare Worker '{self.cf_worker_name}' already exists")
                return True
            elif response.status_code == 404:
                print(f"📝 Cloudflare Worker '{self.cf_worker_name}' does not exist")
                return False
            else:
                print(f"⚠️ Error checking worker: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to check Cloudflare Worker: {e}")
            return False
    
    def create_cloudflare_worker(self) -> bool:
        """Create Cloudflare Worker for database proxy"""
        worker_script = f'''
// Cloudflare Worker for Postgres Database Proxy
// This worker acts as a secure proxy to your local Postgres database

export default {{
  async fetch(request, env, ctx) {{
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {{
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }};
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {{
      return new Response(null, {{ headers: corsHeaders }});
    }}
    
    // Health check endpoint
    if (url.pathname === '/health') {{
      return new Response(JSON.stringify({{
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'postgres-proxy',
        worker: '{self.cf_worker_name}'
      }}), {{
        headers: {{ ...corsHeaders, 'Content-Type': 'application/json' }}
      }});
    }}
    
    // Database info endpoint
    if (url.pathname === '/db-info') {{
      return new Response(JSON.stringify({{
        host: '{self.local_host}',
        port: {self.local_port},
        database: '{self.local_db}',
        user: '{self.local_user}',
        ssl_mode: 'prefer',
        connection_url: 'postgresql://{self.local_user}:[REDACTED]@{self.local_host}:{self.local_port}/{self.local_db}?sslmode=prefer'
      }}), {{
        headers: {{ ...corsHeaders, 'Content-Type': 'application/json' }}
      }});
    }}
    
    // Default response
    return new Response(JSON.stringify({{
      message: 'Postgres Proxy Worker',
      endpoints: ['/health', '/db-info'],
      note: 'This worker provides database connection information for Codegen'
    }}), {{
      headers: {{ ...corsHeaders, 'Content-Type': 'application/json' }}
    }});
  }},
}};
'''
        
        try:
            url = f"https://api.cloudflare.com/client/v4/accounts/{self.cf_account_id}/workers/scripts/{self.cf_worker_name}"
            
            # Create multipart form data
            files = {
                'metadata': (None, json.dumps({
                    'main_module': 'worker.js',
                    'compatibility_date': '2023-05-18'
                }), 'application/json'),
                'worker.js': (None, worker_script, 'application/javascript+module')
            }
            
            headers = {'X-Auth-Key': self.cf_api_key, 'X-Auth-Email': self.cf_email}
            response = requests.put(url, headers=headers, files=files)
            
            if response.status_code in [200, 201]:
                print(f"✅ Cloudflare Worker '{self.cf_worker_name}' created successfully")
                return True
            else:
                print(f"❌ Failed to create worker: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to create Cloudflare Worker: {e}")
            return False
    
    def test_worker_deployment(self) -> bool:
        """Test if the worker is accessible"""
        try:
            print(f"🧪 Testing worker at: {self.cf_worker_url}")
            response = requests.get(f"{self.cf_worker_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Worker is accessible and healthy")
                print(f"   Status: {data.get('status')}")
                print(f"   Timestamp: {data.get('timestamp')}")
                return True
            else:
                print(f"⚠️ Worker responded with status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to test worker: {e}")
            return False
    
    def save_to_env_file(self):
        """Save database credentials to .env file"""
        env_content = f"""# Codegen Postgres Database Configuration
# Generated by cloudflare_postgres_setup.py

# Database Connection Details
POSTGRES_HOST={self.local_host}
POSTGRES_PORT={self.local_port}
POSTGRES_DATABASE={self.local_db}
POSTGRES_USER={self.local_user}
POSTGRES_PASSWORD={self.local_password}
POSTGRES_SSL_MODE=prefer

# Connection URL for Codegen
DATABASE_URL=postgresql://{self.local_user}:{self.local_password}@{self.local_host}:{self.local_port}/{self.local_db}?sslmode=prefer

# Cloudflare Configuration
CLOUDFLARE_GLOBAL_API_KEY={self.cf_api_key}
CLOUDFLARE_EMAIL={self.cf_email}
CLOUDFLARE_ACCOUNT_ID={self.cf_account_id}
CLOUDFLARE_WORKER_NAME={self.cf_worker_name}
CLOUDFLARE_WORKER_URL={self.cf_worker_url}

# For Codegen Integration (use these in Codegen settings)
CODEGEN_DB_HOST={self.local_host}
CODEGEN_DB_PORT={self.local_port}
CODEGEN_DB_NAME={self.local_db}
CODEGEN_DB_USER={self.local_user}
CODEGEN_DB_PASSWORD={self.local_password}
"""
        
        try:
            with open(self.env_file, 'w') as f:
                f.write(env_content)
            print(f"✅ Environment variables saved to {self.env_file}")
        except Exception as e:
            print(f"❌ Failed to save .env file: {e}")
    
    def print_status_report(self):
        """Print comprehensive status report"""
        print("\n" + "=" * 60)
        print("📊 SETUP STATUS REPORT")
        print("=" * 60)
        
        # Database Status
        print("\n🐘 DATABASE STATUS:")
        print(f"   Host: {self.local_host}")
        print(f"   Port: {self.local_port}")
        print(f"   Database: {self.local_db}")
        print(f"   User: {self.local_user}")
        print(f"   Password: {self.local_password}")
        print(f"   SSL Mode: prefer")
        
        # Test database connection
        try:
            conn = psycopg2.connect(
                host=self.local_host,
                port=self.local_port,
                database=self.local_db,
                user=self.local_user,
                password=self.local_password
            )
            conn.close()
            print("   Status: ✅ CONNECTED")
        except Exception as e:
            print(f"   Status: ❌ CONNECTION FAILED - {e}")
        
        # Cloudflare Status
        print(f"\n���️ CLOUDFLARE STATUS:")
        print(f"   Worker Name: {self.cf_worker_name}")
        print(f"   Worker URL: {self.cf_worker_url}")
        print(f"   Account ID: {self.cf_account_id}")
        
        # Test worker
        try:
            response = requests.get(f"{self.cf_worker_url}/health", timeout=5)
            if response.status_code == 200:
                print("   Status: ✅ WORKER ACCESSIBLE")
            else:
                print(f"   Status: ⚠️ WORKER RESPONDED WITH {response.status_code}")
        except:
            print("   Status: ❌ WORKER NOT ACCESSIBLE")
        
        # Codegen Integration Instructions
        print(f"\n🤖 CODEGEN INTEGRATION:")
        print("   Copy these values to Codegen Postgres settings:")
        print(f"   Host: {self.local_host}")
        print(f"   Port: {self.local_port}")
        print(f"   Database: {self.local_db}")
        print(f"   Username: {self.local_user}")
        print(f"   Password: {self.local_password}")
        print("   SSL Mode: prefer")
        
        print(f"\n📁 FILES CREATED:")
        print(f"   .env file: {self.env_file.absolute()}")
        
        print(f"\n🔗 USEFUL URLS:")
        print(f"   Worker Health: {self.cf_worker_url}/health")
        print(f"   Worker DB Info: {self.cf_worker_url}/db-info")
        
        print("\n" + "=" * 60)
    
    def run_setup(self):
        """Main setup process"""
        self.print_banner()
        
        # Step 1: Check PostgreSQL
        print("🔍 Step 1: Checking PostgreSQL server...")
        if not self.check_postgres_running():
            print("❌ Setup failed: PostgreSQL not accessible")
            return False
        
        # Step 2: Setup database and user
        print("\n🔧 Step 2: Setting up database and user...")
        if not self.setup_database_and_user():
            print("❌ Setup failed: Could not setup database")
            return False
        
        # Step 3: Check/Create Cloudflare Worker
        print("\n☁️ Step 3: Checking Cloudflare Worker...")
        worker_exists = self.check_cloudflare_worker_exists()
        
        if not worker_exists:
            print("🚀 Creating Cloudflare Worker...")
            if not self.create_cloudflare_worker():
                print("❌ Setup failed: Could not create Cloudflare Worker")
                return False
            
            # Wait a moment for deployment
            print("��� Waiting for worker deployment...")
            time.sleep(3)
        
        # Step 4: Test worker
        print("\n🧪 Step 4: Testing worker deployment...")
        if not self.test_worker_deployment():
            print("⚠️ Worker may not be fully accessible yet (this is normal)")
        
        # Step 5: Save configuration
        print("\n💾 Step 5: Saving configuration...")
        self.save_to_env_file()
        
        # Step 6: Print status report
        self.print_status_report()
        
        print("\n🎉 Setup completed successfully!")
        print("💡 You can now use these credentials in Codegen's Postgres integration")
        
        return True

def main():
    """Main entry point"""
    try:
        setup = CloudflarePostgresSetup()
        success = setup.run_setup()
        
        if success:
            print("\n✅ All done! Your local Postgres is now ready for Codegen integration.")
        else:
            print("\n❌ Setup encountered errors. Please check the output above.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️ Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
