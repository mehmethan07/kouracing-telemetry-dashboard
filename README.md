# KOU Racing Telemetry Dashboard

High-performance real-time visualization and analytics platform for Formula Student EV telemetry data.

![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-blue)

## Features

- **Real-Time Data Streaming:** Sub-second telemetry updates via Socket.io from the KOU Racing Telemetry Gateway.
- **High-Performance Charts:** Utilizes `uPlot` for rendering thousands of data points with minimal CPU overhead.
- **Dynamic Track Map:** Live vehicle position tracking with integrated motor temperature heat-mapping.
- **Lap Analysis:** Automatic lap detection and performance breakdown (Duration, Avg/Max Speed, RPM peaks).
- **Session Comparison:** Overlay historical telemetry data from multiple sessions for detailed competitive analysis.
- **Fault Management:** Real-time fault alerts and system event logs with human-readable error descriptions.
- **REST API Docs:** Interactive documentation for accessing telemetry history and session data programmatically.

## Architecture

```text
Vehicle → UDP → Telemetry Gateway (Node.js) → InfluxDB
                                  ↓
                          Socket.io (3001)
                                  ↓
                  Telemetry Dashboard (Next.js/React)
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **State Management:** Zustand
- **Visualization:** uPlot, Lucide Icons
- **Communication:** Socket.io-client
- **Styling:** CSS Modules, Vanilla CSS (Custom KOU Racing Design System)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Running instance of [KOU Racing Telemetry Gateway](https://github.com/mehmethan07/kouracing-telemetry)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mehmethan07/telemetry-dashboard.git
   cd telemetry-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file based on `.env.example`.
   ```bash
   cp .env.example .env.local
   ```

4. Run Development Server:
   ```bash
   npm run dev
   ```

## Development

### Project Structure
```text
src/
├── app/             # Next.js Pages & Server/Client Routes
├── components/      # Reusable UI Components (Charts, TrackMap)
└── store/           # Zustand State Management & Socket Connections
```

---

## License

This project is licensed under the MIT License.

## About KOU Racing
KOU Racing is the official Formula Student team of Kocaeli University. This dashboard is part of our integrated telemetry system designed for high-speed EV racing performance analysis.
