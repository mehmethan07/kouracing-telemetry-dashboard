"use client";

import { useState, useEffect, useMemo } from "react";
import TelemetryChart from "../components/TelemetryChart/TelemetryChart";
import TimelineScrubber from "../components/TimelineScrubber/TimelineScrubber";
import SpeedGauge from "../components/SpeedGauge/SpeedGauge";
import ThrottleBar from "../components/ThrottleBar/ThrottleBar";
import FaultLog from "../components/FaultLog/FaultLog";
import TrackMap from "../components/TrackMap/TrackMap";
import AnimatedNumber from "../components/AnimatedNumber/AnimatedNumber";
import ExportButton from "../components/ExportButton/ExportButton";
import { useTelemetryStore } from "../store/useTelemetryStore";
import { Activity, Battery, Thermometer, AlertTriangle, CheckCircle2, Zap, Cpu, WifiOff, Settings } from "lucide-react";
import styles from "./page.module.css";

// --- CLOCK COMPONENT ---
const LiveClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);
  return <div className={styles.clock}>{time}</div>;
};

// --- CONNECTION OVERLAY ---
const ConnectionOverlay = () => {
  const isConnected = useTelemetryStore(state => state.isConnected);
  const restoreFromBlackbox = useTelemetryStore(state => state.restoreFromBlackbox);
  const [showOverlay, setShowOverlay] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      const timer = setTimeout(() => setShowOverlay(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowOverlay(false);
      setRestored(false);
    }
  }, [isConnected]);

  if (!showOverlay || restored) return null;

  return (
    <div className={styles.connectionOverlay}>
      <div className={styles.connectionOverlayContent}>
        <div className={styles.connectionOverlayIcon}>
          <WifiOff size={28} />
        </div>
        <h3 className={styles.connectionOverlayTitle}>CONNECTION LOST</h3>
        <p className={styles.connectionOverlayText}>
          Telemetry gateway ile bağlantı kesildi. Otomatik yeniden bağlanma deneniyor...
        </p>

        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn-primary"
            onClick={async () => {
              await restoreFromBlackbox();
              setRestored(true);
            }}
          >
            <Settings size={14} /> Restore from Blackbox
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Load the last auto-saved buffer</span>
        </div>

        <div className={styles.connectionOverlayPulse}>
          <span className={styles.connectionOverlayDot} />
          <span className={styles.connectionOverlayDot} />
          <span className={styles.connectionOverlayDot} />
        </div>
      </div>
    </div>
  );
};

// --- ATOMIC SELECTOR WRAPPERS ---

const ConnectionStatus = () => {
  const isConnected = useTelemetryStore(state => state.isConnected);
  const vState = useTelemetryStore(state => state.data.vehicle_state);
  return (
    <div className={styles.statusContainer}>
      <div className={styles.badge}>
        <Zap size={14} color="var(--kou-green)" />
        {vState.toUpperCase()}
      </div>
      <div className={`${styles.badge} ${isConnected ? styles.connected : styles.disconnected}`}>
        {isConnected ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
        {isConnected ? "LIVE" : "OFFLINE"}
      </div>
    </div>
  );
};

const SpeedWrapper = () => {
  const speed = useTelemetryStore(state => state.data.speed);
  return <SpeedGauge speed={speed} maxSpeed={160} />;
};

const RpmWrapper = () => {
  const rpm = useTelemetryStore(state => state.data.rpm);
  const history = useTelemetryStore(state => state.history);
  const lastUpdated = useTelemetryStore(state => state.history.lastUpdated);

  const max = useMemo(() => {
    const recent = history.rpm.slice(-120);
    let m = 0;
    for (let i = 0; i < recent.length; i++) if (recent[i] > m) m = recent[i];
    return m;
  }, [history.rpm, lastUpdated]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelColorBar} style={{ background: 'var(--gradient-purple)' }} />
      <div className={styles.panelHeader}><Activity size={16} /> RPM</div>
      <div className={styles.panelBody}>
        <AnimatedNumber value={rpm} className={styles.panelValue} />
        <span className={styles.panelUnit}>rpm</span>
      </div>
      <div className={styles.panelMiniStat}>
        <span className={styles.miniStatItem}>PEAK <span className={styles.miniStatValue}>{Math.round(max)}</span></span>
      </div>
    </div>
  );
};

