'use client';

import { useEffect } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

export default function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const { connect, disconnect } = useTelemetryStore();

  useEffect(() => {
    // Global connection: Connects when the app loads, disconnects only when the tab is closed
    connect();
    
    return () => {
      // Disconnects purely on unmount of the entire app instance
      disconnect();
    };
  }, [connect, disconnect]);

  return <>{children}</>;
}
