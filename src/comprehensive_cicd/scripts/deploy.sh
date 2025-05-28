#!/bin/bash

# Comprehensive CI/CD System Deployment Script
# This script sets up and deploys the Claude Code Validation Integration system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"
DOCKER_COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check Node.js (for local development)
    if ! command -v node &> /dev/null; then
        log_warning "Node.js is not installed. This is required for local development."
    fi
    
    # Check PostgreSQL client (optional)
    if ! command -v psql &> /dev/null; then
        log_warning "PostgreSQL client is not installed. Database operations may be limited."
    fi
    
    log_success "Dependencies check completed"
}

setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log_info "Creating .env file from template..."
        cp "$PROJECT_DIR/.env.example" "$ENV_FILE"
        
        # Generate random secrets
        JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "default-jwt-secret-$(date +%s)")
        POSTGRES_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "cicd_password_$(date +%s)")
        
        # Update .env file with generated secrets
        sed -i.bak "s/your-jwt-secret-key/$JWT_SECRET/g" "$ENV_FILE"
        sed -i.bak "s/cicd_password/$POSTGRES_PASSWORD/g" "$ENV_FILE"
        
        log_success "Environment file created: $ENV_FILE"
        log_warning "Please review and update the configuration in $ENV_FILE"
    else
        log_info "Environment file already exists: $ENV_FILE"
    fi
}

build_application() {
    log_info "Building application..."
    
    cd "$PROJECT_DIR"
    
    # Install dependencies
    if [ -f "package.json" ]; then
        log_info "Installing Node.js dependencies..."
        npm install
        
        # Build TypeScript
        log_info "Building TypeScript..."
        npm run build
        
        log_success "Application built successfully"
    else
        log_warning "No package.json found, skipping Node.js build"
    fi
}

setup_database() {
    log_info "Setting up database..."
    
    # Start PostgreSQL container
    docker-compose up -d postgres
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker-compose exec -T postgres pg_isready -U cicd_user -d comprehensive_cicd; then
            log_success "PostgreSQL is ready"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL failed to start within 30 seconds"
            exit 1
        fi
        
        sleep 1
    done
    
    # Run database migrations
    log_info "Running database migrations..."
    docker-compose exec -T postgres psql -U cicd_user -d comprehensive_cicd -f /docker-entrypoint-initdb.d/01-schema.sql || true
    
    log_success "Database setup completed"
}

start_services() {
    log_info "Starting all services..."
    
    cd "$PROJECT_DIR"
    
    # Start all services
    docker-compose up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    
    # Check API health
    for i in {1..60}; do
        if curl -f http://localhost:3000/health &> /dev/null; then
            log_success "API server is ready"
            break
        fi
        
        if [ $i -eq 60 ]; then
            log_error "API server failed to start within 60 seconds"
            docker-compose logs cicd-api
            exit 1
        fi
        
        sleep 1
    done
    
    log_success "All services started successfully"
}

run_tests() {
    log_info "Running tests..."
    
    cd "$PROJECT_DIR"
    
    # Run unit tests
    if [ -f "package.json" ]; then
        npm test
        log_success "Tests completed successfully"
    else
        log_warning "No package.json found, skipping tests"
    fi
}

show_status() {
    log_info "Service Status:"
    echo
    
    # Show Docker containers
    docker-compose ps
    echo
    
    # Show service URLs
    log_info "Service URLs:"
    echo "  🚀 API Server: http://localhost:3000"
    echo "  📊 Health Check: http://localhost:3000/health"
    echo "  📈 Metrics: http://localhost:3000/api/v1/metrics"
    echo "  🗄️  PostgreSQL: localhost:5432"
    echo "  🔴 Redis: localhost:6379"
    echo "  🧪 Mock AgentAPI: http://localhost:8000"
    echo
    
    # Show logs command
    log_info "To view logs:"
    echo "  docker-compose logs -f [service-name]"
    echo
    
    # Show stop command
    log_info "To stop services:"
    echo "  docker-compose down"
    echo
}

cleanup() {
    log_info "Cleaning up..."
    
    cd "$PROJECT_DIR"
    
    # Stop and remove containers
    docker-compose down -v
    
    # Remove images (optional)
    if [ "$1" = "--remove-images" ]; then
        docker-compose down --rmi all
        log_info "Docker images removed"
    fi
    
    log_success "Cleanup completed"
}

# Main deployment function
deploy() {
    local mode="$1"
    
    log_info "Starting Comprehensive CI/CD System deployment..."
    log_info "Mode: $mode"
    echo
    
    case "$mode" in
        "development"|"dev")
            check_dependencies
            setup_environment
            build_application
            setup_database
            start_services
            show_status
            ;;
        "production"|"prod")
            check_dependencies
            setup_environment
            build_application
            setup_database
            # Use production profile
            COMPOSE_PROFILES=production docker-compose up -d
            show_status
            ;;
        "test")
            check_dependencies
            setup_environment
            build_application
            run_tests
            ;;
        "monitoring")
            check_dependencies
            setup_environment
            setup_database
            # Use monitoring profile
            COMPOSE_PROFILES=monitoring docker-compose up -d
            show_status
            ;;
        "cleanup")
            cleanup "$2"
            ;;
        *)
            log_error "Invalid mode: $mode"
            echo "Usage: $0 {development|production|test|monitoring|cleanup}"
            echo
            echo "Modes:"
            echo "  development  - Deploy for development with hot reload"
            echo "  production   - Deploy for production with optimizations"
            echo "  test         - Run tests only"
            echo "  monitoring   - Deploy with monitoring stack (Prometheus/Grafana)"
            echo "  cleanup      - Stop and remove all containers"
            echo
            exit 1
            ;;
    esac
}

# Script entry point
if [ $# -eq 0 ]; then
    deploy "development"
else
    deploy "$@"
fi

