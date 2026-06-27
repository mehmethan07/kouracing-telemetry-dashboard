import { useEffect, useRef, useMemo } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

// Accepts both regular JS arrays and TypedArrays (Float64Array from ring buffer)
type TelArray = Float64Array | number[];

interface TelemetryChartProps {
  title: string;
  color: string;
  data: [TelArray, TelArray]; // [time, values]
  yMin?: number;
  yMax?: number;
  syncKey?: string;
  isLive?: boolean;
  timeWindow?: number; // In seconds
  scrubBounds?: [number, number] | null;
  onPanZoom?: () => void;
}

// ---------------------------------------------------------------------------
// ⚡ Optimisation #4 — Binary search for visible window cutoff index
//
// Old approach: linear backward scan → O(N)  (up to 54,000 comparisons)
// New approach: binary search on sorted time array → O(log N) (~16 comparisons)
//
// Works because the time array is always monotonically increasing.
// lowerBound returns the first index where arr[i] >= target.
// ---------------------------------------------------------------------------
function lowerBound(arr: TelArray, target: number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1; // fast unsigned right-shift divide by 2
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export default function TelemetryChart({ 
  title, color, data, yMin = 0, yMax = 150, syncKey, isLive = true, timeWindow = 60, scrubBounds = null, onPanZoom 
}: TelemetryChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const getSize = () => ({
      width: containerRef.current?.clientWidth || 400,
      height: 200,
    });
    
    let syncCursor = undefined;
    if (syncKey) {
      const syncObj = uPlot.sync(syncKey);
      syncCursor = { key: syncObj.key, setSeries: true };
    }

    const options: uPlot.Options = {
      title: title,
      ...getSize(),
      padding: [15, 15, 0, 15],
      pxAlign: false,
      cursor: {
        points: { size: 6, fill: color },
        sync: syncCursor
      },
      hooks: {
        setScale: [
          (u, key) => {
            if (key === 'x') {
              // If dataset flag is not '1', this scale change came from user interaction (pan/zoom)
              if (u.ctx.canvas.dataset.programmaticScale !== '1') {
                if (onPanZoom) onPanZoom();
              }
              u.ctx.canvas.dataset.programmaticScale = '0'; // Reset flag
            }
          }
        ]
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
          width: 2.5,
          fill: (u: uPlot) => {
            // Check if bounds are valid before creating gradient to prevent errors on mount
            if (!u.bbox || 
                u.bbox.height === 0 || 
                u.bbox.width === 0 || 
                !Number.isFinite(u.bbox.top) || 
                !Number.isFinite(u.bbox.height)) {
              return `${color}20`;
            }
            
            try {
              const gradient = u.ctx.createLinearGradient(0, u.bbox.top, 0, u.bbox.top + u.bbox.height);
              gradient.addColorStop(0, `${color}50`); // 31% opacity at top (glowing edge)
              gradient.addColorStop(1, `${color}00`); // Fades to complete transparency at bottom
              return gradient;
            } catch (e) {
              return `${color}20`;
            }
          },
          points: { show: false }
        }
      ]
    };

    if (plotContainerRef.current) {
      plotRef.current = new uPlot(options, data, plotContainerRef.current);
    }

    let lastWidth = containerRef.current?.clientWidth || 400;
    const resizeObserver = new ResizeObserver(() => {
      if (plotRef.current && containerRef.current) {
        const newWidth = containerRef.current.clientWidth;
        if (Math.abs(newWidth - lastWidth) > 2) {
          lastWidth = newWidth;
          plotRef.current.setSize({ width: newWidth, height: 200 });
        }
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

  // Fast path for updating data and applying the Live Lock sliding window or Scrubbing
  useEffect(() => {
    if (plotRef.current && data[0].length > 0) {
      plotRef.current.setData(data);
      
      if (scrubBounds) {
        // Timeline scrubber takes priority over Live Lock
        plotRef.current.ctx.canvas.dataset.programmaticScale = '1';
        plotRef.current.setScale('x', { min: scrubBounds[0], max: scrubBounds[1] });
      } else if (isLive && timeWindow) {
        const latestTime = data[0][data[0].length - 1];
        const minTime = latestTime - timeWindow;
        
        plotRef.current.ctx.canvas.dataset.programmaticScale = '1';
        plotRef.current.setScale('x', { min: minTime, max: latestTime });
      }
    }
  }, [data, isLive, timeWindow, scrubBounds]);

  // Statistics Calculation
  const stats = useMemo(() => {
    // Determine the visible range to calculate stats only for what's on screen
    let values = data[1] || [];
    
    // Performance optimization: only compute stats for the visible window if we are Live
    if (isLive && timeWindow && data[0].length > 0) {
      const latest   = data[0][data[0].length - 1];
      const cutoff   = latest - timeWindow;
      // ⚡ Binary search — O(log N) instead of O(N) reverse linear scan
      const startIdx = lowerBound(data[0], cutoff);
      values = values.slice(startIdx);
    }

    if (values.length === 0) return { max: '0.0', min: '0.0', avg: '0.0' };
    
    let max = -Infinity, min = Infinity, sum = 0, count = 0;
    for (let i = 0; i < values.length; i++) {
        const val = values[i];
        if (val !== null && val !== undefined && !isNaN(val)) {
            if (val > max) max = val;
            if (val < min) min = val;
            sum += val;
            count++;
        }
    }
    
    if (count === 0) return { max: '0.0', min: '0.0', avg: '0.0' };

    return {
      max: max.toFixed(1),
      min: min.toFixed(1),
      avg: (sum / count).toFixed(1),
    };
  }, [data, isLive, timeWindow]);

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div ref={plotContainerRef} style={{ width: '100%', overflow: 'hidden' }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', padding: '0 0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <span>Min: <b style={{ color: 'var(--kou-white)' }}>{stats.min}</b></span>
        <span>Avg: <b style={{ color: color }}>{stats.avg}</b></span>
        <span>Max: <b style={{ color: 'var(--kou-white)' }}>{stats.max}</b></span>
      </div>
    </div>
  );
}