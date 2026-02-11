# Changelog

All notable changes to the BC Ferries Operations Dashboard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-25

### Added
- **Historical Data System**: Complete time-series data collection and visualization
  - SQLite database integration for telemetry storage
  - Data collection every 5 seconds from all connected vessels
  - 5-minute and hourly data aggregation for performance
  - 1-day data retention policy for demo system
  - Interactive Chart.js visualization with time-based X-axis
  - Support for 9 telemetry metrics (RPM, temperature, fuel flow, battery SOC, voltage, generator load, speed, bilge level, CO2 level)
  - Time range selection (1h, 6h, 12h, 24h)
  - CSV export functionality for historical data
  - Automatic chart updates when vessel or metric selection changes

### Fixed
- **Operational State Display**: Fixed issue where operational state incorrectly showed "Offline"
  - Updated `getOperationalState()` function to check "operational" field first
  - Properly displays "underway" or "docked" based on vessel telemetry

- **MQTT Status Display**: Resolved duplicate MQTT connection issue
  - Removed client-side MQTT manager that was creating conflicting connections
  - Dashboard now correctly shows server-side MQTT broker status
  - Fixed status display cycling through "Connected" → "Connecting..." → "Failed"

- **Fire Alarm Alerts**: Fire alarms now generate critical alerts
  - Added fire alarm check to `checkForAlerts()` function
  - Fire alarms properly appear in Active Alerts panel with critical severity
  - Maintains visual indication in Safety Systems panel

### Changed
- **Build Dependencies**: Switched from `better-sqlite3` to `sqlite3`
  - Resolves Alpine Linux build issues in Docker container
  - Uses prebuilt binaries instead of requiring compilation
  - Maintains full SQLite functionality with callback-based API

### Technical Improvements
- Added Chart.js date-fns adapter for proper time-series visualization
- Implemented Promise-based wrappers for SQLite callbacks
- Created background worker for data collection and aggregation
- Added proper error handling for database operations
- Optimized Docker build with necessary compilation tools

## [1.0.0] - 2025-01-19

### Initial Release
- **Core Dashboard Features**
  - Real-time vessel monitoring via WebSocket
  - Fleet status overview with vessel counts
  - Individual vessel selection and detailed telemetry
  - Engine performance gauges (RPM, temperature, fuel flow)
  - Power systems monitoring (battery SOC, generator load)
  - Safety systems display (fire alarm, bilge level, CO2)
  - Navigation information (speed, heading, position, compass)
  - Weather and environmental conditions
  - Alert management system with severity levels

- **Technical Infrastructure**
  - Express.js backend server
  - WebSocket real-time communication
  - MQTT broker integration for vessel telemetry
  - Canvas-based maritime gauges
  - Responsive design for control room displays
  - Fly.io deployment configuration
  - Docker containerization

- **User Interface**
  - Professional maritime control room aesthetic
  - Dark theme optimized for 24/7 operations
  - Real-time status indicators
  - Emergency alert modal dialogs
  - Vessel detail panels
  - Interactive gauge displays

---

## Deployment Notes

### Upgrading from 1.0.0 to 1.1.0
1. The SQLite database will be automatically created on first run
2. Historical data collection begins immediately upon deployment
3. No migration required - new feature is additive

### Environment Requirements
- Node.js 18+
- SQLite3 support
- 512MB+ RAM for production
- Persistent storage for `/app/data` directory

### Known Issues
- Historical data requires vessels to be connected and sending telemetry
- Chart displays sample data when no vessel is selected
- Data retention is limited to 1 day in demo configuration