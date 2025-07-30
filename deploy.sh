#!/bin/bash

# deployment.sh - Complete Open SWE Deployment Script
# This script handles the full deployment setup for Open SWE, including installing prerequisites.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Logging Functions ---
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# --- Prerequisite Setup ---
# This function checks for and installs required tools like Git, OpenSSL, Node.js, and Yarn.
setup_prerequisites() {
    log_info "Setting up prerequisites..."

    # Update package list
    sudo apt-get update > /dev/null 2>&1

    # Check for Git, OpenSSL, and curl
    for pkg in git openssl curl; do
        if ! command -v $pkg &> /dev/null; then
            log_warning "$pkg is not installed. Installing..."
            sudo apt-get install -y $pkg
            log_success "$pkg installed."
        else
            log_success "$pkg is already installed."
        fi
    done

    # --- Node.js and NVM Setup ---
    export NVM_DIR="$HOME/.nvm"
    NODE_VERSION_REQUIRED=18
    
    # Source NVM if it's already installed
    if [ -s "$NVM_DIR/nvm.sh" ]; then
      source "$NVM_DIR/nvm.sh"
    fi

    # Install NVM if it's not installed
    if ! command -v nvm &> /dev/null; then
        log_warning "NVM not found. Installing..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        # Source the new nvm script to make it available in this session
        source "$NVM_DIR/nvm.sh"
    fi
    
    # Now that NVM is available, check for the required Node.js version
    # We default to '0' if no version is installed yet.
    CURRENT_NODE_VERSION=$(nvm current 2>/dev/null | sed 's/v//' | cut -d'.' -f1 || echo "0")
    if [ "$CURRENT_NODE_VERSION" -ge "$NODE_VERSION_REQUIRED" ]; then
        log_success "Node.js v$(nvm current) is installed and meets the requirement (>= v$NODE_VERSION_REQUIRED)."
    else
        log_warning "Required Node.js version not found. Installing Node.js LTS..."
        nvm install --lts
        nvm use --lts
        nvm alias default 'lts/*'
        log_success "Node.js $(node -v) is now installed and in use."
    fi

    # --- Yarn and Corepack Setup ---
    log_info "Enabling Corepack to manage Yarn version..."
    # Corepack is bundled with Node.js and manages package manager versions.
    # This command ensures it's active and will use the yarn version from the project's package.json.
    corepack enable
    log_success "Corepack enabled. Yarn will be managed automatically."
}


# --- Repository Setup ---
setup_repository() {
    if [ ! -d "open-swe" ]; then
        log_info "Cloning Open SWE repository..."
        git clone https://github.com/langchain-ai/open-swe.git
        cd open-swe
    else
        log_info "Repository already exists, entering directory and pulling latest changes..."
        cd open-swe
        git pull origin main
    fi
    log_success "Repository setup complete."
}

# --- Install Dependencies ---
install_dependencies() {
    log_info "Installing dependencies with Yarn (managed by Corepack)..."
    # Ensure nvm's Node.js version is used
    source "$HOME/.nvm/nvm.sh"
    # Corepack will handle getting the right Yarn version
    yarn install
    log_success "Dependencies installed successfully."
}

# --- Build Project ---
build_project() {
    log_info "Building the project packages..."
    source "$HOME/.nvm/nvm.sh"
    yarn build
    log_success "Project built successfully."
}

