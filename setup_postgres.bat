@echo off
echo ========================================
echo Cloudflare Postgres Setup for Codegen
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ and try again
    pause
    exit /b 1
)

REM Install required packages
echo Installing required Python packages...
pip install -r requirements.txt

REM Set environment variables if provided
if not "%CLOUDFLARE_API_TOKEN%"=="" (
    echo Using provided Cloudflare API Token
) else (
    set CLOUDFLARE_API_TOKEN=eae82cf159577a8838cc83612104c09c5a0d6
)

if not "%CLOUDFLARE_ACCOUNT_ID%"=="" (
    echo Using provided Cloudflare Account ID
) else (
    set CLOUDFLARE_ACCOUNT_ID=2b2a1d3effa7f7fe4fe2a8c4e48681e3
)

if not "%CLOUDFLARE_WORKER_NAME%"=="" (
    echo Using provided Worker Name
) else (
    set CLOUDFLARE_WORKER_NAME=neon-db
)

if not "%CLOUDFLARE_WORKER_URL%"=="" (
    echo Using provided Worker URL
) else (
    set CLOUDFLARE_WORKER_URL=https://neon-db.pixeliumperfecto.workers.dev
)

REM PostgreSQL admin credentials (optional)
if not "%POSTGRES_ADMIN_USER%"=="" (
    echo Using provided PostgreSQL admin user: %POSTGRES_ADMIN_USER%
)

if not "%POSTGRES_ADMIN_PASSWORD%"=="" (
    echo Using provided PostgreSQL admin password
) else (
    echo.
    echo NOTE: If PostgreSQL connection fails, you'll be prompted for admin credentials
)

echo.
echo Starting Postgres setup...
echo.

REM Run the Python setup script
python cloudflare_postgres_setup.py

echo.
echo Setup completed! Check the output above for any errors.
echo Your database credentials are saved in .env file
echo.
pause
