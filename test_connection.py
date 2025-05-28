#!/usr/bin/env python3
"""
Test script to verify Postgres connection and Cloudflare Worker
"""

import os
import sys
import requests
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

def load_env_config():
    """Load configuration from .env file"""
    env_file = Path('.env')
    if not env_file.exists():
        print("❌ .env file not found. Run setup first!")
        return None
    
    load_dotenv(env_file)
    
    config = {
        'host': os.getenv('POSTGRES_HOST', 'localhost'),
        'port': int(os.getenv('POSTGRES_PORT', 5432)),
        'database': os.getenv('POSTGRES_DATABASE', 'codegen_db'),
        'user': os.getenv('POSTGRES_USER', 'codegen_user'),
        'password': os.getenv('POSTGRES_PASSWORD'),
        'worker_url': os.getenv('CLOUDFLARE_WORKER_URL')
    }
    
    if not config['password']:
        print("❌ Password not found in .env file")
        return None
    
    return config

def test_postgres_connection(config):
    """Test PostgreSQL database connection"""
    print("🐘 Testing PostgreSQL connection...")
    
    try:
        conn = psycopg2.connect(
            host=config['host'],
            port=config['port'],
            database=config['database'],
            user=config['user'],
            password=config['password'],
            sslmode='prefer'
        )
        
        cur = conn.cursor()
        
        # Test basic query
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"✅ Connected to PostgreSQL")
        print(f"   Version: {version}")
        
        # Test permissions (should work)
        cur.execute("SELECT current_user, current_database();")
        user, db = cur.fetchone()
        print(f"   Current user: {user}")
        print(f"   Current database: {db}")
        
        # Test if we can create tables (should fail for read-only user)
        try:
            cur.execute("CREATE TABLE test_table (id INTEGER);")
            print("⚠️ Warning: User has write permissions (should be read-only)")
            cur.execute("DROP TABLE test_table;")
        except psycopg2.Error:
            print("✅ User correctly has read-only permissions")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        return False

def test_cloudflare_worker(config):
    """Test Cloudflare Worker accessibility"""
    print("\n☁️ Testing Cloudflare Worker...")
    
    if not config['worker_url']:
        print("❌ Worker URL not found in config")
        return False
    
    try:
        # Test health endpoint
        response = requests.get(f"{config['worker_url']}/health", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Worker health check passed")
            print(f"   Status: {data.get('status')}")
            print(f"   Worker: {data.get('worker')}")
            print(f"   Timestamp: {data.get('timestamp')}")
        else:
            print(f"⚠️ Worker responded with status: {response.status_code}")
            return False
        
        # Test db-info endpoint
        response = requests.get(f"{config['worker_url']}/db-info", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Worker db-info endpoint accessible")
            print(f"   Host: {data.get('host')}")
            print(f"   Port: {data.get('port')}")
            print(f"   Database: {data.get('database')}")
        else:
            print(f"⚠️ db-info endpoint responded with status: {response.status_code}")
        
        return True
        
    except Exception as e:
        print(f"❌ Worker test failed: {e}")
        return False

def print_codegen_instructions(config):
    """Print instructions for Codegen integration"""
    print("\n" + "=" * 50)
    print("🤖 CODEGEN INTEGRATION INSTRUCTIONS")
    print("=" * 50)
    print("\n1. Open Codegen Settings")
    print("2. Go to Integrations → Postgres")
    print("3. Click 'Add Credential'")
    print("4. Enter these values:")
    print(f"   • Credential Name: My Local Database")
    print(f"   • Description: Local Postgres via Cloudflare")
    print(f"   • Host: {config['host']}")
    print(f"   • Port: {config['port']}")
    print(f"   • Database Name: {config['database']}")
    print(f"   • Username: {config['user']}")
    print(f"   • Password: {config['password']}")
    print(f"   • SSL Mode: prefer")
    print("\n5. Click 'Test Connection' to verify")
    print("6. Click 'Save' if test passes")
    print("\n✅ Your local Postgres is now ready for Codegen!")

def main():
    """Main test function"""
    print("🧪 Testing Cloudflare Postgres Setup")
    print("=" * 40)
    
    # Load configuration
    config = load_env_config()
    if not config:
        sys.exit(1)
    
    # Test PostgreSQL
    postgres_ok = test_postgres_connection(config)
    
    # Test Cloudflare Worker
    worker_ok = test_cloudflare_worker(config)
    
    # Summary
    print("\n" + "=" * 40)
    print("📊 TEST SUMMARY")
    print("=" * 40)
    print(f"PostgreSQL: {'✅ PASS' if postgres_ok else '❌ FAIL'}")
    print(f"Cloudflare Worker: {'✅ PASS' if worker_ok else '❌ FAIL'}")
    
    if postgres_ok and worker_ok:
        print("\n🎉 All tests passed!")
        print_codegen_instructions(config)
    else:
        print("\n❌ Some tests failed. Please check the setup.")
        sys.exit(1)

if __name__ == "__main__":
    main()

