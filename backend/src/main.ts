// dotenv는 가장 먼저 로드해야 한다.
// db/supabase.ts의 createAdminClient()가 process.env를 참조하기 때문.
import "dotenv/config";

import { fetchJson } from "./crawler/fetcher";
import { parse } from "./crawler/parser";
import type { HoroscopeEntry } from "./crawler/parser";
import { createAdminClient } from "./db/supabase";

// ============================================================
// Pipeline steps
// ============================================================

async function upsertHoroscopes(
  entries: HoroscopeEntry[],
  supabase: ReturnType<typeof createAdminClient>
): Promise<void> {
  // date + zodiac_sign UNIQUE 제약 기준으로 upsert
  // 같은 날짜에 재실행해도 중복 없이 덮어쓴다
  const { error } = await supabase
    .from("horoscopes")
    .upsert(entries, { onConflict: "date,zodiac_sign" });

  if (error) {
    throw new Error(`[upsert] ${error.message}`);
  }
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    console.log("[main] ========== DRY RUN (upsert skipped) ==========");
  }

  // ----------------------------------------------------------
  // Step 1: Fetch
  // ----------------------------------------------------------
  const data = await fetchJson();

  // ----------------------------------------------------------
  // Step 2: Parse
  // ----------------------------------------------------------
  const entries = parse(data);

  if (entries.length === 0) {
    // parser.ts의 검증에서 에러가 나지 않았는데 0건이면 구조 변경 가능성
    console.error("[main] Parser returned 0 entries.");
    process.exit(1);
  }

  if (entries.length < 12) {
    // 12개 미만이면 경고만 출력하고 계속 진행 (부분 저장 허용)
    console.warn(
      `[main] Expected 12 entries but got ${entries.length}. Proceeding anyway.`
    );
  }

  const date = entries[0].date;
  console.log(`[main] Parsed ${entries.length} entries  date=${date}`);

  // 파싱 결과 목록 출력
  const sorted = [...entries].sort((a, b) => a.rank - b.rank);
  for (const e of sorted) {
    const preview = e.advice.split("\n")[0];
    console.log(
      `  ${String(e.rank).padStart(2)}. ${e.zodiac_name.padEnd(6)} (${e.zodiac_sign.padEnd(11)})  ${preview}`
    );
  }

  // ----------------------------------------------------------
  // Step 3: Upsert (dry-run 시 건너뜀)
  // ----------------------------------------------------------
  if (isDryRun) {
    console.log("\n[dry-run] Done. No data was written to Supabase.");
    return;
  }

  const supabase = createAdminClient();
  await upsertHoroscopes(entries, supabase);

  console.log(
    `[main] ✓ Upserted ${entries.length} rows  date=${date}`
  );
}

// ============================================================
// Entry point
// ============================================================

main().catch((err: Error) => {
  console.error("[main] Fatal:", err.message);
  process.exit(1);
});
