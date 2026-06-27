'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTelemetryStore } from '../../store/useTelemetryStore';
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
  Wifi,
  WifiOff,
  Activity,
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
  { href: '/inverter', icon: Activity, label: 'Inverter' },
  { href: '/race', icon: Maximize2, label: 'Race Mode' },
];

function ConnectionIndicator({ collapsed }: { collapsed: boolean }) {
  const isConnected = useTelemetryStore(s => s.isConnected);

  return (
    <div className={styles.connectionStatus}>
      <div className={`${styles.connectionDot} ${isConnected ? styles.dotOnline : styles.dotOffline}`} />
      {!collapsed && (
        <div className={styles.connectionInfo}>
          <div className={styles.connectionLabel}>
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
          <span className={styles.connectionSub}>WebSocket</span>
        </div>
      )}
    </div>
  );
}

function SidebarComponent({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div 
        className={`${styles.brand} ${collapsed ? styles.clickableBrand : ''}`}
        onClick={collapsed ? onToggle : undefined}
        title={collapsed ? "Expand Sidebar" : undefined}
      >
        <div className={styles.brandIcon}>
          <span className={styles.brandIconText}>K</span>
        </div>
        {!collapsed && (
          <div className={styles.brandText}>
            <span className={styles.brandName}>KOU</span>
            <span className={styles.brandSub}>RACING</span>
          </div>
        )}
        {!collapsed && (
          <button className={styles.toggleBtn} onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label="Toggle sidebar">
            <ChevronLeft size={16} />
          </button>
        )}
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
              {isActive && <span className={styles.activeIndicator} />}
              <span className={styles.navIcon}>
                <Icon size={19} />
              </span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              {isActive && !collapsed && <span className={styles.activeDot} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Connection + Version */}
      <div className={styles.footer}>
        <ConnectionIndicator collapsed={collapsed} />
        {!collapsed && (
          <span className={styles.version}>v0.4.0</span>
        )}
      </div>
    </aside>
  );
}

const Sidebar = memo(SidebarComponent);
export default Sidebar;
