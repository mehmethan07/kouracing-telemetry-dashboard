'use client';

import { memo } from 'react';
import { AlertTriangle, XCircle, CheckCircle2, Zap, Thermometer, Battery } from 'lucide-react';
import { FaultLogEntry } from '../../store/useTelemetryStore';
import styles from './FaultLog.module.css';

interface FaultLogProps {
  faults: FaultLogEntry[];
  onClear: () => void;
}

function getFaultIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes('motor') || t.includes('overheat')) return <Thermometer size={13} />;
  if (t.includes('battery') || t.includes('voltage')) return <Battery size={13} />;
  if (t.includes('inverter')) return <Zap size={13} />;
  if (t === 'resolved') return <CheckCircle2 size={13} />;
  return <AlertTriangle size={13} />;
}

function getFaultColor(type: string) {
  const t = type.toLowerCase();
  if (t === 'resolved') return 'var(--status-ok)';
  if (t.includes('motor') || t.includes('overheat')) return 'var(--status-danger)';
  if (t.includes('battery')) return 'var(--status-warning)';
  if (t.includes('inverter')) return 'var(--status-info)';
  return 'var(--status-danger)';
}

function FaultLogComponent({ faults, onClear }: FaultLogProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const activeFaults = faults.filter(f => f.type !== 'RESOLVED').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <AlertTriangle size={15} color="var(--status-danger)" />
          <span>FAULT LOG</span>
          {activeFaults > 0 && (
            <span className={styles.faultCount}>{activeFaults}</span>
          )}
        </div>
        {faults.length > 0 && (
          <button className={styles.clearBtn} onClick={onClear}>
            <XCircle size={13} /> Clear
          </button>
        )}
      </div>
      <div className={styles.list}>
        {faults.length === 0 ? (
          <div className={styles.empty}>
            <CheckCircle2 size={20} color="var(--status-ok)" />
            <span>No faults recorded</span>
          </div>
        ) : (
          faults.map((fault, i) => {
            const color = getFaultColor(fault.type);
            const isResolved = fault.type === 'RESOLVED';
            return (
              <div key={`${fault.timestamp}-${i}`}
                className={`${styles.item} ${isResolved ? styles.itemResolved : ''}`}
                style={{ borderLeftColor: color }}
              >
                <span className={styles.icon} style={{ color }}>
                  {getFaultIcon(fault.type)}
                </span>
                <span className={styles.time}>{formatTime(fault.timestamp)}</span>
                <span className={styles.type} style={{ color }}>{fault.type}</span>
                <span className={styles.message}>{fault.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const FaultLog = memo(FaultLogComponent);
export default FaultLog;
