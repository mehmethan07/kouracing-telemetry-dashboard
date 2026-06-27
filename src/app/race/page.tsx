'use client';

import SpeedGauge from '../../components/SpeedGauge/SpeedGauge';
import AnimatedNumber from '../../components/AnimatedNumber/AnimatedNumber';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { AlertTriangle, CheckCircle2, Zap, Minimize2 } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

export default function RaceMode() {
  const speed = useTelemetryStore(s => s.data.speed);
  const rpm = useTelemetryStore(s => s.data.rpm);
  const motorTemp = useTelemetryStore(s => s.data.motor_temp);
  const batteryVoltage = useTelemetryStore(s => s.data.battery_voltage);
  const throttle = useTelemetryStore(s => s.data.throttle);
  const vehicleState = useTelemetryStore(s => s.data.vehicle_state);
  const isConnected = useTelemetryStore(s => s.isConnected);

  // Threshold detection for driver alerts
  const isMotorOverheating = motorTemp > 100;
  const isBatteryAnomalous = batteryVoltage > 0 && (batteryVoltage < 300 || batteryVoltage > 420);
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
        {vehicleState.toUpperCase()}
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
        <SpeedGauge speed={speed} maxSpeed={160} />
      </div>

      {/* Bottom panels */}
      <div className={styles.bottomBar}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>RPM</span>
          <AnimatedNumber value={rpm} className={styles.metricValue} />
        </div>

        <div className={`${styles.metric} ${isMotorOverheating ? styles.danger : ''}`}>
          <span className={styles.metricLabel}>MOTOR °C</span>
          <AnimatedNumber value={motorTemp} decimals={1} className={styles.metricValue} />
        </div>

        <div className={`${styles.metric} ${isBatteryAnomalous ? styles.danger : ''}`}>
          <span className={styles.metricLabel}>BATTERY V</span>
          <AnimatedNumber value={batteryVoltage} decimals={1} className={styles.metricValue} />
        </div>

        <div className={styles.metric}>
          <span className={styles.metricLabel}>THROTTLE</span>
          <div className={styles.throttleMini}>
            <div className={styles.throttleFill} style={{ width: `${throttle}%` }} />
          </div>
          <AnimatedNumber value={throttle} className={styles.metricValueSmall} />
          <span className={styles.metricUnit}>%</span>
        </div>
      </div>
    </main>
  );
}
