import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

/* ── theme tokens ── */
const C = {
  bg: '#030712',
  card: '#111827',
  input: '#0f172a',
  text: '#e2e8f0',
  muted: '#94a3b8',
  accent: '#6366f1',
  border: '#1e293b',
  green: '#10b981',
  red: '#ef4444',
};

/* ── shared styles ── */
const s = {
  page: { color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: 820 },
  title: { fontSize: 28, fontWeight: 700, margin: '0 0 32px 0', color: C.text },
  section: {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: 24, marginBottom: 24,
  },
  sectionTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 20px 0', color: C.text, display: 'flex', alignItems: 'center', gap: 10 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6 },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: C.input, color: C.text, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '10px 14px', fontSize: 14, outline: 'none',
    transition: 'border-color .2s',
  },
  inputFocus: { borderColor: C.accent },
  row: { display: 'flex', gap: 16, marginBottom: 16 },
  col: { flex: 1 },
  btn: {
    background: C.accent, color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 22px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
    transition: 'opacity .2s',
  },
  btnOutline: {
    background: 'transparent', color: C.accent, border: `1px solid ${C.accent}40`,
    borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  },
  saved: {
    color: C.green, fontSize: 13, fontWeight: 600, marginLeft: 12,
    transition: 'opacity .3s', display: 'inline-block',
  },
  resultBox: {
    marginTop: 12, background: C.input, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: 14, fontSize: 13,
  },
  envDot: (color) => ({
    width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0,
  }),
  envCard: {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: 16, marginBottom: 12,
  },
  envHeader: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  envName: { fontWeight: 700, fontSize: 15, flex: 1, color: C.text },
  toggle: { color: C.muted, fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', padding: '4px 8px' },
  select: {
    width: '100%', boxSizing: 'border-box',
    background: C.input, color: C.text, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '10px 14px', fontSize: 14, outline: 'none',
    appearance: 'auto', cursor: 'pointer',
  },
};

/* ── Input with focus styling ── */
function StyledInput({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...s.input, ...(focused ? s.inputFocus : {}), ...style }}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

/* ── "Saved!" flash ── */
function useSavedFlash() {
  const [show, setShow] = useState(false);
  const timer = useRef(null);
  const flash = () => {
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2000);
  };
  const el = show ? <span style={s.saved}>Saved!</span> : null;
  return [el, flash];
}

/* ── localStorage helpers ── */
const LS_ENVS = 'grafana_probe_envs';
const LS_LLM = 'grafana_probe_llm';

function loadEnvs() {
  try { return JSON.parse(localStorage.getItem(LS_ENVS)) || null; } catch { return null; }
}
function saveEnvs(data) { localStorage.setItem(LS_ENVS, JSON.stringify(data)); }
function loadLlm() {
  try { return JSON.parse(localStorage.getItem(LS_LLM)) || null; } catch { return null; }
}
function saveLlm(data) { localStorage.setItem(LS_LLM, JSON.stringify(data)); }

const DEFAULT_ENVS = [
  { key: 'DEV', label: 'DEV', color: '#22d3ee', url: '', token: '' },
  { key: 'PERF', label: 'PERF', color: '#eab308', url: '', token: '' },
  { key: 'PROD', label: 'PROD', color: '#ef4444', url: '', token: '' },
];

const LLM_MODELS = {
  None: [],
  OpenAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  Claude: ['claude-sonnet-4-20250514', 'claude-opus-4-0-20250115', 'claude-3-haiku-20240307'],
};

