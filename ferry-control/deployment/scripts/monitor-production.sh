#!/bin/bash

# BC Ferries Dashboard - Production Monitoring Script
# Real-time monitoring and alerting for production deployment

set -e

# Configuration
APP_NAME="bc-ferries-ops-dashboard"
TEST_URL="https://$APP_NAME.fly.dev"
MONITOR_INTERVAL=30  # seconds
ALERT_THRESHOLD_LOAD_TIME=5  # seconds
ALERT_THRESHOLD_ERROR_RATE=5  # percent
LOG_FILE="./monitor.log"
ALERT_FILE="./alerts.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
SUCCESS_COUNT=0
ERROR_COUNT=0
ALERT_COUNT=0

log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${BLUE}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

error() {
    local message="[ERROR] $1"
    echo -e "${RED}$message${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $message" >> "$ALERT_FILE"
    ((ALERT_COUNT++))
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    local message="[WARNING] $1"
    echo -e "${YELLOW}$message${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
}

# Initialize log files
initialize_logs() {
    touch "$LOG_FILE" "$ALERT_FILE"
    log "Production monitoring started"
    log "Target: $TEST_URL"
    log "Interval: ${MONITOR_INTERVAL}s"
}

# Health check function
perform_health_check() {
    local start_time=$(date +%s.%N)
    local http_status=""
    local load_time=""
    local response_size=""
    
    # Perform the request
    local curl_output=$(curl -o /dev/null -s -w '%{http_code}|%{time_total}|%{size_download}' \
                       --connect-timeout 10 --max-time 30 "$TEST_URL" 2>/dev/null || echo "000|0|0")
    
    IFS='|' read -r http_status load_time response_size <<< "$curl_output"
    
    local end_time=$(date +%s.%N)
    local check_duration=$(echo "$end_time - $start_time" | bc)
    
    ((TOTAL_CHECKS++))
    
    # Analyze results
    if [ "$http_status" = "200" ]; then
        ((SUCCESS_COUNT++))
        
        # Check load time
        if (( $(echo "$load_time > $ALERT_THRESHOLD_LOAD_TIME" | bc -l) )); then
            warn "High load time: ${load_time}s (threshold: ${ALERT_THRESHOLD_LOAD_TIME}s)"
        fi
        
        # Log successful check
        log "Health check OK - Status: $http_status, Load: ${load_time}s, Size: ${response_size}b"
        
    else
        ((ERROR_COUNT++))
        error "Health check FAILED - Status: $http_status, Time: ${check_duration}s"
        
        # Additional diagnostics on failure
        check_dns_resolution
        check_ssl_certificate
    fi
    
    # Calculate error rate
    local error_rate=$(echo "scale=2; $ERROR_COUNT * 100 / $TOTAL_CHECKS" | bc)
    
    if (( $(echo "$error_rate > $ALERT_THRESHOLD_ERROR_RATE" | bc -l) )); then
        error "High error rate: ${error_rate}% (threshold: ${ALERT_THRESHOLD_ERROR_RATE}%)"
        suggest_rollback
    fi
    
    return $([ "$http_status" = "200" ] && echo 0 || echo 1)
}

# DNS resolution check
check_dns_resolution() {
    log "Checking DNS resolution..."
    local hostname="${TEST_URL#https://}"
    hostname="${hostname#http://}"
    
    if nslookup "$hostname" > /dev/null 2>&1; then
        success "DNS resolution OK"
    else
        error "DNS resolution failed for $hostname"
    fi
}

# SSL certificate check
check_ssl_certificate() {
    log "Checking SSL certificate..."
    local hostname="${TEST_URL#https://}"
    hostname="${hostname#http://}"
    
    if echo | timeout 10 openssl s_client -servername "$hostname" -connect "$hostname:443" 2>/dev/null | grep -q "Verify return code: 0"; then
        success "SSL certificate OK"
    else
        warn "SSL certificate verification failed"
    fi
}

