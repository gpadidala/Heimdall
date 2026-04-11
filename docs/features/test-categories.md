# The 17 Test Categories

Every GrafanaProbe run is a composition of independent category modules. Each category lives in `backend/src/tests/{id}/index.js` and exposes a single `run(client, depGraph, options)` function that returns an array of test results. Categories are opt-in — pick only the ones you care about for each run.

| # | Id | Name | What it tests | Links API |
|---|---|---|---|---|
| 1 | `api-health` | 💚 API Health | Connectivity, auth, `/api/health` latency, build info | ↗ |
| 2 | `datasources` | 🔌 Data Sources | Health per DS, sample query execution, config validation | ↗ |
| 3 | `folders` | 📁 Folders | Hierarchy, permissions, nested folder support | ↗ |
| 4 | `dashboards` | 📊 Dashboards | Load, panel count, DS refs, schema version, owner metadata | ↗ |
| 5 | `panels` | 🔲 Panels | Type validity, deprecated types, library panel resolution | ↗ |
| 6 | `alerts` | 🔔 Alerts | Rules, contact points, notification policies, mute timings | ↗ |
| 7 | `plugins` | 🧩 Plugins | Signature checks, version drift, per-plugin health | ↗ |
| 8 | `app-plugins` | 📦 App Plugins | Installed apps, page routes, configuration | ↗ |
| 9 | `users` | 👥 Users & Access | Org users, teams, service accounts, admin count | ↗ |
| 10 | `links` | 🔗 Links | Internal dashboard links, external URLs, snapshot resolution | ↗ |
| 11 | `annotations` | 📝 Annotations | Orphan annotations, integrity, dashboard-level vs org-level | ↗ |
| 12 | `query-latency` | ⏱️ Query Latency | Live profiling of panel queries, slow-query detection | ↗ |
| 13 | `config-audit` | 🔒 Config Audit | Feature toggles, auth config, CORS, security settings | ↗ |
| 14 | `provisioning` | 📄 Provisioning | Provisioned vs manual dashboards, drift detection | ↗ |
| 15 | `data-freshness` | 🕐 Data Freshness | Stale-data detection, time-range validity | ↗ |
| 16 | `capacity-planning` | 📈 Capacity Planning | Dashboard count, panel density, load distribution | ↗ |
| 17 | `k8s-dashboards` | ☸️ K8s Dashboards | Kubernetes-specific dashboards, cluster/namespace vars | ↗ |

## Running a subset

Via the **Run Tests** page → deselect the ones you don't want. Or via API:

```bash
curl -X POST http://localhost:4000/api/tests/run \
  -H 'Content-Type: application/json' \
  -d '{"categories":["dashboards","alerts","datasources"]}'
```

## Adding a new category

See the stub in `backend/src/tests/_template/index.js` and open a PR — the engine picks it up from `CATEGORIES` in `backend/src/services/testEngine.js`.
