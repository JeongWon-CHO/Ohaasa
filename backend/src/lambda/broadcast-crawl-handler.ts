import "dotenv/config";
import { createAdminClient } from "../db/supabase";
import { collectAndSave as collectGogo } from "../gogo/pipeline";
import { collectAndSave as collectMezamashi } from "../mezamashi/pipeline";
import { fetchJson } from "../mezamashi/fetcher";
import { parse } from "../mezamashi/parser";

export interface BroadcastCrawlEvent {
  dryRun?: boolean;
}

/** 방송별 조회용 수집만 수행한다. 알림 발송기/상태 머신은 호출하지 않는다. */
export async function handler(event: BroadcastCrawlEvent = {}) {
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const supabase = createAdminClient();
  // 각 소스를 별도로 기다려 한쪽 실패가 다른 쪽 수집을 막지 않도록 한다.
  const results = await Promise.allSettled([
    collectGogo(supabase, today, { dryRun: event.dryRun === true }),
    (async () => {
      if (event.dryRun === true) {
        const result = parse(await fetchJson());
        return {
          status: result.date === today ? "dry_run" : "stale",
          date: result.date,
          count: result.date === today ? result.entries.length : 0,
        };
      }
      return collectMezamashi(supabase, today);
    })(),
  ]);
  const report = results.map((result, index) => ({
    source: index === 0 ? "gogo" : "mezamashi",
    ...(result.status === "fulfilled"
      ? result.value
      : { status: "failed", date: today, count: 0 }),
  }));
  // 에러 원문에는 외부 응답/설정값이 섞일 수 있어 상태만 기록한다.
  console.log(
    "[broadcast-crawl]",
    JSON.stringify({ date: today, results: report }),
  );
  if (results.every((result) => result.status === "rejected"))
    throw new Error("[broadcast-crawl] Both sources failed");
  return { date: today, results: report };
}
