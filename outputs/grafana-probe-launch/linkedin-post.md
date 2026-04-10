# GrafanaProbe — LinkedIn Launch Copy

Three variants. Pick whichever fits your voice. All are paste-ready.

---

## Variant A — Technical Builder Tone (~340 chars)

Just open-sourced **GrafanaProbe** 🛠️

17 test categories. 3 engines (K6 + Playwright + JMeter). One UI.

Auto-discovers your entire Grafana instance, runs ~7,000 tests in 60s, and tells you exactly what's broken.

Built it because Grafana upgrades break things silently. Now they don't.

⭐ github.com/gpadidala/grafana-k6-ui-tester

#Grafana #Observability #SRE #OpenSource

---

## Variant B — Story / Problem-Solution (~820 chars)

Last quarter, a Grafana plugin upgrade silently broke 14 dashboards in our production stack.

Nobody noticed for 6 hours.

So I built **GrafanaProbe** — an open-source testing platform that auto-discovers every dashboard, panel, datasource, alert, and plugin in your Grafana instance and validates all of them in one click.

It runs 17 test categories across 3 engines (K6 API tests, Playwright browser tests, JMeter load tests) and gives you live progress streaming, clickable Grafana deep-links, AI-powered failure analysis, and a dependency graph that maps the blast radius of any change.

7,177 tests. ~60 seconds. Zero config.

Now I'd never let an upgrade ship without it.

⭐ github.com/gpadidala/grafana-k6-ui-tester

#Grafana #Observability #SRE #DevOps #OpenSource #Monitoring

---

## Variant C — Launch Announcement (~1,420 chars)

🚀 Launching **GrafanaProbe** — an open-source enterprise testing platform for Grafana

After watching one too many Grafana upgrades silently break production dashboards at 3 AM, I built the tool I wished existed.

**What it does:**

✅ 17 test categories — API health, datasources, dashboards, panels, alerts, plugins, K8s dashboards, query latency, capacity planning, and more
✅ 3 test engines in one UI — K6 (API), Playwright (browser E2E), JMeter (performance)
✅ Auto-discovers your entire Grafana instance — no config files, no test scripts to write
✅ Live progress streaming via WebSocket — see every test as it runs
✅ Clickable Grafana deep-links in every report — one click from a failing test to the actual dashboard
✅ AI failure analysis (OpenAI / Claude) — root cause and fix in plain English
✅ Dependency graph — maps every datasource → dashboard → panel → plugin relationship so you can preview the blast radius of any change
✅ Multi-environment support (DEV / PERF / PROD) with cron scheduling
✅ Docker, Podman, Windows, Linux, macOS, CI/CD ready

**Real numbers from a production test run:**
• 7,177 tests across 21 categories
• 108 dashboards inspected
• 1,804 panels validated
• 5,665 dependency edges mapped
• Sub-60s to first results

**Stack:** React + Node.js + SQLite + Socket.IO. MIT licensed.

If you run Grafana in production, please give it a try and tell me what's missing. PRs and issues welcome.

⭐ Star the repo: github.com/gpadidala/grafana-k6-ui-tester
🎬 Demo: clone → ./demo-run.sh → http://localhost:3001

#Grafana #Observability #SRE #DevOps #OpenSource #PlatformEngineering #Monitoring #Kubernetes #AIOps
