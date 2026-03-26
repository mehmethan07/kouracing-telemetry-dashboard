'use client';

import { memo } from 'react';
import styles from './SpeedGauge.module.css';

interface SpeedGaugeProps {
  speed: number;
  maxSpeed?: number;
}

function SpeedGaugeComponent({ speed, maxSpeed = 160 }: SpeedGaugeProps) {
  const clampedSpeed = Math.min(Math.max(speed, 0), maxSpeed);
  const percentage = clampedSpeed / maxSpeed;

  // SVG center and radius
  const cx = 150;
  const cy = 140;
  const r = 110;

  // Angles in radians — SVG coordinate system (Y-axis goes DOWN)
  // Start at left (180°) and sweep clockwise to right (0°)
  // In SVG: angle 0 = right, π/2 = bottom, π = left
  // We want a top-facing semicircle: from π (left) to 0 (right), going UP

  // Convert a normalized value (0-1) to an (x, y) point on the arc
  // 0 = left side (180°), 1 = right side (0°)
  const getPoint = (t: number, radius: number) => {
    // Angle goes from π (left) to 0 (right), counterclockwise in math terms
    // In SVG's flipped Y, this means going through the TOP
    const angle = Math.PI * (1 - t);
    return {
      x: cx + radius * Math.cos(angle),
      y: cy - radius * Math.sin(angle),
    };
  };

  // Build SVG arc path from t1 to t2
  const buildArc = (t1: number, t2: number, radius: number) => {
    const p1 = getPoint(t1, radius);
    const p2 = getPoint(t2, radius);
    const angleDiff = Math.abs(t2 - t1) * Math.PI;
    const largeArc = angleDiff > Math.PI ? 1 : 0;
    // sweep-flag: 1 = clockwise in SVG (which is our direction from left to right going UP)
    return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
  };

  // Background arc: full semicircle (0 to 1)
  const bgPath = buildArc(0, 1, r);

  // Value arc: from 0 to percentage
  const valuePath = percentage > 0.005 ? buildArc(0, percentage, r) : '';

  // Needle position
  const needle = getPoint(percentage, r - 15);

  // Speed ticks
  const ticks = [];
  const tickCount = 8;
  for (let i = 0; i <= tickCount; i++) {
    const t = i / tickCount;
    const outer = getPoint(t, r + 8);
    const inner = getPoint(t, r - 5);
    const label = getPoint(t, r + 22);
    const tickValue = Math.round((maxSpeed / tickCount) * i);
    ticks.push(
      <g key={i}>
        <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--kou-silver)" strokeWidth="2" />
        <text x={label.x} y={label.y} fill="var(--text-muted)" fontSize="10" textAnchor="middle" dominantBaseline="middle"
          fontFamily="var(--font-inter)">
          {tickValue}
        </text>
      </g>
    );
  }

  // Dynamic color based on speed
  const getColor = () => {
    if (percentage > 0.85) return 'var(--status-danger)';
    if (percentage > 0.65) return 'var(--status-warning)';
    return 'var(--kou-green)';
  };

  return (
    <div className={styles.container}>
      <svg viewBox="0 0 300 180" className={styles.svg}>
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--kou-green)" />
            <stop offset="65%" stopColor="var(--status-warning)" />
            <stop offset="100%" stopColor="var(--status-danger)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc — full semicircle */}
        <path d={bgPath} fill="none" stroke="var(--border-color)" strokeWidth="12" strokeLinecap="round" />

        {/* Value arc */}
        {valuePath && (
          <path d={valuePath} fill="none" stroke="url(#gaugeGradient)" strokeWidth="12" strokeLinecap="round"
            className={styles.valueArc} filter="url(#glow)" />
        )}

        {/* Ticks */}
        {ticks}

        {/* Needle dot */}
        <circle cx={needle.x} cy={needle.y} r="5" fill={getColor()} filter="url(#glow)" className={styles.needle} />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="4" fill="var(--kou-silver)" />

        {/* Speed value */}
        <text x={cx} y={cy - 25} fill="var(--kou-white)" fontSize="36" textAnchor="middle"
          fontFamily="var(--font-orbitron)" fontWeight="700" className={styles.speedValue}>
          {Math.round(speed)}
        </text>
        <text x={cx} y={cy - 5} fill="var(--text-muted)" fontSize="12" textAnchor="middle"
          fontFamily="var(--font-inter)">
          km/h
        </text>
      </svg>
    </div>
  );
}

const SpeedGauge = memo(SpeedGaugeComponent);
export default SpeedGauge;
