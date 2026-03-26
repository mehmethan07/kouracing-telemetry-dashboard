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

/**
 * Main Telemetry Dashboard Page
 * Provides real-time cockpit view with gauges, track position, and historical trend charts.
 */
export default function Dashboard() {
  const { data, history, faultLog, isConnected, clearFaultLog } = useTelemetryStore();

  // Threshold detection for UI alert states
  const isMotorOverheating = data.motor_temp > 100;
  const isBatteryAnomalous = data.battery_voltage > 0 && (data.battery_voltage < 300 || data.battery_voltage > 420);

  // Track progress calculation (assuming 120 points per lap)
  const trackProgress = history.time.length > 0 ? (history.time.length % 120) / 120 : 0;
  const lapCount = Math.floor(history.time.length / 120) + 1;
  const currentLapPoints = history.time.length % 120;
  const heatData = history.motor_temp.slice(-currentLapPoints);

  // Sliding Window (ECG Mode) configuration for real-time charts
  const WINDOW_SIZE = 200;
  const wTime = history.time.slice(-WINDOW_SIZE);
  const wSpeed = history.speed.slice(-WINDOW_SIZE);
  const wRpm = history.rpm.slice(-WINDOW_SIZE);
  const wMotorTemp = history.motor_temp.slice(-WINDOW_SIZE);
  const wBattery = history.battery_voltage.slice(-WINDOW_SIZE);
  const wThrottle = history.throttle.slice(-WINDOW_SIZE);

  return (
    <main className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>KOU RACING TELEMETRY</h1>
          <p className={styles.subtitle}>OFFICIAL PIT WALL DASHBOARD</p>
        </div>

        <div className={styles.headerActions}>
          <ExportButton />
          <div className={styles.statusContainer}>
            <div className={styles.badge}>
              <Zap size={16} color="var(--kou-green)" />
              STATE: {data.vehicle_state.toUpperCase()}
            </div>
            <div className={`${styles.badge} ${isConnected ? styles.connected : styles.disconnected}`}>
              {isConnected ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {isConnected ? "SYSTEM ONLINE" : "OFFLINE"}
            </div>
          </div>
        </div>
      </header>

      <div className={styles.topSection}>
        <div className={`${styles.panel} ${styles.gaugePanel}`}>
          <SpeedGauge speed={data.speed} maxSpeed={160} />
        </div>

        <div className={styles.dataPanels}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <Activity size={18} /> RPM
            </div>
            <div className={styles.panelBody}>
              <AnimatedNumber value={data.rpm} className={styles.panelValue} />
              <span className={styles.panelUnit}>rpm</span>
            </div>
          </div>

          <div className={`${styles.panel} ${isMotorOverheating ? styles.panelDanger : ''}`}>
            <div className={styles.panelHeader}>
              <Thermometer size={18} color={isMotorOverheating ? "var(--status-danger)" : "currentColor"} />
              MOTOR TEMP
            </div>
            <div className={styles.panelBody}>
              <AnimatedNumber value={data.motor_temp} decimals={1} className={`${styles.panelValue} ${isMotorOverheating ? styles.dangerText : ''}`} />
              <span className={styles.panelUnit}>°C</span>
            </div>
          </div>

          <div className={`${styles.panel} ${isBatteryAnomalous ? styles.panelDanger : ''}`}>
            <div className={styles.panelHeader}>
              <Battery size={18} color={isBatteryAnomalous ? "var(--status-danger)" : "currentColor"} />
              BATTERY
            </div>
            <div className={styles.panelBody}>
              <AnimatedNumber value={data.battery_voltage} decimals={1} className={`${styles.panelValue} ${isBatteryAnomalous ? styles.dangerText : ''}`} />
              <span className={styles.panelUnit}>V</span>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <Cpu size={18} /> INVERTER
            </div>
            <div className={styles.panelBody}>
              <span className={styles.panelValueSmall}>{data.inverter_status.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.panel} ${styles.throttlePanel}`}>
          <ThrottleBar value={data.throttle} />
        </div>
      </div>

      <div className={styles.middleSection}>
        <div className={`${styles.panel} ${styles.trackPanel}`}>
          <TrackMap lapCount={lapCount} progress={trackProgress} heatData={heatData} />
        </div>
        <div className={`${styles.panel} ${styles.faultPanel}`}>
          <FaultLog faults={faultLog} onClear={clearFaultLog} />
        </div>
      </div>

      <div className={styles.chartsSection}>
        <div className={`${styles.panel} ${styles.chartPanel}`}>
          <TelemetryChart title="SPEED TREND" color="#3B82F6" data={[wTime, wSpeed]} yMin={0} yMax={160} />
        </div>
        <div className={`${styles.panel} ${styles.chartPanel}`}>
          <TelemetryChart title="RPM TREND" color="#8B5CF6" data={[wTime, wRpm]} yMin={0} yMax={16000} />
        </div>
        <div className={`${styles.panel} ${styles.chartPanel}`}>
          <TelemetryChart title="MOTOR TEMP" color={isMotorOverheating ? "var(--status-danger)" : "var(--kou-green)"} data={[wTime, wMotorTemp]} yMin={0} yMax={120} />
        </div>
        <div className={`${styles.panel} ${styles.chartPanel}`}>
          <TelemetryChart title="BATTERY VOLTAGE" color="#F59E0B" data={[wTime, wBattery]} yMin={200} yMax={450} />
        </div>
        <div className={`${styles.panel} ${styles.chartPanel}`}>
          <TelemetryChart title="THROTTLE" color="#06B6D4" data={[wTime, wThrottle]} yMin={0} yMax={100} />
        </div>
      </div>
    </main>
  );
}