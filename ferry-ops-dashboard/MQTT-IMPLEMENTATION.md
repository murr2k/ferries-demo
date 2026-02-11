# MQTT Dual-Protocol Implementation

## Overview

This implementation adds MQTT subscriber functionality to the BC Ferries operations dashboard, creating a dual-protocol system where both WebSocket and MQTT clients can update the same dashboard data structures with automatic last-writer-wins behavior.

## Architecture

```
Ferry Control App → MQTT Broker → MQTT Client (Browser)
                                      ↓
                              window.dashboard.vessels Map
                                      ↑
WebSocket Server  ←  Ferry Control  ←  WebSocket Client (Browser)
```

## Key Components

### 1. MQTT Manager (`js/mqtt-manager.js`)
- Browser-side MQTT client using MQTT.js
- Connects to MQTT broker at `149.248.193.180:9001` (WebSocket-over-MQTT)
- Subscribes to ferry telemetry topics: 
  - `ferry/vessel/+/telemetry`
  - `ferry/vessel/+/emergency/+`
  - `ferry/system/status`
  - `ferry/weather/+`
  - `ferry/alerts/+`

### 2. Dual Connection Status
- WebSocket status indicator
- MQTT status indicator  
- Combined overall status (connected/partial/disconnected)

### 3. Automatic Last-Writer-Wins
Both protocols write to the same data structures:
```javascript
// Both WebSocket and MQTT update the same Map
window.dashboard.vessels.set(vesselId, vessel);
window.dashboard.alerts.unshift(alert);
```

## Data Flow

### WebSocket Path
```
Ferry Control → WebSocket Server → Dashboard WebSocket Client → vessel Map
```

### MQTT Path  
```
Ferry Control → MQTT Broker → Dashboard MQTT Client → vessel Map
```

**Last writer automatically wins** since both paths update the same JavaScript Map/Array objects.

## Configuration

### MQTT Broker Settings
```javascript
brokerConfig = {
  host: '149.248.193.180',
  port: 9001, // WebSocket port
  protocol: 'ws',
  username: 'ferry_control',
  password: 'secure_ferry_pass_2024'
}
```

### Topic Structure
- `ferry/vessel/{vesselId}/telemetry` - Vessel telemetry data
- `ferry/vessel/{vesselId}/emergency/{type}` - Emergency alerts
- `ferry/system/status` - System status updates
- `ferry/weather/{location}` - Weather data
- `ferry/alerts/{type}` - General alerts

## Security

### Content Security Policy
Updated CSP headers to allow MQTT broker connections:
```javascript
connectSrc: [..., "ws://149.248.193.180:9001", "wss://149.248.193.180:9001"]
```

### Authentication
- MQTT uses username/password authentication
- Same credentials as ferry control system
- Clean session for browser clients

## Connection Management

### Reconnection Logic
- Exponential backoff for both protocols
- Graceful degradation when one protocol fails
- Status indicators show individual protocol health

### Error Handling
```javascript
// MQTT-specific error handling
if (error.code === 'ECONNREFUSED') {
  dashboard.updateMQTTStatus('unavailable');
  // Extended retry interval for unavailable broker
}
```

## Testing

### Browser Test
Visit: `http://localhost:8081/test-mqtt.html`
- Tests MQTT WebSocket connection
- Attempts subscription and publishing
- Shows real-time connection status

### Test Publisher
```bash
node test-mqtt-publisher.js
```
- Publishes test telemetry data via MQTT
- Demonstrates dual-protocol updates
- Shows last-writer-wins behavior

## Benefits

### 1. Protocol Redundancy
- WebSocket or MQTT can provide data
- System continues working if one protocol fails
- No complex arbitration logic needed

### 2. Genuine Dual-Protocol Communication
- MQTT and WebSocket are completely independent
- Both protocols can have different data sources
- True last-writer-wins without synchronization

### 3. Scalable Architecture  
- MQTT provides pub/sub scalability
- WebSocket provides real-time bidirectional communication
- Each protocol optimized for its use case

### 4. Simple Implementation
- No coordination between protocols required
- Both write to same JavaScript objects
- Automatic conflict resolution via timing

## Browser Support

Requires modern browsers with:
- WebSocket support
- MQTT.js library (loaded via CDN)
- Modern JavaScript (ES2018+)

## Deployment Notes

1. Ensure MQTT broker is running with WebSocket support
2. Update firewall rules for port 9001
3. Configure authentication credentials
4. Test both protocols independently
5. Monitor connection status indicators

## Troubleshooting

### MQTT Connection Issues
- Check broker availability: `curl -v telnet://149.248.193.180:9001`  
- Verify credentials in broker password file
- Check CSP headers allow WebSocket connections
- Monitor browser console for connection errors

### Status Indicators
- Green: Connected
- Yellow: Connecting  
- Red: Error/Failed
- Gray: Offline/Unavailable

The dual status display immediately shows which protocol is working.