const MotorTempWrapper = () => {
  const temp = useTelemetryStore(state => state.data.motor_temp);
  const danger = temp > 100;
  return (
    <div className={`${styles.panel} ${danger ? styles.panelDanger : ''}`}>
      <div className={styles.panelColorBar} style={{ background: danger ? 'var(--gradient-danger)' : 'var(--gradient-green)' }} />
      <div className={styles.panelHeader}>
        <Thermometer size={16} color={danger ? "var(--status-danger)" : "currentColor"} /> MOTOR TEMP
      </div>
      <div className={styles.panelBody}>
        <AnimatedNumber value={temp} decimals={1} className={`${styles.panelValue} ${danger ? styles.dangerText : ''}`} />
        <span className={styles.panelUnit}>°C</span>
      </div>
      <div className={styles.panelMiniStat}>
        <span className={styles.miniStatItem}>LIMIT <span className={styles.miniStatValue}>100°C</span></span>
      </div>
    </div>
  );
};

const BatteryWrapper = () => {
  const volt = useTelemetryStore(state => state.data.battery_voltage);
  const danger = volt > 0 && (volt < 300 || volt > 420);
  return (
    <div className={`${styles.panel} ${danger ? styles.panelDanger : ''}`}>
      <div className={styles.panelColorBar} style={{ background: danger ? 'var(--gradient-danger)' : 'var(--gradient-amber)' }} />
      <div className={styles.panelHeader}>
        <Battery size={16} color={danger ? "var(--status-danger)" : "currentColor"} /> BATTERY
      </div>
      <div className={styles.panelBody}>
        <AnimatedNumber value={volt} decimals={1} className={`${styles.panelValue} ${danger ? styles.dangerText : ''}`} />
        <span className={styles.panelUnit}>V</span>
      </div>
      <div className={styles.panelMiniStat}>
        <span className={styles.miniStatItem}>RANGE <span className={styles.miniStatValue}>300–420V</span></span>
      </div>
    </div>
  );
};

const InverterWrapper = () => {
  const status = useTelemetryStore(state => state.data.inverter_status);
  return (
    <div className={styles.panel}>
      <div className={styles.panelColorBar} style={{ background: 'var(--gradient-cyan)' }} />
      <div className={styles.panelHeader}><Cpu size={16} /> INVERTER</div>
      <div className={styles.panelBody}>
        <span className={styles.panelValueSmall}>{status.toUpperCase()}</span>
      </div>
    </div>
  );
};

const ThrottleWrapper = () => {
  const throttle = useTelemetryStore(state => state.data.throttle);
  return <ThrottleBar value={throttle} />;
};

const TrackMapWrapper = () => {
  const currentLap = useTelemetryStore(state => state.data.lap);
  const laps = useTelemetryStore(state => state.history.laps);
  const motor_temp = useTelemetryStore(state => state.history.motor_temp);
  const lastUpdated = useTelemetryStore(state => state.history.lastUpdated);
  const EXPECTED_POINTS_PER_LAP = 3600; // ~60 seconds at 60Hz

  const { progress, heatData } = useMemo(() => {
    let lapStartIdx = 0;
    // Limit backward search to prevent O(N) lag on large arrays
    const searchLimit = Math.max(0, laps.length - EXPECTED_POINTS_PER_LAP * 5);
    for (let i = laps.length - 1; i >= searchLimit; i--) {
      if (laps[i] !== currentLap) {
        lapStartIdx = i + 1;
        break;
      }
    }

    const pointsInCurrentLap = laps.length - lapStartIdx;
    const prog = pointsInCurrentLap > 0
      ? Math.min(pointsInCurrentLap / EXPECTED_POINTS_PER_LAP, 1)
      : 0;

    let heat = lapStartIdx >= 0 ? motor_temp.slice(lapStartIdx) : [];

    // Downsample heatData to max 100 points to prevent rendering thousands of SVG paths
    if (heat.length > 100) {
      const step = Math.ceil(heat.length / 100);
      heat = heat.filter((_, i) => i % step === 0);
    }

    return { progress: prog, heatData: heat };
  }, [laps, motor_temp, currentLap, lastUpdated]);

  return <TrackMap lapCount={currentLap} progress={progress} heatData={heatData} />;
};

