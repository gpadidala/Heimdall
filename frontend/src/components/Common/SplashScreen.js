import React, { useEffect, useState } from 'react';

/**
 * Launch splash — shows once per browser session on first app load.
 * Fades in, holds for ~1.2s, fades out, then unmounts so the main app
 * is fully interactive. Session-scoped via sessionStorage so a refresh
 * within the same tab doesn't re-play the animation (refresh a new
 * tab → splash plays again, which is what you want).
 */

const SESSION_KEY = 'heimdall_splash_shown';

// Phases: enter (fade in) → hold → exit (fade out) → unmount
const ENTER_MS = 450;
const HOLD_MS = 1200;
const EXIT_MS = 500;

let kfInjected = false;
function injectKf() {
  if (kfInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = `
    @keyframes heimdallSplashRingSpin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes heimdallSplashPulse {
      0%, 100% { filter: drop-shadow(0 0 32px rgba(99, 102, 241, 0.55)); }
      50%      { filter: drop-shadow(0 0 48px rgba(167, 139, 250, 0.85)); }
    }
    @keyframes heimdallSplashWordIn {
      from { opacity: 0; transform: translateY(8px); letter-spacing: 8px; }
      to   { opacity: 1; transform: translateY(0);   letter-spacing: 6px; }
    }
    @keyframes heimdallSplashTaglineIn {
      0%   { opacity: 0; }
      60%  { opacity: 0; }
      100% { opacity: 0.72; }
    }
  `;
  document.head.appendChild(el);
  kfInjected = true;
}

export default function SplashScreen({ onDone }) {
  // `phase`: 'enter' → 'hold' → 'exit' → null (unmounted by parent)
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    injectKf();
    const t1 = setTimeout(() => setPhase('hold'), ENTER_MS);
    const t2 = setTimeout(() => setPhase('exit'), ENTER_MS + HOLD_MS);
    const t3 = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
      onDone && onDone();
    }, ENTER_MS + HOLD_MS + EXIT_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  // Opacity / scale per phase — the smooth transition handles the ease
  const opacity = phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1;
  const scale   = phase === 'enter' ? 0.94 : phase === 'exit' ? 1.05 : 1;

  const rootStyle = {
    position: 'fixed', inset: 0, zIndex: 10000,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(circle at center, #0f172a 0%, #030712 70%)',
    opacity,
    transform: `scale(${scale})`,
    transition: `opacity ${phase === 'exit' ? EXIT_MS : ENTER_MS}ms ease, transform ${phase === 'exit' ? EXIT_MS : ENTER_MS}ms ease`,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    userSelect: 'none',
    pointerEvents: phase === 'exit' ? 'none' : 'auto',
  };

  const tridentStyle = {
    fontSize: 120,
    lineHeight: 1,
    animation: 'heimdallSplashPulse 2s ease-in-out infinite',
  };

  const ringOuter = {
    position: 'absolute',
    width: 260, height: 260,
    borderRadius: '50%',
    border: '2px dashed rgba(99, 102, 241, 0.35)',
    animation: 'heimdallSplashRingSpin 18s linear infinite',
  };

  const ringInner = {
    position: 'absolute',
    width: 200, height: 200,
    borderRadius: '50%',
    border: '1.5px solid rgba(167, 139, 250, 0.35)',
    animation: 'heimdallSplashRingSpin 9s linear infinite reverse',
  };

  const wordmarkStyle = {
    marginTop: 30,
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: 6,
    background: 'linear-gradient(135deg, #a5b4fc, #c4b5fd)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: `heimdallSplashWordIn ${ENTER_MS}ms ease both`,
  };

  const taglineStyle = {
    marginTop: 12,
    fontSize: 13,
    color: '#94a3b8',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: 500,
    animation: `heimdallSplashTaglineIn ${ENTER_MS + 300}ms ease both`,
  };

  const creditStyle = {
    position: 'absolute',
    bottom: 24,
    fontSize: 11,
    color: '#475569',
    letterSpacing: 1,
  };

  return (
    <div style={rootStyle} role="status" aria-label="Heimdall loading">
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 260, height: 260 }}>
        <div style={ringOuter} />
        <div style={ringInner} />
        <div style={tridentStyle} role="img" aria-label="Heimdall trident">🔱</div>
      </div>
      <div style={wordmarkStyle}>HEIMDALL</div>
      <div style={taglineStyle}>Watchman of your observability stack</div>
      <div style={creditStyle}>by Gopal Rao</div>
    </div>
  );
}

// Helper exported for App.js so it can decide whether to mount the splash
// at all — we skip on HMR / subsequent renders within the same session.
export function shouldShowSplash() {
  try {
    return sessionStorage.getItem(SESSION_KEY) !== '1';
  } catch {
    return true;
  }
}
