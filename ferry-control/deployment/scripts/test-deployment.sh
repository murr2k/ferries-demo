#!/bin/bash

# BC Ferries Dashboard - Deployment Testing Script
# Comprehensive testing suite for safe deployment validation

set -e

# Configuration
APP_NAME="bc-ferries-ops-dashboard"
TEST_URL="https://$APP_NAME.fly.dev"
DEBUG_URL="$TEST_URL?debug=true"
TIMEOUT=30

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
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

# Test basic connectivity
test_basic_connectivity() {
    log "Testing basic connectivity..."
    
    if curl -f -s --connect-timeout $TIMEOUT "$TEST_URL" > /dev/null; then
        success "Basic connectivity test passed"
        return 0
    else
        error "Basic connectivity test failed"
        return 1
    fi
}

# Test page load performance
test_page_performance() {
    log "Testing page load performance..."
    
    local load_time=$(curl -o /dev/null -s -w '%{time_total}' --connect-timeout $TIMEOUT "$TEST_URL")
    local load_time_ms=$(echo "$load_time * 1000" | bc)
    
    log "Page load time: ${load_time_ms}ms"
    
    if (( $(echo "$load_time > 5" | bc -l) )); then
        warn "Page load time exceeds 5 seconds"
        return 1
    else
        success "Page performance test passed"
        return 0
    fi
}

# Test HTML structure integrity
test_html_structure() {
    log "Testing HTML structure integrity..."
    
    local html_content=$(curl -s --connect-timeout $TIMEOUT "$TEST_URL")
    
    # Check for essential elements
    if echo "$html_content" | grep -q "BC Ferries Operations Center"; then
        success "Title check passed"
    else
        error "Title check failed"
        return 1
    fi
    
    if echo "$html_content" | grep -q "connectionStatus"; then
        success "Connection status element found"
    else
        error "Connection status element missing"
        return 1
    fi
    
    if echo "$html_content" | grep -q "mqttStatusIndicator"; then
        success "MQTT status indicator found"
    else
        error "MQTT status indicator missing"
        return 1
    fi
    
    if echo "$html_content" | grep -q "js/dashboard.js"; then
        success "Dashboard script included"
    else
        error "Dashboard script missing"
        return 1
    fi
    
    # Check for debug console inclusion
    if echo "$html_content" | grep -q "js/debug-console.js"; then
        success "Debug console script included"
    else
        warn "Debug console script not found"
    fi
    
    return 0
}

# Test JavaScript loading
test_javascript_loading() {
    log "Testing JavaScript file accessibility..."
    
    if curl -f -s --connect-timeout $TIMEOUT "$TEST_URL/js/dashboard.js" > /dev/null; then
        success "Dashboard JavaScript loads successfully"
    else
        error "Dashboard JavaScript failed to load"
        return 1
    fi
    
    if curl -f -s --connect-timeout $TIMEOUT "$TEST_URL/js/debug-console.js" > /dev/null; then
        success "Debug console JavaScript loads successfully"
    else
        warn "Debug console JavaScript failed to load (may not be deployed yet)"
    fi
    
    return 0
}

# Test CSS loading
test_css_loading() {
    log "Testing CSS file accessibility..."
    
    if curl -f -s --connect-timeout $TIMEOUT "$TEST_URL/css/dashboard.css" > /dev/null; then
        success "CSS loads successfully"
    else
        error "CSS failed to load"
        return 1
    fi
    
    return 0
}

# Test debug mode functionality
test_debug_mode() {
    log "Testing debug mode functionality..."
    
    # Check if debug URL is accessible
    if curl -f -s --connect-timeout $TIMEOUT "$DEBUG_URL" > /dev/null; then
        success "Debug mode URL accessible"
    else
        error "Debug mode URL failed"
        return 1
    fi
    
    # Check if debug console is included when debug=true
    local debug_html=$(curl -s --connect-timeout $TIMEOUT "$DEBUG_URL")
    
    if echo "$debug_html" | grep -q "js/debug-console.js"; then
        success "Debug console included in debug mode"
    else
        warn "Debug console not found in debug mode"
    fi
    
    return 0
}

# Test MQTT status indicators
test_mqtt_indicators() {
    log "Testing MQTT status indicators..."
    
    local html_content=$(curl -s --connect-timeout $TIMEOUT "$TEST_URL")
    
    # Check for MQTT status elements
    local mqtt_indicators=(
        "mqttStatusIndicator"
        "mqttStatusText"
        "MQTT: Connecting"
    )
    
    for indicator in "${mqtt_indicators[@]}"; do
        if echo "$html_content" | grep -q "$indicator"; then
            success "MQTT indicator '$indicator' found"
        else
            error "MQTT indicator '$indicator' missing"
            return 1
        fi
    done
    
    return 0
}

# Test error handling (graceful degradation)
test_error_handling() {
    log "Testing error handling and graceful degradation..."
    
    # Test 404 handling
    if curl -f -s --connect-timeout $TIMEOUT "$TEST_URL/nonexistent-file.js" > /dev/null 2>&1; then
        warn "404 handling may not be working properly"
    else
        success "404 handling works correctly"
    fi
    
    return 0
}

