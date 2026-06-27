'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { GitCompareArrows, Upload, Download } from 'lucide-react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import styles from './page.module.css';
import RadarChart from '@/components/RadarChart/RadarChart';
import GhostCarSim from '@/components/GhostCarSim/GhostCarSim';
import EngineerSummary from '@/components/EngineerSummary/EngineerSummary';
import ScatterChart from '@/components/ScatterChart/ScatterChart';

interface SessionData {
  time: number[];
  speed: number[];
  rpm: number[];
  motor_temp: number[];
  battery_voltage: number[];
  throttle: number[];
}

interface LoadedSession {
  name: string;
  data: SessionData;
  color: string;
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];
const METRICS = [
  { key: 'speed', label: 'Speed (km/h)', yMin: 0, yMax: 160 },
  { key: 'rpm', label: 'RPM', yMin: 0, yMax: 16000 },
  { key: 'motor_temp', label: 'Motor Temp (°C)', yMin: 0, yMax: 120 },
  { key: 'battery_voltage', label: 'Battery (V)', yMin: 200, yMax: 450 },
  { key: 'throttle', label: 'Throttle (%)', yMin: 0, yMax: 100 },
] as const;

const uSync = uPlot.sync("compareSync");

/**
 * OverlayChart Component
 * Uses uPlot to render multiple session datasets on a single time-normalized axis.
 */
const OverlayChart = memo(function OverlayChart({ sessions, metricKey, label, yMin, yMax, onHover, strokeWidth, showBrakingZones, isDeltaGraph = false }: {
  sessions: LoadedSession[];
  metricKey: string;
  label: string;
  yMin: number;
  yMax: number;
  onHover: (idx: number | null) => void;
  strokeWidth: number;
  showBrakingZones: boolean;
  isDeltaGraph?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current || sessions.length === 0) return;

    // Normalize time to start from 0 for fair comparison
    const maxLen = Math.max(...sessions.map(s => s.data.time.length));
    const normalizedTime = Array.from({ length: maxLen }, (_, i) => i);

    const series: uPlot.Series[] = [{}];
    const data: uPlot.AlignedData = [normalizedTime];

    if (isDeltaGraph && sessions.length === 2) {
      // Calculate diff for delta graph
      const metric0 = sessions[0].data[metricKey as keyof SessionData] as number[];
      const metric1 = sessions[1].data[metricKey as keyof SessionData] as number[];
      const diffData = [];
      for (let i = 0; i < maxLen; i++) {
        const v0 = metric0[i];
        const v1 = metric1[i];
        if (v0 == null || v1 == null) diffData.push(null);
        else diffData.push(v0 - v1);
      }
      data.push(diffData);
      series.push({
        show: true,
        label: 'Delta',
        stroke: '#10B981', // Green for delta
        width: strokeWidth,
        fill: (u: uPlot) => {
          if (!u.bbox || u.bbox.height === 0 || u.bbox.width === 0 || !Number.isFinite(u.bbox.top) || !Number.isFinite(u.bbox.height)) return 'rgba(16, 185, 129, 0.2)';
          try {
            const gradient = u.ctx.createLinearGradient(0, u.bbox.top, 0, u.bbox.top + u.bbox.height);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
            return gradient;
          } catch {
            return 'rgba(16, 185, 129, 0.2)';
          }
        }
      });
    } else {
      sessions.forEach((session) => {
        const metric = session.data[metricKey as keyof SessionData] as number[];
        const padded: (number | null)[] = [...metric];
        while (padded.length < maxLen) padded.push(null);
        data.push(padded as number[]);
        series.push({
          show: true,
          label: session.name,
          stroke: session.color,
          width: strokeWidth,
          fill: sessions.length === 1 ? (u: uPlot) => {
            if (!u.bbox || u.bbox.height === 0 || u.bbox.width === 0 || !Number.isFinite(u.bbox.top) || !Number.isFinite(u.bbox.height)) return `${session.color}20`;
            try {
              const gradient = u.ctx.createLinearGradient(0, u.bbox.top, 0, u.bbox.top + u.bbox.height);
              gradient.addColorStop(0, `${session.color}50`);
              gradient.addColorStop(1, `${session.color}00`);
              return gradient;
            } catch {
              return `${session.color}20`;
            }
          } : undefined,
        });
      });
    }

    const getSize = () => ({
      width: containerRef.current?.clientWidth || 400,
      height: 220,
    });

    const opts: uPlot.Options = {
      title: label,
      ...getSize(),
      padding: [15, 15, 0, 15],
      pxAlign: false,
      cursor: {
        sync: { key: uSync.key, setSeries: true },
        points: { size: 5 },
      },
      hooks: {
        setCursor: [
          (u) => {
            onHover(u.cursor.idx || null);
          }
        ],
        drawClear: [
          (u) => {
            if (!showBrakingZones || sessions.length === 0 || isDeltaGraph) return;
            const ctx = u.ctx;
            const refSession = sessions[0];
            const throttle = refSession.data.throttle;
            const speed = refSession.data.speed;
            
            ctx.save();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.08)'; // Faint red braking zone

            let startIdx = -1;
            for (let i = 0; i < throttle.length; i++) {
              const isBraking = throttle[i] < 5 && speed[i] > 30; // 0 throttle and moving fast implies braking
              if (isBraking && startIdx === -1) {
                startIdx = i;
              } else if (!isBraking && startIdx !== -1) {
                const x0 = u.valToPos(startIdx, 'x', true);
                const x1 = u.valToPos(i, 'x', true);
                if (x1 > x0) {
                  ctx.fillRect(x0, u.bbox.top, x1 - x0, u.bbox.height);
                }
                startIdx = -1;
              }
            }
            if (startIdx !== -1) {
              const x0 = u.valToPos(startIdx, 'x', true);
              const x1 = u.valToPos(throttle.length - 1, 'x', true);
              ctx.fillRect(x0, u.bbox.top, x1 - x0, u.bbox.height);
            }
            ctx.restore();
          }
        ]
      },
      axes: [
        {
          stroke: 'var(--kou-silver)',
          grid: { show: true, stroke: 'rgba(255,255,255,0.05)', width: 1 },
          font: '11px var(--font-inter)',
        },
        {
          stroke: 'var(--kou-silver)',
          grid: { show: true, stroke: 'rgba(255,255,255,0.05)', width: 1 },
          font: '11px var(--font-inter)',
          size: 50,
        },
      ],
      scales: {
        x: { time: false },
        y: { auto: false, range: [yMin, yMax] },
      },
      series,
    };

    if (plotRef.current) {
      plotRef.current.destroy();
    }

    plotRef.current = new uPlot(opts, data, containerRef.current);

    const resizeObserver = new ResizeObserver(() => {
      if (plotRef.current && containerRef.current) {
        plotRef.current.setSize(getSize());
      }
    });
    const currentContainer = containerRef.current;
    if (currentContainer) {
      resizeObserver.observe(currentContainer);
    }

    return () => {
      resizeObserver.disconnect();
      if (plotRef.current) {
        plotRef.current.destroy();
        plotRef.current = null;
      }
    };
  }, [sessions, metricKey, label, yMin, yMax, onHover, strokeWidth, showBrakingZones, isDeltaGraph]);

  return <div ref={containerRef} style={{ width: '100%', overflow: 'hidden' }} />;
});

