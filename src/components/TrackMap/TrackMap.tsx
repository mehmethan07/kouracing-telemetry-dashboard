'use client';

import { memo } from 'react';
import styles from './TrackMap.module.css';

interface TrackMapProps {
  lapCount?: number;
  progress?: number;
  heatData?: Float64Array | number[];
}

function TrackMapComponent({ lapCount = 0, progress = 0, heatData: rawHeatData = [] }: TrackMapProps) {
  // Normalize to number[] — works with both Float64Array (ring buffer) and number[]
  const heatData: number[] = rawHeatData instanceof Float64Array
    ? Array.from(rawHeatData)
    : rawHeatData as number[];
  const cx = 200;
  const cy = 120;
  const rx = 160;
  const ry = 80;

  const getPoint = (t: number) => {
    const angle = -Math.PI / 2 + t * 2 * Math.PI;
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  };

  const fullTrackPath = `
    M ${cx} ${cy - ry}
    A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}
    A ${rx} ${ry} 0 0 1 ${cx} ${cy + ry}
    A ${rx} ${ry} 0 0 1 ${cx - rx} ${cy}
    A ${rx} ${ry} 0 0 1 ${cx} ${cy - ry}
    Z
  `;

  const buildArc = (t1: number, t2: number) => {
    if (Math.abs(t2 - t1) < 0.001) return '';
    const start = getPoint(t1);
    const end = getPoint(t2);
    const largeArc = (t2 - t1) > 0.5 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${rx} ${ry} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const getTempColor = (temp: number) => {
    if (temp >= 100) return 'var(--status-danger)';
    if (temp >= 70) return 'var(--status-warning)';
    return 'var(--kou-green)';
  };

  const renderTrail = () => {
    if (progress <= 0) return null;

    if (!heatData || heatData.length === 0) {
      return (
        <path d={buildArc(0, progress)} fill="none" stroke="var(--kou-green)" strokeWidth="5"
          strokeLinecap="round" opacity="0.7" />
      );
    }

    const segmentLength = progress / Math.max(heatData.length, 1);

    return heatData.map((temp, index) => {
      const t1 = index * segmentLength;
      const t2 = Math.min((index + 1.1) * segmentLength, progress);
      const color = getTempColor(temp);

      return (
        <path
          key={index}
          d={buildArc(t1, t2)}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.85"
        />
      );
    });
  };

  const sf = getPoint(0);
  const car = getPoint(progress);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>TRACK POSITION</span>
        <span className={styles.lapBadge}>LAP {lapCount}</span>
      </div>
      <svg viewBox="0 0 400 240" className={styles.svg}>
        <defs>
          <filter id="carGlow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track outline */}
        <path d={fullTrackPath} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="22" />
        <path d={fullTrackPath} fill="none" stroke="rgba(255,255,255,0.015)"
          strokeDasharray="6 5" strokeWidth="1" />

        {/* S/F line */}
        <line x1={sf.x} y1={sf.y - 14} x2={sf.x} y2={sf.y + 14}
          stroke="var(--kou-white)" strokeWidth="2" opacity="0.6" />
        <text x={sf.x} y={sf.y - 20} fill="var(--text-dimmed)" fontSize="7"
          textAnchor="middle" fontFamily="var(--font-inter)" fontWeight="600">S/F</text>

        {/* Sector markers */}
        {[0.25, 0.5, 0.75].map((s, i) => {
          const pt = getPoint(s);
          return (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="2.5" fill="var(--text-dimmed)" opacity="0.3" />
              <text x={pt.x} y={pt.y - 10} fill="var(--text-dimmed)" fontSize="7"
                textAnchor="middle" fontFamily="var(--font-inter)" fontWeight="500">S{i + 1}</text>
            </g>
          );
        })}

        {/* Progress trail with Heat Map */}
        {renderTrail()}

        {/* Car position */}
        <circle cx={car.x} cy={car.y} r="8"
          fill="var(--kou-white)" filter="url(#carGlow)"
          className={styles.car} />
        <circle cx={car.x} cy={car.y} r="3.5" fill="var(--kou-green)" className={styles.car} />
      </svg>

      {/* Heat Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--kou-green)' }} />
          Normal
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--status-warning)' }} />
          70°C+
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--status-danger)' }} />
          100°C+
        </div>
      </div>
    </div>
  );
}

const TrackMap = memo(TrackMapComponent);
export default TrackMap;