# Test backward compatibility
test_backward_compatibility() {
    log "Testing backward compatibility..."
    
    local html_content=$(curl -s --connect-timeout $TIMEOUT "$TEST_URL")
    
    # Check that all original functionality is present
    local required_elements=(
        "fleet-overview"
        "vessel-detail"
        "engine-gauges"
        "power-systems"
        "safety-systems"
        "navigation-display"
        "weather-environment"
    )
    
    for element in "${required_elements[@]}"; do
        if echo "$html_content" | grep -q "$element"; then
            success "Original element '$element' present"
        else
            error "Original element '$element' missing - backward compatibility broken"
            return 1
        fi
    done
    
    return 0
}

# Test production safety
test_production_safety() {
    log "Testing production safety measures..."
    
    # Without debug flag, debug features should be disabled
    local normal_html=$(curl -s --connect-timeout $TIMEOUT "$TEST_URL")
    
    # The debug console should load but be disabled by default
    if echo "$normal_html" | grep -q "js/debug-console.js"; then
        success "Debug console script included (will be feature-flagged)"
    else
        warn "Debug console not included"
    fi
    
    # Test that the main dashboard loads without debug parameters
    if echo "$normal_html" | grep -q "OperationsDashboard"; then
        success "Main dashboard functionality preserved"
    else
        error "Main dashboard functionality compromised"
        return 1
    fi
    
    return 0
}

# Run comprehensive health check
comprehensive_health_check() {
    log "Running comprehensive health check..."
    
    local tests=(
        "test_basic_connectivity"
        "test_page_performance"
        "test_html_structure"
        "test_javascript_loading"
        "test_css_loading"
        "test_debug_mode"
        "test_mqtt_indicators"
        "test_error_handling"
        "test_backward_compatibility"
        "test_production_safety"
    )
    
    local passed=0
    local failed=0
    local warnings=0
    
    for test in "${tests[@]}"; do
        if $test; then
            ((passed++))
        else
            ((failed++))
        fi
    done
    
    log "=============================================="
    log "TEST RESULTS SUMMARY"
    log "=============================================="
    success "Tests Passed: $passed"
    error "Tests Failed: $failed"
    warn "Warnings: Check logs above"
    
    if [ $failed -eq 0 ]; then
        success "All critical tests passed! Deployment is safe."
        return 0
    else
        error "Some tests failed. Review before proceeding with deployment."
        return 1
    fi
}

# Generate test report
generate_test_report() {
    local timestamp=$(date +'%Y-%m-%d_%H-%M-%S')
    local report_file="../backup/test_report_$timestamp.txt"
    
    log "Generating test report..."
    
    {
        echo "BC Ferries Dashboard Deployment Test Report"
        echo "Generated: $(date)"
        echo "Test URL: $TEST_URL"
        echo "Debug URL: $DEBUG_URL"
        echo "=========================================="
        echo ""
        
        # Basic info
        echo "Basic Connectivity:"
        curl -I -s --connect-timeout $TIMEOUT "$TEST_URL" | head -5
        echo ""
        
        echo "Page Performance:"
        echo "Load Time: $(curl -o /dev/null -s -w '%{time_total}s' --connect-timeout $TIMEOUT "$TEST_URL")"
        echo "Response Size: $(curl -o /dev/null -s -w '%{size_download} bytes' --connect-timeout $TIMEOUT "$TEST_URL")"
        echo ""
        
        echo "JavaScript Files:"
        curl -I -s "$TEST_URL/js/dashboard.js" | head -2
        curl -I -s "$TEST_URL/js/debug-console.js" | head -2
        echo ""
        
        echo "CSS Files:"
        curl -I -s "$TEST_URL/css/dashboard.css" | head -2
        echo ""
        
    } > "$report_file"
    
    success "Test report saved to: $report_file"
}

# Main execution
main() {
    log "BC Ferries Dashboard - Deployment Testing Suite"
    log "=============================================="
    
    case "${1:-all}" in
        "all")
            comprehensive_health_check
            generate_test_report
            ;;
        "basic")
            test_basic_connectivity
            test_page_performance
            ;;
        "structure")
            test_html_structure
            test_backward_compatibility
            ;;
        "debug")
            test_debug_mode
            test_production_safety
            ;;
        "performance")
            test_page_performance
            ;;
        "mqtt")
            test_mqtt_indicators
            ;;
        "report")
            generate_test_report
            ;;
        *)
            echo "Usage: $0 [all|basic|structure|debug|performance|mqtt|report]"
            echo "  all         - Run all tests (default)"
            echo "  basic       - Basic connectivity and performance"
            echo "  structure   - HTML structure and compatibility"
            echo "  debug       - Debug functionality tests"
            echo "  performance - Performance tests only"
            echo "  mqtt        - MQTT-specific tests"
            echo "  report      - Generate test report only"
            exit 1
            ;;
    esac
}

# Check prerequisites
if ! command -v curl &> /dev/null; then
    error "curl is required but not installed"
    exit 1
fi

if ! command -v bc &> /dev/null; then
    error "bc is required but not installed"
    exit 1
fi

# Run main function
main "$@"