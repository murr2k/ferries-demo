# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BC Ferries Maritime Monitoring System — a demo project simulating real-time maritime telemetry for BC Ferries Island Class vessels. Three Node.js services communicate via MQTT and WebSocket, deployed on Fly.io (Seattle region).

## Services & Ports

| Service | Directory | Port | Purpose |
|---------|-----------|------|---------|
| Ferry Control | `ferry-control/` | 8080 | Vessel simulator, MQTT publisher, control API |
| Ops Dashboard | `ferry-ops-dashboard/` | 8081 | Fleet operations center, SQLite historical data |
| Ferry Monitoring | `ferry-monitoring/` | 8080 | Lightweight monitoring (incomplete — see notes below) |

## Development Commands

Each service is independent — run from within each service directory:

```bash
npm install       # Install dependencies
npm run dev       # Development mode (nodemon auto-reload)
npm start         # Production mode
npm test          # Run Jest tests
```

## Deployment (Fly.io)

`ferry-control` and `ferry-ops-dashboard` have Dockerfiles and `fly.toml`. `ferry-monitoring` has neither.

```bash
fly deploy           # Deploy from within a service directory
fly status
fly logs --follow
fly secrets set KEY=VALUE
```

## Architecture

**Data flow:**
1. `ferry-control` simulates vessel telemetry and publishes to MQTT broker (Mosquitto on Fly.io) via `lib/mqtt-client.js`
2. `ferry-ops-dashboard` subscribes to MQTT, stores to SQLite at 5-second intervals, and broadcasts via WebSocket to browser clients
3. Browser dashboards connect via WebSocket for real-time updates

**MQTT provider** (active: `mosquitto`, set in `ferry-control/config/mqtt-config.json`):
- Broker: `bc-ferries-mqtt-broker.fly.dev`, WSS port 443
- Topic prefix (mosquitto mode): `ferry/vessel/{vesselId}/...`
- Topic prefix (HiveMQ mode): `fleet/bcferries/{vesselId}/...`
- Credentials for Mosquitto are hardcoded as fallbacks in `lib/mqtt-client.js:92-93` — these should be moved to environment variables

**SQLite persistence** (ops-dashboard only):
- Database at `./data/ferry_telemetry.db` (configurable via `DB_PATH`)
- `db/database.js` — schema init; `db/historical-data.js` — queries/CSV export
- `workers/data-collector.js` — background collection every 5 seconds

## Known Issues (from legacy cleanup)

### Missing `/public` directories — all three services
All three `server.js` files serve `public/index.html` as the root route, but none of the `public/` directories exist. The servers will start but return 404 on every browser request.

- `ferry-control`: The UI files exist at `deployment/current/` (`index.html`, `dashboard.css`, `dashboard.js`) — these need to be copied/moved to `public/`.
- `ferry-ops-dashboard` and `ferry-monitoring`: No UI files exist at all.

### `ferry-monitoring` is incomplete
- Only contains `server.js` and `package.json` — no Dockerfile, no `.env.example`, no frontend
- Connects to HiveMQ by default, while `ferry-control` uses Mosquitto — they will not exchange messages without reconfiguration
- Subscribes to `fleet/bcferries/+/telemetry` but `ferry-control` (mosquitto mode) publishes to `ferry/vessel/{vesselId}/telemetry`
- The `npm run build:frontend` script references `webpack` which is not installed

### `ferry-ops-dashboard` build script
`npm run build` references `build.js` which does not exist — not a runtime issue.

### Cross-service URL coupling
`ferry-ops-dashboard` connects to `ferry-control` via WebSocket. The URL defaults to `https://ferry.linknote.com` (set in `fly.toml` as `FERRY_CONTROL_API`/`FERRY_CONTROL_WS`). In local development, override these via `.env`.

## Key Configuration

**Environment variables** — copy `.env.example` to `.env` in each service:
- `ferry-control`: `HIVEMQ_CLUSTER_URL`, `HIVEMQ_USERNAME/PASSWORD`, `VESSEL_ID`, `TELEMETRY_INTERVAL`
- `ferry-ops-dashboard`: `MQTT_BROKER_URL`, `MQTT_CLIENT_ID`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `DB_PATH`, `FERRY_CONTROL_API`, `FERRY_CONTROL_WS`
- `ferry-monitoring`: `MQTT_BROKER`, `HIVEMQ_USERNAME`, `HIVEMQ_PASSWORD`, `FERRY_CONTROL_URL`

**MQTT provider selection** (ferry-control): set `activeProvider` in `config/mqtt-config.json` or set `MQTT_PROVIDER` env var. Options: `mosquitto` (default) or `hivemq`.

## REST API Highlights

**Ferry Control** (`localhost:8080`):
- `GET /api/vessel/state` — current vessel state
- `POST /api/override/engine/rpm` — inject sensor overrides
- `POST /api/emergency/fire/trigger` — trigger fire alarm
- `GET /health` — health check including MQTT status

**Ops Dashboard** (`localhost:8081`):
- `GET /api/fleet` — all vessels
- `GET /api/historical/:vessel/:metric?range=24h` — time-series data
- `GET /api/historical/:vessel/export` — CSV download
- `POST /api/control/:vesselId/:system/:action` — proxy to ferry-control
- `GET /health`

## Loose Files in ferry-control

The `ferry-control/` root contains many loose development/debug scripts from the original repo (`generate-hivemq-config.js`, `hivemq-api-configurator.js`, `ops-mqtt-fix.js`, `test-*.js`, etc.) that are not part of the running application. The actual application is: `server.js`, `lib/mqtt-client.js`, `config/mqtt-config.json`, `Dockerfile`, `fly.toml`, `package.json`.