export default function ComparePage() {
  const [sessions, setSessions] = useState<LoadedSession[]>([]);
  const [availableSessions, setAvailableSessions] = useState<{ id: string; name: string }[]>([]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  
  // Phase 2 Settings
  const [strokeWidth, setStrokeWidth] = useState<number>(2.5);
  const [showBrakingZones, setShowBrakingZones] = useState<boolean>(true);

  // Use useCallback so we don't recreate the function on every render
  const handleHover = useCallback((idx: number | null) => {
    setHoverIdx(idx);
  }, []);

  // Load available sessions from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('kou_telemetry_sessions');
      if (raw) {
        const parsed = JSON.parse(raw) as { id: string; name: string }[];
        setAvailableSessions(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const loadSession = useCallback(async (id: string, name: string) => {
    if (sessions.length >= 4) return; // Max 4 sessions
    if (sessions.find((s) => s.name === name)) return; // Already loaded

    try {
      const { getSessionData } = await import('../../utils/idb');
      const data = await getSessionData(id);
      if (!data) return;
      
      setSessions((prev) => {
        // Strict check inside state updater to prevent double-click race conditions
        if (prev.length >= 4) return prev;
        if (prev.find((s) => s.name === name)) return prev;
        
        const color = COLORS[prev.length % COLORS.length];
        return [...prev, { name, data: data as unknown as SessionData, color }];
      });
    } catch { /* ignore */ }
  }, [sessions]);

  const removeSession = useCallback((name: string) => {
    setSessions((prev) => prev.filter((s) => s.name !== name));
  }, []);

  const exportCSV = useCallback(() => {
    if (sessions.length === 0) return;
    const maxLen = Math.max(...sessions.map(s => s.data.time.length));
    let csv = 'Point,';
    
    // Headers
    sessions.forEach(s => {
      csv += `${s.name}_Speed,${s.name}_RPM,${s.name}_Temp,${s.name}_Battery,${s.name}_Throttle,`;
    });
    csv += '\n';

    // Data
    for (let i = 0; i < maxLen; i++) {
      csv += `${i},`;
      sessions.forEach(s => {
        csv += `${s.data.speed[i] ?? ''},${s.data.rpm[i] ?? ''},${s.data.motor_temp[i] ?? ''},${s.data.battery_voltage[i] ?? ''},${s.data.throttle[i] ?? ''},`;
      });
      csv += '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_compare_${sessions.length}_sessions.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [sessions]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || sessions.length >= 4) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        // Handle both array format and object format
        let sessionData: SessionData;
        if (Array.isArray(data)) {
          // CSV-style array of objects
          sessionData = {
            time: data.map((d: Record<string, number>) => d.timestamp),
            speed: data.map((d: Record<string, number>) => d.speed),
            rpm: data.map((d: Record<string, number>) => d.rpm),
            motor_temp: data.map((d: Record<string, number>) => d.motor_temp),
            battery_voltage: data.map((d: Record<string, number>) => d.battery_voltage),
            throttle: data.map((d: Record<string, number>) => d.throttle),
          };
        } else {
          sessionData = data as SessionData;
        }
        const color = COLORS[sessions.length % COLORS.length];
        setSessions((prev) => [...prev, { name: file.name.replace('.json', ''), data: sessionData, color }]);
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [sessions]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <GitCompareArrows size={24} /> SESSION COMPARE
          </h1>
          <p className={styles.subtitle}>Overlay multiple sessions on the same charts</p>
        </div>
      </header>

      {/* Session selector */}
      <div className={styles.selectorSection}>
        <div className={styles.selectorHeader}>
          <span className={styles.selectorTitle}>Sessions ({sessions.length}/4)</span>
          <label className={styles.uploadBtn}>
            <Upload size={14} /> Upload JSON
            <input type="file" accept=".json" onChange={handleFileUpload} hidden />
          </label>
        </div>

        <div className={styles.sessionButtons}>
          {availableSessions.map((s) => {
            const isLoaded = sessions.find((ls) => ls.name === s.name);
            return (
              <button
                key={s.id}
                className={`${styles.sessionBtn} ${isLoaded ? styles.sessionBtnActive : ''}`}
                onClick={() => isLoaded ? removeSession(s.name) : loadSession(s.id, s.name)}
                style={isLoaded ? { borderColor: isLoaded.color, color: isLoaded.color } : {}}
              >
                {isLoaded && <span className={styles.dot} style={{ backgroundColor: isLoaded.color }} />}
                {s.name}
              </button>
            );
          })}
          {availableSessions.length === 0 && (
            <p className={styles.emptyHint}>No saved sessions. Go to Sessions page to save one, or upload a JSON file.</p>
          )}
        </div>

        {/* Legend & Controls */}
        {sessions.length > 0 && (
          <div className={styles.legendContainer}>
            <div className={styles.legend}>
              {sessions.map((s) => (
                <div key={s.name} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ backgroundColor: s.color }} />
                  <span>{s.name}</span>
                  <span className={styles.legendPoints}>{s.data.time.length} pts</span>
                </div>
              ))}
            </div>
            <div className={styles.controls}>
              <label className={styles.controlLabel}>
                <input type="checkbox" checked={showBrakingZones} onChange={e => setShowBrakingZones(e.target.checked)} />
                Show Braking Zones (Red)
              </label>
              <label className={styles.controlLabel}>
                Line Width: {strokeWidth}px
                <input type="range" min="1" max="5" step="0.5" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} />
              </label>
              <button className={styles.exportBtn} onClick={exportCSV}>
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overlay Charts */}
      {sessions.length === 0 ? (
        <div className={styles.empty}>
          <GitCompareArrows size={48} />
          <h2>Select Sessions to Compare</h2>
          <p>Load 2-4 sessions from saved sessions or upload JSON files to see overlay charts.</p>
        </div>
      ) : (
        <>
          {/* Phase 3: Ghost Car & Radar Chart */}
          <div className={styles.phase3Grid}>
            <div className={styles.phase3Panel}>
              <GhostCarSim sessions={sessions} />
            </div>
            <div className={styles.phase3Panel}>
              <RadarChart sessions={sessions} />
            </div>
          </div>

          {sessions.length === 2 && (
            <div className={styles.deltaChartWrapper}>
              <h3 className={styles.deltaChartTitle}>DELTA TIME GRAPH (SPEED DIFF)</h3>
              <div className={styles.chartPanel}>
                <OverlayChart
                  sessions={sessions}
                  metricKey="speed"
                  label="Speed Difference (+/- km/h)"
                  yMin={-30}
                  yMax={30}
                  onHover={handleHover}
                  strokeWidth={strokeWidth}
                  showBrakingZones={showBrakingZones}
                  isDeltaGraph={true}
                />
              </div>
            </div>
          )}

          <div className={styles.chartsGrid}>
            {METRICS.map((m) => (
              <div key={m.key} className={styles.chartPanel}>
                <OverlayChart
                  sessions={sessions}
                  metricKey={m.key}
                  label={m.label}
                  yMin={m.yMin}
                  yMax={m.yMax}
                  onHover={handleHover}
                  strokeWidth={strokeWidth}
                  showBrakingZones={showBrakingZones}
                />
              </div>
            ))}
          </div>

          {/* Phase 4: Scatter Plots */}
          <div className={styles.scatterGrid}>
            <ScatterChart sessions={sessions} xMetric="rpm" yMetric="speed" />
            <ScatterChart sessions={sessions} xMetric="throttle" yMetric="speed" />
          </div>
        </>
      )}

      {/* Leaderboard & Live Delta */}
      {sessions.length > 0 && (
        <div className={styles.bottomSection}>
          <div className={styles.summaryWrapper}>
            <EngineerSummary sessions={sessions} />
          </div>

          <div className={styles.leaderboardSection}>
          <h3 className={styles.leaderboardTitle}>
            {hoverIdx !== null ? `LIVE DELTA @ Point ${hoverIdx}` : 'SESSION SUMMARY (AVG)'}
          </h3>
          <div className={styles.leaderboardTableWrapper}>
            <table className={styles.leaderboardTable}>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Speed</th>
                  <th>RPM</th>
                  <th>Temp</th>
                  <th>Battery</th>
                  <th>Throttle</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, idx) => {
                  let speed = 0, rpm = 0, temp = 0, battery = 0, throttle = 0;
                  
                  if (hoverIdx !== null) {
                    // Live Delta Mode
                    speed = s.data.speed[hoverIdx] ?? 0;
                    rpm = s.data.rpm[hoverIdx] ?? 0;
                    temp = s.data.motor_temp[hoverIdx] ?? 0;
                    battery = s.data.battery_voltage[hoverIdx] ?? 0;
                    throttle = s.data.throttle[hoverIdx] ?? 0;
                  } else {
                    // Summary Mode (Avg)
                    const len = s.data.speed.length || 1;
                    speed = Math.round(s.data.speed.reduce((a,b)=>a+b,0) / len);
                    rpm = Math.round(s.data.rpm.reduce((a,b)=>a+b,0) / len);
                    temp = Math.round(s.data.motor_temp.reduce((a,b)=>a+b,0) / len);
                    battery = Math.round(s.data.battery_voltage.reduce((a,b)=>a+b,0) / len);
                    throttle = Math.round(s.data.throttle.reduce((a,b)=>a+b,0) / len);
                  }

                  // Find best in Live Delta
                  const bestSpeed = sessions.length > 1 && hoverIdx !== null && speed === Math.max(...sessions.map(x => x.data.speed[hoverIdx] || 0));
                  const isDeltaMode = hoverIdx !== null;
                  
                  // Calculate Delta from previous session
                  let deltaStr = "";
                  if (isDeltaMode && idx > 0) {
                    const prevSpeed = sessions[idx-1].data.speed[hoverIdx] || 0;
                    const diff = speed - prevSpeed;
                    deltaStr = ` (${diff >= 0 ? '+' : ''}${Math.round(diff*10)/10})`;
                  }

                  return (
                    <tr key={s.name}>
                      <td style={{ color: s.color, fontWeight: 'bold' }}>{s.name}</td>
                      <td className={bestSpeed ? styles.bestStat : ''}>
                        {Math.round(speed*10)/10} {isDeltaMode && <span className={styles.deltaSpan}>{deltaStr}</span>}
                      </td>
                      <td>{Math.round(rpm)}</td>
                      <td>{Math.round(temp)}</td>
                      <td>{Math.round(battery)}</td>
                      <td>{Math.round(throttle)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
    </main>
  );
}
