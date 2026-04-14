const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

async function request(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  return res.json();
}

export const api = {
  health: () => request('GET', '/api/health'),
  config: () => request('GET', '/api/config'),
  testConnection: (grafanaUrl, token) => request('POST', '/api/test-connection', { grafanaUrl, token }),
  listDatasources: (grafanaUrl, token) => {
    const qs = new URLSearchParams();
    if (grafanaUrl) qs.set('grafanaUrl', grafanaUrl);
    if (token) qs.set('token', token);
    return request('GET', `/api/datasources?${qs.toString()}`);
  },
  getDatasourceImpact: (uid, grafanaUrl, token) => {
    const qs = new URLSearchParams();
    if (grafanaUrl) qs.set('grafanaUrl', grafanaUrl);
    if (token) qs.set('token', token);
    return request('GET', `/api/datasources/${encodeURIComponent(uid)}/impact?${qs.toString()}`);
  },
  getCategories: () => request('GET', '/api/tests/categories'),
  runTests: (body) => request('POST', '/api/tests/run', body),
  runCategory: (id, body) => request('POST', `/api/tests/run-category/${id}`, body),
  getReports: () => request('GET', '/api/reports'),
  getReport: (file) => request('GET', `/api/reports/${file}`),
  deleteReport: (id) => request('DELETE', `/api/reports/${id}`),
  deleteAllReports: () => request('DELETE', '/api/reports'),
  getHtmlReportUrl: (file) => `${API}/api/reports/html/${file}`,

  // DSUD Snapshots
  listSnapshots: () => request('GET', '/api/snapshots'),
  getSnapshot: (id) => request('GET', `/api/snapshots/${id}`),
  createSnapshot: (body) => request('POST', '/api/snapshots', body),
  deleteSnapshot: (id) => request('DELETE', `/api/snapshots/${id}`),
  createDiff: (baselineId, currentId) => request('POST', '/api/snapshots/diff', { baselineId, currentId }),
  getDiff: (id) => request('GET', `/api/snapshots/diff/${id}`),
  listDiffs: () => request('GET', '/api/snapshots/diff'),
  acknowledgeDiffItem: (diffId, itemId) => request('POST', `/api/snapshots/diff/${diffId}/items/${itemId}/ack`),
  getSnapshotDashboard: (snapshotId, uid) => request('GET', `/api/snapshots/${snapshotId}/dashboards/${uid}`),
  getSnapshotStorageInfo: () => request('GET', '/api/snapshots/storage-info'),

  // Dashboard screenshot bundles — full-page PNGs for every matched
  // dashboard, packaged as a single zip for offline reference.
  captureDashboardScreenshots: (body) =>
    request('POST', '/api/screenshots/dashboards', body),
  listScreenshotBundles: () =>
    request('GET', '/api/screenshots/bundles'),
  getScreenshotBundle: (id) =>
    request('GET', `/api/screenshots/bundles/${encodeURIComponent(id)}`),
  deleteScreenshotBundle: (id) =>
    request('DELETE', `/api/screenshots/bundles/${encodeURIComponent(id)}`),
  screenshotDownloadUrl: (id) =>
    `/api/screenshots/bundles/${encodeURIComponent(id)}/download`,
  screenshotPreviewUrl: (id, uid) =>
    `/api/screenshots/bundles/${encodeURIComponent(id)}/dashboards/${encodeURIComponent(uid)}.png`,

  // Plugins (Plugin Validation page)
  // opts: { includeCore, includeEmbedded } — both default to true so callers
  // see every installed plugin (core + embedded + external). Pass false to
  // narrow the list for the Plugin Validation page.
  listInstalledPlugins: (grafanaUrl, token, opts = {}) => {
    const qs = new URLSearchParams();
    if (grafanaUrl) qs.set('grafanaUrl', grafanaUrl);
    if (token) qs.set('token', token);
    if (opts.includeCore === false) qs.set('includeCore', '0');
    if (opts.includeEmbedded === false) qs.set('includeEmbedded', '0');
    return request('GET', `/api/plugins/installed?${qs.toString()}`);
  },
  getPluginUpdateInfo: (id, grafanaUrl, token) => {
    const qs = new URLSearchParams();
    if (grafanaUrl) qs.set('grafanaUrl', grafanaUrl);
    if (token) qs.set('token', token);
    return request('GET', `/api/plugins/${encodeURIComponent(id)}/update-info?${qs.toString()}`);
  },
  getPluginImpact: (id, grafanaUrl, token) => {
    const qs = new URLSearchParams();
    if (grafanaUrl) qs.set('grafanaUrl', grafanaUrl);
    if (token) qs.set('token', token);
    return request('GET', `/api/plugins/${encodeURIComponent(id)}/impact?${qs.toString()}`);
  },
  validatePlugin: (id, body) => request('POST', `/api/plugins/${encodeURIComponent(id)}/validate`, body),

  // Email
  getEmailConfig: () => request('GET', '/api/email/config'),
  saveEmailConfig: (cfg) => request('POST', '/api/email/config', cfg),
  sendTestEmail: (to) => request('POST', '/api/email/test', { to }),
  notifyFailure: (body) => request('POST', '/api/email/notify-failure', body),
};

export const API_BASE = API;
export default api;