const FaultLogWrapper = () => {
  const faultLog = useTelemetryStore(state => state.faultLog);
  const clearFaultLog = useTelemetryStore(state => state.clearFaultLog);
  return <FaultLog faults={faultLog} onClear={clearFaultLog} />;
};

const AVAILABLE_CHARTS = [
  { id: 'speed', label: 'SPEED' },
  { id: 'rpm', label: 'RPM' },
  { id: 'motor_temp', label: 'MOTOR TEMP' },
  { id: 'battery', label: 'BATTERY' },
  { id: 'throttle', label: 'THROTTLE' }
];

const REFRESH_RATES = [
  { label: '60 Hz (Realtime)', ms: 16 },
  { label: '30 Hz (Smooth)', ms: 33 },
  { label: '10 Hz (Balanced)', ms: 100 },
  { label: '4 Hz (Power Save)', ms: 250 },
  { label: '1 Hz (Slow)', ms: 1000 },
];

const TIME_WINDOWS = [
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: 'All', seconds: 0 },
];

const SpeedChartWrapper = ({ isLive, timeWindow, scrubBounds, onPanZoom }: any) => {
  const time = useTelemetryStore(state => state.history.time);
  const speed = useTelemetryStore(state => state.history.speed);
  const lastUpdated = useTelemetryStore(state => state.history.lastUpdated); // force render
  return <TelemetryChart title="SPEED" color="#3B82F6" data={[time, speed]} yMin={0} yMax={160} syncKey="raceDash" isLive={isLive} timeWindow={timeWindow} scrubBounds={scrubBounds} onPanZoom={onPanZoom} />;
};

const RpmChartWrapper = ({ isLive, timeWindow, scrubBounds, onPanZoom }: any) => {
  const time = useTelemetryStore(state => state.history.time);
  const rpm = useTelemetryStore(state => state.history.rpm);
  const lastUpdated = useTelemetryStore(state => state.history.lastUpdated);
  return <TelemetryChart title="RPM" color="#8B5CF6" data={[time, rpm]} yMin={0} yMax={16000} syncKey="raceDash" isLive={isLive} timeWindow={timeWindow} scrubBounds={scrubBounds} onPanZoom={onPanZoom} />;
};

const MotorTempChartWrapper = ({ isLive, timeWindow, scrubBounds, onPanZoom }: any) => {
  const time = useTelemetryStore(state => state.history.time);
  const motor_temp = useTelemetryStore(state => state.history.motor_temp);
  const lastUpdated = useTelemetryStore(state => state.history.lastUpdated);
  const tempOverheating = motor_temp.length > 0 && motor_temp[motor_temp.length - 1] > 100;
  return <TelemetryChart title="MOTOR TEMP" color={tempOverheating ? "var(--status-danger)" : "var(--kou-green)"} data={[time, motor_temp]} yMin={0} yMax={120} syncKey="raceDash" isLive={isLive} timeWindow={timeWindow} scrubBounds={scrubBounds} onPanZoom={onPanZoom} />;
};

const BatteryChartWrapper = ({ isLive, timeWindow, scrubBounds, onPanZoom }: any) => {
  const time = useTelemetryStore(state => state.history.time);
  const battery = useTelemetryStore(state => state.history.battery_voltage);
  const lastUpdated = useTelemetryStore(state => state.history.lastUpdated);
  return <TelemetryChart title="BATTERY" color="#F59E0B" data={[time, battery]} yMin={200} yMax={450} syncKey="raceDash" isLive={isLive} timeWindow={timeWindow} scrubBounds={scrubBounds} onPanZoom={onPanZoom} />;
};