# --- Create Environment Files ---
create_environment_files() {
    log_info "Creating environment files..."

    # Generate encryption keys
    SECRETS_ENCRYPTION_KEY=$(openssl rand -hex 32)
    # Use static webhook secret as requested
    WEBHOOK_SECRET="123"

    # Create apps/web/.env
    log_info "Creating web app environment file (apps/web/.env)..."
    cat > apps/web/.env << EOF
# GitHub App OAuth settings
NEXT_PUBLIC_GITHUB_APP_CLIENT_ID="Iv23li9PqHMExi84gaq1"
GITHUB_APP_CLIENT_SECRET="d1fbd80a53d530773b3361f23efab3732c436a7b"
GITHUB_APP_REDIRECT_URI="http://localhost:3000/api/auth/github/callback"

# Encryption key for secrets
SECRETS_ENCRYPTION_KEY="$SECRETS_ENCRYPTION_KEY"

# GitHub App details
GITHUB_APP_NAME="zeeeepa"
GITHUB_APP_ID="1484403"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAtUlGIe5pVo8j0rUV7E8+SdXreSNqcbCBotJnQ4WR4WzxjCLm
z8etfUi7e0446AqXPxgec+RgYNpv9S5pJWbuqYFYmKM0GSGiPSrthx4m4RGKWTg3
fhRXvvKCUuV8EZXH9bGHOAsqw8/VLVIfiZOSoKC0A9UzwV9NVK38EcPBWRevefaz
tggWEsqqpOOA2fZZCqWHzfHgieyQzHhXSGTq9I3Z6UgL2rXuNLaqBE/u5wAEaVOy
/EB7XspyyFUHQbzmIZdwMx1EkDvVQBHQfUigC6MQc4QbPE7Q8W950ZiG05PUn/ot
WsUAIYfhIFxOe1rdX6TKRiFF8HeJu9oDwuv2oQIDAQABAoIBAQCrreis2YsIXiYe
tT89uw3R/rQw1ElJwU4DVB5W43dzdCiL/cF3pDG4I9jovPtHREBXkA/G0NA06Kh+
GKWatg/uln/AjU4ZPrDWHIE1JGjNXD8YnxRuYfV271JcDtegD6h+FNFpUan+JiRL
9ynGr+p8E7RmrNGGnyost1evuyKvqxPYW23QaIWxW6VIVAsmdQ6dPYunO5wS/i7n
x7A66dTwGrrIS1oxz01tfwJXyYNooHGDKxYb9HQnNEdVqHVzUTsPT77WXrBA3QBb
AcK6DrI5GzIR0WxnaIoSxZ9wXVaSFK1LJg9zY/NqsigdbEuL/xcWW4O4w1c2ZIC
lX9yqIABAoGBAPGsBi7KfNwfsT30gG46Z6FEMHy6KNbruFyLhmArumP3SThvRbf1
fw6KW/ebM0gFQJihPuepQ5O4MavlXjuuvO+JbhhqshGKti8SRQQK/8ATb+MNFwS
BEAxyB4zfNagj4kjRv4tZh8J68QUJNvSU+Lg9ZbYR9yUnC8x2ENs9LrBAoGBAMAI
vsxpTozurAqJNnHg9YTy0pbnZ+CS8TW/PC2dQGfdMfmRvhPB24bQVCQTwVySK8ZI
8yyL07hyrLKW3kOzIwSJBIBsBV28HpOdDVDNqJ9tnM9dbj6RW3DNiz+ZQfQPpv0H
GOU35/axVnYYsmR0fUQ6Wq699tyF3jI7LRpBV5PhAoGAJGsb82koL7PG7eMuh23d
t/uioukaxmh3O9r6wPtV90KIkiySgQpW2M+a9vS5yJ+RCu71w0VA8ksIrGhBShwP
qDN7U7HEHrIUOt0E1jUprB/Ll5X1PfqpEVNvKL3xjhZcCvp59Eu7G+pO0RmIBGhJ
o+Lqn3SwP5lVf/cu89ozdwECgYEAo1DMs5t7qm/w8KTxILhpFcBNSPlUZrGRYlxZ
GZH7DFoZ/l3sgXEE+gqDBIuojsnhYKj55pCkZuFf7iJQtNLMnTbKFU3I4obymief
A3FkTvIxwkl7UMreMXkdS+FTLfWB1v8KNSbup+b52UX3sWdAgZ3/MU1tfO58ocuh
+ApKKQECgYBh9nZt71xoQwZNvF1f6oz5Frovt3iyz0+9VspxQl3jfSt3r+u6RKji0
UeVr+E8TKwRv+s0L8cldMfGOOs1bGQWpYUlkjI6402SVytXFEygEr5ARARCIanX5
D2WDdIlCKdkmycpaXbEc9IBmmeILhTi+CET+zsqEnTGbNd0HC5SJZQ==
-----END RSA PRIVATE KEY-----"

# API URLs for development
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
LANGGRAPH_API_URL="http://localhost:2024"
EOF

    # Create apps/open-swe/.env
    log_info "Creating agent environment file (apps/open-swe/.env)..."
    cat > apps/open-swe/.env << EOF
# LangSmith tracing & LangGraph platform
LANGCHAIN_PROJECT="default"
LANGCHAIN_API_KEY="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"
LANGCHAIN_TRACING_V2="true"

# LLM Provider Keys (add your own)
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
GOOGLE_API_KEY="AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0"

# Infrastructure
DAYTONA_API_KEY="dtn_c68c510cc530924d82188aa3d3ddeef5d4a2fdd05eab23363adef4992a5a5a88"

# Tools
FIRECRAWL_API_KEY="fc-1bea6be3d4804506b6d3888040b9af1e"

# GitHub App settings
GITHUB_APP_NAME="zeeeepa"
GITHUB_APP_ID="1484403"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAtUlGIe5pVo8j0rUV7E8+SdXreSNqcbCBotJnQ4WR4WzxjCLm
z8etfUi7e0446AqXPxgec+RgYNpv9S5pJWbuqYFYmKM0GSGiPSrthx4m4RGKWTg3
fhRXvvKCUuV8EZXH9bGHOAsqw8/VLVIfiZOSoKC0A9UzwV9NVK38EcPBWRevefaz
tggWEsqqpOOA2fZZCqWHzfHgieyQzHhXSGTq9I3Z6UgL2rXuNLaqBE/u5wAEaVOy
/EB7XspyyFUHQbzmIZdwMx1EkDvVQBHQfUigC6MQc4QbPE7Q8W950ZiG05PUn/ot
WsUAIYfhIFxOe1rdX6TKRiFF8HeJu9oDwuv2oQIDAQABAoIBAQCrreis2YsIXiYe
tT89uw3R/rQw1ElJwU4DVB5W43dzdCiL/cF3pDG4I9jovPtHREBXkA/G0NA06Kh+
GKWatg/uln/AjU4ZPrDWHIE1JGjNXD8YnxRuYfV271JcDtegD6h+FNFpUan+JiRL
9ynGr+p8E7RmrNGGnyost1evuyKvqxPYW23QaIWxW6VIVAsmdQ6dPYunO5wS/i7n
x7A66dTwGrrIS1oxz01tfwJXyYNooHGDKxYb9HQnNEdVqHVzUTsPT77WXrBA3QBb
AcK6DrI5GzIR0WxnaIoSxZ9wXVaSFK1LJg9zY/NqsigdbEuL/xcWW4O4w1c2ZIC
lX9yqIABAoGBAPGsBi7KfNwfsT30gG46Z6FEMHy6KNbruFyLhmArumP3SThvRbf1
fw6KW/ebM0gFQJihPuepQ5O4MavlXjuuvO+JbhhqshGKti8SRQQK/8ATb+MNFwS
BEAxyB4zfNagj4kjRv4tZh8J68QUJNvSU+Lg9ZbYR9yUnC8x2ENs9LrBAoGBAMAI
vsxpTozurAqJNnHg9YTy0pbnZ+CS8TW/PC2dQGfdMfmRvhPB24bQVCQTwVySK8ZI
8yyL07hyrLKW3kOzIwSJBIBsBV28HpOdDVDNqJ9tnM9dbj6RW3DNiz+ZQfQPpv0H
GOU35/axVnYYsmR0fUQ6Wq699tyF3jI7LRpBV5PhAoGAJGsb82koL7PG7eMuh23d
t/uioukaxmh3O9r6wPtV90KIkiySgQpW2M+a9vS5yJ+RCu71w0VA8ksIrGhBShwP
qDN7U7HEHrIUOt0E1jUprB/Ll5X1PfqpEVNvKL3xjhZcCvp59Eu7G+pO0RmIBGhJ
o+Lqn3SwP5lVf/cu89ozdwECgYEAo1DMs5t7qm/w8KTxILhpFcBNSPlUZrGRYlxZ
GZH7DFoZ/l3sgXEE+gqDBIuojsnhYKj55pCkZuFf7iJQtNLMnTbKFU3I4obymief
A3FkTvIxwkl7UMreMXkdS+FTLfWB1v8KNSbup+b52UX3sWdAgZ3/MU1tfO58ocuh
+ApKKQECgYBh9nZt71xoQwZNvF1f6oz5Frovt3iyz0+9VspxQl3jfSt3r+u6RKji0
UeVr+E8TKwRv+s0L8cldMfGOOs1bGQWpYUlkjI6402SVytXFEygEr5ARARCIanX5
D2WDdIlCKdkmycpaXbEc9IBmmeILhTi+CET+zsqEnTGbNd0HC5SJZQ==
-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET="$WEBHOOK_SECRET"

# Server configuration
PORT="2024"
OPEN_SWE_APP_URL="http://localhost:3000"
SECRETS_ENCRYPTION_KEY="$SECRETS_ENCRYPTION_KEY"
EOF

    log_success "Environment files created successfully."
    log_warning "Please fill in any missing API keys (e.g., ANTHROPIC_API_KEY) in apps/open-swe/.env"
}

