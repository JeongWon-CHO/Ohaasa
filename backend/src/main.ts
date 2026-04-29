// dotenv는 가장 먼저 로드해야 한다.
// db/supabase.ts의 createAdminClient()가 process.env를 참조하기 때문.
import "dotenv/config";

import { fetchJson } from "./crawler/fetcher";
import { parse } from "./crawler/parser";
import { createAdminClient } from "./db/supabase";
import { sendNotifications } from "./notifications/sender";

// ============================================================
// Pipeline steps
// ============================================================

async function crawlAndSave(
  supabase: ReturnType<typeof createAdminClient>,
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
    console.log("[crawl] dry-run: upsert skipped");
    return;
  }

  const { error } = await supabase
    .from("horoscopes")
    .upsert(entries, { onConflict: "date,zodiac_sign" });

  if (error) {
    throw new Error(`[upsert] ${error.message}`);
  }

  console.log(`[main] ✓ Upserted ${entries.length} rows  date=${date}`);
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    console.log("[main] ========== DRY RUN ==========");
  }

  const supabase = createAdminClient();

  // ----------------------------------------------------------
  // Step 1: Crawl and save
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
  try {
    const result = await sendNotifications(supabase, isDryRun);
    console.log(
      `[main] ✓ Notifications: ${result.succeeded}/${result.total} sent` +
      `  date=${result.date}  failed=${result.failed}  disabled=${result.disabled}`
    );
  } catch (err) {
    console.error(
      `[main] Notification failed: ${err instanceof Error ? err.message : String(err)}`
    );
    notifyFailed = true;
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
