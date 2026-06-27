'use client';

import { useState, useCallback, useEffect } from 'react';
import { History, Download, Trash2, Play, Clock, Database, BarChart2 } from 'lucide-react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import styles from './page.module.css';

interface SessionRecord {
  id: string;
  name: string;
  date: string;
  dataPoints: number;
  duration: string;
}

function getStoredSessions(): SessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('kou_telemetry_sessions');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: SessionRecord[]) {
  localStorage.setItem('kou_telemetry_sessions', JSON.stringify(sessions));
}

// Asynchronously loads a tiny fraction of the session data to draw a real sparkline preview
const SessionThumbnail = ({ sessionId }: { sessionId: string }) => {
  const [data, setData] = useState<number[] | null>(null);

  useEffect(() => {
    let mounted = true;
    import('../../utils/idb').then(({ getSessionData }) => {
      getSessionData(sessionId).then((res: any) => {
        if (!mounted || !res || !res.speed || res.speed.length === 0) return;
        // Downsample to max 50 points for the thumbnail
        const speeds = res.speed as number[];
        const step = Math.max(1, Math.floor(speeds.length / 50));
        const sampled = speeds.filter((_, i) => i % step === 0);
        setData(sampled);
      });
    }).catch(console.error);
    return () => { mounted = false; };
  }, [sessionId]);

  if (!data) return <div className={styles.thumbnailPreview}><BarChart2 size={16} style={{marginRight: '8px'}}/> Loading...</div>;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 200;
  const height = 40;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={styles.thumbnailPreview} style={{ padding: '0.5rem 1rem' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${sessionId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#grad-${sessionId})`} />
        <polyline points={points} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export default function HistoryPage() {
  const history = useTelemetryStore((s) => s.history);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [savedMsg, setSavedMsg] = useState('');

  // Hydration fix: load sessions from localStorage only after initial mount
  useEffect(() => {
    setSessions(getStoredSessions());
  }, []);

  // LocalStorage still only holds session metadata (lightweight, no async needed)
  const saveCurrentSession = useCallback(async () => {
    if (history.time.length === 0) return;

    const now = new Date();
    const id = `session_${Date.now()}`;
    // Calculate actual duration from timestamps, not from data point count
    const durationSec = history.time.length > 1
      ? history.time[history.time.length - 1] - history.time[0]
      : 0;
    const mins = Math.floor(durationSec / 60);
    const secs = Math.floor(durationSec % 60);

    const session: SessionRecord = {
      id,
      name: `Session ${sessions.length + 1}`,
      date: now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      dataPoints: history.time.length,
      duration: `${mins}m ${secs}s`,
    };

    // Save history object to IndexedDB asynchronously (heavy operation)
    try {
      const { saveSessionData } = await import('../../utils/idb');
      await saveSessionData(id, history);
      
      const updated = [session, ...sessions];
      setSessions(updated);
      saveSessions(updated);
      setSavedMsg('Session saved to IndexedDB!');
    } catch (err) {
      console.error('Failed to save session to IndexedDB:', err);
      setSavedMsg('Error saving session');
    }

    setTimeout(() => setSavedMsg(''), 2500);
  }, [history, sessions]);

  const deleteSession = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    
    // Delete data from IndexedDB
    try {
      const { deleteSessionData } = await import('../../utils/idb');
      await deleteSessionData(id);
    } catch (err) {
      console.error('Failed to delete session from IndexedDB:', err);
    }
  }, [sessions]);

  const downloadSession = useCallback(async (id: string) => {
    try {
      const { getSessionData } = await import('../../utils/idb');
      const data = await getSessionData(id);
      
      if (!data) {
        alert("Session data not found in IndexedDB!");
        return;
      }
      
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${id}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <History size={24} /> SESSION HISTORY
          </h1>
          <p className={styles.subtitle}>Record and review past telemetry sessions</p>
        </div>
        <div className={styles.headerActions}>
          {savedMsg && <span className={styles.savedMsg}>{savedMsg}</span>}
          <button className={styles.saveBtn} onClick={saveCurrentSession} disabled={history.time.length === 0}>
            <Database size={16} />
            Save Current Session
          </button>
        </div>
      </header>

      {sessions.length === 0 ? (
        <div className={styles.empty}>
          <History size={48} />
          <h2>No Saved Sessions</h2>
          <p>Start a telemetry session and click &quot;Save Current Session&quot; to record it.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {sessions.map((session) => (
            <div key={session.id} className={styles.card}>
              <div className={styles.cardColorBar} />
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{session.name}</h3>
                <div className={styles.cardActions}>
                  <button className={styles.iconBtn} onClick={() => downloadSession(session.id)} title="Download JSON">
                    <Download size={14} />
                  </button>
                  <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => deleteSession(session.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <SessionThumbnail sessionId={session.id} />

              <div className={styles.cardBody}>
                <div className={styles.cardStat}>
                  <Clock size={14} />
                  <span>{session.date}</span>
                </div>
                <div className={styles.cardStat}>
                  <Play size={14} />
                  <span>{session.duration}</span>
                </div>
                <div className={styles.cardStat}>
                  <Database size={14} />
                  <span>{session.dataPoints.toLocaleString()} data points</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
