// cheerio 의존성 없음 — JSON API 응답을 직접 변환한다.
import type { HoroscopeApiResponse } from "./fetcher";

// ============================================================
// Output Type
// ============================================================

export interface HoroscopeEntry {
  date: string;        // 'YYYY-MM-DD'
  zodiac_sign: string; // 'aries' | 'taurus' | ...
  zodiac_name: string; // 'おひつじ座' | 'おうし座' | ...
  rank: number;        // 1 ~ 12
  advice: string;      // 탭 문자를 \n으로 정규화한 조언 텍스트
}

// ============================================================
// Constants
// ============================================================

// horoscope_st (황도 12궁 번호, zero-padded) → English key + 일본어명
// 검증됨: 실제 API 응답의 horoscope_st 값과 HTML 클래스명의 zodiac_sign이 일치
const ZODIAC_MAP: Record<string, { sign: string; name: string }> = {
  "01": { sign: "aries",       name: "おひつじ座" },
  "02": { sign: "taurus",      name: "おうし座"   },
  "03": { sign: "gemini",      name: "ふたご座"   },
  "04": { sign: "cancer",      name: "かに座"     },
  "05": { sign: "leo",         name: "しし座"     },
  "06": { sign: "virgo",       name: "おとめ座"   },
  "07": { sign: "libra",       name: "てんびん座" },
  "08": { sign: "scorpio",     name: "さそり座"   },
  "09": { sign: "sagittarius", name: "いて座"     },
  "10": { sign: "capricorn",   name: "やぎ座"     },
  "11": { sign: "aquarius",    name: "みずがめ座" },
  "12": { sign: "pisces",      name: "うお座"     },
};

// ============================================================
// Internal helpers
// ============================================================

/**
 * "20260428" → "2026-04-28"
 * 8자리 YYYYMMDD 형식이 아니면 에러를 던진다.
 */
function parseDate(raw: string): string {
  const s = String(raw).trim();

  if (!/^\d{8}$/.test(s)) {
    throw new Error(
      `[parser] Invalid onair_date format: "${s}" (expected 8-digit YYYYMMDD)`
    );
  }

  const year  = s.slice(0, 4);
  const month = s.slice(4, 6);
  const day   = s.slice(6, 8);

  // 기본 날짜 유효성 검사 (예: 20261332 같은 값 거부)
  const dt = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (isNaN(dt.getTime())) {
    throw new Error(`[parser] onair_date is not a valid calendar date: "${s}"`);
  }

  return `${year}-${month}-${day}`;
}

/**
 * advice 텍스트 정규화.
 * API 응답의 horoscope_text는 문장 구분자로 탭(\t)을 사용한다.
 * trailing 탭으로 생기는 빈 줄도 제거한다.
 */
function normalizeAdvice(raw: string): string {
  return raw
    .replace(/\t+/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

// ============================================================
// Public API
// ============================================================

/**
 * open_st 에 대한 처리 방침 (MVP):
 *
 * - "2" = 공개 상태 (정상 케이스)
 * - 그 외 값 = 방송 전/비공개일 가능성 있음
 *
 * 결정: open_st !== "2"이면 경고를 출력하되 저장은 허용한다.
 * 이유: 크롤러가 실행될 때 이미 detail 데이터가 들어있다면 유효한 데이터이며,
 *       open_st의 다른 값 의미를 아직 완전히 파악하지 못했기 때문에
 *       저장을 막는 것보다 경고 후 진행하는 것이 서비스 연속성에 유리하다.
 *       단, detail이 비어있는 경우는 아래 검증에서 별도로 에러 처리된다.
 */
export function parse(data: HoroscopeApiResponse): HoroscopeEntry[] {
  // open_st 확인
  if (String(data.open_st) !== "2") {
    console.warn(
      `[parser] open_st is "${data.open_st}" (expected "2"). ` +
      `Data may not be fully published yet. Proceeding anyway.`
    );
  }

  // onair_date 변환
  const date = parseDate(data.onair_date);

  // detail 개수 검증
  if (!Array.isArray(data.detail) || data.detail.length !== 12) {
    throw new Error(
      `[parser] Expected exactly 12 detail entries, got ${
        Array.isArray(data.detail) ? data.detail.length : typeof data.detail
      }`
    );
  }

  // 각 항목 변환
  const entries: HoroscopeEntry[] = data.detail.map((item, idx) => {
    // ranking_no 검증
    const rank = Number(item.ranking_no);
    if (!Number.isInteger(rank) || rank < 1 || rank > 12) {
      throw new Error(
        `[parser] detail[${idx}]: invalid ranking_no "${item.ranking_no}"`
      );
    }

    // horoscope_st 검증 및 매핑
    const zodiac = ZODIAC_MAP[item.horoscope_st];
    if (!zodiac) {
      throw new Error(
        `[parser] detail[${idx}]: unknown horoscope_st "${item.horoscope_st}"`
      );
    }

    // horoscope_text 검증 및 정규화
    const advice = normalizeAdvice(item.horoscope_text ?? "");
    if (!advice) {
      throw new Error(
        `[parser] detail[${idx}]: empty horoscope_text for ranking_no "${item.ranking_no}"`
      );
    }

    return {
      date,
      rank,
      zodiac_sign: zodiac.sign,
      zodiac_name: zodiac.name,
      advice,
    };
  });

  // rank 중복 검증
  const ranks = entries.map((e) => e.rank);
  const dupRanks = ranks.filter((r, i) => ranks.indexOf(r) !== i);
  if (dupRanks.length > 0) {
    throw new Error(`[parser] Duplicate ranks detected: ${[...new Set(dupRanks)].join(", ")}`);
  }

  // zodiac_sign 중복 검증
  const signs = entries.map((e) => e.zodiac_sign);
  const dupSigns = signs.filter((s, i) => signs.indexOf(s) !== i);
  if (dupSigns.length > 0) {
    throw new Error(`[parser] Duplicate zodiac_signs detected: ${[...new Set(dupSigns)].join(", ")}`);
  }

  return entries;
}
