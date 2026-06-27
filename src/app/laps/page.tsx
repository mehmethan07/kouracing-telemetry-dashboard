'use client';

import { useMemo, useState } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { Timer, TrendingUp, TrendingDown, Minus, Trophy, X, ChevronRight } from 'lucide-react';
import TelemetryChart from '../../components/TelemetryChart/TelemetryChart';
import RadarChart from '@/components/RadarChart/RadarChart';
import styles from './page.module.css';

interface LapData {
  lap: number;
  avgSpeed: number;
  maxSpeed: number;
  avgRpm: number;
  maxTemp: number;
  avgBattery: number;
  duration: string;
  durationSec: number;
  
  // Phase 1: Sectors
  s1Time: number;
  s2Time: number;
  s3Time: number;
  s1Color?: 'purple' | 'green' | 'none';
  s2Color?: 'purple' | 'green' | 'none';
  s3Color?: 'purple' | 'green' | 'none';
  lapColor?: 'purple' | 'green' | 'none';
  consistency: number;

  // Phase 2: Mini Telemetry
  fullThrottlePct: number;
  hardBrakingEvents: number;

  status: 'completed' | 'in-progress';
  progress: number;
  dataRange: { start: number; end: number };
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
    const sliceEnd = end + 1;
    const isCurrentLap = i === totalLaps - 1;

    const speeds = history.speed.slice(start, sliceEnd);
    const rpms = history.rpm.slice(start, sliceEnd);
    const temps = history.motor_temp.slice(start, sliceEnd);
    const batteries = history.battery_voltage.slice(start, sliceEnd);
    const throttles = history.throttle.slice(start, sliceEnd);
    const times = history.time.slice(start, sliceEnd);

    let avgSpeed = 0, maxSpeed = -Infinity, avgRpm = 0, maxTemp = -Infinity, avgBattery = 0;
    let speedSum = 0, rpmSum = 0, batterySum = 0;

    let totalDist = 0;
    const distances = [0];

    for (let j = 0; j < speeds.length; j++) {
      speedSum += speeds[j];
      if (speeds[j] > maxSpeed) maxSpeed = speeds[j];
      
      if (j > 0) {
        const dt = times[j] - times[j-1];
        totalDist += (speeds[j] / 3.6) * dt;
      }
      distances.push(totalDist);
    }
    
    for (let j = 0; j < rpms.length; j++) { rpmSum += rpms[j]; }
    for (let j = 0; j < temps.length; j++) { if (temps[j] > maxTemp) maxTemp = temps[j]; }
    for (let j = 0; j < batteries.length; j++) { batterySum += batteries[j]; }

    avgSpeed = speeds.length ? speedSum / speeds.length : 0;
    maxSpeed = speeds.length ? maxSpeed : 0;
    avgRpm = rpms.length ? rpmSum / rpms.length : 0;
    maxTemp = temps.length ? maxTemp : 0;
    avgBattery = batteries.length ? batterySum / batteries.length : 0;

    const durationSec = history.time[end] - history.time[start];
    const effectiveSecs = Math.max(durationSec, 1);
    const mins = Math.floor(effectiveSecs / 60);
    const secs = Math.floor(effectiveSecs % 60);

    // Calculate Sectors (Distance based 33%, 66%)
    const s1Target = totalDist * 0.3333;
    const s2Target = totalDist * 0.6666;
    let s1EndIdx = -1, s2EndIdx = -1;
    
    for(let j = 0; j < distances.length; j++) {
      if (s1EndIdx === -1 && distances[j] >= s1Target) s1EndIdx = j;
      if (s2EndIdx === -1 && distances[j] >= s2Target) s2EndIdx = j;
    }
    
    // Fallbacks if target distance not reached
    if (s1EndIdx === -1) s1EndIdx = Math.floor(distances.length / 3);
    if (s2EndIdx === -1) s2EndIdx = Math.floor(distances.length * 2 / 3);
    
    // We must ensure indices are within times array bounds. distances is length N+1, but we use it as approx index.
    s1EndIdx = Math.min(s1EndIdx, times.length - 1);
    s2EndIdx = Math.min(s2EndIdx, times.length - 1);
    
    const s1Time = times[s1EndIdx] - times[0];
    const s2Time = times[s2EndIdx] - times[s1EndIdx];
    const s3Time = times[times.length - 1] - times[s2EndIdx];

    // Phase 2: Mini Telemetry
    let fullThrottleCount = 0;
    let hardBrakingEvents = 0;
    for (let j = 0; j < throttles.length; j++) {
      if (throttles[j] >= 90) fullThrottleCount++;
      // Simple hard braking detection: throttle < 5 and speed dropping fast
      if (j > 5 && throttles[j] < 5 && throttles[j-5] > 50 && speeds[j] < speeds[j-5] - 5) {
        hardBrakingEvents++;
      }
    }
    const fullThrottlePct = (fullThrottleCount / Math.max(1, throttles.length)) * 100;

