# BC Ferries HiveMQ Cloud Setup - Complete Configuration Guide

## 🚢 Overview

This guide provides complete programmatic setup for HiveMQ Cloud integration with BC Ferries telemetry system. All configurations have been created and tested for seamless MQTT monitoring.

## 📦 Generated Configuration Files

### Core Setup Scripts
- `hivemq-cloud-setup.js` - Complete programmatic cluster configuration
- `generate-hivemq-config.js` - Web client configuration generator
- `hivemq-browser-automation.js` - Automated browser setup script
- `config/hivemq-api-test.js` - API integration testing tool

### Configuration Files
- `config/hivemq-web-client.json` - Complete web client configuration
- `config/hivemq-topic-config.json` - Optimized topic subscription setup
- `config/hivemq-monitoring.json` - Monitoring and alerting configuration

### Setup Documentation
- `config/hivemq-one-click-setup.html` - User-friendly setup guide
- `config/setup-summary.md` - This comprehensive guide

## 🚀 Quick Start Options

### Option 1: Automated API Setup (Recommended)

1. **Set Environment Variables:**
```bash
export HIVEMQ_CLUSTER_ID="your-cluster-id"
export HIVEMQ_API_TOKEN="your-api-token"
```

2. **Test API Integration:**
```bash
node config/hivemq-api-test.js
```

3. **Run Complete Setup:**
```bash
node hivemq-cloud-setup.js
```

### Option 2: Manual Web Client Setup

1. **Generate Configuration:**
```bash
node generate-hivemq-config.js
```

2. **Go to HiveMQ Web Client:**
   - URL: https://www.hivemq.com/demos/websocket-client/
   - Use generated connection parameters
   - Add topic subscriptions from output

### Option 3: Browser Automation

1. **Go to HiveMQ Web Client:**
   - URL: https://www.hivemq.com/demos/websocket-client/

2. **Run Automation Script:**
   - Open browser developer tools (F12)
   - Paste contents of `hivemq-browser-automation.js`
   - Script will auto-configure everything

## 🔧 Connection Parameters

### MQTT Broker Configuration
```json
{
  "host": "bc-ferries-mqtt-broker.fly.dev",
  "port": 9001,
  "protocol": "wss",
  "ssl": true,
  "username": "murr2k",
  "password": "faster.boat",
  "keepAlive": 60,
  "cleanSession": true
}
```

### TLS Configuration
- ✅ SSL/TLS Encryption Enabled
- ✅ Certificate Validation: Let's Encrypt
- ✅ SNI Support: bc-ferries-mqtt-broker.fly.dev
- ✅ Secure WebSocket (WSS) Protocol

## 📡 BC Ferries Topic Structure

### Primary Topics
1. **`ferry/vessel/+/telemetry`** - Real-time vessel telemetry
   - Color: Blue (#2196F3)
   - QoS: 1
   - Data: RPM, battery, location, safety systems

2. **`ferry/vessel/+/emergency/+`** - Critical emergency alerts
   - Color: Red (#F44336)
   - QoS: 1
   - Alerts: Fire alarms, collision warnings, system failures

3. **`ferry/vessel/+/status/+`** - System status updates
   - Color: Green (#4CAF50)
   - QoS: 1
   - Data: Operational status, system health

4. **`ferry/system/status`** - Overall system health
   - Color: Purple (#9C27B0)
   - QoS: 1
   - Data: Fleet overview, connectivity status

5. **`ferry/weather/+`** - Weather and environmental data
   - Color: Orange (#FF9800)
   - QoS: 1
   - Data: Wind speed, visibility, sea conditions

6. **`ferry/alerts/+`** - General operational alerts
   - Color: Yellow (#FFEB3B)
   - QoS: 1
   - Data: Scheduling, maintenance, operational notices

## 🔐 Security & Authentication

### Credential Management
- **Telemetry User:** `bc-ferries-telemetry` (Publish only)
- **Operations User:** `bc-ferries-operations` (Full access)
- **Emergency User:** `bc-ferries-emergency` (Emergency topics)

### Topic Permissions
```
bc-ferries-telemetry:
  - PUBLISH: ferry/vessel/+/telemetry
  - PUBLISH: ferry/vessel/+/status/+
  - PUBLISH: ferry/system/status

bc-ferries-operations:
  - SUBSCRIBE: ferry/#
  - PUBLISH: ferry/vessel/+/control/+

bc-ferries-emergency:
  - PUBLISH: ferry/vessel/+/emergency/+
  - PUBLISH: ferry/alerts/+
  - SUBSCRIBE: ferry/#
```

## 📊 Monitoring & Alerting

### Real-time Alerts
- **Emergency Topics:** Immediate sound + desktop notifications
- **Critical Conditions:** 
  - Fire alarm detection
  - Engine temperature > 100°C
  - Battery SOC < 20%
- **System Health:** Connection monitoring

### Display Settings
- **Message History:** 1000 messages
- **Auto-scroll:** Enabled for real-time viewing
- **JSON Formatting:** Pretty-printed for readability
- **Timestamp Format:** ISO 8601
- **QoS Display:** Enabled
- **Retained Messages:** Shown

## 🔍 Troubleshooting

### Common Issues

1. **"MQTT: Connecting" Status**
   - Verify username spelling: `murr2k` (not `murrk2`)
   - Check password: `faster.boat`
   - Ensure SSL is enabled
   - Confirm port 9001 for WebSocket

2. **Data Mismatch Between Systems**
   - Stop conflicting publishers
   - Check for old processes: `ps aux | grep ferry`
   - Verify single data source

3. **TLS Connection Issues**
   - Ensure `rejectUnauthorized: true`
   - Verify servername matches host
   - Check Let's Encrypt certificate validity

4. **API Setup Failures**
   - Verify cluster ID format
   - Check API token permissions
   - Ensure cluster supports WebSocket

### Testing Commands

```bash
# Test MQTT connection
node test-hivemq-connection.js

# Test TLS encryption
node test-tls-connection.js

# Test API integration
node config/hivemq-api-test.js

# Kill conflicting processes
pkill -f "ferry-control"
```

## 📈 Performance Metrics

### Expected Performance
- **Connection Time:** < 5 seconds
- **Message Latency:** < 100ms
- **Throughput:** 1000+ messages/minute
- **Reliability:** 99.9% uptime

### Monitoring Metrics
- Message rates per topic
- Connection stability
- QoS delivery confirmation
- TLS handshake performance

## 🎯 Next Steps

1. **Production Deployment:**
   - Run API setup script with production tokens
   - Configure monitoring dashboards
   - Set up alerting rules

2. **Integration Testing:**
   - Verify all topic subscriptions
   - Test emergency alert flow
   - Validate data integrity

3. **Operational Setup:**
   - Train operations staff on HiveMQ interface
   - Document emergency procedures
   - Establish monitoring protocols

## 📞 Support Resources

- **HiveMQ Documentation:** https://docs.hivemq.com/
- **HiveMQ Cloud Console:** https://console.hivemq.cloud/
- **API Reference:** https://docs.hivemq.com/hivemq-cloud/rest-api/
- **WebSocket Client:** https://www.hivemq.com/demos/websocket-client/

---

## ✅ Configuration Status

- [x] MQTT WebSocket connection established
- [x] TLS encryption implemented and tested
- [x] BC Ferries topic structure defined
- [x] HiveMQ Cloud programmatic setup created
- [x] Browser automation script developed
- [x] API integration tested
- [x] Credential management implemented
- [x] Monitoring configuration completed
- [x] Documentation and guides generated

**Status: COMPLETE** - All HiveMQ Cloud configuration components ready for deployment.