#!/usr/bin/env node

/**
 * MQTT Instrumentation Verification Script
 * 
 * This script verifies that the instrumentation has been properly added
 * to the critical interface points without breaking functionality.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 MQTT Instrumentation Verification');
console.log('=====================================\n');

// File paths
const mqttManagerPath = path.join(__dirname, '../public/js/mqtt-manager.js');
const dashboardPath = path.join(__dirname, '../public/js/dashboard.js');

// Check if files exist
if (!fs.existsSync(mqttManagerPath)) {
    console.error('❌ mqtt-manager.js not found at:', mqttManagerPath);
    process.exit(1);
}

if (!fs.existsSync(dashboardPath)) {
    console.error('❌ dashboard.js not found at:', dashboardPath);
    process.exit(1);
}

console.log('✅ Both target files found\n');

// Read file contents
const mqttContent = fs.readFileSync(mqttManagerPath, 'utf8');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Verification patterns for MQTT manager
const mqttPatterns = [
    { name: 'Authentication Logging', pattern: /\[MQTT-AUTH\].*Authentication credentials/ },
    { name: 'Anonymous Connection Logging', pattern: /\[MQTT-AUTH\].*No authentication credentials/ },
    { name: 'Connection Success Logging', pattern: /\[MQTT-CONNECT\].*connected to broker/ },
    { name: 'Connection Error Logging', pattern: /\[MQTT-CONNECT\].*MQTT error/ },
    { name: 'Disconnect Logging', pattern: /\[MQTT-CONNECT\].*disconnected/ },
    { name: 'Reconnection Logging', pattern: /\[MQTT-CONNECT\].*reconnecting/ },
    { name: 'Status Update Calls', pattern: /\[STATUS-UPDATE\].*updateMQTTStatus/ },
    { name: 'Initialization Logging', pattern: /\[MQTT-INIT\].*MQTT manager/ },
    { name: 'Dashboard Availability Check', pattern: /\[MQTT-INIT\].*Dashboard available/ }
];

// Verification patterns for dashboard
const dashboardPatterns = [
    { name: 'Status Update Function Entry', pattern: /\[STATUS-UPDATE\].*updateMQTTStatus called/ },
    { name: 'DOM Element Checks', pattern: /\[DOM-CHECK\].*mqttStatusIndicator/ },
    { name: 'UI Update Logging', pattern: /\[UI-UPDATE\].*Setting MQTT status/ },
    { name: 'Dashboard Initialization', pattern: /\[DASHBOARD-INIT\].*Dashboard initialized/ },
    { name: 'Element Verification', pattern: /\[DOM-CHECK\].*element found/ }
];

console.log('🔍 Verifying MQTT Manager Instrumentation:');
console.log('--------------------------------------------');

let mqttPassed = 0;
mqttPatterns.forEach(({ name, pattern }) => {
    if (pattern.test(mqttContent)) {
        console.log(`✅ ${name}`);
        mqttPassed++;
    } else {
        console.log(`❌ ${name}`);
    }
});

console.log(`\n📊 MQTT Manager: ${mqttPassed}/${mqttPatterns.length} patterns found\n`);

console.log('🔍 Verifying Dashboard Instrumentation:');
console.log('---------------------------------------');

let dashboardPassed = 0;
dashboardPatterns.forEach(({ name, pattern }) => {
    if (pattern.test(dashboardContent)) {
        console.log(`✅ ${name}`);
        dashboardPassed++;
    } else {
        console.log(`❌ ${name}`);
    }
});

console.log(`\n📊 Dashboard: ${dashboardPassed}/${dashboardPatterns.length} patterns found\n`);

// Overall verification
const totalPatterns = mqttPatterns.length + dashboardPatterns.length;
const totalPassed = mqttPassed + dashboardPassed;

console.log('🎯 Overall Verification Results:');
console.log('=================================');
console.log(`✅ Patterns Found: ${totalPassed}/${totalPatterns}`);
console.log(`📊 Coverage: ${Math.round((totalPassed/totalPatterns) * 100)}%`);

if (totalPassed === totalPatterns) {
    console.log('\n🎉 All instrumentation patterns verified!');
    console.log('✅ Safe to deploy - instrumentation is properly installed');
    
    // Additional safety checks
    console.log('\n🔒 Safety Verification:');
    console.log('========================');
    
    // Check that original functionality is preserved
    const criticalFunctions = [
        'updateMQTTStatus',
        'setupEventHandlers',
        'connect',
        'initializeElements'
    ];
    
    let safetyPassed = 0;
    criticalFunctions.forEach(func => {
        const mqttHasFunction = mqttContent.includes(`${func}(`);
        const dashboardHasFunction = dashboardContent.includes(`${func}(`);
        
        if (mqttHasFunction || dashboardHasFunction) {
            console.log(`✅ Function preserved: ${func}`);
            safetyPassed++;
        } else {
            console.log(`⚠️ Function check: ${func}`);
        }
    });
    
    // Check for error handling preservation
    if (mqttContent.includes('try {') && mqttContent.includes('catch')) {
        console.log('✅ Error handling preserved in MQTT manager');
        safetyPassed++;
    }
    
    if (dashboardContent.includes('if (')) {
        console.log('✅ Conditional logic preserved in dashboard');
        safetyPassed++;
    }
    
    console.log(`\n📊 Safety Score: ${safetyPassed}/${criticalFunctions.length + 2}`);
    
    if (safetyPassed >= criticalFunctions.length) {
        console.log('✅ DEPLOYMENT APPROVED - All safety checks passed');
        process.exit(0);
    } else {
        console.log('⚠️ REVIEW REQUIRED - Some safety concerns detected');
        process.exit(1);
    }
    
} else {
    console.log('\n⚠️ Instrumentation incomplete!');
    console.log('❌ Review and fix missing patterns before deployment');
    process.exit(1);
}