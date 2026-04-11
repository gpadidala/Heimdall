# Configuration Reference

All backend configuration lives in `backend/.env`. Frontend configuration (environments, LLM keys, tour state) lives in `localStorage` and is managed via the **Settings** page.

## `backend/.env` — full reference

```env
# ── Grafana connection ────────────────────────────
GRAFANA_URL=http://grafana.example.com     # no trailing slash
GRAFANA_API_TOKEN=glsa_xxxxxxxxxxxxxxxxxx  # service-account token, Admin role
GRAFANA_ORG_ID=1                            # org the token belongs to

# ── Server ────────────────────────────────────────
PORT=4000
NODE_ENV=production

# ── Test retention ────────────────────────────────
MAX_RUNS_PER_ENV=5     # keep last N runs per env, auto-prune older

# ── AI failure analysis (optional) ────────────────
LLM_PROVIDER=openai                           # or: claude
LLM_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
LLM_MODEL=gpt-4o-mini                          # or: claude-sonnet-4-20250514

# ── Notifications (optional) ──────────────────────
SLACK_WEBHOOK_URL=
PAGERDUTY_ROUTING_KEY=

# ── Performance tuning ────────────────────────────
QUERY_TIMEOUT_MS=15000
DASHBOARD_LOAD_TIMEOUT_MS=30000
STALE_DATA_THRESHOLD_MS=900000
SLOW_QUERY_THRESHOLD_MS=5000

# ── Corporate proxy (optional) ────────────────────
HTTP_PROXY=http://proxy.corp.example.com:8080
HTTPS_PROXY=http://proxy.corp.example.com:8080
NO_PROXY=localhost,127.0.0.1
```

## Environments (managed in UI)

Configured via **Settings → 🌐 Environments** (stored in browser localStorage, not `.env`). Each env has its own URL and API token. The active env is selected via the sidebar pills. See [Multi-Environment](../features/environments.md).

## SMTP (managed in UI)

Configured via **Settings → 📧 Email Notifications** (stored in `backend/data/email-config.json`, gitignored). Powers the 📧 buttons on failing test rows.

## Retention

The `MAX_RUNS_PER_ENV` setting automatically prunes older runs after each new run completes, scoped per environment. Set to `0` to disable pruning.
