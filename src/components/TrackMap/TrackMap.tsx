'use client';

import { memo } from 'react';
import styles from './TrackMap.module.css';

interface TrackMapProps {
  lapCount?: number;
  progress?: number; // Normalized vehicle position (0-1)
  heatData?: number[]; // Motor temperature history for the current lap
}

/**
 * TrackMap Component
 * Renders a SVG-based track outline with real-time vehicle positioning and
 * motor temperature heat-mapping.
 */
function TrackMapComponent({ lapCount = 0, progress = 0, heatData = [] }: TrackMapProps) {
  const cx = 200;
  const cy = 120;
  const rx = 160;
  const ry = 80;

  // t (0-1) -> (x,y) on ellipse, starting from top (S/F), going clockwise
  const getPoint = (t: number) => {
    const angle = -Math.PI / 2 + t * 2 * Math.PI;
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  };

  // Build the full ellipse path using 4 arcs (needed because SVG can't do a full ellipse as one arc)
  const fullTrackPath = `
    M ${cx} ${cy - ry}
    A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}
    A ${rx} ${ry} 0 0 1 ${cx} ${cy + ry}
    A ${rx} ${ry} 0 0 1 ${cx - rx} ${cy}
    A ${rx} ${ry} 0 0 1 ${cx} ${cy - ry}
    Z
  `;

  // Builds an SVG arc from t1 to t2
  const buildArc = (t1: number, t2: number) => {
    if (Math.abs(t2 - t1) < 0.001) return '';
    const start = getPoint(t1);
    const end = getPoint(t2);
    const largeArc = (t2 - t1) > 0.5 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${rx} ${ry} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Determine color based on motor temperature
  const getTempColor = (temp: number) => {
    if (temp >= 100) return 'var(--status-danger)';
    if (temp >= 70) return 'var(--status-warning)';
    return 'var(--kou-green)';
  };

  // Render progress trail: if heatData is provided, render multiple colored segments
  const renderTrail = () => {
    if (progress <= 0) return null;

    if (!heatData || heatData.length === 0) {
      // Single solid line if no heat data
      return (
        <path d={buildArc(0, progress)} fill="none" stroke="var(--kou-green)" strokeWidth="4"
          strokeLinecap="round" opacity="0.6" />
      );
    }

    // Determine segment length
    const segmentLength = progress / Math.max(heatData.length, 1);
    
    return heatData.map((temp, index) => {
      // Draw a line slightly overlapping to avoid gaps
      const t1 = index * segmentLength;
      const t2 = Math.min((index + 1.1) * segmentLength, progress);
      const color = getTempColor(temp);
      
      return (
        <path
          key={index}
          d={buildArc(t1, t2)}
          fill="none"
          stroke={color}
          strokeWidth="6" // slightly thicker for heat map
          strokeLinecap="round"
          opacity="0.8"
        />
      );
    });
  };

  // S/F position
  const sf = getPoint(0);

  // Car position
  const car = getPoint(progress);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>TRACK POSITION (HEAT MAP)</span>
        <span className={styles.lapBadge}>LAP {lapCount}</span>
      </div>
      <svg viewBox="0 0 400 240" className={styles.svg}>
        <defs>
          <filter id="carGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track outline */}
        <path d={fullTrackPath} fill="none" stroke="var(--border-color)" strokeWidth="20" />
        <path d={fullTrackPath} fill="none" stroke="var(--bg-main)" strokeWidth="1"
          strokeDasharray="8 6" opacity="0.5" />

        {/* S/F line */}
        <line x1={sf.x} y1={sf.y - 12} x2={sf.x} y2={sf.y + 12}
          stroke="var(--kou-white)" strokeWidth="3" />
        <text x={sf.x} y={sf.y - 18} fill="var(--text-muted)" fontSize="8"
          textAnchor="middle" fontFamily="var(--font-inter)">S/F</text>

        {/* Sector markers */}
        {[0.25, 0.5, 0.75].map((s, i) => {
          const pt = getPoint(s);
          return (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="3" fill="var(--kou-silver)" opacity="0.4" />
              <text x={pt.x} y={pt.y - 10} fill="var(--text-muted)" fontSize="7"
                textAnchor="middle" fontFamily="var(--font-inter)">S{i + 1}</text>
            </g>
          );
        })}

        {/* Progress trail with Heat Map */}
        {renderTrail()}

        {/* Car position */}
        <circle cx={car.x} cy={car.y} r="8"
          fill="var(--kou-white)" filter="url(#carGlow)"
          className={styles.car} />
        <circle cx={car.x} cy={car.y} r="4" fill="var(--bg-main)" />
      </svg>
    </div>
  );
}

const TrackMap = memo(TrackMapComponent);
export default TrackMap;
