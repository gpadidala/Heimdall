import React from 'react';

const STATUS_MAP = {
  passed:  { color: '#10b981', bg: '#064e3b' },
  PASS:    { color: '#10b981', bg: '#064e3b' },
  failed:  { color: '#ef4444', bg: '#450a0a' },
  FAIL:    { color: '#ef4444', bg: '#450a0a' },
  WARN:    { color: '#eab308', bg: '#422006' },
  warning: { color: '#eab308', bg: '#422006' },
  running: { color: '#6366f1', bg: '#312e81' },
  pending: { color: '#94a3b8', bg: '#1e293b' },
};

// Inject pulse keyframes once
const PULSE_KEYFRAMES = `
@keyframes statusBadgePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
`;

let styleInjected = false;
function injectKeyframes() {
  if (styleInjected || typeof document === 'undefined') return;
  const sheet = document.createElement('style');
  sheet.textContent = PULSE_KEYFRAMES;
  document.head.appendChild(sheet);
  styleInjected = true;
}

export default function StatusBadge({ status, size = 'md' }) {
  React.useEffect(() => {
    injectKeyframes();
  }, []);

  const cfg = STATUS_MAP[status] || { color: '#94a3b8', bg: '#1e293b' };
  const isRunning = status === 'running';

  const isSmall = size === 'sm';

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isSmall ? '2px 8px' : '3px 12px',
    fontSize: isSmall ? 10 : 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    lineHeight: 1.4,
    color: cfg.color,
    backgroundColor: cfg.bg,
    borderRadius: 9999,
    whiteSpace: 'nowrap',
    animation: isRunning ? 'statusBadgePulse 1.5s ease-in-out infinite' : 'none',
  };

  return <span style={style}>{status}</span>;
}
