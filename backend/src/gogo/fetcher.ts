export const SOURCE_URL = "https://www.tv-asahi.co.jp/goodmorning/uranai/";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,ko;q=0.9,en-US;q=0.8",
};

/**
 * 고고별자리 운세 페이지의 HTML을 fetch해 문자열로 반환한다.
 *
 * @throws 네트워크 오류, HTTP 에러 시 에러를 던진다.
 */
export async function fetchHtml(): Promise<string> {
  console.log(`[gogo-fetcher] GET ${SOURCE_URL}`);

  let res: Response;
  try {
    res = await fetch(SOURCE_URL, { headers: HEADERS });
  } catch (err) {
    throw new Error(`[gogo-fetcher] Network error: ${(err as Error).message}`);
  }

  console.log(
    `[gogo-fetcher] ${res.status} ${res.statusText}` +
    ` | Content-Type: ${res.headers.get("content-type") ?? "(none)"}`
  );

  if (!res.ok) {
    throw new Error(`[gogo-fetcher] HTTP ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  console.log(`[gogo-fetcher] OK — ${html.length.toLocaleString()} bytes`);
  return html;
}