# --- Create Startup Scripts ---
create_startup_scripts() {
    log_info "Creating startup scripts..."

    # Create start-all.sh for concurrent startup
    cat > start-all.sh << 'EOF'
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Logging Functions ---
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🚀 Starting Open SWE (All Services)..."

# Function to handle cleanup on exit
cleanup() {
    echo ""
    log_warning "🛑 Shutting down all services..."
    # Kill all background jobs of this script
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Set up trap to call cleanup function on script exit (Ctrl+C)
trap cleanup SIGINT SIGTERM

# Source NVM to ensure correct Node version is used
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Start agent in background
echo "🤖 Starting LangGraph Agent in 'apps/open-swe'..."
(cd apps/open-swe && yarn dev) &

# Wait a moment for the agent to initialize
sleep 5

# Start web interface in background
echo "🌐 Starting Web Interface in 'apps/web'..."
(cd apps/web && yarn dev) &

echo ""
log_success "✅ Open SWE is running!"
echo "   LangGraph Agent: http://localhost:2024"
echo "   Web Interface:   http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for all background processes to finish
wait
EOF
    chmod +x start-all.sh

    log_success "Startup script 'start-all.sh' created."
}

# --- Display Final Instructions ---
display_instructions() {
    echo ""
    echo -e "🎉 ${GREEN}Open SWE setup is complete!${NC}"
    echo ""
    log_info "Important Generated Values:"
    echo "   - A unique SECRETS_ENCRYPTION_KEY has been set in both .env files."
    echo "   - Your GITHUB_WEBHOOK_SECRET is: ${YELLOW}123${NC}"
    echo ""
    log_warning "ACTION REQUIRED: Update your GitHub App's webhook secret to \"123\" in your GitHub App settings."
    echo ""
    log_info "To start the application, first navigate into the 'open-swe' directory:"
    echo "   cd open-swe"
    echo "Then run:"
    echo "   ./start-all.sh"
    echo ""
    log_info "Once started, access the services at:"
    echo "   - Web Interface: http://localhost:3000"
    echo "   - LangGraph API: http://localhost:2024"
    echo ""
}

# --- Main Deployment Function ---
main() {
    echo "🚀 Open SWE Complete Deployment Script"
    echo "======================================"
    echo ""

    setup_prerequisites
    setup_repository
    install_dependencies
    build_project
    create_environment_files
    create_startup_scripts
    display_instructions

    echo ""
    log_success "Deployment script finished successfully! 🎉"
}

# Run the main function
main "$@"

