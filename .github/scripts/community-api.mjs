/** Never print request headers, response bodies, device IDs or API keys. */
export function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}
export async function database(path, { method = 'GET', body, prefer } = {}, request = fetch, env = required) {
  const response = await request(`${env('SUPABASE_URL').replace(/\/$/, '')}/rest/v1/${path}`, {
    method,
    headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    // Safe diagnostics only: no query parameters, response messages or request bodies.
    let code = '';
    try {
      const error = await response.json();
      if (typeof error.code === 'string' && /^(?:[A-Z0-9]{5}|PGRST[0-9]{3})$/.test(error.code)) code = `; code=${error.code}`;
    } catch { /* Non-JSON proxy errors must remain safe to report. */ }
    const resource = path.split(/[?/]/)[0];
    const label = /^[a-z_]+$/.test(resource) ? resource : 'resource';
    throw new Error(`Database ${method} ${label} failed (${response.status}${code})`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
