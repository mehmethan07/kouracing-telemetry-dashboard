'use client';

import { useEffect } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

/**
 * TelemetryProvider
 *
 * Bootstraps the binary WebSocket connection lifecycle:
 *   1. Hydrate charts from InfluxDB history (REST)
 *   2. Open native WebSocket to binary gateway (ws:// / wss://)
 *   3. On unmount (or HMR) → graceful disconnect
 *
 * NOTE: connect() is idempotent — safe to call twice.
 */
export default function TelemetryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Pre-fill charts with historical data before live stream starts
      await useTelemetryStore.getState().hydrateFromInflux();

      if (!cancelled) {
        // Open the native WebSocket binary connection
        useTelemetryStore.getState().connect();
      }
    })();

    return () => {
      cancelled = true;
      // Clean disconnect: closes WS with code 1000 and cancels reconnect timer
      useTelemetryStore.getState().disconnect();
    };
  }, []);

  return <>{children}</>;
}