# Check specific endpoints
check_critical_endpoints() {
    local endpoints=(
        "/js/dashboard.js"
        "/js/debug-console.js"
        "/css/dashboard.css"
    )
    
    log "Checking critical endpoints..."
    
    for endpoint in "${endpoints[@]}"; do
        local url="$TEST_URL$endpoint"
        local status=$(curl -o /dev/null -s -w '%{http_code}' --connect-timeout 5 "$url")
        
        if [ "$status" = "200" ]; then
            success "Endpoint OK: $endpoint"
        else
            warn "Endpoint issue: $endpoint (Status: $status)"
        fi
    done
}

# Test debug functionality
test_debug_functionality() {
    log "Testing debug functionality..."
    
    local debug_url="${TEST_URL}?debug=true"
    local status=$(curl -o /dev/null -s -w '%{http_code}' --connect-timeout 10 "$debug_url")
    
    if [ "$status" = "200" ]; then
        success "Debug mode accessible"
    else
        warn "Debug mode not accessible (Status: $status)"
    fi
}

# Performance monitoring
monitor_performance_metrics() {
    log "Collecting performance metrics..."
    
    # Multiple requests to get average
    local total_time=0
    local requests=5
    
    for ((i=1; i<=requests; i++)); do
        local load_time=$(curl -o /dev/null -s -w '%{time_total}' --connect-timeout 10 "$TEST_URL")
        total_time=$(echo "$total_time + $load_time" | bc)
    done
    
    local avg_time=$(echo "scale=3; $total_time / $requests" | bc)
    log "Average load time over $requests requests: ${avg_time}s"
    
    if (( $(echo "$avg_time > $ALERT_THRESHOLD_LOAD_TIME" | bc -l) )); then
        warn "Average load time exceeds threshold"
    fi
}

# Suggest rollback if issues detected
suggest_rollback() {
    error "CRITICAL: Multiple issues detected!"
    error "Consider rolling back the deployment:"
    error "  ./scripts/deploy.sh rollback"
    error ""
    error "Or disable debug features:"
    error "  Check debug console for issues at: ${TEST_URL}?debug=true"
}

# Generate monitoring report
generate_monitoring_report() {
    local uptime_percentage=$(echo "scale=2; $SUCCESS_COUNT * 100 / $TOTAL_CHECKS" | bc)
    local error_rate=$(echo "scale=2; $ERROR_COUNT * 100 / $TOTAL_CHECKS" | bc)
    
    log "=============================================="
    log "MONITORING REPORT"
    log "=============================================="
    log "Total Checks: $TOTAL_CHECKS"
    log "Successful: $SUCCESS_COUNT (${uptime_percentage}%)"
    log "Failed: $ERROR_COUNT (${error_rate}%)"
    log "Alerts Triggered: $ALERT_COUNT"
    log "Monitoring Duration: $((TOTAL_CHECKS * MONITOR_INTERVAL))s"
    log "=============================================="
    
    # Save detailed report
    local report_file="./monitoring_report_$(date +%Y%m%d_%H%M%S).txt"
    {
        echo "BC Ferries Dashboard - Monitoring Report"
        echo "Generated: $(date)"
        echo "Monitoring Period: $((TOTAL_CHECKS * MONITOR_INTERVAL)) seconds"
        echo ""
        echo "Summary:"
        echo "  Total Health Checks: $TOTAL_CHECKS"
        echo "  Successful Checks: $SUCCESS_COUNT"
        echo "  Failed Checks: $ERROR_COUNT"
        echo "  Uptime Percentage: ${uptime_percentage}%"
        echo "  Error Rate: ${error_rate}%"
        echo "  Alerts Triggered: $ALERT_COUNT"
        echo ""
        echo "Thresholds:"
        echo "  Load Time Alert: ${ALERT_THRESHOLD_LOAD_TIME}s"
        echo "  Error Rate Alert: ${ALERT_THRESHOLD_ERROR_RATE}%"
        echo ""
        echo "Recent Log Entries:"
        tail -20 "$LOG_FILE"
        echo ""
        echo "Recent Alerts:"
        tail -10 "$ALERT_FILE" 2>/dev/null || echo "No alerts recorded"
        
    } > "$report_file"
    
    log "Detailed report saved to: $report_file"
}

