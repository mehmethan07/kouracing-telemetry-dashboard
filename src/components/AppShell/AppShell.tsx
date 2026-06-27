'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '../Sidebar/Sidebar';
import ShortcutsModal from '../ShortcutsModal/ShortcutsModal';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { showHelp, setShowHelp } = useKeyboardShortcuts();

  // Hide sidebar completely in Race Mode for distraction-free experience
  const isRaceMode = pathname === '/race';

  if (isRaceMode) {
    return (
      <div className={styles.raceShell}>
        {children}
        <ShortcutsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`${styles.content} ${collapsed ? styles.contentCollapsed : ''}`}>
        {children}
      </div>
      <ShortcutsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
