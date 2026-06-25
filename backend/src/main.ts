// dotenv는 가장 먼저 로드해야 한다.
// db/supabase.ts의 createAdminClient()가 process.env를 참조하기 때문.
import "dotenv/config";

import { fetchJson } from "./crawler/fetcher";
import { parse, type HoroscopeEntry } from "./crawler/parser";
import { createAdminClient } from "./db/supabase";
import { translateAdvice, translatePlace, containsJapanese } from "./translator/translate";
import { fetchHtml as fetchGogoHtml } from "./gogo/fetcher";
import { parse as parseGogo, type GogoEntry } from "./gogo/parser";
import { translateGogoEntries, type GogoKoEntry } from "./gogo/translator";

// ============================================================
// Types
// ============================================================

type SupabaseClient = ReturnType<typeof createAdminClient>;

type HoroscopeSource = "ohaasa" | "gogo";

interface HoroscopeUpsertRow extends HoroscopeEntry {
  advice_ko:      string | null;
  source:         HoroscopeSource;
  lucky_place_ko: string | null;
  lucky_color:    string | null;
  lucky_item:     string | null;
  lucky_color_ko: string | null;
  lucky_item_ko:  string | null;
  money_score:    number | null;
  love_score:     number | null;
  work_score:     number | null;
  health_score:   number | null;
}

// ============================================================
// Constants
// ============================================================

// HoroscopeEntry.zodiac_name 과 일치하는 오하아사 표기 기준 일본어 별자리명.
// 주말 모드에서 고고 데이터로 row를 구성할 때 사용한다.
const ZODIAC_NAME_MAP: Record<string, string> = {
  aries:       "おひつじ座",
  taurus:      "おうし座",
  gemini:      "ふたご座",
  cancer:      "かに座",
  leo:         "しし座",
  virgo:       "おとめ座",
  libra:       "てんびん座",
  scorpio:     "さそり座",
  sagittarius: "いて座",
  capricorn:   "やぎ座",
  aquarius:    "みずがめ座",
  pisces:      "うお座",
};

// ============================================================
// Date helpers
// ============================================================

