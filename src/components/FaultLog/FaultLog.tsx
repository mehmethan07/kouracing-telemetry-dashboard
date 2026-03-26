'use client';

import { memo } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import { FaultLogEntry } from '../../store/useTelemetryStore';
import styles from './FaultLog.module.css';

interface FaultLogProps {
  faults: FaultLogEntry[];
  onClear: () => void;
}

function FaultLogComponent({ faults, onClear }: FaultLogProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <AlertTriangle size={16} color="var(--status-danger)" />
          <span>FAULT LOG</span>
        </div>
        {faults.length > 0 && (
          <button className={styles.clearBtn} onClick={onClear}>
            <XCircle size={14} /> Clear
          </button>
        )}
      </div>
      <div className={styles.list}>
        {faults.length === 0 ? (
          <div className={styles.empty}>No faults recorded</div>
        ) : (
          faults.map((fault, i) => (
            <div key={`${fault.timestamp}-${i}`} className={styles.item}>
              <span className={styles.time}>{formatTime(fault.timestamp)}</span>
              <span className={styles.type}>{fault.type}</span>
              <span className={styles.message}>{fault.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const FaultLog = memo(FaultLogComponent);
export default FaultLog;
