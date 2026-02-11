# BC Ferries Maritime Monitoring Demo

Real-time maritime telemetry system simulating BC Ferries Island Class vessel operations. Four services communicate via MQTT and WebSocket, all deployed on Fly.io.

## Services

| Service | Fly.io app | Purpose |
|---------|-----------|---------|
| `mqtt-broker/` | `bc-ferries-mqtt-broker` | Mosquitto broker — the shared message bus |
| `ferry-control/` | `bc-ferries-control-new` | Vessel simulator, telemetry publisher, interactive control panel |
| `ferry-ops-dashboard/` | `bc-ferries-ops-dashboard` | Fleet operations center with historical data (SQLite) |
| `ferry-monitoring/` | `bc-ferries-monitoring` | Telemetry aggregation and system health monitoring |

## Architecture

```
Browser                    Fly.io
  │                          │
  ├── WebSocket ─────────────► ferry-control :8080
  │                          │   publishes telemetry via MQTT
  │                          │           │
  │                          │           ▼
  │                          │   mqtt-broker :1883 / :9001 (WSS)
  │                          │           │
  │                          │           ▼
  ├── WebSocket ─────────────► ferry-ops-dashboard :8081
  │                          │   subscribes to MQTT, stores to SQLite
  │                          │
  └── WebSocket ─────────────► ferry-monitoring :8080
                             │   subscribes to MQTT, aggregates fleet state
```

**MQTT topics** (Mosquitto provider):
- `ferry/vessel/{vesselId}/telemetry` — engine, power, navigation, safety data
- `ferry/vessel/{vesselId}/emergency/{type}` — fire alarms, safety events
- `ferry/vessel/{vesselId}/status/{component}` — system health, retained
- `ferry/vessel/{vesselId}/control/{system}/{action}` — inbound control commands

Telemetry is published every 60 seconds by default (`TELEMETRY_INTERVAL` env var). The ops dashboard collects and stores it every 5 seconds, with 1-day retention.

## Local Development

Each service is independent. Run them in separate terminals:

```bash
# Terminal 1 — MQTT broker (requires Docker)
cd mqtt-broker
docker build -t ferry-mqtt-broker .
docker run -p 1883:1883 -p 9001:9001 ferry-mqtt-broker

# Terminal 2 — Ferry control simulator
cd ferry-control
cp .env.example .env          # edit MQTT_BROKER_HOST if needed
npm install
npm run dev                   # http://localhost:8080

# Terminal 3 — Ops dashboard
cd ferry-ops-dashboard
cp .env.example .env          # set MQTT_BROKER_URL=ws://localhost:9001
npm install
npm run dev                   # http://localhost:8081

# Terminal 4 — Monitoring service
cd ferry-monitoring
cp .env.example .env          # set MQTT_BROKER=ws://localhost:9001
npm install
npm run dev                   # http://localhost:8080
```

For local dev, point the services at your local broker by setting `MQTT_BROKER_URL=ws://localhost:9001` (no auth — the broker runs with `allow_anonymous true` in its current config).

## Deployment

Services deploy to Fly.io. **GitHub Actions handle this automatically** on push to `main` — each workflow is path-filtered so only the changed service redeploys.

To trigger a deploy manually from the Actions tab, use the `workflow_dispatch` trigger on any of the four workflows.

To deploy manually from the CLI:

```bash
cd <service-directory>
fly deploy
```

**Required GitHub secret**: `FLY_API_TOKEN`
Get your token with `fly auth token`, then add it at:
`Settings → Secrets and variables → Actions → New repository secret`

### First-time setup for a new service

If deploying `ferry-monitoring` for the first time (it has a `fly.toml` but no existing app):

```bash
cd ferry-monitoring
fly apps create bc-ferries-monitoring
fly deploy
```

## Configuration

Each service has a `.env.example` — copy to `.env` for local development. Production configuration is set via `fly.toml` `[env]` blocks and `fly secrets` for sensitive values.

Key environment variables:

**ferry-control**
| Variable | Default | Notes |
|----------|---------|-------|
| `MQTT_PROVIDER` | `mosquitto` | `mosquitto` or `hivemq` |
| `VESSEL_ID` | `island-class-001` | Vessel identifier used in topics |
| `TELEMETRY_INTERVAL` | `60000` | ms between telemetry publishes |
| `MQTT_USERNAME` | *(none)* | Broker auth (if enabled) |
| `MQTT_PASSWORD` | *(none)* | Broker auth (if enabled) |

**ferry-ops-dashboard**
| Variable | Default | Notes |
|----------|---------|-------|
| `MQTT_BROKER_URL` | `wss://bc-ferries-mqtt-broker.fly.dev:443` | Broker WebSocket URL |
| `FERRY_CONTROL_API` | `https://bc-ferries-control-new.fly.dev` | ferry-control base URL |
| `FERRY_CONTROL_WS` | `wss://bc-ferries-control-new.fly.dev` | ferry-control WebSocket URL |
| `DB_PATH` | `./data/ferry_telemetry.db` | SQLite database location |
| `DATA_RETENTION_DAYS` | `1` | How long to keep telemetry |

**ferry-monitoring**
| Variable | Default | Notes |
|----------|---------|-------|
| `MQTT_BROKER` | `wss://bc-ferries-mqtt-broker.fly.dev:443` | Broker WebSocket URL |
| `FERRY_CONTROL_URL` | `https://bc-ferries-control-new.fly.dev` | ferry-control base URL |

## API Reference

**ferry-control** (`:8080`)
- `GET /health` — service and MQTT connection status
- `GET /api/vessel/state` — current simulated vessel state
- `POST /api/override/engine/rpm` — inject RPM override
- `POST /api/override/engine/temperature` — inject temperature override
- `POST /api/override/power/battery` — inject battery SOC override
- `POST /api/override/safety/bilge` — inject bilge level override
- `POST /api/emergency/fire/trigger` — trigger fire alarm
- `POST /api/emergency/fire/acknowledge` — acknowledge fire alarm

**ferry-ops-dashboard** (`:8081`)
- `GET /health`
- `GET /api/fleet` — all tracked vessels and current state
- `GET /api/alerts` — active alerts
- `GET /api/historical/:vessel/:metric?range=24h` — time-series data
- `GET /api/historical/:vessel/export?range=24h` — CSV download
- `GET /api/historical/:vessel/:metric/stats` — min/max/avg statistics
- `POST /api/control/:vesselId/:system/:action` — proxies to ferry-control

**ferry-monitoring** (`:8080`)
- `GET /health`
- `GET /api/monitoring/state` — aggregated fleet monitoring state
- `GET /api/vessels` — connected vessels
- `GET /api/vessels/:vesselId/telemetry` — latest telemetry for a vessel
- `GET /api/alerts/summary` — alert counts by severity
