# Open SWE Deployment Scripts

This repository contains improved deployment scripts for Open SWE that fix common issues and use a static webhook secret as requested.

## 🚀 Quick Start

### 1. Use the Fixed Deployment Script
```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

### 2. Fix Any Issues (if needed)
```bash
# Run the fix script to address common problems
./fix-deployment.sh
```

### 3. Start the Application
```bash
cd open-swe
./start-all.sh
```

## 📋 What's Fixed

### ✅ Static Webhook Secret
- **Issue**: Original script generated random webhook secrets
- **Fix**: Now always uses "123" as the webhook secret
- **Location**: Line in `create_environment_files()` function

### ✅ GitHub Private Key Format
- **Issue**: Private key format was causing JWT signing errors
- **Fix**: Proper RSA private key format with correct line breaks
- **Error Fixed**: `secretOrPrivateKey must be an asymmetric key when using RS256`

### ✅ Start Script Logging
- **Issue**: `log_success: command not found` error
- **Fix**: Added logging functions to the start script
- **Result**: Clean startup output with proper colors

### ✅ Environment File Structure
- **Issue**: Missing or incorrectly formatted environment variables
- **Fix**: Proper .env file structure for both web and agent apps

## 🔧 Key Changes Made

### 1. Static Webhook Secret
```bash
# OLD (random):
WEBHOOK_SECRET=$(openssl rand -hex 32)

# NEW (static):
WEBHOOK_SECRET="123"
```

### 2. Fixed Private Key Format
The private key is now properly formatted as a valid RSA key that can be used with JWT RS256 algorithm.

### 3. Improved Start Script
- Added proper logging functions
- Better error handling
- Cleaner output formatting

### 4. Environment File Fixes
- Consistent SECRETS_ENCRYPTION_KEY across both files
- Proper GitHub App configuration
- Correct API URLs and ports

## 🐛 Common Issues & Solutions

### Issue: GitHub Authentication Errors
**Symptoms**: 
- `Failed to get installation token`
- `secretOrPrivateKey must be an asymmetric key`

**Solution**:
1. Run `./fix-deployment.sh`
2. Follow the GitHub App setup guide in `GITHUB_APP_SETUP.md`
3. Replace the temporary private key with your real GitHub App private key

### Issue: Start Script Errors
**Symptoms**:
- `log_success: command not found`
- Missing colored output

**Solution**:
The fixed `start-all.sh` script includes all necessary logging functions.

### Issue: Port Conflicts
**Symptoms**:
- `EADDRINUSE` errors
- Services not starting

**Solution**:
```bash
# Kill any existing processes on the ports
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:2024 | xargs kill -9

# Then restart
cd open-swe && ./start-all.sh
```

## 📁 File Structure

```
.
├── deploy.sh              # Main deployment script (FIXED)
├── fix-deployment.sh      # Additional fixes script
├── DEPLOYMENT_README.md   # This file
└── open-swe/             # Created by deployment script
    ├── apps/
    │   ├── web/.env      # Web app environment (FIXED)
    │   └── open-swe/.env # Agent environment (FIXED)
    └── start-all.sh      # Startup script (FIXED)
```

## 🔐 Security Notes

### Development vs Production

**Development (Current Setup)**:
- Uses static webhook secret "123"
- Includes temporary RSA private key
- Suitable for local testing

**Production Setup**:
- Generate secure webhook secret
- Use real GitHub App private key
- Set proper environment variables
- Use HTTPS endpoints

### GitHub App Setup for Production

1. Create a GitHub App in your GitHub organization
2. Generate and download the private key
3. Replace the temporary key in both `.env` files
4. Update the App ID and client credentials
5. Set webhook secret to "123" in GitHub App settings

## 🚀 Usage Examples

### Basic Deployment
```bash
# Clone this repository
git clone <your-repo>
cd <your-repo>

# Run deployment
./deploy.sh

# Start services
cd open-swe
./start-all.sh
```

### Fix Existing Deployment
```bash
# If you already have open-swe but it's not working
./fix-deployment.sh

# Restart services
cd open-swe
./start-all.sh
```

### Custom Configuration
```bash
# Edit environment files before starting
nano open-swe/apps/web/.env
nano open-swe/apps/open-swe/.env

# Add your API keys, then start
cd open-swe
./start-all.sh
```

## 📞 Support

If you encounter issues:

1. Check the logs in the terminal where you ran `./start-all.sh`
2. Verify your GitHub App configuration
3. Ensure all required API keys are set
4. Run `./fix-deployment.sh` to apply additional fixes

## 🎯 Success Indicators

When everything is working correctly, you should see:

1. **Deployment Script**: Completes without errors, shows webhook secret as "123"
2. **Start Script**: Both services start with colored output, no "command not found" errors
3. **Web Interface**: Accessible at http://localhost:3000 without authentication errors
4. **API**: LangGraph API running at http://localhost:2024

The main fix is that your webhook secret will now always be "123" instead of a random value, and all the GitHub authentication issues should be resolved.