/** UTC+9 (JST/KST) 기준 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환한다. */
function getTodayJST(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/**
 * "YYYY-MM-DD" 형식의 JST 날짜가 토요일(6) 또는 일요일(0)인지 반환한다.
 * 평일/주말 판단은 오하아사 업데이트 여부가 아닌 JST 요일 기준으로 한다.
 */
function isWeekendJST(today: string): boolean {
  const [y, m, d] = today.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일, 6=토
  return day === 0 || day === 6;
}

// ============================================================
// Translation step (ohaasa advice)
// ============================================================

/**
 * DB에서 기존 번역을 조회해 재번역 방지 로직을 적용한 후 각 entry에
 * advice_ko를 붙여 반환한다. gogo 필드는 null로, source는 'ohaasa'로 초기화한다.
 *
 * 재번역 skip 조건 (모두 만족해야 함):
 *   1. 동일 (date, zodiac_sign) row가 이미 존재
 *   2. 기존 advice === 새 advice (원문이 바뀌지 않음)
 *   3. 기존 advice_ko IS NOT NULL (이미 번역 완료)
 */
async function attachTranslations(
  supabase: SupabaseClient,
  entries: HoroscopeEntry[]
): Promise<HoroscopeUpsertRow[]> {
  const date = entries[0].date;

  const { data: existingRows, error: queryError } = await supabase
    .from("horoscopes")
    .select("zodiac_sign, advice, advice_ko, lucky_place, lucky_place_ko")
    .eq("date", date);

  if (queryError) {
    console.warn(
      `[translator] Failed to query existing rows: ${queryError.message}. Translating all entries.`
    );
  }

  type ExistingRow = {
    zodiac_sign: string;
    advice: string;
    advice_ko: string | null;
    lucky_place: string | null;
    lucky_place_ko: string | null;
  };
  const existingMap = new Map<string, ExistingRow>(
    (existingRows ?? []).map((r: ExistingRow) => [r.zodiac_sign, r])
  );

  const results: HoroscopeUpsertRow[] = [];

  for (const entry of entries) {
    const existing = existingMap.get(entry.zodiac_sign);

    // ── lucky_place_ko (advice 번역과 독립적으로 skip 판단) ──────
    let lucky_place_ko: string | null = null;
    if (entry.lucky_place !== null) {
      const canSkipPlace =
        existing !== undefined &&
        existing.lucky_place === entry.lucky_place &&
        existing.lucky_place_ko !== null &&
        !containsJapanese(existing.lucky_place_ko);

      if (canSkipPlace) {
        lucky_place_ko = existing.lucky_place_ko;
      } else {
        console.log(`[translator] ${entry.zodiac_sign}: translating lucky_place "${entry.lucky_place}"`);
        lucky_place_ko = await translatePlace(entry.lucky_place);
        if (lucky_place_ko === null) {
          console.warn(`[translator] ${entry.zodiac_sign}: lucky_place translation failed, lucky_place_ko=null`);
        }
      }
    }

    const canSkip =
      existing !== undefined &&
      existing.advice === entry.advice &&
      existing.advice_ko !== null &&
      !containsJapanese(existing.advice_ko);

    const nullGogoFields = {
      lucky_color:    null,
      lucky_item:     null,
      lucky_color_ko: null,
      lucky_item_ko:  null,
      money_score:    null,
      love_score:     null,
      work_score:     null,
      health_score:   null,
    } as const;

    if (canSkip) {
      console.log(`[translator] ${entry.zodiac_sign}: skip (same advice, already translated)`);
      results.push({ ...entry, advice_ko: existing.advice_ko, lucky_place_ko, source: "ohaasa", ...nullGogoFields });
      continue;
    }

    const label = existing
      ? `${entry.zodiac_sign}: re-translating (advice changed or advice_ko missing)`
      : `${entry.zodiac_sign}: translating (new entry)`;
    console.log(`[translator] ${label}`);

    const advice_ko = await translateAdvice(entry.advice, entry.zodiac_sign);
    if (advice_ko === null) {
      console.warn(`[translator] ${entry.zodiac_sign}: translation failed, advice_ko=null`);
    }
    results.push({ ...entry, advice_ko, lucky_place_ko, source: "ohaasa", ...nullGogoFields });
  }

  return results;
}

// ============================================================
// Gogo steps
// ============================================================

/**
 * 고고별자리 HTML을 fetch/parse하고 오늘 날짜(JST)와 일치하는 경우에만 entries를 반환한다.
 * 실패 또는 날짜 불일치 시 null을 반환하며, 파이프라인을 중단하지 않는다.
 */
async function fetchGogoEntries(today: string, force = false): Promise<GogoEntry[] | null> {
  try {
    const html   = await fetchGogoHtml();
    const result = parseGogo(html);

    if (result.date !== today) {
      if (!force) {
        console.warn(
          `[gogo] Date mismatch: gogo=${result.date}, today=${today}.` +
          ` Skipping gogo.`
        );
        return null;
      }
      console.warn(
        `[gogo] Date mismatch (force): gogo=${result.date}, today=${today}.` +
        ` Proceeding anyway.`
      );
    }

    console.log(`[gogo] Parsed ${result.entries.length} entries  date=${result.date}`);
    return result.entries;
  } catch (err) {
    console.warn(
      `[gogo] Failed: ${err instanceof Error ? err.message : String(err)}.` +
      ` gogo fields will be null.`
    );
    return null;
  }
}

/**
 * GogoEntry 배열의 lucky_color / lucky_item을 번역한다.
 * 실패 시 null Map을 반환하며, 파이프라인을 중단하지 않는다.
 */
async function fetchGogoKo(
  gogoEntries: GogoEntry[] | null
): Promise<Map<string, GogoKoEntry> | null> {
  if (!gogoEntries) return null;
  try {
    return await translateGogoEntries(gogoEntries);
  } catch (err) {
    console.warn(
      `[gogo-ko] Failed: ${err instanceof Error ? err.message : String(err)}.` +
      ` lucky_color_ko / lucky_item_ko will be null.`
    );
    return null;
  }
}

/**
 * 번역이 붙은 ohaasa rows에 gogo 부가정보(lucky/score 필드)를 병합한다.
 * rank / advice / source 는 ohaasa 기준을 유지한다.
 */
function mergeGogo(
  rows: HoroscopeUpsertRow[],
  gogoEntries: GogoEntry[] | null,
  gogoKoMap:   Map<string, GogoKoEntry> | null,
): HoroscopeUpsertRow[] {
  const gogoMap = gogoEntries
    ? new Map(gogoEntries.map((e) => [e.zodiac_sign, e]))
    : null;

  return rows.map((row) => {
    const gogo   = gogoMap?.get(row.zodiac_sign)   ?? null;
    const gogoKo = gogoKoMap?.get(row.zodiac_sign) ?? null;
    return {
      ...row,
      lucky_color:    gogo?.lucky_color   ?? null,
      lucky_item:     gogo?.lucky_item    ?? null,
      lucky_color_ko: gogoKo?.lucky_color_ko ?? null,
      lucky_item_ko:  gogoKo?.lucky_item_ko  ?? null,
      money_score:    gogo?.money_score   ?? null,
      love_score:     gogo?.love_score    ?? null,
      work_score:     gogo?.work_score    ?? null,
      health_score:   gogo?.health_score  ?? null,
    };
  });
}

// ============================================================
// Weekend mode: gogo as main source
// ============================================================

/**
 * 주말 모드 전용.
 * 고고별자리 entries로 HoroscopeUpsertRow를 구성한다.
 * rank / advice / lucky / score 모두 고고 기준, source = 'gogo'.
 *
 * 재번역 skip 조건:
 *   동일 (date, zodiac_sign, source='gogo') row가 이미 존재하고
 *   advice 원문이 같고 advice_ko가 null이 아닌 경우.
 */
async function buildWeekendRows(
  supabase: SupabaseClient,
  today: string,
  gogoEntries: GogoEntry[],
  gogoKoMap: Map<string, GogoKoEntry> | null,
): Promise<HoroscopeUpsertRow[]> {
  const { data: existingRows, error: queryError } = await supabase
    .from("horoscopes")
    .select("zodiac_sign, advice, advice_ko")
    .eq("date", today)
    .eq("source", "gogo");

  if (queryError) {
    console.warn(
      `[translator] Failed to query existing gogo rows: ${queryError.message}. Translating all entries.`
    );
  }

  type ExistingRow = { zodiac_sign: string; advice: string; advice_ko: string | null };
  const existingMap = new Map<string, ExistingRow>(
    (existingRows ?? []).map((r: ExistingRow) => [r.zodiac_sign, r])
  );

  const rows: HoroscopeUpsertRow[] = [];

  for (const entry of gogoEntries) {
    const existing = existingMap.get(entry.zodiac_sign);
    const canSkip =
      existing !== undefined &&
      existing.advice === entry.advice &&
      existing.advice_ko !== null &&
      !containsJapanese(existing.advice_ko);

    let advice_ko: string | null;
    if (canSkip) {
      console.log(`[translator] ${entry.zodiac_sign}: skip gogo advice (already translated)`);
      advice_ko = existing.advice_ko;
    } else {
      const label = existing
        ? `${entry.zodiac_sign}: re-translating gogo advice (changed or missing)`
        : `${entry.zodiac_sign}: translating gogo advice (new entry)`;
      console.log(`[translator] ${label}`);
      advice_ko = await translateAdvice(entry.advice, entry.zodiac_sign);
      if (advice_ko === null) {
        console.warn(`[translator] ${entry.zodiac_sign}: translation failed, advice_ko=null`);
      }
    }

    const gogoKo = gogoKoMap?.get(entry.zodiac_sign) ?? null;
    rows.push({
      date:           today,
      zodiac_sign:    entry.zodiac_sign,
      zodiac_name:    ZODIAC_NAME_MAP[entry.zodiac_sign] ?? entry.zodiac_sign,
      rank:           entry.rank,
      advice:         entry.advice,
      advice_ko,
      source:         "gogo",
      lucky_place:    null,
      lucky_place_ko: null,
      lucky_color:    entry.lucky_color,
      lucky_item:     entry.lucky_item,
      lucky_color_ko: gogoKo?.lucky_color_ko ?? null,
      lucky_item_ko:  gogoKo?.lucky_item_ko  ?? null,
      money_score:    entry.money_score,
      love_score:     entry.love_score,
      work_score:     entry.work_score,
      health_score:   entry.health_score,
    });
  }

  return rows;
}

// ============================================================
// Dry-run previews
// ============================================================

/** 평일 dry-run: ohaasa rank 순서로 gogo 병합 결과를 출력한다. */
function printGogoPreview(
  sorted:      HoroscopeEntry[],
  gogoEntries: GogoEntry[] | null,
  gogoKoMap:   Map<string, GogoKoEntry> | null,
): void {
  console.log("[crawl] dry-run weekday gogo supplement preview:");
  const gogoMap = gogoEntries
    ? new Map(gogoEntries.map((e) => [e.zodiac_sign, e]))
    : null;

  for (const e of sorted) {
    const g  = gogoMap?.get(e.zodiac_sign);
    const ko = gogoKoMap?.get(e.zodiac_sign);
    if (g) {
      const colorDisplay = ko?.lucky_color_ko
        ? `${g.lucky_color}(${ko.lucky_color_ko})`
        : g.lucky_color;
      const itemDisplay = ko?.lucky_item_ko
        ? `${g.lucky_item}(${ko.lucky_item_ko})`
        : g.lucky_item;
      console.log(
        `  ${e.zodiac_sign.padEnd(12)}` +
        `  color=${colorDisplay}  item=${itemDisplay}` +
        `  money=${g.money_score} love=${g.love_score}` +
        `  work=${g.work_score} health=${g.health_score}`
      );
    } else {
      console.log(`  ${e.zodiac_sign.padEnd(12)}  (gogo: null)`);
    }
  }
}

/** 주말 dry-run: gogo rank 순서로 메인 데이터를 출력한다. */
function printWeekendPreview(
  gogoEntries: GogoEntry[],
  gogoKoMap:   Map<string, GogoKoEntry> | null,
): void {
  console.log("[crawl] dry-run weekend mode — gogo as main source:");
  const sorted = [...gogoEntries].sort((a, b) => a.rank - b.rank);
  for (const e of sorted) {
    const ko = gogoKoMap?.get(e.zodiac_sign);
    const colorDisplay = ko?.lucky_color_ko
      ? `${e.lucky_color}(${ko.lucky_color_ko})`
      : e.lucky_color;
    const itemDisplay = ko?.lucky_item_ko
      ? `${e.lucky_item}(${ko.lucky_item_ko})`
      : e.lucky_item;
    const advicePreview = e.advice.slice(0, 30) + (e.advice.length > 30 ? "…" : "");
    console.log(
      `  ${String(e.rank).padStart(2)}. ${e.zodiac_sign.padEnd(12)}` +
      `  advice="${advicePreview}"` +
      `  color=${colorDisplay}  item=${itemDisplay}` +
      `  money=${e.money_score} love=${e.love_score}` +
      `  work=${e.work_score} health=${e.health_score}`
    );
  }
}

// ============================================================
// Pipeline steps
// ============================================================

/**
 * 크롤/번역/저장을 수행한다.
 *
 * @returns true  → upsert 완료
 *          false → 데이터 미보유로 스킵
 *
 * 모드 결정 (JST 요일 기준):
 *   평일(월~금): 오하아사 메인. ohaasaDate !== today이면 스킵.
 *   주말(토~일): 고고 메인.   gogoDate  !== today이면 스킵.
 */
async function crawlAndSave(
  supabase: SupabaseClient,
  isDryRun: boolean,
  isForce: boolean,
): Promise<boolean> {
  const today   = getTodayJST();
  const weekend = isWeekendJST(today);

  // ── WEEKEND MODE ──────────────────────────────────────────────
  if (weekend) {
    console.log(`[main] Weekend mode  today=${today}`);

    const gogoEntries = await fetchGogoEntries(today, isForce);
    if (!gogoEntries) {
      console.warn(
        `[main] Weekend: no fresh gogo data for today=${today}.` +
        ` Skipping upsert/notification.`
      );
      return false;
    }

    const gogoKoMap = await fetchGogoKo(gogoEntries);

    if (isDryRun) {
      printWeekendPreview(gogoEntries, gogoKoMap);
      console.log("[crawl] dry-run: upsert skipped");
      return true;
    }

    const rows = await buildWeekendRows(supabase, today, gogoEntries, gogoKoMap);

    const { error } = await supabase
      .from("horoscopes")
      .upsert(rows, { onConflict: "date,zodiac_sign" });

    if (error) throw new Error(`[upsert] ${error.message}`);

    const translated = rows.filter((r) => r.advice_ko   !== null).length;
    const withGogoKo = rows.filter((r) => r.lucky_color_ko !== null).length;
    console.log(
      `[main] ✓ Upserted ${rows.length} rows  date=${today}  source=gogo` +
      `  translated=${translated}/${rows.length}` +
      `  gogo-ko=${withGogoKo}/${rows.length}`
    );
    return true;
  }

  // ── WEEKDAY MODE ──────────────────────────────────────────────
  const data    = await fetchJson();
  const entries = parse(data);

  if (entries.length === 0) {
    throw new Error("Parser returned 0 entries");
  }
  if (entries.length < 12) {
    console.warn(
      `[main] Expected 12 entries but got ${entries.length}. Proceeding anyway.`
    );
  }

  const ohaasaDate = entries[0].date;
  const sorted     = [...entries].sort((a, b) => a.rank - b.rank);

  console.log(`[main] Weekday mode  today=${today}  ohaasa=${ohaasaDate}`);
  for (const e of sorted) {
    const preview = e.advice.split("\n")[0];
    console.log(
      `  ${String(e.rank).padStart(2)}. ${e.zodiac_name.padEnd(6)} (${e.zodiac_sign.padEnd(11)})  ${preview}`
    );
  }

  if (ohaasaDate !== today) {
    if (!isForce) {
      console.warn(
        `[main] Weekday but ohaasa date stale (ohaasa=${ohaasaDate}, today=${today}).` +
        ` Skipping upsert/notification.`
      );
      return false;
    }
    console.warn(
      `[main] Weekday ohaasa date stale (force): ohaasa=${ohaasaDate}, today=${today}.` +
      ` Proceeding anyway.`
    );
  }

  // ── Step 2: gogo fetch (best-effort) ──────────────────────────
  const gogoEntries = await fetchGogoEntries(today, isForce);
  const gogoKoMap   = await fetchGogoKo(gogoEntries);

  if (isDryRun) {
    printGogoPreview(sorted, gogoEntries, gogoKoMap);
    console.log("[crawl] dry-run: advice translation, database upsert, notification skipped");
    return true;
  }

  // ── Step 3: advice 번역 ────────────────────────────────────────
  const translatedRows = await attachTranslations(supabase, entries);

  // ── Step 4: gogo 병합 ──────────────────────────────────────────
  const rows = mergeGogo(translatedRows, gogoEntries, gogoKoMap);

  // ── Step 5: upsert ─────────────────────────────────────────────
  const { error } = await supabase
    .from("horoscopes")
    .upsert(rows, { onConflict: "date,zodiac_sign" });

  if (error) throw new Error(`[upsert] ${error.message}`);

  const translated = rows.filter((r) => r.advice_ko    !== null).length;
  const withGogo   = rows.filter((r) => r.lucky_color  !== null).length;
  const withGogoKo = rows.filter((r) => r.lucky_color_ko !== null).length;
  console.log(
    `[main] ✓ Upserted ${rows.length} rows  date=${ohaasaDate}  source=ohaasa` +
    `  translated=${translated}/${rows.length}` +
    `  gogo=${withGogo}/${rows.length}` +
    `  gogo-ko=${withGogoKo}/${rows.length}`
  );
  return true;
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");
  const isForce  = process.argv.includes("--force");

  if (isDryRun) console.log("[main] ========== DRY RUN ==========");
  if (isForce)  console.log("[main] ========== FORCE MODE ==========");

  const supabase = createAdminClient();

  try {
    const upserted = await crawlAndSave(supabase, isDryRun, isForce);
    if (!upserted) {
      console.log("[main] No fresh data today. Skipping.");
      process.exit(2);
    }
  } catch (err) {
    console.error(`[main] Crawl failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// ============================================================
// Entry point
// ============================================================

main().catch((err: Error) => {
  console.error("[main] Unexpected error:", err.message);
  process.exit(1);
});
