'use client';

import { useState, useCallback } from 'react';
import { History, Download, Trash2, Play, Clock, Database } from 'lucide-react';
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

export default function HistoryPage() {
  const history = useTelemetryStore((s) => s.history);
  const [sessions, setSessions] = useState<SessionRecord[]>(getStoredSessions);
  const [savedMsg, setSavedMsg] = useState('');

  const saveCurrentSession = useCallback(() => {
    if (history.time.length === 0) return;

    const now = new Date();
    const id = `session_${Date.now()}`;
    const durationSec = history.time.length;
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;

    const session: SessionRecord = {
      id,
      name: `Session ${sessions.length + 1}`,
      date: now.toLocaleString('tr-TR'),
      dataPoints: history.time.length,
      duration: `${mins}m ${secs}s`,
    };

    // History verisini de kaydet
    try {
      localStorage.setItem(`kou_session_data_${id}`, JSON.stringify(history));
    } catch {
      // localStorage dolu olabilir
    }

    const updated = [session, ...sessions];
    setSessions(updated);
    saveSessions(updated);
    setSavedMsg('Session saved!');
    setTimeout(() => setSavedMsg(''), 2000);
  }, [history, sessions]);

  const deleteSession = useCallback((id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    localStorage.removeItem(`kou_session_data_${id}`);
  }, [sessions]);

  const downloadSession = useCallback((id: string) => {
    const raw = localStorage.getItem(`kou_session_data_${id}`);
    if (!raw) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${id}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{session.name}</h3>
                <div className={styles.cardActions}>
                  <button className={styles.iconBtn} onClick={() => downloadSession(session.id)} title="Download">
                    <Download size={14} />
                  </button>
                  <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => deleteSession(session.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
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
                  <span>{session.dataPoints} data points</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
