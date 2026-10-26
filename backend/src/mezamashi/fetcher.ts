export const SOURCE_URL = "https://www.fujitv.co.jp/meza/uranai/data/uranai.json";

export async function fetchJson(): Promise<unknown> {
  const response = await fetch(SOURCE_URL, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`[mezamashi-fetcher] HTTP ${response.status}`);
  return response.json();
}