const ThrottleChartWrapper = ({ isLive, timeWindow, scrubBounds, onPanZoom }: any) => {
  const time = useTelemetryStore(state => state.history.time);
  const throttle = useTelemetryStore(state => state.history.throttle);
  const lastUpdated = useTelemetryStore(state => state.history.lastUpdated);
  return <TelemetryChart title="THROTTLE" color="#06B6D4" data={[time, throttle]} yMin={0} yMax={100} syncKey="raceDash" isLive={isLive} timeWindow={timeWindow} scrubBounds={scrubBounds} onPanZoom={onPanZoom} />;
};

const ChartsWrapper = () => {
  'use no memo';
  const refreshRate = useTelemetryStore(state => state.uiRefreshRate);
  const setUiRefreshRate = useTelemetryStore(state => state.setUiRefreshRate);

  // DO NOT select history here, to prevent Toolbar from re-rendering 60 times a second!
  // Instead, pass the props down to the isolated Chart Wrappers.

  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Interactive Chart Controls State
  const [isLive, setIsLive] = useState(true);
  const [timeWindow, setTimeWindow] = useState(60);
  const [scrubBounds, setScrubBounds] = useState<[number, number] | null>(null);

  useEffect(() => {
    const savedCharts = localStorage.getItem('kou_selected_charts');
    if (savedCharts) {
      setSelectedCharts(JSON.parse(savedCharts));
    } else {
      setSelectedCharts(['speed', 'rpm', 'motor_temp', 'battery', 'throttle']);
    }
  }, []);

  const toggleChart = (id: string) => {
    const updated = selectedCharts.includes(id)
      ? selectedCharts.filter(c => c !== id)
      : [...selectedCharts, id];

    if (updated.length === 0) return;

    setSelectedCharts(updated);
    localStorage.setItem('kou_selected_charts', JSON.stringify(updated));
  };

  const handlePanZoom = () => {
    // If the user manually interacts with any chart, break the live lock
    if (isLive) {
      setIsLive(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

      {/* --- CHART CONTROLS TOOLBAR --- */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        padding: '0.5rem',
        borderRadius: 'var(--radius-md)',
        position: 'relative'
      }}>
        {/* Left: Time Range Selectors */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem', fontWeight: 600 }}>TIME RANGE:</span>
          {TIME_WINDOWS.map(win => (
            <button
              key={win.label}
              onClick={() => {
                setTimeWindow(win.seconds);
                setIsLive(true); // Re-lock to live when changing window size
                setScrubBounds(null); // Clear scrubber
              }}
              style={{
                background: timeWindow === win.seconds ? 'var(--kou-green)' : 'rgba(255,255,255,0.05)',
                color: timeWindow === win.seconds ? '#000' : 'var(--text-dimmed)',
                border: 'none',
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {win.label}
            </button>
          ))}

          {/* Live Indicator / Resume Button */}
          {!isLive && (
            <button
              onClick={() => {
                setIsLive(true);
                setScrubBounds(null);
              }}
              style={{
                marginLeft: '1rem',
                background: 'rgba(239, 68, 68, 0.2)', // Danger red transparent
                color: '#EF4444',
                border: '1px solid #EF4444',
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                animation: 'pulseAlert 2s infinite'
              }}
            >
              RESUME LIVE
            </button>
          )}
          {isLive && (
            <span style={{
              marginLeft: '1rem',
              color: 'var(--kou-green)',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-ok)', boxShadow: '0 0 6px var(--status-ok-glow)' }} />
              LIVE LOCK
            </span>
          )}
        </div>

        {/* Right: Settings Dropdown */}
        <div style={{ display: 'flex', position: 'relative' }}>
          <button
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              padding: '0.4rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Settings size={16} />
          </button>

          {isSelectorOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              background: 'var(--bg-panel-solid)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: 'var(--shadow-lg)',
              width: '240px'
            }}>
              {/* Refresh Rate Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>UI Refresh Rate</span>
                <select
                  value={refreshRate}
                  onChange={(e) => setUiRefreshRate(Number(e.target.value))}
                  style={{
                    padding: '0.4rem',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--kou-white)',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit'
                  }}
                >
                  {REFRESH_RATES.map(rate => (
                    <option key={rate.ms} value={rate.ms}>{rate.label}</option>
                  ))}
                </select>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.2rem 0' }} />

              {/* Chart Visibility */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Visible Charts</span>
                {AVAILABLE_CHARTS.map(chart => (
                  <label key={chart.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--kou-white)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedCharts.includes(chart.id)}
                      onChange={() => toggleChart(chart.id)}
                      style={{ accentColor: 'var(--kou-green)' }}
                    />
                    {chart.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.chartsSection}>
        {selectedCharts.includes('speed') && (
          <div className={`${styles.panel} ${styles.chartPanel}`}>
            <SpeedChartWrapper isLive={isLive} timeWindow={timeWindow} scrubBounds={scrubBounds} onPanZoom={handlePanZoom} />
          </div>
        )}
        {selectedCharts.includes('rpm') && (
          <div className={`${styles.panel} ${styles.chartPanel}`}>
            <RpmChartWrapper isLive={isLive} timeWindow={timeWindow} scrubBounds={scrubBounds} onPanZoom={handlePanZoom} />
          </div>
        )}
        {selectedCharts.includes('motor_temp') && (
          <div className={`${styles.panel} ${styles.chartPanel}`}>
            <MotorTempChartWrapper isLive={isLive} timeWindow={timeWindow} scrubBounds={scrubBounds} onPanZoom={handlePanZoom} />
          </div>
        )}
        {selectedCharts.includes('battery') && (
          <div className={`${styles.panel} ${styles.chartPanel}`}>
            <BatteryChartWrapper isLive={isLive} timeWindow={timeWindow} scrubBounds={scrubBounds} onPanZoom={handlePanZoom} />
          </div>
        )}
        {selectedCharts.includes('throttle') && (
          <div className={`${styles.panel} ${styles.chartPanel}`}>
            <ThrottleChartWrapper isLive={isLive} timeWindow={timeWindow} scrubBounds={scrubBounds} onPanZoom={handlePanZoom} />
          </div>
        )}
      </div>

      {/* --- TIMELINE SCRUBBER --- */}
      <TimelineScrubberWrapper
        onSelect={(min: number, max: number) => {
          setIsLive(false);
          setScrubBounds([min, max]);
        }}
        onClear={() => {
          setScrubBounds(null);
        }}
      />
    </div>
  );
};

// Isolated Scrubber to prevent full Toolbar re-render
const TimelineScrubberWrapper = ({ onSelect, onClear }: any) => {
  const time = useTelemetryStore(state => state.history.time);
  const speed = useTelemetryStore(state => state.history.speed);
  const lastUpdated = useTelemetryStore(state => state.history.lastUpdated);
  return <TimelineScrubber data={[time, speed]} onSelect={onSelect} onClear={onClear} />;
};

/**
 * Main Telemetry Dashboard Page
 */
export default function Dashboard() {
  return (
    <main className={styles.dashboard}>
      <ConnectionOverlay />

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>KOU RACING TELEMETRY</h1>
          <p className={styles.subtitle}>Official Pit Wall Dashboard</p>
        </div>
        <div className={styles.headerActions}>
          <LiveClock />
          <ExportButton />
          <ConnectionStatus />
        </div>
      </header>

      <div className={styles.topSection}>
        <div className={`${styles.panel} ${styles.gaugePanel}`}>
          <SpeedWrapper />
        </div>

        <div className={styles.dataPanels}>
          <RpmWrapper />
          <MotorTempWrapper />
          <BatteryWrapper />
          <InverterWrapper />
        </div>

        <div className={`${styles.panel} ${styles.throttlePanel}`}>
          <ThrottleWrapper />
        </div>
      </div>

      <div className={styles.middleSection}>
        <div className={`${styles.panel} ${styles.trackPanel}`}>
          <TrackMapWrapper />
        </div>
        <div className={`${styles.panel} ${styles.faultPanel}`}>
          <FaultLogWrapper />
        </div>
      </div>

      <ChartsWrapper />
    </main>
  );
}