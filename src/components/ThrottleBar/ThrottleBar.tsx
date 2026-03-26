'use client';

import { memo } from 'react';
import styles from './ThrottleBar.module.css';

interface ThrottleBarProps {
  value: number; // 0-100
}

function ThrottleBarComponent({ value }: ThrottleBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  const getBarColor = () => {
    if (clampedValue > 85) return 'var(--status-danger)';
    if (clampedValue > 60) return 'var(--status-warning)';
    return 'var(--kou-green)';
  };

  return (
    <div className={styles.container}>
      <div className={styles.label}>THROTTLE</div>
      <div className={styles.barWrapper}>
        <div className={styles.barTrack}>
          <div
            className={styles.barFill}
            style={{
              height: `${clampedValue}%`,
              backgroundColor: getBarColor(),
              boxShadow: `0 0 12px ${getBarColor()}40`,
            }}
          />
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => (
            <div
              key={tick}
              className={styles.tick}
              style={{ bottom: `${tick}%` }}
            >
              <span className={styles.tickLabel}>{tick}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.value}>
        <span className={styles.valueNumber}>{Math.round(clampedValue)}</span>
        <span className={styles.valueUnit}>%</span>
      </div>
    </div>
  );
}

const ThrottleBar = memo(ThrottleBarComponent);
export default ThrottleBar;
