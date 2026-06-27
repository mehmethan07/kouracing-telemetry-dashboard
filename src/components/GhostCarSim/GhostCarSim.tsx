import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Square, FastForward } from 'lucide-react';
import styles from './GhostCarSim.module.css';

interface SessionData {
  time: number[];
  speed: number[];
}

interface LoadedSession {
  name: string;
  data: SessionData;
  color: string;
}

export default function GhostCarSim({ sessions }: { sessions: LoadedSession[] }) {
  const [playing, setPlaying] = useState(false);
  const [speedMult, setSpeedMult] = useState(1);
  const [progressIdx, setProgressIdx] = useState(0);
  const reqRef = useRef<number | null>(null);

  // Calculate max length and pre-compute distances
  const { maxLen, sessionDists, maxTotalDist } = useMemo(() => {
    let maxL = 0;
    const sessionDists = sessions.map(s => {
      const spd = s.data.speed;
      const len = spd.length;
      if (len > maxL) maxL = len;

      const dist = new Float64Array(len);
      let d = 0;
      for (let i = 0; i < len; i++) {
        // Assuming ~60Hz (dt = 1/60s). Speed is km/h -> /3.6 to get m/s
        d += ((spd[i] || 0) / 3.6) * (1 / 60);
        dist[i] = d;
      }
      return dist;
    });

    let maxTotalDist = 1;
    sessionDists.forEach(d => {
      if (d.length > 0 && d[d.length - 1] > maxTotalDist) {
        maxTotalDist = d[d.length - 1];
      }
    });

    return { maxLen: maxL, sessionDists, maxTotalDist };
  }, [sessions]);

  // Playback Loop
  useEffect(() => {
    if (!playing) {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      return;
    }

    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = time - lastTime;
      // We want to advance indices based on 60Hz. 
      // 1 index per 16.6ms * speedMult
      const framesToAdvance = (dt / 16.666) * speedMult;
      
      setProgressIdx(prev => {
        let next = prev + framesToAdvance;
        if (next >= maxLen) {
          setPlaying(false);
          return maxLen - 1;
        }
        return next;
      });

      lastTime = time;
      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [playing, speedMult, maxLen]);

  const togglePlay = () => {
    if (progressIdx >= maxLen - 1) {
      setProgressIdx(0);
    }
    setPlaying(!playing);
  };

  const stop = () => {
    setPlaying(false);
    setProgressIdx(0);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>GHOST CAR SIMULATION</h3>
        <div className={styles.controls}>
          <button className={styles.iconBtn} onClick={stop} title="Stop">
            <Square size={14} />
          </button>
          <button className={styles.iconBtn} onClick={togglePlay} title={playing ? "Pause" : "Play"}>
            {playing ? "PAUSE" : <Play size={14} />}
          </button>
          <button 
            className={`${styles.iconBtn} ${speedMult > 1 ? styles.activeMult : ''}`} 
            onClick={() => setSpeedMult(s => s === 1 ? 2 : s === 2 ? 5 : 1)}
            title="Speed"
          >
            <FastForward size={14} /> {speedMult}x
          </button>
        </div>
      </div>

      <div className={styles.track}>
        {/* Progress Line */}
        <div className={styles.finishLine} />
        
        {sessions.map((s, idx) => {
          const distArr = sessionDists[idx];
          const currIdx = Math.floor(progressIdx);
          const currentDist = distArr[Math.min(currIdx, distArr.length - 1)] || 0;
          const pct = Math.min(100, (currentDist / maxTotalDist) * 100);

          return (
            <div key={s.name} className={styles.lane}>
              <div className={styles.laneLabel} style={{ color: s.color }}>{s.name}</div>
              <div className={styles.carWrapper}>
                <div 
                  className={styles.car} 
                  style={{ 
                    transform: `translateX(calc(${pct}% * var(--track-width) / 100))`,
                    backgroundColor: s.color,
                    boxShadow: `0 0 10px ${s.color}80`
                  }}
                >
                  <span className={styles.carTooltip}>{Math.round(currentDist)}m</span>
                </div>
                <div className={styles.carTrail} style={{ width: `${pct}%`, backgroundColor: s.color }} />
              </div>
            </div>
          );
        })}
      </div>
      
      <div className={styles.timeInfo}>
        <div className={styles.progressBarWrapper}>
          <div className={styles.progressBar} style={{ width: `${(progressIdx / Math.max(1, maxLen)) * 100}%` }} />
        </div>
        <span className={styles.timeText}>
          {((progressIdx / 60)).toFixed(1)}s / {((maxLen / 60)).toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
