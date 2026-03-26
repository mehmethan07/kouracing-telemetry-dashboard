'use client';

import { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`${styles.content} ${collapsed ? styles.contentCollapsed : ''}`}>
        {children}
      </div>
    </div>
  );
}
