import React, { useMemo } from 'react';
import { Cpu } from 'lucide-react';
import styles from './EngineerSummary.module.css';

interface SessionData {
  speed: number[];
  battery_voltage: number[];
  throttle: number[];
}

interface LoadedSession {
  name: string;
  data: SessionData;
  color: string;
}

export default function EngineerSummary({ sessions }: { sessions: LoadedSession[] }) {
  const insights = useMemo(() => {
    if (sessions.length < 2) return [];
    
    const results: { text: string; color: string }[] = [];
    const s1 = sessions[0];
    const s2 = sessions[1];

    // Speed comparison
    const s1MaxSpeed = Math.max(...s1.data.speed);
    const s2MaxSpeed = Math.max(...s2.data.speed);
    if (s1MaxSpeed > s2MaxSpeed + 2) {
      results.push({ text: `${s1.name} has a higher top speed by +${(s1MaxSpeed - s2MaxSpeed).toFixed(1)} km/h.`, color: s1.color });
    } else if (s2MaxSpeed > s1MaxSpeed + 2) {
      results.push({ text: `${s2.name} has a higher top speed by +${(s2MaxSpeed - s1MaxSpeed).toFixed(1)} km/h.`, color: s2.color });
    }

    // Battery comparison
    const s1AvgBattery = s1.data.battery_voltage.reduce((a, b) => a + b, 0) / s1.data.battery_voltage.length;
    const s2AvgBattery = s2.data.battery_voltage.reduce((a, b) => a + b, 0) / s2.data.battery_voltage.length;
    if (s1AvgBattery > s2AvgBattery + 1) {
      results.push({ text: `${s1.name} shows better energy retention (Avg ${s1AvgBattery.toFixed(1)}V vs ${s2AvgBattery.toFixed(1)}V).`, color: '#10B981' });
    } else if (s2AvgBattery > s1AvgBattery + 1) {
      results.push({ text: `${s2.name} shows better energy retention (Avg ${s2AvgBattery.toFixed(1)}V vs ${s1AvgBattery.toFixed(1)}V).`, color: '#10B981' });
    }

    // Coasting / Braking
    const s1Coasting = s1.data.throttle.filter(t => t === 0).length / s1.data.throttle.length;
    const s2Coasting = s2.data.throttle.filter(t => t === 0).length / s2.data.throttle.length;
    if (s1Coasting > s2Coasting + 0.05) {
      results.push({ text: `${s1.name} spends ${((s1Coasting - s2Coasting) * 100).toFixed(1)}% more time coasting (throttle off).`, color: s1.color });
    } else if (s2Coasting > s1Coasting + 0.05) {
      results.push({ text: `${s2.name} spends ${((s2Coasting - s1Coasting) * 100).toFixed(1)}% more time coasting (throttle off).`, color: s2.color });
    }

    if (results.length === 0) {
      results.push({ text: "Both sessions have very similar performance profiles.", color: '#9CA3AF' });
    }

    return results;
  }, [sessions]);

  if (sessions.length < 2) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}><Cpu size={14} /> AI ENGINEER SUMMARY</h3>
      <ul className={styles.list}>
        {insights.map((ins, i) => (
          <li key={i} className={styles.item}>
            <span className={styles.dot} style={{ backgroundColor: ins.color }} />
            {ins.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
