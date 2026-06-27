# KOU Racing Telemetry Dashboard

A high-performance web-based telemetry dashboard built for KOU Racing. Designed to handle continuous, high-frequency (60Hz) data streams with zero-allocation binary parsing and efficient memory management.

## Architecture & Performance

The dashboard is built to operate under strict performance constraints, minimizing garbage collection (GC) pauses and React re-render overhead:

- **End-to-End Binary Protocol:** Operates over native WebSockets using raw `ArrayBuffer` payloads (28-byte Little-Endian packets), eliminating JSON parsing overhead.
- **Zero-Allocation Ring Buffers:** Incoming telemetry is stored in pre-allocated `Float64Array` ring buffers using a Struct-of-Arrays (SoA) layout. This ensures O(1) reads/writes and generates zero GC pressure during active sessions.
- **rAF Render Loop:** UI updates are decoupled from network events. A `requestAnimationFrame` loop flushes buffered data to the global state at a controlled rate, preventing React render thrashing.
- **Direct DOM Manipulation:** High-frequency UI components (e.g., speed readouts) bypass the React reconciliation cycle entirely by writing directly to `Element.textContent`.
- **Canvas Rendering:** Time-series charts utilize `uPlot` for rendering thousands of data points at 60fps without DOM bloat.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **State Management:** Zustand
- **Charting:** uPlot
- **Icons:** Lucide React
- **Database Client:** InfluxDB Client (for historical data hydration)

## Getting Started

### Prerequisites

- Node.js (v20 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd telemetry-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and configure the required environment variables (see below).

4. Start the development server:
   ```bash
   npm run dev
   ```
   The dashboard will be available at `http://localhost:3005`.

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL (e.g., `ws://localhost:3005` or `wss://your-domain.com`). |
| `NEXT_PUBLIC_HISTORY_WINDOW_SEC` | The time window (in seconds) of historical data to fetch on initial load (default: `28800`). |

*(Additional environment variables for InfluxDB or backend configuration should be added to `.env.local` as required by your specific backend setup).*

## Build for Production

To create an optimized production build:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Deployment

This project is optimized for deployment on Vercel. Ensure that your WebSocket endpoints are served over `wss://` if the dashboard is hosted on an `https://` domain, due to browser mixed-content security policies.
