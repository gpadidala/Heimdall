import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { icon: '📊', label: 'Dashboard', path: '/' },
  { icon: '▶️', label: 'Run Tests', path: '/run' },
  { icon: '📋', label: 'Reports', path: '/reports' },
  { icon: '🔍', label: 'Compare', path: '/compare' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
];

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 260,
    backgroundColor: '#111827',
    borderRight: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    overflowY: 'auto',
  },
  logoSection: {
    padding: '24px 20px 16px',
    borderBottom: '1px solid #1e293b',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.5px',
    lineHeight: 1,
  },
  brandName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e2e8f0',
    letterSpacing: '-0.2px',
  },
  versionBadge: {
    display: 'inline-block',
    marginLeft: 8,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: '#a78bfa',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 9999,
    verticalAlign: 'middle',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    paddingLeft: 2,
  },
  nav: {
    flex: 1,
    padding: '12px 0',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 20px',
    margin: '2px 8px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: 'none',
    background: 'none',
    width: 'calc(100% - 16px)',
    textAlign: 'left',
    borderLeft: '3px solid transparent',
  },
  navItemHover: {
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
  },
  navItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    color: '#e2e8f0',
    borderLeft: '3px solid #6366f1',
    fontWeight: 600,
  },
  navIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
    flexShrink: 0,
  },
  bottomSection: {
    padding: '16px 20px',
    borderTop: '1px solid #1e293b',
  },
  categoriesText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 11,
    color: '#475569',
  },
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredPath, setHoveredPath] = React.useState(null);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside style={styles.sidebar}>
      {/* Logo Section */}
      <div style={styles.logoSection}>
        <div style={styles.logoRow}>
          <span style={styles.logoText}>GP</span>
          <div>
            <span style={styles.brandName}>GrafanaProbe</span>
            <span style={styles.versionBadge}>v2.0</span>
          </div>
        </div>
        <div style={styles.subtitle}>by Gopal Rao</div>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          const hovered = hoveredPath === item.path && !active;

          const itemStyle = {
            ...styles.navItem,
            ...(active ? styles.navItemActive : {}),
            ...(hovered ? styles.navItemHover : {}),
          };

          return (
            <button
              key={item.path}
              style={itemStyle}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHoveredPath(item.path)}
              onMouseLeave={() => setHoveredPath(null)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div style={styles.bottomSection}>
        <div style={styles.categoriesText}>21 test categories</div>
        <div style={styles.versionText}>GrafanaProbe v2.0.0</div>
      </div>
    </aside>
  );
}
