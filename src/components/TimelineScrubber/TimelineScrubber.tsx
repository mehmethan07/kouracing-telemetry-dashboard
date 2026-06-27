'use client';

import { useEffect, useRef, memo } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import styles from './TimelineScrubber.module.css';

interface TimelineScrubberProps {
  data: [(Float64Array | number[]), (Float64Array | number[])]; // [time, speed]
  onSelect: (minTime: number, maxTime: number) => void;
  onClear: () => void;
}

function TimelineScrubberComponent({ data, onSelect, onClear }: TimelineScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height: 80,
      cursor: {
        x: false,
        y: false,
        points: { show: false }
      },
      legend: { show: false },
      axes: [
        {
          show: true,
          font: '10px Inter',
          stroke: 'rgba(255,255,255,0.4)',
          grid: { show: false }
        },
        { show: false } // hide y axis
      ],
      series: [
        {},
        {
          show: true,
          stroke: '#3B82F6',
          width: 1,
          fill: 'rgba(59, 130, 246, 0.2)',
          points: { show: false }
        }
      ],
      hooks: {
        setSelect: [
          (u) => {
            const min = u.posToVal(u.select.left, 'x');
            const max = u.posToVal(u.select.left + u.select.width, 'x');
            if (u.select.width > 0) {
              onSelect(min, max);
            } else {
              onClear();
            }
          }
        ]
      }
    };

    chartRef.current = new uPlot(opts, data, containerRef.current);

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.setSize({
          width: containerRef.current.clientWidth,
          height: 80
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []); // Mount once

  // Update data smoothly
  useEffect(() => {
    if (chartRef.current && data[0].length > 0) {
      chartRef.current.setData(data);
    }
  }, [data]);

  return (
    <div className={styles.scrubberWrapper}>
      <div className={styles.scrubberLabel}>TIMELINE SCRUBBER</div>
      <div ref={containerRef} className={styles.chartContainer} />
    </div>
  );
}

const TimelineScrubber = memo(TimelineScrubberComponent);
export default TimelineScrubber;
