import React, { useEffect, useState } from 'react';

const TYPE_CONFIG = {
  success: { borderColor: '#10b981', icon: '✓', bg: '#064e3b' },
  error:   { borderColor: '#ef4444', icon: '✕', bg: '#450a0a' },
  info:    { borderColor: '#6366f1', icon: 'ℹ', bg: '#312e81' },
  warning: { borderColor: '#eab308', icon: '⚠', bg: '#422006' },
};

// Inject slide-up keyframes once
const SLIDE_KEYFRAMES = `
@keyframes toastSlideUp {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
@keyframes toastSlideOut {
  from { transform: translateY(0); opacity: 1; }
  to   { transform: translateY(20px); opacity: 0; }
}
`;

let toastStyleInjected = false;
function injectToastKeyframes() {
  if (toastStyleInjected || typeof document === 'undefined') return;
  const sheet = document.createElement('style');
  sheet.textContent = SLIDE_KEYFRAMES;
  document.head.appendChild(sheet);
  toastStyleInjected = true;
}

export default function Toast({ message, type = 'info', onClose }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    injectToastKeyframes();
  }, []);

  useEffect(() => {
    const dismissTimer = setTimeout(() => {
      setExiting(true);
    }, 4500);

    return () => clearTimeout(dismissTimer);
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const exitTimer = setTimeout(() => {
      if (onClose) onClose();
    }, 300);
    return () => clearTimeout(exitTimer);
  }, [exiting, onClose]);

  const handleClose = () => {
    setExiting(true);
  };

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;

  const containerStyle = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 9999,
    minWidth: 320,
    maxWidth: 440,
    backgroundColor: '#111827',
    border: '1px solid #1e293b',
    borderLeft: `4px solid ${cfg.borderColor}`,
    borderRadius: 8,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    animation: exiting
      ? 'toastSlideOut 0.3s ease-in forwards'
      : 'toastSlideUp 0.3s ease-out forwards',
  };

  const iconStyle = {
    width: 24,
    height: 24,
    borderRadius: '50%',
    backgroundColor: cfg.bg,
    color: cfg.borderColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  };

  const messageStyle = {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 1.5,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 16,
    padding: '0 2px',
    lineHeight: 1,
    flexShrink: 0,
  };

  return (
    <div style={containerStyle}>
      <div style={iconStyle}>{cfg.icon}</div>
      <div style={messageStyle}>{message}</div>
      <button style={closeButtonStyle} onClick={handleClose} aria-label="Close">
        ×
      </button>
    </div>
  );
}
