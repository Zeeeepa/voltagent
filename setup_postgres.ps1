# PowerShell script for Cloudflare Postgres Setup
# Run with: powershell -ExecutionPolicy Bypass -File setup_postgres.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cloudflare Postgres Setup for Codegen" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.7+ and try again" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Set environment variables if not already set
if (-not $env:CLOUDFLARE_API_TOKEN) {
    $env:CLOUDFLARE_API_TOKEN = "eae82cf159577a8838cc83612104c09c5a0d6"
    Write-Host "Using default Cloudflare API Token" -ForegroundColor Yellow
}

if (-not $env:CLOUDFLARE_ACCOUNT_ID) {
    $env:CLOUDFLARE_ACCOUNT_ID = "2b2a1d3effa7f7fe4fe2a8c4e48681e3"
    Write-Host "Using default Cloudflare Account ID" -ForegroundColor Yellow
}

if (-not $env:CLOUDFLARE_WORKER_NAME) {
    $env:CLOUDFLARE_WORKER_NAME = "neon-db"
    Write-Host "Using default Worker Name: neon-db" -ForegroundColor Yellow
}

if (-not $env:CLOUDFLARE_WORKER_URL) {
    $env:CLOUDFLARE_WORKER_URL = "https://neon-db.pixeliumperfecto.workers.dev"
    Write-Host "Using default Worker URL" -ForegroundColor Yellow
}

# PostgreSQL admin credentials (optional)
if ($env:POSTGRES_ADMIN_USER) {
    Write-Host "Using provided PostgreSQL admin user: $env:POSTGRES_ADMIN_USER" -ForegroundColor Green
}

if ($env:POSTGRES_ADMIN_PASSWORD) {
    Write-Host "Using provided PostgreSQL admin password" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "NOTE: If PostgreSQL connection fails, you'll be prompted for admin credentials" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing required Python packages..." -ForegroundColor Blue
try {
    pip install -r requirements.txt
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting Postgres setup..." -ForegroundColor Blue
Write-Host ""

# Run the Python setup script
try {
    python cloudflare_postgres_setup.py
    Write-Host ""
    Write-Host "✅ Setup completed! Check the output above for any errors." -ForegroundColor Green
    Write-Host "Your database credentials are saved in .env file" -ForegroundColor Green
} catch {
    Write-Host "❌ Setup script failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "You can now run 'python test_connection.py' to verify the setup" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
