'use client';

import { useTelemetryStore } from '../../store/useTelemetryStore';
import TelemetryChart from '../../components/TelemetryChart/TelemetryChart';
import { Activity, AlertTriangle, CheckCircle2, Zap, Thermometer, Battery, Trash2, ShieldAlert } from 'lucide-react';
import styles from './page.module.css';

export default function InverterPage() {
  const data = useTelemetryStore(s => s.data);
  const history = useTelemetryStore(s => s.history);
  const faultLog = useTelemetryStore(s => s.faultLog);
  const clearFaultLog = useTelemetryStore(s => s.clearFaultLog);
  const isConnected = useTelemetryStore(s => s.isConnected);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Activity size={24} /> INVERTER DIAGNOSTICS
          </h1>
          <p className={styles.subtitle}>Isolated monitoring for motor controller</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.clearBtn} onClick={clearFaultLog} disabled={faultLog.length === 0}>
            <Trash2 size={16} /> Clear Faults
          </button>
        </div>
      </header>

      <div className={styles.grid}>
        
        {/* Left Column: Live Status & Charts */}
        <div className={styles.leftColumn}>
          
          <div className={styles.statusGrid}>
            <div className={`${styles.statusCard} ${data.fault ? styles.faultActive : ''}`}>
              <div className={styles.statusLabel}>
                {data.fault ? <AlertTriangle size={14} color="var(--status-danger)" /> : <CheckCircle2 size={14} color="var(--status-ok)" />}
                FAULT STATUS
              </div>
              <div className={`${styles.statusValue} ${data.fault ? styles.danger : styles.ok}`}>
                {data.fault ? data.fault_type : 'CLEAR'}
              </div>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusLabel}>
                <Zap size={14} /> INVERTER STATE
              </div>
              <div className={styles.statusValue}>
                {isConnected ? data.inverter_status : 'OFFLINE'}
              </div>
            </div>

            <div className={styles.statusCard}>
              <div className={styles.statusLabel}>
                <Activity size={14} /> VEHICLE STATE
              </div>
              <div className={styles.statusValue}>
                {isConnected ? data.vehicle_state : 'OFFLINE'}
              </div>
            </div>
          </div>

          <div className={styles.chartsArea}>
            <div className={styles.chartContainer}>
              <TelemetryChart 
                title="MOTOR TEMPERATURE (°C)" 
                color={data.motor_temp > 100 ? "var(--status-danger)" : "var(--status-warning)"} 
                data={[history.time, history.motor_temp]} 
                yMin={0} 
                yMax={120} 
              />
            </div>
            <div className={styles.chartContainer}>
              <TelemetryChart 
                title="BATTERY VOLTAGE (V)" 
                color="#3B82F6" 
                data={[history.time, history.battery_voltage]} 
                yMin={200} 
                yMax={450} 
              />
            </div>
            <div className={styles.chartContainer}>
              <TelemetryChart 
                title="THROTTLE REQUEST (%)" 
                color="var(--kou-silver)" 
                data={[history.time, history.throttle]} 
                yMin={0} 
                yMax={100} 
              />
            </div>
          </div>

        </div>

        {/* Right Column: Fault Log */}
        <div className={styles.rightColumn}>
          <div className={styles.logBox}>
            <div className={styles.logHeader}>
              <ShieldAlert size={16} /> FAULT HISTORY
            </div>
            
            <div className={styles.logList}>
              {faultLog.length === 0 ? (
                <div className={styles.emptyLog}>
                  <CheckCircle2 size={32} opacity={0.5} />
                  <span>No faults recorded in this session.</span>
                </div>
              ) : (
                faultLog.map((log, idx) => {
                  const isResolved = log.type === 'RESOLVED';
                  return (
                    <div key={idx} className={`${styles.logItem} ${isResolved ? styles.resolved : ''}`}>
                      <div className={styles.logItemHeader}>
                        <span className={`${styles.logType} ${isResolved ? styles.resolved : ''}`}>
                          {log.type}
                        </span>
                        <span className={styles.logTime}>
                          {new Date(log.timestamp * 1000).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className={styles.logMessage}>{log.message}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
