// 앱 내 출처 표시용 페이지 URL (fetch 대상이 아님)
export const SOURCE_URL = "https://www.asahi.co.jp/ohaasa/week/horoscope/";

// 실제 데이터 취득 대상: main.min.js가 호출하는 내부 JSON API
const JSON_API_URL = "https://www.asahi.co.jp/data/ohaasa2020/horoscope.json";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, */*",
  "Accept-Language": "ja,ko;q=0.9,en-US;q=0.8",
};

// ============================================================
// API Response Types
// ============================================================

export interface HoroscopeDetailRaw {
  horoscope_detail_id: string;
  horoscope_id: string;
  ranking_no: string;   // "1" ~ "12"
  horoscope_st: string; // "01" ~ "12" (zero-padded)
  horoscope_text: string;
}

export interface HoroscopeApiResponse {
  horoscope_id: string;
  onair_date: string;   // "20260428" 형식 문자열
  open_st: string;      // "2" = 공개 상태
  detail: HoroscopeDetailRaw[];
}

// ============================================================
// Fetch
// ============================================================

/**
 * 오하아사 운세 JSON API를 fetch해 첫 번째 요소를 반환한다.
 *
 * @throws 네트워크 오류, HTTP 에러, JSON 파싱 실패, 빈 응답 시 에러를 던진다.
 */
export async function fetchJson(): Promise<HoroscopeApiResponse> {
  console.log(`[fetcher] GET ${JSON_API_URL}`);

  let res: Response;
  try {
    res = await fetch(JSON_API_URL, { headers: HEADERS });
  } catch (err) {
    throw new Error(`[fetcher] Network error: ${(err as Error).message}`);
  }

  console.log(
    `[fetcher] ${res.status} ${res.statusText}` +
    ` | Content-Type: ${res.headers.get("content-type") ?? "(none)"}`
  );

  if (!res.ok) {
    throw new Error(`[fetcher] HTTP ${res.status} ${res.statusText}`);
  }

  const raw = await res.text();
  console.log(`[fetcher] OK — ${raw.length.toLocaleString()} bytes`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`[fetcher] JSON parse failed: ${(err as Error).message}`);
  }

  // API는 배열을 반환하며 요소가 1개이어야 한다
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      `[fetcher] Unexpected response shape: expected non-empty array, ` +
      `got ${Array.isArray(parsed) ? "empty array" : typeof parsed}`
    );
  }

  return parsed[0] as HoroscopeApiResponse;
}
