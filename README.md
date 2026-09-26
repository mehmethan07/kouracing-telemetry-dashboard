# KOU Racing Telemetry Dashboard

A high-performance web-based telemetry dashboard built for KOU Racing Formula Student Electric team. Designed to handle continuous, high-frequency (60 Hz) live data streams with zero-allocation binary parsing and efficient memory management.

## System Architecture

This dashboard is one component of a two-part system. **A running Gateway is required for live data.**

```
UDP Telemetry Device
        │
        ▼
Gateway (Node.js / UDP → WebSocket)   ← kouracing-telemetry repository
        │
        ├─── WebSocket (binary, 28-byte packets) ──► Dashboard (Next.js)
        │                                              real-time live view
        └─── REST API (InfluxDB history) ──────────► Dashboard (Next.js)
                                                       historical charts on load
```

The [kouracing-telemetry](https://github.com/mehmethan07/kouracing-telemetry) gateway repository is a **required dependency** — without it there is no data source. The dashboard does not contain its own backend and cannot generate or simulate live telemetry on its own.

## Performance Design

The dashboard is built to operate under strict performance constraints, minimizing garbage collection (GC) pauses and React re-render overhead:

- **Client-side Binary Parsing:** Incoming WebSocket messages are raw `ArrayBuffer` payloads (28-byte Little-Endian packets). These are parsed entirely on the client using `DataView` in `src/utils/telemetryParser.ts` — no JSON, no file I/O, no `.fsd` or similar file format. Each packet is decoded the instant it arrives over the WebSocket connection.
- **Zero-Allocation Ring Buffers:** Parsed telemetry is stored in pre-allocated `Float64Array` ring buffers (Struct-of-Arrays layout). This ensures O(1) reads/writes with zero GC pressure during a live session.
- **rAF Render Loop:** UI updates are decoupled from network events. A `requestAnimationFrame` loop flushes buffered data to global state at a controlled rate, preventing React render thrashing.
- **Direct DOM Manipulation:** High-frequency UI components (e.g., speed readouts) bypass the React reconciliation cycle entirely by writing directly to `Element.textContent`.
- **Canvas Rendering:** Time-series charts use `uPlot` to render thousands of data points at 60 fps without DOM bloat.
- **Session Persistence (IndexedDB):** Completed telemetry sessions are automatically saved to the browser's IndexedDB via `src/utils/idb.ts`. This is not a general cache — it stores full session buffers (time, speed, rpm, motor_temp, battery_voltage, throttle, laps) so that a session can be fully restored after a page reload or network drop, without any server roundtrip.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **State Management:** Zustand (with pre-allocated TypedArray ring buffers)
- **Charting:** uPlot (Canvas-based, 60 fps)
- **Icons:** Lucide React

## Features & Components

### Live Dashboard (`/`)
- Real-time speed gauge, RPM, motor temperature, battery voltage, throttle bar
- Fault detection with live fault log and alert system
- Adjustable UI refresh rate (1 Hz – 60 Hz)
- Configurable time-window chart controls (30 s / 1 m / 5 m / 15 m / All)
- Timeline scrubber for reviewing past data within the current session
- Blackbox recovery: restores the last auto-saved session from IndexedDB on reconnect

### Race Mode (`/race`)
- Minimal full-screen driver view: speed, RPM, motor temp, battery voltage, throttle
- Threshold-based driver alerts (motor overheat > 100 °C, battery out of 300–420 V range)

### Lap Analysis (`/laps`)
- Per-lap breakdown with sector times and performance deltas

### History (`/history`)
- Loads stored sessions from IndexedDB for post-session review
- **RadarChart:** Overlays multiple sessions on a spider/radar chart across five axes (top speed, avg RPM, avg motor temp, avg battery voltage, avg throttle) — useful for comparing overall session performance at a glance
- **ScatterChart:** Canvas-rendered scatter plot of any two telemetry channels against each other (e.g., speed vs. throttle) to identify correlations across sessions
- **GhostCarSim:** Animated playback simulator that replays two sessions side-by-side as moving "ghost" markers along a speed timeline, with variable playback speed (1×, 2×, 4×)

### Compare (`/compare`)
- Side-by-side comparison of multiple loaded sessions

### Track Map
- **TrackMap:** SVG oval track with a live position marker driven by lap progress (0–1). The track surface is colour-coded using a motor temperature heat map sampled at up to 100 points per lap, giving a thermal overview of each lap.

### Team (`/team`)
- Driver roster and engineer notes, persisted via the Gateway REST API

## Getting Started

### Prerequisites

- Node.js v20 or higher
- npm
- A running instance of the **[kouracing-telemetry](https://github.com/mehmethan07/kouracing-telemetry) gateway** (required for live WebSocket data and historical REST data)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mehmethan07/kouracing-telemetry-dashboard.git
   cd kouracing-telemetry-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` in the project root and set the required environment variables (see below).

4. Start the development server:
   ```bash
   npm run dev
   ```
   The dashboard will be available at `http://localhost:3005`.

## Environment Variables

| Variable | Required | Description |
| :--- | :---: | :--- |
| `GATEWAY_URL` | ✅ | Base URL of the Gateway REST API (e.g., `https://your-gateway-domain.com`). Must be set — no default. |
| `GATEWAY_API_KEY` | ⚠️ | API key sent as `x-api-key` to authenticate with the Gateway. Leave empty if the gateway does not require a key. |
| `NEXT_PUBLIC_WS_URL` | ⚠️ | WebSocket binary stream URL (e.g., `ws://192.168.1.10:3005`). If omitted, the dashboard auto-selects `wss://<host>` on HTTPS or `ws://<hostname>:3005` otherwise. |
| `NEXT_PUBLIC_HISTORY_WINDOW_SEC` | — | Seconds of historical data to fetch on load. Min: `60`, Max: `86400`. Default: `28800` (8 hours). |

> `GATEWAY_URL` and `GATEWAY_API_KEY` are server-side variables and are never exposed to the browser.

## Build for Production

```bash
npm run build
npm start
```

## Docker

The project uses Next.js `standalone` output for Docker deployment:

```bash
docker build -t kouracing-dashboard .

docker run -p 3005:3005 \
  -e GATEWAY_URL=https://your-gateway-domain.com \
  -e GATEWAY_API_KEY=your-api-key \
  kouracing-dashboard
```

## Deployment on Vercel

The Next.js app can be deployed on Vercel. Note that `NEXT_PUBLIC_WS_URL` must point to an **external** server (e.g., the Gateway host) since Vercel's serverless environment does not support long-lived WebSocket connections. If the dashboard is served over `https://`, the WebSocket URL must use `wss://` to comply with browser mixed-content policies.
