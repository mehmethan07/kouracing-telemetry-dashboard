'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import styles from './NotificationSystem.module.css';

type NotificationType = 'success' | 'warning' | 'danger' | 'info';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Listen for critical alarms from telemetry store
  useEffect(() => {
    const unsub = useTelemetryStore.subscribe((state, prevState) => {
      // Check if a new critical alarm was added
      const prevLogLen = prevState.faultLog.length;
      const currLogLen = state.faultLog.length;
      
      if (currLogLen > prevLogLen) {
        const newFault = state.faultLog[0]; // Prepend, so it's the first one
        if (newFault.type !== 'RESOLVED') {
          let type: NotificationType = 'danger';
          if (newFault.type.includes('BATTERY')) type = 'warning';
          
          addNotification({
            title: newFault.type,
            message: newFault.message,
            type
          });
          
          // Play sound
          try {
            const audio = new Audio('/alert.mp3'); // We'll assume this exists or fails silently
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play failed', e));
          } catch(e) {}
        }
      }
    });
    
    return unsub;
  }, []);

  const addNotification = (notif: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setNotifications(prev => [...prev, { ...notif, id }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={20} className={styles.iconSuccess} />;
      case 'warning': return <AlertTriangle size={20} className={styles.iconWarning} />;
      case 'danger': return <AlertTriangle size={20} className={styles.iconDanger} />;
      case 'info': return <Info size={20} className={styles.iconInfo} />;
    }
  };

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}
      <div className={styles.container}>
        {notifications.map(notif => (
          <div key={notif.id} className={`${styles.toast} ${styles[`toast${notif.type}`]}`}>
            <div className={styles.iconContainer}>
              {getIcon(notif.type)}
            </div>
            <div className={styles.content}>
              <h4 className={styles.title}>{notif.title}</h4>
              <p className={styles.message}>{notif.message}</p>
            </div>
            <button className={styles.closeBtn} onClick={() => removeNotification(notif.id)}>
              <X size={16} />
            </button>
            <div className={styles.progressBar} />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
