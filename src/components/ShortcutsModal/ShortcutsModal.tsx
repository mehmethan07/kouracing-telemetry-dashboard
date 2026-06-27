'use client';

import { Keyboard, X } from 'lucide-react';
import styles from './ShortcutsModal.module.css';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'D', description: 'Go to Dashboard' },
    { key: 'L', description: 'Go to Lap Analysis' },
    { key: 'R', description: 'Go to Race Mode' },
    { key: 'H', description: 'Go to Session History' },
    { key: 'T', description: 'Go to Team Management' },
    { key: '?', description: 'Toggle this help menu' },
    { key: 'ESC', description: 'Close modals / panels' },
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            <Keyboard size={18} />
            <span>Keyboard Shortcuts</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>
          {shortcuts.map(s => (
            <div key={s.key} className={styles.shortcutRow}>
              <span className={styles.description}>{s.description}</span>
              <span className={styles.keyBadge}>{s.key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
