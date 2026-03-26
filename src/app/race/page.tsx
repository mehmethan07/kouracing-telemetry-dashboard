'use client';

import { useEffect } from 'react';
import SpeedGauge from '../../components/SpeedGauge/SpeedGauge';
import AnimatedNumber from '../../components/AnimatedNumber/AnimatedNumber';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { AlertTriangle, CheckCircle2, Zap, Minimize2 } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

export default function RaceMode() {
  const { data, isConnected } = useTelemetryStore();

  // Threshold detection for driver alerts
  const isMotorOverheating = data.motor_temp > 100;
  const isBatteryAnomalous = data.battery_voltage > 0 && (data.battery_voltage < 300 || data.battery_voltage > 420);
  const hasAlert = isMotorOverheating || isBatteryAnomalous;

  return (
    <main className={styles.raceMode}>
      {/* Exit button */}
      <Link href="/" className={styles.exitBtn}>
        <Minimize2 size={16} /> Exit Race Mode
      </Link>

      {/* Connection status */}
      <div className={`${styles.statusBadge} ${isConnected ? styles.online : styles.offline}`}>
        {isConnected ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
        {isConnected ? 'LIVE' : 'OFFLINE'}
      </div>

      {/* Vehicle state */}
      <div className={styles.stateBadge}>
        <Zap size={14} color="var(--kou-green)" />
        {data.vehicle_state.toUpperCase()}
      </div>

      {/* Alert overlay */}
      {hasAlert && (
        <div className={styles.alertOverlay}>
          <AlertTriangle size={24} />
          {isMotorOverheating && <span>MOTOR OVERHEAT</span>}
          {isBatteryAnomalous && <span>BATTERY ANOMALY</span>}
        </div>
      )}

      {/* CENTER: Speed Gauge */}
      <div className={styles.center}>
        <SpeedGauge speed={data.speed} maxSpeed={160} />
      </div>

      {/* Bottom panels */}
      <div className={styles.bottomBar}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>RPM</span>
          <AnimatedNumber value={data.rpm} className={styles.metricValue} />
        </div>

        <div className={`${styles.metric} ${isMotorOverheating ? styles.danger : ''}`}>
          <span className={styles.metricLabel}>MOTOR °C</span>
          <AnimatedNumber value={data.motor_temp} decimals={1} className={styles.metricValue} />
        </div>

        <div className={`${styles.metric} ${isBatteryAnomalous ? styles.danger : ''}`}>
          <span className={styles.metricLabel}>BATTERY V</span>
          <AnimatedNumber value={data.battery_voltage} decimals={1} className={styles.metricValue} />
        </div>

        <div className={styles.metric}>
          <span className={styles.metricLabel}>THROTTLE</span>
          <div className={styles.throttleMini}>
            <div className={styles.throttleFill} style={{ width: `${data.throttle}%` }} />
          </div>
          <AnimatedNumber value={data.throttle} className={styles.metricValueSmall} />
          <span className={styles.metricUnit}>%</span>
        </div>
      </div>
    </main>
  );
}
