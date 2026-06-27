'use client';

import { memo, useMemo } from 'react';
import styles from './SpeedGauge.module.css';

interface SpeedGaugeProps {
  speed: number;
  maxSpeed?: number;
}

// ---------------------------------------------------------------------------
// ⚡ Optimisation #3 — Static geometry hoisted to module scope
//
// Old approach: every render called getPoint(), buildArc(), and rebuilt the
//   full ticks[] array (9 elements × trig calculations) — even when maxSpeed
//   hadn't changed.
//
// New approach:
//   • cx, cy, r are constants.
//   • getPoint() / buildArc() are pure module-level functions (no closure cost).
//   • STATIC_BG_PATH and STATIC_INNER_TRACK are computed ONCE at module load time.
//   • ticks[] is memo-ised with [maxSpeed] dependency (rarely changes).
//   • Only valuePath, needle position, color, and glow are recomputed per render
//     (they depend on the live `speed` value and are unavoidably dynamic).
// ---------------------------------------------------------------------------

const CX = 150;
const CY = 135;
const R  = 105;

/** Pure function — no side-effects, no closures, no allocation per call */
function getPoint(t: number, radius: number) {
  const angle = Math.PI * (1 - t);
  return {
    x: CX + radius * Math.cos(angle),
    y: CY - radius * Math.sin(angle),
  };
}

/** Pure function — builds an SVG arc path string */
function buildArc(t1: number, t2: number, radius: number) {
  const p1        = getPoint(t1, radius);
  const p2        = getPoint(t2, radius);
  const angleDiff = Math.abs(t2 - t1) * Math.PI;
  const largeArc  = angleDiff > Math.PI ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
}

// Computed ONCE at module load — never recalculated regardless of render count
const STATIC_BG_PATH     = buildArc(0, 1, R);
const STATIC_INNER_TRACK = buildArc(0, 1, R - 16);

/** Builds tick data array for a given maxSpeed — only called when maxSpeed changes */
function buildTicks(maxSpeed: number) {
  const TICK_COUNT = 8;
  return Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
    const t      = i / TICK_COUNT;
    const outer  = getPoint(t, R + 6);
    const inner  = getPoint(t, R - 3);
    const label  = getPoint(t, R + 20);
    const isMajor = i % 2 === 0;
    return {
      key:       i,
      outer, inner, label,
      tickValue: Math.round((maxSpeed / TICK_COUNT) * i),
      isMajor,
    };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SpeedGaugeComponent({ speed, maxSpeed = 160 }: SpeedGaugeProps) {
  // useMemo([maxSpeed]) — only recomputes when the max speed limit changes
  const ticks = useMemo(() => buildTicks(maxSpeed), [maxSpeed]);

  const clampedSpeed = Math.min(Math.max(speed, 0), maxSpeed);
  const percentage   = clampedSpeed / maxSpeed;

  // These three are dynamic (depend on live speed) → computed every render
  const valuePath    = percentage > 0.005 ? buildArc(0, percentage, R) : '';
  const needle       = getPoint(percentage, R - 12);
  const color        = percentage > 0.85
    ? 'var(--status-danger)'
    : percentage > 0.65
    ? 'var(--status-warning)'
    : 'var(--kou-green-light)';
  const glowIntensity = 2 + percentage * 6;

  return (
    <div className={styles.container}>
      <svg viewBox="0 0 300 175" className={styles.svg}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="var(--kou-green)" />
            <stop offset="60%"  stopColor="var(--status-warning)" />
            <stop offset="100%" stopColor="var(--status-danger)" />
          </linearGradient>
          <filter id="arcGlow">
            <feGaussianBlur stdDeviation={glowIntensity} result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="needleGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.08" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx={CX} cy={CY} r={R - 20} fill="url(#centerGlow)" />

        {/* ⚡ Static background arc — pre-computed at module load */}
        <path d={STATIC_BG_PATH} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="14" strokeLinecap="round" />

        {/* Dynamic value arc */}
        {valuePath && (
          <path d={valuePath} fill="none" stroke="url(#gaugeGrad)" strokeWidth="10"
            strokeLinecap="round" className={styles.valueArc} filter="url(#arcGlow)" />
        )}

        {/* ⚡ Static inner track — pre-computed at module load */}
        <path d={STATIC_INNER_TRACK} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

        {/* ⚡ Static ticks — useMemo([maxSpeed]), rarely rebuilt */}
        {ticks.map(({ key, inner, outer, label, tickValue, isMajor }) => (
          <g key={key}>
            <line
              x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={isMajor ? 'var(--kou-silver)' : 'var(--text-dimmed)'}
              strokeWidth={isMajor ? '2' : '1'}
              opacity={isMajor ? 1 : 0.5}
            />
            {isMajor && (
              <text
                x={label.x} y={label.y}
                fill="var(--text-dimmed)" fontSize="9"
                textAnchor="middle" dominantBaseline="middle"
                fontFamily="var(--font-inter)"
              >
                {tickValue}
              </text>
            )}
          </g>
        ))}

        {/* Dynamic needle position */}
        <circle cx={needle.x} cy={needle.y} r="5" fill={color}
          filter="url(#needleGlow)" className={styles.needle} />
        <circle cx={needle.x} cy={needle.y} r="2" fill="white"
          opacity="0.9" className={styles.needle} />

        {/* Center reference dot */}
        <circle cx={CX} cy={CY} r="3" fill="var(--text-dimmed)" opacity="0.3" />

        {/* Speed value text */}
        <text x={CX} y={CY - 28} fill="var(--kou-white)" fontSize="40"
          textAnchor="middle" fontFamily="var(--font-orbitron)"
          fontWeight="800" className={styles.speedValue}>
          {Math.round(speed)}
        </text>
        <text x={CX} y={CY - 6} fill="var(--text-dimmed)" fontSize="11"
          textAnchor="middle" fontFamily="var(--font-inter)"
          fontWeight="500" letterSpacing="0.15em">
          KM/H
        </text>
      </svg>
    </div>
  );
}

const SpeedGauge = memo(SpeedGaugeComponent);
export default SpeedGauge;
