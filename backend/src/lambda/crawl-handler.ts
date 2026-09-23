import "dotenv/config";

import { crawlAndSave, getTodayJST, isWeekendJST } from "../main";
import { createAdminClient } from "../db/supabase";

export interface CrawlLambdaEvent {
  force?: boolean;
  dryRun?: boolean;
}

export interface CrawlLambdaResult {
  status: "saved" | "stale" | "partial";
  date: string;
  source: "ohaasa" | "gogo";
  readyCount?: number;
}

/** Lambda에서는 process.exit를 사용하지 않고 상태 머신이 판별할 결과를 반환한다. */
export async function handler(event: CrawlLambdaEvent = {}): Promise<CrawlLambdaResult> {
  const date = getTodayJST();
  const source = isWeekendJST(date) ? "gogo" : "ohaasa";
  const supabase = createAdminClient();
  const saved = await crawlAndSave(
    supabase,
    event.dryRun === true,
    event.force === true,
  );

  if (!saved) return { status: "stale", date, source };
  if (event.dryRun === true) return { status: "saved", date, source };

  const { data, error } = await supabase
    .from("horoscopes")
    .select("zodiac_sign, advice_ko")
    .eq("date", date);
  if (error) throw new Error(`[lambda] Failed to verify saved rows: ${error.message}`);

  const rows = (data ?? []) as Array<{ zodiac_sign: string; advice_ko: string | null }>;
  const uniqueSigns = new Set(rows.map((row) => row.zodiac_sign));
  const readyCount = rows.filter((row) => Boolean(row.advice_ko)).length;
  const ready = rows.length === 12 && uniqueSigns.size === 12 && readyCount === 12;

  return { status: ready ? "saved" : "partial", date, source, readyCount };
}
