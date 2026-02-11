// BC Ferries Debug Console - Safe Runtime Debugging
// Feature-flagged debugging system with error isolation

(function() {
    'use strict';
    
    // Debug configuration with feature flags
    const DEBUG_CONFIG = {
        enabled: window.location.search.includes('debug=true') || 
                 localStorage.getItem('bcf_debug') === 'true' ||
                 window.location.hostname.includes('localhost'),
        console: true,
        mqtt_logging: true,
        performance_metrics: true,
        connection_tracing: true,
        visual_console: true,
        error_reporting: true
    };
    
    // Early exit if debugging disabled
    if (!DEBUG_CONFIG.enabled) {
        console.log('🚢 BC Ferries Debug Console: Disabled (use ?debug=true to enable)');
        return;
    }
    
    console.log('🚢 BC Ferries Debug Console: Initializing...');
    
    // Safe execution wrapper
    function safeDebugExecution(debugFunction, context = '', fallback = null) {
        if (!DEBUG_CONFIG.enabled) return fallback;
        
        try {
            return debugFunction();
        } catch (error) {
            console.warn(`🚢 Debug function failed (${context}):`, error);
            if (DEBUG_CONFIG.error_reporting) {
                // Store error for analysis but don't break production
                const errorLog = JSON.parse(localStorage.getItem('bcf_debug_errors') || '[]');
                errorLog.push({
                    context,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                });
                // Keep only last 50 errors
                if (errorLog.length > 50) errorLog.shift();
                localStorage.setItem('bcf_debug_errors', JSON.stringify(errorLog));
            }
            return fallback;
        }
    }
    
    // Debug console UI
    class DebugConsole {
        constructor() {
            this.logs = [];
            this.mqttEvents = [];
            this.performanceMetrics = {};
            this.connectionHistory = [];
            this.isVisible = false;
            
            this.init();
        }
        
        init() {
            safeDebugExecution(() => {
                this.createConsoleUI();
                this.setupEventListeners();
                this.startPerformanceMonitoring();
                console.log('🚢 Debug Console UI initialized');
            }, 'DebugConsole.init');
        }
        
        createConsoleUI() {
            if (!DEBUG_CONFIG.visual_console) return;
            
            const consoleHTML = `
                <div id="bcf-debug-console" style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 400px;
                    max-height: 600px;
                    background: rgba(0, 20, 40, 0.95);
                    border: 2px solid #00d4ff;
                    border-radius: 8px;
                    color: #00d4ff;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    z-index: 10000;
                    box-shadow: 0 4px 20px rgba(0, 212, 255, 0.3);
                    backdrop-filter: blur(10px);
                    display: none;
                    overflow: hidden;
                ">
                    <div style="
                        background: linear-gradient(135deg, #001a33, #003366);
                        padding: 10px;
                        border-bottom: 1px solid #00d4ff;
                        cursor: move;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    " id="bcf-debug-header">
                        <span style="font-weight: bold;">🚢 BC Ferries Debug Console</span>
                        <div>
                            <button id="bcf-debug-minimize" style="
                                background: none;
                                border: none;
                                color: #00d4ff;
                                cursor: pointer;
                                margin-right: 5px;
                                font-size: 14px;
                            ">−</button>
                            <button id="bcf-debug-close" style="
                                background: none;
                                border: none;
                                color: #ff4444;
                                cursor: pointer;
                                font-size: 14px;
                            ">✕</button>
                        </div>
                    </div>
                    <div id="bcf-debug-tabs" style="
                        background: rgba(0, 212, 255, 0.1);
                        padding: 5px;
                        border-bottom: 1px solid #00d4ff;
                        display: flex;
                        gap: 10px;
                    ">
                        <button class="bcf-debug-tab active" data-tab="logs">Logs</button>
                        <button class="bcf-debug-tab" data-tab="mqtt">MQTT</button>
                        <button class="bcf-debug-tab" data-tab="performance">Performance</button>
                        <button class="bcf-debug-tab" data-tab="connection">Connection</button>
                    </div>
                    <div id="bcf-debug-content" style="
                        padding: 10px;
                        max-height: 400px;
                        overflow-y: auto;
                        background: rgba(0, 0, 0, 0.3);
                    ">
                        <div id="bcf-debug-logs" class="bcf-debug-panel">
                            <div style="color: #00ff88; margin-bottom: 10px;">Debug Console Active</div>
                        </div>
                        <div id="bcf-debug-mqtt" class="bcf-debug-panel" style="display: none;"></div>
                        <div id="bcf-debug-performance" class="bcf-debug-panel" style="display: none;"></div>
                        <div id="bcf-debug-connection" class="bcf-debug-panel" style="display: none;"></div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', consoleHTML);
            
            // Add tab styles
            const style = document.createElement('style');
            style.textContent = `
                .bcf-debug-tab {
                    background: none;
                    border: none;
                    color: #00d4ff;
                    cursor: pointer;
                    padding: 5px 10px;
                    border-radius: 3px;
                    font-size: 11px;
                }
                .bcf-debug-tab.active {
                    background: rgba(0, 212, 255, 0.2);
                    color: #fff;
                }
                .bcf-debug-panel {
                    font-size: 10px;
                    line-height: 1.4;
                }
                #bcf-debug-content::-webkit-scrollbar {
                    width: 6px;
                }
                #bcf-debug-content::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.3);
                }
                #bcf-debug-content::-webkit-scrollbar-thumb {
                    background: #00d4ff;
                    border-radius: 3px;
                }
            `;
            document.head.appendChild(style);
            
            this.consoleElement = document.getElementById('bcf-debug-console');
            this.makeDraggable();
        }
        
        setupEventListeners() {
            safeDebugExecution(() => {
                // Show/hide with Ctrl+D
                document.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && e.key === 'd') {
                        e.preventDefault();
                        this.toggle();
                    }
                });
                
                // Tab switching
                document.querySelectorAll('.bcf-debug-tab').forEach(tab => {
                    tab.addEventListener('click', (e) => {
                        this.switchTab(e.target.dataset.tab);
                    });
                });
                
                // Close and minimize buttons
                const closeBtn = document.getElementById('bcf-debug-close');
                const minimizeBtn = document.getElementById('bcf-debug-minimize');
                
                if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
                if (minimizeBtn) minimizeBtn.addEventListener('click', () => this.minimize());
                
            }, 'DebugConsole.setupEventListeners');
        }
        
        makeDraggable() {
            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;
            let xOffset = 0;
            let yOffset = 0;
            
            const header = document.getElementById('bcf-debug-header');
            if (!header) return;
            
            header.addEventListener('mousedown', (e) => {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
                isDragging = true;
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                    xOffset = currentX;
                    yOffset = currentY;
                    this.consoleElement.style.transform = `translate(${currentX}px, ${currentY}px)`;
                }
            });
            
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        }
        
        toggle() {
            this.isVisible ? this.hide() : this.show();
        }
        
        show() {
            if (this.consoleElement) {
                this.consoleElement.style.display = 'block';
                this.isVisible = true;
                this.log('Debug console opened', 'system');
            }
        }
        
        hide() {
            if (this.consoleElement) {
                this.consoleElement.style.display = 'none';
                this.isVisible = false;
            }
        }
        
        minimize() {
            const content = document.getElementById('bcf-debug-content');
            if (content) {
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            }
        }
        
        switchTab(tabName) {
            // Update active tab
            document.querySelectorAll('.bcf-debug-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            
            // Show/hide panels
            document.querySelectorAll('.bcf-debug-panel').forEach(panel => {
                panel.style.display = 'none';
            });
            
            const activePanel = document.getElementById(`bcf-debug-${tabName}`);
            if (activePanel) {
                activePanel.style.display = 'block';
            }
        }
        
        log(message, type = 'info', data = null) {
            if (!DEBUG_CONFIG.console) return;
            
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = {
                timestamp,
                message,
                type,
                data
            };
            
            this.logs.push(logEntry);
            if (this.logs.length > 200) this.logs.shift(); // Keep last 200 logs
            
            // Update logs panel
            this.updateLogsPanel();
            
            // Also log to browser console
            const consoleMethod = type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log';
            console[consoleMethod](`🚢 [${timestamp}] ${message}`, data || '');
        }
        
        updateLogsPanel() {
            const logsPanel = document.getElementById('bcf-debug-logs');
            if (!logsPanel) return;
            
            const recentLogs = this.logs.slice(-50); // Show last 50 logs
            logsPanel.innerHTML = recentLogs.map(log => {
                const color = {
                    error: '#ff4444',
                    warn: '#ffaa44',
                    info: '#00d4ff',
                    system: '#00ff88',
                    mqtt: '#ff88ff'
                }[log.type] || '#00d4ff';
                
                return `
                    <div style="margin-bottom: 5px; border-left: 2px solid ${color}; padding-left: 8px;">
                        <span style="color: #888;">${log.timestamp}</span>
                        <span style="color: ${color}; margin-left: 8px;">[${log.type.toUpperCase()}]</span>
                        <span style="color: #fff; margin-left: 8px;">${log.message}</span>
                        ${log.data ? `<div style="color: #ccc; font-size: 9px; margin-top: 2px; margin-left: 16px;">${JSON.stringify(log.data, null, 2)}</div>` : ''}
                    </div>
                `;
            }).join('');
            
            logsPanel.scrollTop = logsPanel.scrollHeight;
        }
        
        logMQTT(event, data) {
            if (!DEBUG_CONFIG.mqtt_logging) return;
            
            const mqttEvent = {
                timestamp: new Date().toLocaleTimeString(),
                event,
                data: JSON.stringify(data, null, 2)
            };
            
            this.mqttEvents.push(mqttEvent);
            if (this.mqttEvents.length > 100) this.mqttEvents.shift();
            
            this.updateMQTTPanel();
            this.log(`MQTT: ${event}`, 'mqtt', data);
        }
        
        updateMQTTPanel() {
            const mqttPanel = document.getElementById('bcf-debug-mqtt');
            if (!mqttPanel) return;
            
            mqttPanel.innerHTML = this.mqttEvents.map(event => `
                <div style="margin-bottom: 8px; padding: 5px; background: rgba(255, 136, 255, 0.1); border-radius: 3px;">
                    <div style="color: #ff88ff; font-weight: bold;">${event.timestamp} - ${event.event}</div>
                    <pre style="color: #ccc; font-size: 9px; margin: 3px 0; overflow-x: auto;">${event.data}</pre>
                </div>
            `).join('');
            
            mqttPanel.scrollTop = mqttPanel.scrollHeight;
        }
        
        logConnection(status, details) {
            if (!DEBUG_CONFIG.connection_tracing) return;
            
            const connectionEvent = {
                timestamp: new Date().toLocaleTimeString(),
                status,
                details
            };
            
            this.connectionHistory.push(connectionEvent);
            if (this.connectionHistory.length > 50) this.connectionHistory.shift();
            
            this.updateConnectionPanel();
            this.log(`Connection: ${status}`, status.includes('error') ? 'error' : 'info', details);
        }
        
        updateConnectionPanel() {
            const connectionPanel = document.getElementById('bcf-debug-connection');
            if (!connectionPanel) return;
            
            connectionPanel.innerHTML = this.connectionHistory.map(event => {
                const color = event.status.includes('connected') ? '#00ff88' : 
                             event.status.includes('error') ? '#ff4444' : 
                             event.status.includes('connecting') ? '#ffaa44' : '#00d4ff';
                
                return `
                    <div style="margin-bottom: 5px; padding: 3px; border-left: 2px solid ${color}; padding-left: 8px;">
                        <div style="color: ${color}; font-weight: bold;">${event.timestamp} - ${event.status}</div>
                        ${event.details ? `<div style="color: #ccc; font-size: 9px; margin-top: 2px;">${JSON.stringify(event.details, null, 2)}</div>` : ''}
                    </div>
                `;
            }).join('');
            
            connectionPanel.scrollTop = connectionPanel.scrollHeight;
        }
        
        updatePerformance(metric, value) {
            if (!DEBUG_CONFIG.performance_metrics) return;
            
            this.performanceMetrics[metric] = value;
            this.updatePerformancePanel();
        }
        
        updatePerformancePanel() {
            const performancePanel = document.getElementById('bcf-debug-performance');
            if (!performancePanel) return;
            
            const metrics = Object.entries(this.performanceMetrics).map(([key, value]) => {
                const displayValue = typeof value === 'number' ? 
                    (value > 1000 ? `${(value / 1000).toFixed(2)}s` : `${value.toFixed(2)}ms`) : 
                    value;
                
                return `
                    <div style="margin-bottom: 5px; display: flex; justify-content: space-between;">
                        <span style="color: #00d4ff;">${key}:</span>
                        <span style="color: #fff;">${displayValue}</span>
                    </div>
                `;
            }).join('');
            
            performancePanel.innerHTML = `
                <div style="color: #00ff88; margin-bottom: 10px;">Performance Metrics</div>
                ${metrics}
                <div style="margin-top: 10px; color: #888; font-size: 9px;">
                    Last updated: ${new Date().toLocaleTimeString()}
                </div>
            `;
        }
        
        startPerformanceMonitoring() {
            if (!DEBUG_CONFIG.performance_metrics) return;
            
            // Monitor page performance
            if (window.performance) {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    this.updatePerformance('Page Load', navigation.loadEventEnd - navigation.loadEventStart);
                    this.updatePerformance('DOM Content Loaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
                    this.updatePerformance('First Paint', performance.getEntriesByName('first-paint')[0]?.startTime || 0);
                }
            }
            
            // Monitor memory usage (if available)
            if (window.performance && window.performance.memory) {
                setInterval(() => {
                    const memory = window.performance.memory;
                    this.updatePerformance('Used Heap', `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
                    this.updatePerformance('Total Heap', `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
                    this.updatePerformance('Heap Limit', `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`);
                }, 5000);
            }
        }
    }
    
    // Initialize debug console
    const debugConsole = new DebugConsole();
    
    // Make debug console globally accessible
    window.BCFDebug = {
        console: debugConsole,
        log: (msg, type, data) => debugConsole.log(msg, type, data),
        logMQTT: (event, data) => debugConsole.logMQTT(event, data),
        logConnection: (status, details) => debugConsole.logConnection(status, details),
        updatePerformance: (metric, value) => debugConsole.updatePerformance(metric, value),
        config: DEBUG_CONFIG,
        show: () => debugConsole.show(),
        hide: () => debugConsole.hide()
    };
    
    // Instrument existing dashboard functionality
    safeDebugExecution(() => {
        // Hook into MQTT status updates
        if (window.dashboard && typeof window.dashboard.updateMQTTStatus === 'function') {
            const originalUpdateMQTTStatus = window.dashboard.updateMQTTStatus;
            window.dashboard.updateMQTTStatus = function(status) {
                debugConsole.logConnection(`MQTT Status: ${status}`, { status, timestamp: Date.now() });
                return originalUpdateMQTTStatus.call(this, status);
            };
        }
        
        // Hook into WebSocket status updates
        if (window.dashboard && typeof window.dashboard.updateWebSocketStatus === 'function') {
            const originalUpdateWebSocketStatus = window.dashboard.updateWebSocketStatus;
            window.dashboard.updateWebSocketStatus = function(status) {
                debugConsole.logConnection(`WebSocket Status: ${status}`, { status, timestamp: Date.now() });
                return originalUpdateWebSocketStatus.call(this, status);
            };
        }
        
        debugConsole.log('Dashboard instrumentation completed', 'system');
    }, 'Dashboard instrumentation');
    
    // Add performance monitoring to page
    safeDebugExecution(() => {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.entryType === 'navigation') {
                    debugConsole.updatePerformance('Page Load Time', entry.loadEventEnd - entry.loadEventStart);
                } else if (entry.entryType === 'paint') {
                    debugConsole.updatePerformance(`${entry.name}`, entry.startTime);
                }
            });
        });
        
        observer.observe({ entryTypes: ['navigation', 'paint'] });
    }, 'Performance monitoring setup');
    
    // Auto-show debug console if enabled via URL parameter
    if (window.location.search.includes('debug=true')) {
        setTimeout(() => {
            debugConsole.show();
            debugConsole.log('Debug console auto-opened via URL parameter', 'system');
        }, 1000);
    }
    
    console.log('🚢 BC Ferries Debug Console: Ready (Press Ctrl+D to toggle)');
    
})();