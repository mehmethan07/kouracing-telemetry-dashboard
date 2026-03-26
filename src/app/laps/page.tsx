'use client';

import { useTelemetryStore, type TelemetryData } from '../../store/useTelemetryStore';
import { Timer, TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import styles from './page.module.css';

interface LapData {
  lap: number;
  avgSpeed: number;
  maxSpeed: number;
  avgRpm: number;
  maxTemp: number;
  avgBattery: number;
  duration: string;
  status: 'completed' | 'in-progress';
  progress: number;
}

/**
 * Internal logic to segment telemetry history into discrete lap batches.
 * Currently uses a fixed 'pointsPerLap' offset.
 */
function generateLapData(history: ReturnType<typeof useTelemetryStore.getState>['history']): LapData[] {
  if (history.time.length === 0) return [];

  const laps: LapData[] = [];
  const pointsPerLap = 120;
  const totalLaps = Math.ceil(history.time.length / pointsPerLap);

  for (let i = 0; i < Math.min(totalLaps, 10); i++) {
    const start = i * pointsPerLap;
    const end = Math.min(start + pointsPerLap, history.time.length);
    const isCurrentLap = i === totalLaps - 1 && (end - start) < pointsPerLap;

    const speeds = history.speed.slice(start, end);
    const rpms = history.rpm.slice(start, end);
    const temps = history.motor_temp.slice(start, end);
    const batteries = history.battery_voltage.slice(start, end);

    const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const maxSpeed = speeds.length ? Math.max(...speeds) : 0;
    const avgRpm = rpms.length ? rpms.reduce((a, b) => a + b, 0) / rpms.length : 0;
    const maxTemp = temps.length ? Math.max(...temps) : 0;
    const avgBattery = batteries.length ? batteries.reduce((a, b) => a + b, 0) / batteries.length : 0;

    const durationSec = end - start;
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;

    laps.push({
      lap: i + 1,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      avgRpm: Math.round(avgRpm),
      maxTemp: Math.round(maxTemp * 10) / 10,
      avgBattery: Math.round(avgBattery * 10) / 10,
      duration: `${mins}:${secs.toString().padStart(2, '0')}`,
      status: isCurrentLap ? 'in-progress' : 'completed',
      progress: Math.floor(((end - start) / pointsPerLap) * 100),
    });
  }

  return laps;
}

export default function LapsPage() {
  const history = useTelemetryStore((s) => s.history);
  const laps = generateLapData(history);

  const completedLaps = laps.filter(l => l.status === 'completed');
  const bestLap = completedLaps.length > 0
    ? completedLaps.reduce((best, lap) => lap.avgSpeed > best.avgSpeed ? lap : best, completedLaps[0])
    : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Timer size={24} /> LAP ANALYSIS
          </h1>
          <p className={styles.subtitle}>Per-lap performance breakdown</p>
        </div>
        {bestLap && (
          <div className={styles.bestLap}>
            <Trophy size={18} color="var(--status-warning)" />
            <span>Best: Lap {bestLap.lap} — {bestLap.avgSpeed} km/h avg</span>
          </div>
        )}
      </header>

      {laps.length === 0 ? (
        <div className={styles.empty}>
          <Timer size={48} />
          <h2>No Lap Data</h2>
          <p>Connect to the vehicle and start driving to see lap analysis.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Lap</th>
                <th>Duration</th>
                <th>Avg Speed</th>
                <th>Max Speed</th>
                <th>Avg RPM</th>
                <th>Max Temp</th>
                <th>Avg Battery</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {laps.map((lap, i) => {
                const prevLap = i > 0 ? laps[i - 1] : null;
                const trend = prevLap
                  ? lap.avgSpeed > prevLap.avgSpeed ? 'up' : lap.avgSpeed < prevLap.avgSpeed ? 'down' : 'same'
                  : 'same';

                return (
                  <tr key={lap.lap} className={bestLap?.lap === lap.lap ? styles.bestRow : ''}>
                    <td data-label="LAP" className={styles.lapNum}>
                      {bestLap?.lap === lap.lap && <Trophy size={14} color="var(--status-warning)" />}
                      {lap.lap}
                      {lap.status === 'in-progress' && <span className={styles.inProgressBadge}>Live</span>}
                    </td>
                    <td data-label="DURATION" className={styles.mono}>{lap.duration}</td>
                    <td data-label="AVG SPEED">{lap.avgSpeed} km/h</td>
                    <td data-label="MAX SPEED">{lap.maxSpeed} km/h</td>
                    <td data-label="AVG RPM">{lap.avgRpm}</td>
                    <td data-label="MAX TEMP" className={lap.maxTemp > 100 ? styles.danger : ''}>
                      {lap.maxTemp}°C
                    </td>
                    <td data-label="AVG BATTERY">{lap.avgBattery} V</td>
                    <td data-label="TREND">
                      {trend === 'up' && <TrendingUp size={16} color="var(--status-ok)" />}
                      {trend === 'down' && <TrendingDown size={16} color="var(--status-danger)" />}
                      {trend === 'same' && <Minus size={16} color="var(--text-muted)" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
