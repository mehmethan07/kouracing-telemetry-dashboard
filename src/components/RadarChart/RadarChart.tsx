import React, { useMemo } from 'react';
import styles from './RadarChart.module.css';

interface SessionData {
  time: Float64Array | number[];
  speed: Float64Array | number[];
  rpm: Float64Array | number[];
  motor_temp: Float64Array | number[];
  battery_voltage: Float64Array | number[];
  throttle: Float64Array | number[];
}

interface LoadedSession {
  name: string;
  data: SessionData;
  color: string;
}

const AXES = [
  { label: 'Top Speed', key: 'topSpeed', max: 160 },
  { label: 'Avg Throttle', key: 'avgThrottle', max: 100 },
  { label: 'High RPM %', key: 'highRpm', max: 100 },
  { label: 'Aggressiveness', key: 'aggro', max: 100 },
  { label: 'Coasting %', key: 'coasting', max: 100 },
];

export default function RadarChart({ sessions }: { sessions: LoadedSession[] }) {
  const stats = useMemo(() => {
    return sessions.map(session => {
      const { speed, throttle, rpm } = session.data;
      const len = speed.length || 1;
      
      let maxSpeed = 0;
      let throttleSum = 0;
      let highRpmCount = 0;
      let aggroCount = 0;
      let coastingCount = 0;

      for (let i = 0; i < len; i++) {
        const s = speed[i] || 0;
        const t = throttle[i] || 0;
        const r = rpm[i] || 0;

        if (s > maxSpeed) maxSpeed = s;
        throttleSum += t;
        if (r > 12000) highRpmCount++;
        if (t > 90) aggroCount++;
        if (t === 0 && s > 30) coastingCount++;
      }

      return {
        topSpeed: Math.min(100, (maxSpeed / AXES[0].max) * 100),
        avgThrottle: Math.min(100, ((throttleSum / len) / AXES[1].max) * 100),
        highRpm: Math.min(100, (highRpmCount / len) * 100 * 2), // scaled for visibility
        aggro: Math.min(100, (aggroCount / len) * 100 * 3),
        coasting: Math.min(100, (coastingCount / len) * 100 * 4),
      };
    });
  }, [sessions]);

  const size = 300;
  const center = size / 2;
  const radius = size * 0.35;
  const numAxes = AXES.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // Generate background grid
  const gridLevels = 4;
  const grids = Array.from({ length: gridLevels }).map((_, levelIndex) => {
    const levelRadius = radius * ((levelIndex + 1) / gridLevels);
    const points = Array.from({ length: numAxes }).map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)}`;
    }).join(' ');
    return points;
  });

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>DRIVING SIGNATURE</h3>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.svg}>
        {/* Grid Polygons */}
        {grids.map((points, i) => (
          <polygon key={`grid-${i}`} points={points} className={styles.gridLine} />
        ))}

        {/* Axes Lines & Labels */}
        {AXES.map((axis, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          const labelX = center + (radius + 25) * Math.cos(angle);
          const labelY = center + (radius + 25) * Math.sin(angle);

          return (
            <g key={`axis-${i}`}>
              <line x1={center} y1={center} x2={x} y2={y} className={styles.axisLine} />
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" className={styles.axisLabel}>
                {axis.label}
              </text>
            </g>
          );
        })}

        {/* Data Polygons */}
        {stats.map((stat, sIdx) => {
          const session = sessions[sIdx];
          const points = AXES.map((axis, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const val = Math.max(0, Math.min(100, stat[axis.key as keyof typeof stat] || 0));
            const r = radius * (val / 100);
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');

          return (
            <polygon
              key={`data-${sIdx}`}
              points={points}
              fill={session.color}
              fillOpacity={0.2}
              stroke={session.color}
              strokeWidth="2"
              className={styles.dataPolygon}
              style={{ filter: `drop-shadow(0 0 8px ${session.color}80)` }}
            />
          );
        })}
      </svg>
    </div>
  );
}
