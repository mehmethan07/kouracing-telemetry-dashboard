import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface TelemetryChartProps {
  title: string;
  color: string;
  data: [number[], number[]];
  yMin?: number;
  yMax?: number;
}

export default function TelemetryChart({ title, color, data, yMin = 0, yMax = 150 }: TelemetryChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Calculate dimensions based on parent container
    const getSize = () => ({
      width: containerRef.current?.clientWidth || 400,
      height: 200,
    });

    const options: uPlot.Options = {
      title: title,
      ...getSize(), // Otomatik boyut
      padding: [15, 15, 0, 15],
      pxAlign: false,
      cursor: {
        points: { size: 6, fill: color },
      },
      axes: [
        {
          stroke: "var(--kou-silver)",
          grid: { show: true, stroke: "rgba(255,255,255,0.05)", width: 1 },
          font: "11px var(--font-inter)",
        },
        {
          stroke: "var(--kou-silver)",
          grid: { show: true, stroke: "rgba(255,255,255,0.05)", width: 1 },
          font: "11px var(--font-inter)",
          size: 40,
        }
      ],
      scales: {
        x: { time: true },
        y: { auto: false, range: [yMin, yMax] }
      },
      series: [
        {}, 
        {
          show: true,
          stroke: color,
          width: 3,
          fill: `${color}20`,
          points: { show: false }
        }
      ]
    };

    if (plotContainerRef.current) {
      plotRef.current = new uPlot(options, data, plotContainerRef.current);
    }

    // Initialize ResizeObserver to handle fluid layouts
    const resizeObserver = new ResizeObserver(() => {
      if (plotRef.current && containerRef.current) {
        plotRef.current.setSize(getSize());
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (plotRef.current) {
        plotRef.current.destroy();
        plotRef.current = null;
      }
    };
  }, []); 

  // Update plot data when history changes
  useEffect(() => {
    if (plotRef.current && data[0].length > 0) {
      plotRef.current.setData(data);
    }
  }, [data]);

  // Statistics Calculation
  const values = data[1] || [];
  const max = values.length > 0 ? Math.max(...values).toFixed(1) : '0.0';
  const min = values.length > 0 ? Math.min(...values).toFixed(1) : '0.0';
  const validLen = values.length || 1;
  const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / validLen).toFixed(1) : '0.0';

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div ref={plotContainerRef} style={{ width: '100%', overflow: 'hidden' }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', padding: '0 0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <span>Min: <b style={{ color: 'var(--kou-white)' }}>{min}</b></span>
        <span>Avg: <b style={{ color: color }}>{avg}</b></span>
        <span>Max: <b style={{ color: 'var(--kou-white)' }}>{max}</b></span>
      </div>
    </div>
  );
}