# Display real-time dashboard
display_dashboard() {
    clear
    echo "=============================================="
    echo "🚢 BC Ferries Dashboard - Live Monitoring"
    echo "=============================================="
    echo "Target: $TEST_URL"
    echo "Started: $(date)"
    echo "Check Interval: ${MONITOR_INTERVAL}s"
    echo ""
    echo "Current Status:"
    echo "  Total Checks: $TOTAL_CHECKS"
    echo "  Success Rate: $([ $TOTAL_CHECKS -gt 0 ] && echo "scale=1; $SUCCESS_COUNT * 100 / $TOTAL_CHECKS" | bc || echo "0")%"
    echo "  Error Rate: $([ $TOTAL_CHECKS -gt 0 ] && echo "scale=1; $ERROR_COUNT * 100 / $TOTAL_CHECKS" | bc || echo "0")%"
    echo "  Alerts: $ALERT_COUNT"
    echo ""
    echo "Thresholds:"
    echo "  Load Time Alert: > ${ALERT_THRESHOLD_LOAD_TIME}s"
    echo "  Error Rate Alert: > ${ALERT_THRESHOLD_ERROR_RATE}%"
    echo ""
    echo "Last 5 Log Entries:"
    tail -5 "$LOG_FILE" 2>/dev/null | sed 's/^/  /' || echo "  (No logs yet)"
    echo ""
    echo "Press Ctrl+C to stop monitoring and generate report"
    echo "=============================================="
}

# Cleanup and exit handler
cleanup_and_exit() {
    log "Monitoring stopped by user"
    generate_monitoring_report
    
    if [ $ALERT_COUNT -gt 0 ]; then
        warn "⚠️  $ALERT_COUNT alerts were triggered during monitoring"
        warn "Check $ALERT_FILE for details"
    else
        success "✅ No alerts triggered - deployment appears stable"
    fi
    
    exit 0
}

# Main monitoring loop
monitor_loop() {
    while true; do
        display_dashboard
        
        # Perform health check
        perform_health_check
        
        # Additional checks every 10th iteration
        if [ $((TOTAL_CHECKS % 10)) -eq 0 ] && [ $TOTAL_CHECKS -gt 0 ]; then
            check_critical_endpoints
            test_debug_functionality
            monitor_performance_metrics
        fi
        
        # Sleep for interval
        sleep $MONITOR_INTERVAL
    done
}

# Continuous monitoring mode
continuous_monitor() {
    log "Starting continuous monitoring mode"
    
    # Set up signal handlers
    trap cleanup_and_exit INT TERM
    
    # Start monitoring loop
    monitor_loop
}

# Single check mode
single_check() {
    log "Performing single health check"
    
    if perform_health_check; then
        check_critical_endpoints
        test_debug_functionality
        success "Single check completed successfully"
        return 0
    else
        error "Single check detected issues"
        return 1
    fi
}

# Quick status check
quick_status() {
    local status=$(curl -o /dev/null -s -w '%{http_code}' --connect-timeout 5 "$TEST_URL")
    local load_time=$(curl -o /dev/null -s -w '%{time_total}' --connect-timeout 5 "$TEST_URL")
    
    echo "Status: $status"
    echo "Load Time: ${load_time}s"
    
    if [ "$status" = "200" ]; then
        success "Service is UP"
        return 0
    else
        error "Service is DOWN"
        return 1
    fi
}

# Main function
main() {
    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v bc &> /dev/null; then
        error "bc is required but not installed"
        exit 1
    fi
    
    case "${1:-monitor}" in
        "monitor")
            initialize_logs
            continuous_monitor
            ;;
        "check")
            initialize_logs
            single_check
            ;;
        "status")
            quick_status
            ;;
        "report")
            if [ -f "$LOG_FILE" ]; then
                generate_monitoring_report
            else
                error "No monitoring data available. Run monitoring first."
            fi
            ;;
        *)
            echo "Usage: $0 [monitor|check|status|report]"
            echo "  monitor  - Start continuous monitoring (default)"
            echo "  check    - Perform single comprehensive check"
            echo "  status   - Quick status check"
            echo "  report   - Generate report from existing data"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"