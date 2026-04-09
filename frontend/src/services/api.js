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
  getCategories: () => request('GET', '/api/tests/categories'),
  runTests: (body) => request('POST', '/api/tests/run', body),
  runCategory: (id, body) => request('POST', `/api/tests/run-category/${id}`, body),
  getReports: () => request('GET', '/api/reports'),
  getReport: (file) => request('GET', `/api/reports/${file}`),
  deleteReport: (id) => request('DELETE', `/api/reports/${id}`),
  deleteAllReports: () => request('DELETE', '/api/reports'),
  getHtmlReportUrl: (file) => `${API}/api/reports/html/${file}`,
};

export const API_BASE = API;
export default api;
