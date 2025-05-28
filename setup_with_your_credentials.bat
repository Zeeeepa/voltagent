@echo off
echo ========================================
echo Cloudflare Postgres Setup for Codegen
echo Using Your Provided Credentials
echo ========================================
echo.

REM Set your specific Cloudflare credentials
set CLOUDFLARE_GLOBAL_API_KEY=eae82cf159577a8838cc83612104c09c5a0d6
set CLOUDFLARE_ACCOUNT_ID=2b2a1d3effa7f7fe4fe2a8c4e48681e3
set CLOUDFLARE_WORKER_NAME=neon-db
set CLOUDFLARE_WORKER_URL=https://neon-db.pixeliumperfecto.workers.dev

REM You need to set your Cloudflare email address
echo IMPORTANT: Please enter your Cloudflare account email address
set /p CLOUDFLARE_EMAIL="Cloudflare Email: "

if "%CLOUDFLARE_EMAIL%"=="" (
    echo ERROR: Email is required for Global API Key authentication
    pause
    exit /b 1
)

echo.
echo Using credentials:
echo - Global API Key: %CLOUDFLARE_GLOBAL_API_KEY%
echo - Email: %CLOUDFLARE_EMAIL%
echo - Account ID: %CLOUDFLARE_ACCOUNT_ID%
echo - Worker Name: %CLOUDFLARE_WORKER_NAME%
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