    result.push({
      lap: lapNum,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      avgRpm: Math.round(avgRpm),
      maxTemp: Math.round(maxTemp * 10) / 10,
      avgBattery: Math.round(avgBattery * 10) / 10,
      duration: `${mins}:${secs.toString().padStart(2, '0')}`,
      durationSec: effectiveSecs,
      s1Time,
      s2Time,
      s3Time,
      consistency: 100, // Will calculate later
      fullThrottlePct,
      hardBrakingEvents,
      status: isCurrentLap ? 'in-progress' : 'completed',
      progress: isCurrentLap ? Math.min(100, Math.floor((speeds.length / 120) * 100)) : 100,
      dataRange: { start, end },
    });
  }

  // Calculate Purple/Green Sectors
  let bestS1 = Infinity, bestS2 = Infinity, bestS3 = Infinity, bestOverall = Infinity;
  result.forEach(r => {
    if (r.status !== 'completed') return;
    if (r.s1Time < bestS1) bestS1 = r.s1Time;
    if (r.s2Time < bestS2) bestS2 = r.s2Time;
    if (r.s3Time < bestS3) bestS3 = r.s3Time;
    if (r.durationSec < bestOverall) bestOverall = r.durationSec;
  });

  // Since we only have 1 driver's session here, purple/green distinction is mostly vs own best.
  // In F1, purple = overall session best, green = personal best. 
  // We'll mark the absolute best as Purple, and others within 2% as Green.
  result.forEach(r => {
    if (r.status !== 'completed') return;
    
    r.s1Color = r.s1Time <= bestS1 ? 'purple' : (r.s1Time <= bestS1 * 1.02 ? 'green' : 'none');
    r.s2Color = r.s2Time <= bestS2 ? 'purple' : (r.s2Time <= bestS2 * 1.02 ? 'green' : 'none');
    r.s3Color = r.s3Time <= bestS3 ? 'purple' : (r.s3Time <= bestS3 * 1.02 ? 'green' : 'none');
    r.lapColor = r.durationSec <= bestOverall ? 'purple' : (r.durationSec <= bestOverall * 1.02 ? 'green' : 'none');

    // Consistency rating
    const diff = r.durationSec - bestOverall;
    r.consistency = Math.max(0, 100 - (diff / bestOverall) * 500); // Rough rating
  });

  return result;
}

