import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidTranslation, translateMezamashiText } from "./translator";
import { fetchJson } from "./fetcher";
import { parse, type MezamashiEntry } from "./parser";

export const TRANSLATED_FIELDS = [
  "advice",
  "lucky_point",
  "lucky_color",
  "extra_advice",
  "lucky_person",
  "lucky_menu",
] as const;
export type MezamashiRow = MezamashiEntry & {
  [K in (typeof TRANSLATED_FIELDS)[number] as `${K}_ko`]: string | null;
};

export async function translateEntries(
  entries: MezamashiEntry[],
  existing: MezamashiRow[] = [],
  translate = translateMezamashiText,
): Promise<MezamashiRow[]> {
  const rows: MezamashiRow[] = [];
  const cache = new Map<string, string | null>();
  for (const entry of entries) {
    const previous = existing.find(
      (row) => row.date === entry.date && row.zodiac_sign === entry.zodiac_sign,
    );
    const translations = {} as Pick<
      MezamashiRow,
      `${(typeof TRANSLATED_FIELDS)[number]}_ko`
    >;
    for (const field of TRANSLATED_FIELDS) {
      const key = `${field}_ko` as const;
      const original = entry[field];
      const saved = previous?.[key];
      if (!original) translations[key] = null;
      else if (
        previous?.[field] === original &&
        isValidTranslation(field, original, saved)
      )
        translations[key] = saved;
      else {
        const cacheKey = `${field}:${original}`;
        if (!cache.has(cacheKey)) {
          const result = await translate(original, `mezamashi ${field}`);
          cache.set(
            cacheKey,
            isValidTranslation(field, original, result) ? result : null,
          );
        }
        translations[key] = cache.get(cacheKey) ?? null;
      }
    }
    rows.push({ ...entry, ...translations });
  }
  return rows;
}

/** 기존 horoscopes, 알림 및 스케줄러와 독립된 수동 수집 경로. */
export async function collectAndSave(
  supabase: SupabaseClient,
  today: string,
  input?: unknown,
): Promise<{ status: "saved" | "stale"; date: string; count: number }> {
  const result = parse(input ?? (await fetchJson()));
  if (result.date !== today)
    return { status: "stale", date: result.date, count: 0 };

  const { data, error } = await supabase
    .from("mezamashi_horoscopes")
    .select("*")
    .eq("date", result.date);
  if (error)
    throw new Error(`[mezamashi] Existing rows query failed: ${error.message}`);
  const rows = await translateEntries(
    result.entries,
    (data ?? []) as MezamashiRow[],
  );
  const { error: saveError } = await supabase
    .from("mezamashi_horoscopes")
    .upsert(rows, { onConflict: "date,zodiac_sign" });
  if (saveError)
    throw new Error(`[mezamashi] Save failed: ${saveError.message}`);
  return { status: "saved", date: result.date, count: rows.length };
}
