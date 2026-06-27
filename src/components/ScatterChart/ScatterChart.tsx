import React, { useEffect, useRef, useMemo } from 'react';
import styles from './ScatterChart.module.css';

interface SessionData {
  time: number[];
  speed: number[];
  rpm: number[];
  motor_temp: number[];
  battery_voltage: number[];
  throttle: number[];
}

interface LoadedSession {
  name: string;
  data: SessionData;
  color: string;
}

const RANGES: Record<string, [number, number]> = {
  speed: [0, 160],
  rpm: [0, 16000],
  throttle: [0, 100],
  motor_temp: [0, 120],
  battery_voltage: [200, 450],
};

const LABELS: Record<string, string> = {
  speed: 'Speed (km/h)',
  rpm: 'RPM',
  throttle: 'Throttle (%)',
  motor_temp: 'Motor Temp (°C)',
  battery_voltage: 'Battery (V)',
};

export default function ScatterChart({ 
  sessions, 
  xMetric, 
  yMetric 
}: { 
  sessions: LoadedSession[];
  xMetric: keyof SessionData;
  yMetric: keyof SessionData;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const xRange = useMemo(() => RANGES[xMetric as string] || [0, 100], [xMetric]);
  const yRange = useMemo(() => RANGES[yMetric as string] || [0, 100], [yMetric]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 30;

    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw Points
    sessions.forEach(session => {
      const xData = session.data[xMetric] as number[];
      const yData = session.data[yMetric] as number[];
      const len = Math.min(xData.length, yData.length);

      ctx.fillStyle = session.color + '80'; // 50% opacity
      
      for (let i = 0; i < len; i++) {
        const xVal = xData[i];
        const yVal = yData[i];
        
        // Skip nulls or zeroes if not relevant (optional, depending on telemetry noise)
        if (xVal == null || yVal == null) continue;

        const xPx = padding + ((xVal - xRange[0]) / (xRange[1] - xRange[0])) * plotW;
        const yPx = height - padding - ((yVal - yRange[0]) / (yRange[1] - yRange[0])) * plotH;

        if (xPx >= padding && xPx <= width - padding && yPx >= padding && yPx <= height - padding) {
          ctx.fillRect(xPx, yPx, 2, 2); // Fast 2x2 dot
        }
      }
    });

    // Draw Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(LABELS[xMetric as string], width / 2, height - 5);
    
    ctx.save();
    ctx.translate(10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(LABELS[yMetric as string], 0, 0);
    ctx.restore();

  }, [sessions, xMetric, yMetric, xRange, yRange]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{LABELS[yMetric as string]} vs {LABELS[xMetric as string]}</span>
      </div>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
