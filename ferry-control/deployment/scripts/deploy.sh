#!/bin/bash

# BC Ferries Dashboard - Safe Deployment Script
# This script implements a safe, monitored deployment with instant rollback capability

set -e  # Exit on any error

# Configuration
APP_NAME="bc-ferries-ops-dashboard"
BACKUP_DIR="./backup"
STAGING_DIR="./staging"
CURRENT_DIR="./current"
SCRIPTS_DIR="./scripts"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v fly &> /dev/null; then
        error "Fly CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        error "curl is not available"
        exit 1
    fi
    
    # Check if we're in the deployment directory
    if [[ ! -d "$CURRENT_DIR" || ! -d "$STAGING_DIR" ]]; then
        error "Must be run from deployment directory with current/ and staging/ subdirectories"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Create backup of current production
create_backup() {
    log "Creating backup of current production..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Download current production files
    curl -s -o "$BACKUP_PATH/index.html" "https://$APP_NAME.fly.dev/" || {
        error "Failed to download current index.html"
        exit 1
    }
    
    curl -s -o "$BACKUP_PATH/dashboard.js" "https://$APP_NAME.fly.dev/js/dashboard.js" || {
        error "Failed to download current dashboard.js"
        exit 1
    }
    
    curl -s -o "$BACKUP_PATH/dashboard.css" "https://$APP_NAME.fly.dev/css/dashboard.css" || {
        error "Failed to download current dashboard.css"
        exit 1
    }
    
    # Store backup reference for rollback
    echo "$BACKUP_PATH" > "$BACKUP_DIR/.last_backup"
    
    success "Backup created at $BACKUP_PATH"
}

# Health check function
health_check() {
    local url=$1
    local max_attempts=${2:-30}
    local attempt=1
    
    log "Performing health check on $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null; then
            success "Health check passed (attempt $attempt/$max_attempts)"
            return 0
        fi
        
        warn "Health check failed (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Deploy to production
deploy_to_production() {
    log "Starting production deployment..."
    
    # Copy staging files to public directory (assuming standard web server structure)
    if [ -f "$STAGING_DIR/index.html" ]; then
        cp "$STAGING_DIR/index.html" "../public/"
        success "Deployed index.html"
    fi
    
    if [ -f "$STAGING_DIR/dashboard.js" ]; then
        mkdir -p "../public/js"
        cp "$STAGING_DIR/dashboard.js" "../public/js/"
        success "Deployed dashboard.js"
    fi
    
    if [ -f "$STAGING_DIR/debug-console.js" ]; then
        cp "$STAGING_DIR/debug-console.js" "../public/js/"
        success "Deployed debug-console.js"
    fi
    
    # Deploy using fly.io
    log "Deploying to Fly.io..."
    cd ..
    fly deploy --no-cache || {
        error "Fly deployment failed"
        return 1
    }
    
    cd deployment
    success "Deployment to Fly.io completed"
}

# Rollback function
rollback() {
    log "Starting rollback procedure..."
    
    if [ ! -f "$BACKUP_DIR/.last_backup" ]; then
        error "No backup reference found"
        exit 1
    fi
    
    BACKUP_PATH=$(cat "$BACKUP_DIR/.last_backup")
    
    if [ ! -d "$BACKUP_PATH" ]; then
        error "Backup directory $BACKUP_PATH not found"
        exit 1
    fi
    
    log "Rolling back to backup: $BACKUP_PATH"
    
    # Copy backup files to public directory
    cp "$BACKUP_PATH/index.html" "../public/"
    mkdir -p "../public/js" "../public/css"
    cp "$BACKUP_PATH/dashboard.js" "../public/js/"
    cp "$BACKUP_PATH/dashboard.css" "../public/css/"
    
    # Remove debug console if it exists
    rm -f "../public/js/debug-console.js"
    
    # Deploy rollback
    cd ..
    fly deploy --no-cache || {
        error "Rollback deployment failed"
        exit 1
    }
    
    cd deployment
    success "Rollback completed successfully"
}

# Performance monitoring
monitor_performance() {
    log "Starting performance monitoring..."
    
    local start_time=$(date +%s)
    local test_url="https://$APP_NAME.fly.dev/"
    
    # Test page load time
    local load_time=$(curl -o /dev/null -s -w '%{time_total}' "$test_url")
    local load_time_ms=$(echo "$load_time * 1000" | bc)
    
    log "Page load time: ${load_time_ms}ms"
    
    if (( $(echo "$load_time > 5" | bc -l) )); then
        warn "Page load time exceeds 5 seconds"
        return 1
    fi
    
    # Test MQTT connection endpoint (if available)
    if curl -s "$test_url" | grep -q "MQTT"; then
        success "MQTT components detected in page"
    else
        warn "MQTT components not found in page"
    fi
    
    success "Performance monitoring completed"
}

# Main deployment function
main() {
    log "Starting BC Ferries Dashboard Safe Deployment"
    log "=============================================="
    
    # Parse command line arguments
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_backup
            deploy_to_production
            
            # Post-deployment checks
            sleep 5
            if health_check "https://$APP_NAME.fly.dev/"; then
                monitor_performance
                success "Deployment completed successfully!"
                log "Debug features can be enabled by adding '?debug=true' to the URL"
            else
                error "Post-deployment health check failed. Consider rollback."
                exit 1
            fi
            ;;
        "rollback")
            check_prerequisites
            rollback
            
            # Post-rollback checks
            sleep 5
            if health_check "https://$APP_NAME.fly.dev/"; then
                success "Rollback completed successfully!"
            else
                error "Post-rollback health check failed"
                exit 1
            fi
            ;;
        "health-check")
            health_check "https://$APP_NAME.fly.dev/"
            ;;
        "monitor")
            monitor_performance
            ;;
        *)
            echo "Usage: $0 [deploy|rollback|health-check|monitor]"
            echo "  deploy      - Deploy staging files to production (default)"
            echo "  rollback    - Rollback to last backup"
            echo "  health-check - Check production health"
            echo "  monitor     - Monitor performance"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"