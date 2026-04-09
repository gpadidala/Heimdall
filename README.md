# GrafanaProbe v2 — Enterprise Grafana Testing Platform

Production-grade testing platform for Grafana with **22 test categories**, **dependency graph engine**, **live query profiler**, **AI failure analysis**, and a **React dashboard UI**.

**by Gopal Rao**

---

## Quick Start

```bash
git clone https://github.com/gpadidala/grafana-k6-ui-tester.git
cd grafana-probe

# Backend
cd backend
npm install
cp ../.env.example .env    # Edit with your Grafana URL + token
npm run dev                # Starts on http://localhost:4000

# Frontend (new terminal)
cd frontend
npm install
npm start                  # Opens http://localhost:3001
```

## Docker

```bash
export GRAFANA_URL=http://your-grafana:3000
export GRAFANA_API_TOKEN=glsa_xxx
docker-compose up --build
# App at http://localhost:4000

# With test Grafana
docker-compose --profile with-grafana up --build
```

## CLI

```bash
cd backend
node src/cli.js run --url http://grafana:3000 --token glsa_xxx
node src/cli.js smoke --url http://grafana:3000 --token glsa_xxx
node src/cli.js plugin-updates --url http://grafana:3000 --token glsa_xxx
```

## 22 Test Categories

| # | Icon | Category | What it tests |
|---|------|----------|---------------|
| 1 | 💚 | API Health | Connectivity, auth, p50/p95 latency, build info |
| 2 | 🔌 | Data Sources | Health per DS, type-aware queries, config |
| 3 | 📁 | Folders | Hierarchy, permissions, distribution |
| 4 | 📊 | Dashboards | Panels, deprecated types, variables, permissions |
| 5 | 🔲 | Panels | Query execution, DS refs, library panels |
| 6 | 🔔 | Alerts | Rules, contacts, policies, chain trace |
| 7 | 🧩 | Plugins | Signatures, health, versions, Angular |
| 8 | 📦 | App Plugins | Settings, health, dashboards |
| 9 | 👥 | Users & Access | Users, orgs, teams, SAs, security scorecard |
| 10 | 🔗 | Links | URL checks, internal refs, snapshots |
| 11 | 📝 | Annotations | Volume, orphans, integrity, burst detection |
| 12 | ⏱️ | Query Latency | Live query profiling, slow detection |
| 13 | 🔒 | Config Audit | Edition, anonymous access, auth, toggles |
| 14 | 📄 | Provisioning | Drift detection, version count |
| 15 | 🕐 | Data Freshness | Stale data detection |
| 16 | 📈 | Capacity Planning | Density, DS load, alert eval cost |
| 17 | ☸️ | K8s Dashboards | K8s discovery, vars, deprecated metrics |
| 18 | 🔄 | Plugin Upgrade | Impact analysis, risk score |
| 19 | 🏢 | Multi-Org | Per-org health, DS, dashboards |
| 20 | 🔍 | Baseline Regression | Compare runs, detect regressions |
| 21 | 🚀 | Post-Deployment | Deployment-type aware testing |
| 22 | 🔔 | Alert Pipeline E2E | Full chain verification |

## Tech Stack

- **Frontend**: React 18, React Router 6, Recharts, Socket.IO
- **Backend**: Node.js, Express, Socket.IO, sql.js (SQLite)
- **Logging**: Winston (structured JSON)
- **Deploy**: Docker multi-stage, docker-compose

## Author

**Gopal Rao** — [github.com/gpadidala](https://github.com/gpadidala)

## License

MIT
