/** Never print request headers, response bodies, device IDs or API keys. */
export function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}
export async function database(path, { method = 'GET', body, prefer } = {}) {
  const response = await fetch(`${required('SUPABASE_URL').replace(/\/$/, '')}/rest/v1/${path}`, {
    method,
    headers: { apikey: required('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${required('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Database request failed (${response.status})`);
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
