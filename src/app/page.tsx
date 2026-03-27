"use client";

import TelemetryChart from "../components/TelemetryChart/TelemetryChart";
import SpeedGauge from "../components/SpeedGauge/SpeedGauge";
import ThrottleBar from "../components/ThrottleBar/ThrottleBar";
import FaultLog from "../components/FaultLog/FaultLog";
import TrackMap from "../components/TrackMap/TrackMap";
import AnimatedNumber from "../components/AnimatedNumber/AnimatedNumber";
import ExportButton from "../components/ExportButton/ExportButton";
import { useTelemetryStore } from "../store/useTelemetryStore";
import { Activity, Battery, Thermometer, AlertTriangle, CheckCircle2, Zap, Cpu } from "lucide-react";
import styles from "./page.module.css";

// --- ATOMIC SELECTOR WRAPPERS ---
// Using atomic selectors prevents the entire Dashboard tree from re-rendering (saving CPU)
// Each component subscribes ONLY to the precise slice of state it needs.

const ConnectionStatus = () => {
  const isConnected = useTelemetryStore(state => state.isConnected);
  const vState = useTelemetryStore(state => state.data.vehicle_state);
  return (
    <div className={styles.statusContainer}>
      <div className={styles.badge}>
        <Zap size={16} color="var(--kou-green)" />
        STATE: {vState.toUpperCase()}
      </div>
      <div className={`${styles.badge} ${isConnected ? styles.connected : styles.disconnected}`}>
        {isConnected ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        {isConnected ? "SYSTEM ONLINE" : "OFFLINE"}
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
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}><Activity size={18} /> RPM</div>
      <div className={styles.panelBody}>
        <AnimatedNumber value={rpm} className={styles.panelValue} />
        <span className={styles.panelUnit}>rpm</span>
      </div>
    </div>
  );
};

const MotorTempWrapper = () => {
  const temp = useTelemetryStore(state => state.data.motor_temp);
  const danger = temp > 100;
  return (
    <div className={`${styles.panel} ${danger ? styles.panelDanger : ''}`}>
      <div className={styles.panelHeader}>
        <Thermometer size={18} color={danger ? "var(--status-danger)" : "currentColor"} /> MOTOR TEMP
      </div>
      <div className={styles.panelBody}>
        <AnimatedNumber value={temp} decimals={1} className={`${styles.panelValue} ${danger ? styles.dangerText : ''}`} />
        <span className={styles.panelUnit}>°C</span>
      </div>
    </div>
  );
};

const BatteryWrapper = () => {
  const volt = useTelemetryStore(state => state.data.battery_voltage);
  const danger = volt > 0 && (volt < 300 || volt > 420);
  return (
    <div className={`${styles.panel} ${danger ? styles.panelDanger : ''}`}>
      <div className={styles.panelHeader}>
        <Battery size={18} color={danger ? "var(--status-danger)" : "currentColor"} /> BATTERY
      </div>
      <div className={styles.panelBody}>
        <AnimatedNumber value={volt} decimals={1} className={`${styles.panelValue} ${danger ? styles.dangerText : ''}`} />
        <span className={styles.panelUnit}>V</span>
      </div>
    </div>
  );
};

const InverterWrapper = () => {
  const status = useTelemetryStore(state => state.data.inverter_status);
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}><Cpu size={18} /> INVERTER</div>
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
  'use no memo';
  const history = useTelemetryStore(state => state.history);
  const POINTS = history.time.length;
  const progress = POINTS > 0 ? (POINTS % 120) / 120 : 0;
  const currLaps = history.laps && history.laps.length > 0 ? history.laps[history.laps.length - 1] : 1;
  const startIdx = history.laps ? history.laps.indexOf(currLaps) : -1;
  const heatData = startIdx !== -1 ? history.motor_temp.slice(startIdx) : [];
  return <TrackMap lapCount={currLaps} progress={progress} heatData={heatData} />;
};

const FaultLogWrapper = () => {
  const faultLog = useTelemetryStore(state => state.faultLog);
  const clearFaultLog = useTelemetryStore(state => state.clearFaultLog);
  return <FaultLog faults={faultLog} onClear={clearFaultLog} />;
};

const ChartsWrapper = () => {
  'use no memo';
  const history = useTelemetryStore(state => state.history);
  const WINDOW_SIZE = 200;
  const wTime = history.time.slice(-WINDOW_SIZE);
  const wSpeed = history.speed.slice(-WINDOW_SIZE);
  const wRpm = history.rpm.slice(-WINDOW_SIZE);
  const wMotorTemp = history.motor_temp.slice(-WINDOW_SIZE);
  const wBattery = history.battery_voltage.slice(-WINDOW_SIZE);
  const wThrottle = history.throttle.slice(-WINDOW_SIZE);
  
  const tempOverheating = wMotorTemp.length > 0 && wMotorTemp[wMotorTemp.length - 1] > 100;

  return (
    <div className={styles.chartsSection}>
      <div className={`${styles.panel} ${styles.chartPanel}`}>
        <TelemetryChart title="SPEED TREND" color="#3B82F6" data={[wTime, wSpeed]} yMin={0} yMax={160} />
      </div>
      <div className={`${styles.panel} ${styles.chartPanel}`}>
        <TelemetryChart title="RPM TREND" color="#8B5CF6" data={[wTime, wRpm]} yMin={0} yMax={16000} />
      </div>
      <div className={`${styles.panel} ${styles.chartPanel}`}>
        <TelemetryChart title="MOTOR TEMP" color={tempOverheating ? "var(--status-danger)" : "var(--kou-green)"} data={[wTime, wMotorTemp]} yMin={0} yMax={120} />
      </div>
      <div className={`${styles.panel} ${styles.chartPanel}`}>
        <TelemetryChart title="BATTERY VOLTAGE" color="#F59E0B" data={[wTime, wBattery]} yMin={200} yMax={450} />
      </div>
      <div className={`${styles.panel} ${styles.chartPanel}`}>
        <TelemetryChart title="THROTTLE" color="#06B6D4" data={[wTime, wThrottle]} yMin={0} yMax={100} />
      </div>
    </div>
  );
};

/**
 * Main Telemetry Dashboard Page
 * Because we extracted the state listeners to sub-wrappers, this parent never re-renders!
 */
export default function Dashboard() {
  return (
    <main className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>KOU RACING TELEMETRY</h1>
          <p className={styles.subtitle}>OFFICIAL PIT WALL DASHBOARD</p>
        </div>
        <div className={styles.headerActions}>
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