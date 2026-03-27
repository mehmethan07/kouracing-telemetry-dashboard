'use client';

import { useTelemetryStore } from '../../store/useTelemetryStore';
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

function generateLapData(history: ReturnType<typeof useTelemetryStore.getState>['history']): LapData[] {
  if (history.time.length === 0 || !history.laps || history.laps.length === 0) return [];

  const lapsData: Record<number, { start: number, end: number }> = {};
  
  for (let i = 0; i < history.laps.length; i++) {
    const lapNum = history.laps[i];
    if (!lapsData[lapNum]) {
      lapsData[lapNum] = { start: i, end: i };
    }
    lapsData[lapNum].end = i;
  }

  const result: LapData[] = [];
  const lapKeys = Object.keys(lapsData).map(Number).sort((a,b)=>a-b);
  const totalLaps = lapKeys.length;

  for (let i = 0; i < totalLaps; i++) {
    const lapNum = lapKeys[i];
    const { start, end } = lapsData[lapNum];
    const sliceEnd = end + 1; // slice is exclusive
    const isCurrentLap = i === totalLaps - 1;

    const speeds = history.speed.slice(start, sliceEnd);
    const rpms = history.rpm.slice(start, sliceEnd);
    const temps = history.motor_temp.slice(start, sliceEnd);
    const batteries = history.battery_voltage.slice(start, sliceEnd);

    const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const maxSpeed = speeds.length ? Math.max(...speeds) : 0;
    const avgRpm = rpms.length ? rpms.reduce((a, b) => a + b, 0) / rpms.length : 0;
    const maxTemp = temps.length ? Math.max(...temps) : 0;
    const avgBattery = batteries.length ? batteries.reduce((a, b) => a + b, 0) / batteries.length : 0;

    const durationSec = history.time[end] - history.time[start];
    // Fallback if time is identical (e.g. mock data)
    const effectiveSecs = Math.max(durationSec, speeds.length / 60); 
    const mins = Math.floor(effectiveSecs / 60);
    const secs = Math.floor(effectiveSecs % 60);

    result.push({
      lap: lapNum,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      avgRpm: Math.round(avgRpm),
      maxTemp: Math.round(maxTemp * 10) / 10,
      avgBattery: Math.round(avgBattery * 10) / 10,
      duration: `${mins}:${secs.toString().padStart(2, '0')}`,
      status: isCurrentLap ? 'in-progress' : 'completed',
      progress: isCurrentLap ? Math.min(100, Math.floor((speeds.length / 120) * 100)) : 100,
    });
  }

  return result;
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