/* ═══════════════════════════════════════ */
export default function SettingsPage() {
  /* ── Per-environment test state ── */
  const [envTesting, setEnvTesting] = useState({});      // { DEV: true, PERF: false, ... }
  const [envTestResults, setEnvTestResults] = useState({}); // { DEV: {ok, version, ...}, ... }

  const handleTestEnv = async (env) => {
    if (!env.url) {
      setEnvTestResults(p => ({ ...p, [env.key]: { ok: false, error: 'URL is required' } }));
      return;
    }
    setEnvTesting(p => ({ ...p, [env.key]: true }));
    setEnvTestResults(p => ({ ...p, [env.key]: null }));
    try {
      const res = await api.testConnection(env.url, env.token);
      setEnvTestResults(p => ({ ...p, [env.key]: res }));
    } catch (e) {
      setEnvTestResults(p => ({ ...p, [env.key]: { ok: false, error: e.message } }));
    }
    setEnvTesting(p => ({ ...p, [env.key]: false }));
  };

  /* ── Environments ── */
  const [envs, setEnvs] = useState(() => loadEnvs() || DEFAULT_ENVS);
  const [expandedEnv, setExpandedEnv] = useState(null);
  const [envSaved, envFlash] = useSavedFlash();

  const updateEnv = (key, field, value) => {
    setEnvs((prev) => prev.map((e) => (e.key === key ? { ...e, [field]: value } : e)));
  };
  const handleSaveEnv = (key) => {
    saveEnvs(envs);
    envFlash();
  };

  /* ── LLM ── */
  const [llm, setLlm] = useState(() => loadLlm() || { provider: 'None', apiKey: '', model: '' });
  const [llmSaved, llmFlash] = useSavedFlash();

  const handleProviderChange = (provider) => {
    const models = LLM_MODELS[provider] || [];
    setLlm({ provider, apiKey: llm.apiKey, model: models[0] || '' });
  };
  const handleSaveLlm = () => {
    saveLlm(llm);
    llmFlash();
  };

  return (
    <div style={s.page}>
      <h1 style={s.title}>{'\u2699\uFE0F'} Settings</h1>

      {/* ── Section 1: Environments (with built-in test) ── */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>
          {'\uD83C\uDF10'} Environments
          {envSaved}
        </h2>

        {envs.map((env) => {
          const open = expandedEnv === env.key;
          return (
            <div key={env.key} style={s.envCard}>
              <div style={s.envHeader} onClick={() => setExpandedEnv(open ? null : env.key)}>
                <div style={s.envDot(env.color)} />
                <span style={s.envName}>{env.label}</span>
                {env.url && <span style={{ fontSize: 12, color: C.muted }}>{env.url}</span>}
                <button style={s.toggle}>{open ? '\u25B2 Collapse' : '\u25BC Edit'}</button>
              </div>

              {open && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={s.label}>URL</label>
                    <StyledInput type="text" placeholder="https://grafana-dev.example.com"
                      value={env.url} onChange={(e) => updateEnv(env.key, 'url', e.target.value)} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>Token</label>
                    <StyledInput type="password" placeholder="glsa_..."
                      value={env.token} onChange={(e) => updateEnv(env.key, 'token', e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={s.btn} onClick={() => handleSaveEnv(env.key)}>Save</button>
                    <button style={{ ...s.btnOutline, opacity: envTesting[env.key] ? 0.6 : 1 }}
                      disabled={envTesting[env.key]}
                      onClick={() => handleTestEnv(env)}>
                      {envTesting[env.key] ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  {envTestResults[env.key] && (
                    <div style={s.resultBox}>
                      {envTestResults[env.key].ok ? (
                        <div>
                          <span style={{ color: C.green, fontWeight: 700 }}>{'\u2714'} Connected</span>
                          <div style={{ marginTop: 8, color: C.muted, fontSize: 13 }}>
                            Version: <span style={{ color: C.text }}>{envTestResults[env.key].version}</span>
                            {' \u00B7 '}User: <span style={{ color: C.text }}>{envTestResults[env.key].user}</span>
                            {' \u00B7 '}{envTestResults[env.key].ms}ms
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: C.red }}>{'\u2718'} {envTestResults[env.key].error || 'Connection failed'}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Section 3: LLM / AI ── */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>
          {'\uD83E\uDD16'} LLM Analysis (AI)
          {llmSaved}
        </h2>

        <div style={s.row}>
          <div style={s.col}>
            <label style={s.label}>Provider</label>
            <select style={s.select} value={llm.provider}
              onChange={(e) => handleProviderChange(e.target.value)}>
              {Object.keys(LLM_MODELS).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={s.col}>
            <label style={s.label}>API Key</label>
            <StyledInput type="password" placeholder={llm.provider === 'None' ? 'N/A' : 'sk-...'}
              value={llm.apiKey} disabled={llm.provider === 'None'}
              onChange={(e) => setLlm({ ...llm, apiKey: e.target.value })}
              style={llm.provider === 'None' ? { opacity: 0.4 } : {}} />
          </div>
        </div>

        {llm.provider !== 'None' && (
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Model</label>
            <select style={s.select} value={llm.model}
              onChange={(e) => setLlm({ ...llm, model: e.target.value })}>
              {(LLM_MODELS[llm.provider] || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        <button style={{ ...s.btn, opacity: llm.provider === 'None' ? 0.4 : 1 }}
          disabled={llm.provider === 'None'} onClick={handleSaveLlm}>
          Save
        </button>
      </div>
    </div>
  );
}
