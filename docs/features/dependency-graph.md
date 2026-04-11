# Dependency Graph & Impact Analysis

The dependency graph answers the question every platform engineer asks before a Grafana upgrade: **"If I change X, which Y breaks?"**

## What it tracks

- **Datasources → Dashboards** — which dashboards reference each datasource
- **Datasources → Alert Rules** — which alert rules query each datasource
- **Plugins → Dashboards** — which dashboards use each panel plugin type
- **Folders → Dashboards** — organizational containment
- **Dashboards → Template Variables → Datasources** — indirect references via query variables

## Impact-preview endpoints

```bash
# Which dashboards + alerts depend on this datasource?
curl http://localhost:4000/api/graph/impact/datasource/prometheus-uid
# → { dashboards: [...], alerts: [...], summary: {...} }

# Which dashboards use this panel plugin?
curl http://localhost:4000/api/graph/impact/plugin/grafana-piechart-panel
# → { dashboards: [...], count: 12 }

# Full graph stats
curl http://localhost:4000/api/graph/stats
```

## Exporter-upgrade workflow

1. Pick the datasource you're about to change in **Run Tests → Scope by Datasource**
2. The **Blast Radius** preview shows exactly how many dashboards + alerts will be tested
3. Click **Run Tests** — only the impacted resources are exercised
4. Compare against a pre-upgrade baseline to spot regressions

See [Upgrade Validation](../guides/upgrade-validation.md) for the full playbook.

## UI

**Dashboard → Dependency Graph tab** — interactive visualization with hover for impact counts and click-through to any node.
