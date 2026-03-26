'use client';

import { memo, useCallback } from 'react';
import { Download } from 'lucide-react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import styles from './ExportButton.module.css';

function ExportButtonComponent() {
  const history = useTelemetryStore((s) => s.history);

  const exportCSV = useCallback(() => {
    if (history.time.length === 0) return;

    const headers = ['timestamp', 'speed', 'rpm', 'motor_temp', 'battery_voltage', 'throttle'];
    const rows = history.time.map((t, i) =>
      [t, history.speed[i], history.rpm[i], history.motor_temp[i], history.battery_voltage[i], history.throttle[i]].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `telemetry_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [history]);

  const exportJSON = useCallback(() => {
    if (history.time.length === 0) return;

    const data = history.time.map((t, i) => ({
      timestamp: t,
      speed: history.speed[i],
      rpm: history.rpm[i],
      motor_temp: history.motor_temp[i],
      battery_voltage: history.battery_voltage[i],
      throttle: history.throttle[i],
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `telemetry_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [history]);

  return (
    <div className={styles.container}>
      <button className={styles.btn} onClick={exportCSV} title="Export CSV">
        <Download size={14} />
        <span>CSV</span>
      </button>
      <button className={styles.btn} onClick={exportJSON} title="Export JSON">
        <Download size={14} />
        <span>JSON</span>
      </button>
    </div>
  );
}

const ExportButton = memo(ExportButtonComponent);
export default ExportButton;
