'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GitCompareArrows, Upload } from 'lucide-react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import styles from './page.module.css';

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

/**
 * OverlayChart Component
 * Uses uPlot to render multiple session datasets on a single time-normalized axis.
 */
function OverlayChart({ sessions, metricKey, label, yMin, yMax }: {
  sessions: LoadedSession[];
  metricKey: string;
  label: string;
  yMin: number;
  yMax: number;
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

    sessions.forEach((session) => {
      const metric = session.data[metricKey as keyof SessionData] as number[];
      // Pad shorter sessions with null
      const padded = [...metric];
      while (padded.length < maxLen) padded.push(padded[padded.length - 1] ?? 0);
      data.push(padded);
      series.push({
        show: true,
        label: session.name,
        stroke: session.color,
        width: 2,
        fill: `${session.color}10`,
      });
    });

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
        points: { size: 5 },
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
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (plotRef.current) {
        plotRef.current.destroy();
        plotRef.current = null;
      }
    };
  }, [sessions, metricKey, label, yMin, yMax]);

  return <div ref={containerRef} style={{ width: '100%', overflow: 'hidden' }} />;
}

export default function ComparePage() {
  const [sessions, setSessions] = useState<LoadedSession[]>([]);
  const [availableSessions, setAvailableSessions] = useState<{ id: string; name: string }[]>([]);

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
      const color = COLORS[sessions.length % COLORS.length];
      setSessions((prev) => [...prev, { name, data: data as unknown as SessionData, color }]);
    } catch { /* ignore */ }
  }, [sessions]);

  const removeSession = useCallback((name: string) => {
    setSessions((prev) => prev.filter((s) => s.name !== name));
  }, []);

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

        {/* Legend */}
        {sessions.length > 0 && (
          <div className={styles.legend}>
            {sessions.map((s) => (
              <div key={s.name} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ backgroundColor: s.color }} />
                <span>{s.name}</span>
                <span className={styles.legendPoints}>{s.data.time.length} pts</span>
              </div>
            ))}
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
        <div className={styles.chartsGrid}>
          {METRICS.map((m) => (
            <div key={m.key} className={styles.chartPanel}>
              <OverlayChart
                sessions={sessions}
                metricKey={m.key}
                label={m.label}
                yMin={m.yMin}
                yMax={m.yMax}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
