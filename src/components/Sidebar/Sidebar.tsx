'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Timer,
  History,
  Users,
  Maximize2,
  GitCompareArrows,
  Code,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/laps', icon: Timer, label: 'Lap Analysis' },
  { href: '/compare', icon: GitCompareArrows, label: 'Compare' },
  { href: '/history', icon: History, label: 'Sessions' },
  { href: '/team', icon: Users, label: 'Team' },
  { href: '/api-docs', icon: Code, label: 'API' },
  { href: '/race', icon: Maximize2, label: 'Race Mode' },
];

function SidebarComponent({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo / Brand */}
      <div className={styles.brand}>
        {!collapsed && (
          <div className={styles.brandText}>
            <span className={styles.brandName}>KOU</span>
            <span className={styles.brandSub}>RACING</span>
          </div>
        )}
        <button className={styles.toggleBtn} onClick={onToggle}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className={styles.footer}>
          <span className={styles.version}>v0.3.0</span>
        </div>
      )}
    </aside>
  );
}

const Sidebar = memo(SidebarComponent);
export default Sidebar;
