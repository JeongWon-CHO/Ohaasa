// dotenv는 가장 먼저 로드해야 한다.
// db/supabase.ts의 createAdminClient()가 process.env를 참조하기 때문.
import "dotenv/config";

import { fetchJson } from "./crawler/fetcher";
import { parse, type HoroscopeEntry } from "./crawler/parser";
import { createAdminClient } from "./db/supabase";
import { sendNotifications } from "./notifications/sender";
import { pollReceipts } from "./notifications/receipt-poller";
import { translateAdvice } from "./translator/translate";

// ============================================================
// Types
// ============================================================

type SupabaseClient = ReturnType<typeof createAdminClient>;

interface HoroscopeUpsertRow extends HoroscopeEntry {
  advice_ko: string | null;
}

// ============================================================
// Translation step
// ============================================================

/**
 * DB에서 기존 번역을 조회해 재번역 방지 로직을 적용한 후 각 entry에
 * advice_ko를 붙여 반환한다.
 *
 * 재번역 skip 조건 (둘 다 만족해야 함):
 *   1. 동일 (date, zodiac_sign) row가 이미 존재
 *   2. 기존 advice === 새 advice (원문이 바뀌지 않음)
 *   3. 기존 advice_ko IS NOT NULL (이미 번역 완료)
 *
 * 하나라도 다르면 GPT를 재호출한다.
 */
async function attachTranslations(
  supabase: SupabaseClient,
  entries: HoroscopeEntry[]
): Promise<HoroscopeUpsertRow[]> {
  const date = entries[0].date;

  // 오늘 날짜의 기존 row 조회
  const { data: existingRows, error: queryError } = await supabase
    .from("horoscopes")
    .select("zodiac_sign, advice, advice_ko")
    .eq("date", date);

  if (queryError) {
    console.warn(
      `[translator] Failed to query existing rows: ${queryError.message}. Translating all entries.`
    );
  }

  type ExistingRow = { zodiac_sign: string; advice: string; advice_ko: string | null };
  const existingMap = new Map<string, ExistingRow>(
    (existingRows ?? []).map((r: ExistingRow) => [r.zodiac_sign, r])
  );

  const results: HoroscopeUpsertRow[] = [];

  for (const entry of entries) {
    const existing = existingMap.get(entry.zodiac_sign);
    const canSkip =
      existing !== undefined &&
      existing.advice === entry.advice &&
      existing.advice_ko !== null;

    if (canSkip) {
      console.log(`[translator] ${entry.zodiac_sign}: skip (same advice, already translated)`);
      results.push({ ...entry, advice_ko: existing.advice_ko });
      continue;
    }

    const label = existing
      ? `${entry.zodiac_sign}: re-translating (advice changed or advice_ko missing)`
      : `${entry.zodiac_sign}: translating (new entry)`;
    console.log(`[translator] ${label}`);

    const advice_ko = await translateAdvice(entry.advice);
    if (advice_ko === null) {
      console.warn(`[translator] ${entry.zodiac_sign}: translation failed, advice_ko=null`);
    }
    results.push({ ...entry, advice_ko });
  }

  return results;
}

// ============================================================
// Pipeline steps
// ============================================================

async function crawlAndSave(
  supabase: SupabaseClient,
  isDryRun: boolean
): Promise<void> {
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

  const date   = entries[0].date;
  const sorted = [...entries].sort((a, b) => a.rank - b.rank);

  console.log(`[main] Parsed ${entries.length} entries  date=${date}`);
  for (const e of sorted) {
    const preview = e.advice.split("\n")[0];
    console.log(
      `  ${String(e.rank).padStart(2)}. ${e.zodiac_name.padEnd(6)} (${e.zodiac_sign.padEnd(11)})  ${preview}`
    );
  }

  if (isDryRun) {
    console.log("[crawl] dry-run: translation and upsert skipped");
    return;
  }

  // Translation step — 실패해도 파이프라인은 계속 진행 (advice_ko=null로 upsert)
  const rows = await attachTranslations(supabase, entries);

  const { error } = await supabase
    .from("horoscopes")
    .upsert(rows, { onConflict: "date,zodiac_sign" });

  if (error) {
    throw new Error(`[upsert] ${error.message}`);
  }

  const translated = rows.filter((r) => r.advice_ko !== null).length;
  console.log(
    `[main] ✓ Upserted ${rows.length} rows  date=${date}  translated=${translated}/${rows.length}`
  );
}

// ============================================================
// Main
// ============================================================

// POLL_DELAY_MS 환경변수로 대기 시간을 조정한다.
// 기본값: 15분 (Expo 권장). 로컬 테스트 시 POLL_DELAY_MS=0 으로 단축 가능.
const POLL_DELAY_MS = Number(process.env.POLL_DELAY_MS ?? 15 * 60 * 1000);

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    console.log("[main] ========== DRY RUN ==========");
  }

  const supabase = createAdminClient();

  // ----------------------------------------------------------
  // Step 1: Crawl, translate, and save
  // 실패해도 계속 진행한다 — 기존 DB 데이터로 알림 발송을 시도한다.
  // ----------------------------------------------------------
  let crawlFailed = false;
  try {
    await crawlAndSave(supabase, isDryRun);
  } catch (err) {
    console.error(
      `[main] Crawl failed: ${err instanceof Error ? err.message : String(err)}`
    );
    crawlFailed = true;
  }

  // ----------------------------------------------------------
  // Step 2: Send notifications
  // ----------------------------------------------------------
  let notifyFailed = false;
  let receiptIds:      string[]           = [];
  let receiptTokenMap: Record<string, string> = {};

  try {
    const result = await sendNotifications(supabase, isDryRun);
    console.log(
      `[main] ✓ Notifications: ${result.succeeded}/${result.total} sent` +
      `  date=${result.date}  failed=${result.failed}  disabled=${result.disabled}`
    );
    receiptIds      = result.receiptIds;
    receiptTokenMap = result.receiptTokenMap;
  } catch (err) {
    console.error(
      `[main] Notification failed: ${err instanceof Error ? err.message : String(err)}`
    );
    notifyFailed = true;
  }

  // ----------------------------------------------------------
  // Step 3: Poll push receipts
  // dry-run 또는 발송 실패 시에는 skip. receipt polling 실패는 exit(1) 하지 않는다.
  // ----------------------------------------------------------
  if (!isDryRun && !notifyFailed && receiptIds.length > 0) {
    if (POLL_DELAY_MS > 0) {
      const mins = Math.round(POLL_DELAY_MS / 60000);
      console.log(`[main] Waiting ${mins} min for Expo to process receipts...`);
      await sleep(POLL_DELAY_MS);
    }
    try {
      await pollReceipts(supabase, receiptIds, receiptTokenMap);
    } catch (err) {
      console.warn(
        `[main] Receipt polling error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ----------------------------------------------------------
  // Exit code policy:
  //   notify 실패 → exit(1)  (crawl 결과 무관)
  //   crawl만 실패 → exit(0), warning
  //   둘 다 성공  → exit(0)
  // ----------------------------------------------------------
  if (crawlFailed) {
    console.warn(
      "[main] WARN: crawl failed; notifications used existing DB data"
    );
  }
  if (notifyFailed) {
    console.error(
      crawlFailed
        ? "[main] Fatal: both crawl and notification failed"
        : "[main] Fatal: notification failed"
    );
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