// Mini Sparkline component for the trend column
const MiniSparkline = ({ data }: { data: Float64Array | number[] }) => {
  if (data.length < 2) return <div className={styles.sparklinePlaceholder}>-</div>;
  // Float64Array doesn't support spread for Math.min/max
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min || 1;
  
  // Sample data to max 20 points
  const step = Math.ceil(data.length / 20);
  const sampled: number[] = [];
  for (let i = 0; i < data.length; i += step) sampled.push(data[i]);
  
  const width = 60;
  const height = 24;
  
  const points = sampled.map((val, i) => {
    const x = (i / (sampled.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const isUp = sampled[sampled.length - 1] > sampled[0];
  const color = isUp ? 'var(--status-ok)' : 'var(--status-danger)';

  return (
    <svg width={width} height={height} className={styles.sparkline}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default function LapsPage() {
  const history = useTelemetryStore((s) => s.history);
  const laps = useMemo(() => generateLapData(history), [history]);
  
  const [selectedLap, setSelectedLap] = useState<LapData | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'speed' | 'rpm' | 'motor_temp' | 'battery_voltage' | 'throttle'>('speed');

  const completedLaps = laps.filter(l => l.status === 'completed');
  const bestLap = completedLaps.length > 0
    ? completedLaps.reduce((best, lap) => lap.durationSec < best.durationSec ? lap : best, completedLaps[0])
    : null;

  const handleRowClick = (lap: LapData) => {
    setSelectedLap(lap);
  };

  const closeDetails = () => {
    setSelectedLap(null);
    setActiveModalTab('speed');
  };

  return (
    <main className={styles.page}>
      {/* PHASE 3: LAP DETAILS DRAWER */}
      {selectedLap && (
        <>
          <div className={styles.drawerOverlay} onClick={closeDetails} />
          <div className={`${styles.drawerContent} ${selectedLap ? styles.drawerOpen : ''}`}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>LAP {selectedLap.lap} ANALYSIS</h2>
                <p className={styles.drawerSubtitle}>
                  {selectedLap.duration} • S1: {selectedLap.s1Time.toFixed(1)}s • S2: {selectedLap.s2Time.toFixed(1)}s • S3: {selectedLap.s3Time.toFixed(1)}s
                </p>
              </div>
              <button className={styles.closeBtn} onClick={closeDetails}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.drawerBody}>
              <div className={styles.statGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Avg Speed</span>
                  <span className={styles.statValue}>{selectedLap.avgSpeed} <small>km/h</small></span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Max Speed</span>
                  <span className={styles.statValue}>{selectedLap.maxSpeed} <small>km/h</small></span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Avg RPM</span>
                  <span className={styles.statValue}>{selectedLap.avgRpm}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Max Temp</span>
                  <span className={`${styles.statValue} ${selectedLap.maxTemp > 100 ? styles.dangerText : ''}`}>
                    {selectedLap.maxTemp} <small>°C</small>
                  </span>
                </div>
              </div>

              {/* AI AI Analysis */}
              <div className={styles.aiBox}>
                <div className={styles.aiHeader}>
                  <TrendingUp size={14} /> SMART ANALYSIS
                </div>
                <ul className={styles.aiList}>
                  {bestLap && selectedLap.lap !== bestLap.lap && (
                    <li className={styles.aiItem}>
                      <span className={styles.aiDot} style={{ background: 'var(--status-danger)' }} />
                      Lost {(selectedLap.durationSec - bestLap.durationSec).toFixed(1)}s compared to Best Lap (Lap {bestLap.lap}).
                    </li>
                  )}
                  {bestLap && selectedLap.lap === bestLap.lap && (
                    <li className={styles.aiItem}>
                      <span className={styles.aiDot} style={{ background: '#A855F7' }} />
                      Current Session Best Lap! Excellent pacing.
                    </li>
                  )}
                  {selectedLap.fullThrottlePct < 40 && (
                    <li className={styles.aiItem}>
                      <span className={styles.aiDot} style={{ background: 'var(--status-warning)' }} />
                      Low full-throttle duration ({Math.round(selectedLap.fullThrottlePct)}%). Consider carrying more speed through exits.
                    </li>
                  )}
                  {selectedLap.maxTemp > 105 && (
                    <li className={styles.aiItem}>
                      <span className={styles.aiDot} style={{ background: 'var(--status-danger)' }} />
                      Motor temperature critical ({selectedLap.maxTemp}°C). Lift and coast advised.
                    </li>
                  )}
                  {selectedLap.hardBrakingEvents > 5 && (
                    <li className={styles.aiItem}>
                      <span className={styles.aiDot} style={{ background: 'var(--status-warning)' }} />
                      High number of hard braking events ({selectedLap.hardBrakingEvents}). Tire wear might increase.
                    </li>
                  )}
                </ul>
              </div>

              {/* Driving Signature */}
              <div className={styles.signatureBox}>
                <RadarChart sessions={[{ 
                  name: `Lap ${selectedLap.lap}`, 
                  color: '#3B82F6',
                  data: {
                    speed: history.speed.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1),
                    throttle: history.throttle.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1),
                    rpm: history.rpm.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1),
                    time: [], motor_temp: [], battery_voltage: []
                  }
                }]} />
              </div>

              <div className={styles.chartArea}>
                <div className={styles.drawerTabs}>
                  <button className={`${styles.drawerTabBtn} ${activeModalTab === 'speed' ? styles.activeDrawerTab : ''}`} onClick={() => setActiveModalTab('speed')}>Speed</button>
                  <button className={`${styles.drawerTabBtn} ${activeModalTab === 'rpm' ? styles.activeDrawerTab : ''}`} onClick={() => setActiveModalTab('rpm')}>RPM</button>
                  <button className={`${styles.drawerTabBtn} ${activeModalTab === 'motor_temp' ? styles.activeDrawerTab : ''}`} onClick={() => setActiveModalTab('motor_temp')}>Motor Temp</button>
                  <button className={`${styles.drawerTabBtn} ${activeModalTab === 'battery_voltage' ? styles.activeDrawerTab : ''}`} onClick={() => setActiveModalTab('battery_voltage')}>Battery</button>
                  <button className={`${styles.drawerTabBtn} ${activeModalTab === 'throttle' ? styles.activeDrawerTab : ''}`} onClick={() => setActiveModalTab('throttle')}>Throttle</button>
                </div>
                
                <div className={styles.chartWrapper}>
                  {activeModalTab === 'speed' && (
                    <TelemetryChart title="SPEED" color="#3B82F6" data={[history.time.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1), history.speed.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1)]} yMin={0} yMax={160} />
                  )}
                  {activeModalTab === 'rpm' && (
                    <TelemetryChart title="RPM" color="#8B5CF6" data={[history.time.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1), history.rpm.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1)]} yMin={0} yMax={16000} />
                  )}
                  {activeModalTab === 'motor_temp' && (
                    <TelemetryChart title="MOTOR TEMP" color={selectedLap.maxTemp > 100 ? "var(--status-danger)" : "var(--kou-green)"} data={[history.time.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1), history.motor_temp.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1)]} yMin={0} yMax={120} />
                  )}
                  {activeModalTab === 'battery_voltage' && (
                    <TelemetryChart title="BATTERY" color="#F59E0B" data={[history.time.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1), history.battery_voltage.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1)]} yMin={200} yMax={450} />
                  )}
                  {activeModalTab === 'throttle' && (
                    <TelemetryChart title="THROTTLE" color="#06B6D4" data={[history.time.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1), history.throttle.slice(selectedLap.dataRange.start, selectedLap.dataRange.end + 1)]} yMin={0} yMax={100} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
            <span>Best: Lap {bestLap.lap} — {bestLap.duration}</span>
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
                <th>S1</th>
                <th>S2</th>
                <th>S3</th>
                <th>Duration</th>
                <th>Consistency</th>
                <th>Avg Speed</th>
                <th>Full Throttle</th>
                <th>Hard Brakes</th>
                <th>Speed Trend</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {laps.map((lap, i) => {
                const prevLap = i > 0 ? laps[i - 1] : null;
                const trend = prevLap
                  ? lap.avgSpeed > prevLap.avgSpeed ? 'up' : lap.avgSpeed < prevLap.avgSpeed ? 'down' : 'same'
                  : 'same';

                // Get speed data for sparkline
                const lapSpeedData = history.speed.slice(lap.dataRange.start, lap.dataRange.end + 1);

                return (
                  <tr 
                    key={lap.lap} 
                    className={`${bestLap?.lap === lap.lap ? styles.bestRow : ''} ${styles.clickableRow}`}
                    onClick={() => handleRowClick(lap)}
                  >
                    <td data-label="LAP" className={styles.lapNum}>
                      {bestLap?.lap === lap.lap && <Trophy size={14} color="var(--status-warning)" />}
                      {lap.lap}
                      {lap.status === 'in-progress' && <span className={styles.inProgressBadge}>Live</span>}
                    </td>
                    <td data-label="S1" className={styles.sectorCell}>
                      <span className={`${styles.sectorBadge} ${styles[lap.s1Color || 'none']}`}>
                        {lap.status === 'completed' ? lap.s1Time.toFixed(1) : '-'}
                      </span>
                    </td>
                    <td data-label="S2" className={styles.sectorCell}>
                      <span className={`${styles.sectorBadge} ${styles[lap.s2Color || 'none']}`}>
                        {lap.status === 'completed' ? lap.s2Time.toFixed(1) : '-'}
                      </span>
                    </td>
                    <td data-label="S3" className={styles.sectorCell}>
                      <span className={`${styles.sectorBadge} ${styles[lap.s3Color || 'none']}`}>
                        {lap.status === 'completed' ? lap.s3Time.toFixed(1) : '-'}
                      </span>
                    </td>
                    <td data-label="DURATION" className={styles.mono}>
                      <span className={`${styles.sectorBadge} ${styles[lap.lapColor || 'none']}`}>
                        {lap.duration}
                      </span>
                    </td>
                    <td data-label="CONSISTENCY">
                      {lap.status === 'completed' ? (
                        <div className={styles.consistencyBarWrapper}>
                          <div 
                            className={styles.consistencyBar} 
                            style={{ 
                              width: `${lap.consistency}%`, 
                              backgroundColor: lap.consistency > 90 ? 'var(--status-ok)' : lap.consistency > 70 ? 'var(--status-warning)' : 'var(--status-danger)' 
                            }} 
                          />
                          <span className={styles.consistencyText}>{Math.round(lap.consistency)}%</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td data-label="AVG SPEED">{lap.avgSpeed} km/h</td>
                    <td data-label="THROTTLE">
                      <div className={styles.miniBarWrapper}>
                        <div className={styles.miniBar} style={{ width: `${lap.fullThrottlePct}%`, backgroundColor: '#3B82F6' }} />
                        <span className={styles.miniBarText}>{Math.round(lap.fullThrottlePct)}%</span>
                      </div>
                    </td>
                    <td data-label="BRAKING">{lap.hardBrakingEvents}</td>
                    <td data-label="TREND">
                      <div className={styles.trendCell}>
                        {trend === 'up' && <TrendingUp size={14} color="var(--status-ok)" />}
                        {trend === 'down' && <TrendingDown size={14} color="var(--status-danger)" />}
                        {trend === 'same' && <Minus size={14} color="var(--text-muted)" />}
                        <MiniSparkline data={lapSpeedData} />
                      </div>
                    </td>
                    <td className={styles.actionCell}>
                      <ChevronRight size={16} color="var(--text-muted)" />
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
