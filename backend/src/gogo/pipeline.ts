import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchHtml } from "./fetcher";
import { parse, type GogoEntry, type GogoParseResult } from "./parser";
import { translateGogoEntries } from "./translator";
import { containsJapanese, translateAdvice } from "../translator/translate";

const SIGN_NAMES: Record<string, string> = {
  aries: "おひつじ座",
  taurus: "おうし座",
  gemini: "ふたご座",
  cancer: "かに座",
  leo: "しし座",
  virgo: "おとめ座",
  libra: "てんびん座",
  scorpio: "さそり座",
  sagittarius: "いて座",
  capricorn: "やぎ座",
  aquarius: "みずがめ座",
  pisces: "うお座",
};
const FIELDS = ["advice", "lucky_color", "lucky_item"] as const;
type Field = (typeof FIELDS)[number];
export type GogoRow = GogoEntry & {
  date: string;
  zodiac_name: string;
  advice_ko: string | null;
  lucky_color_ko: string | null;
  lucky_item_ko: string | null;
};

function validTranslation(value: string | null | undefined): value is string {
  return Boolean(value?.trim()) && !containsJapanese(value!);
}

async function translateField(
  entry: GogoEntry,
  field: Field,
): Promise<string | null> {
  if (field === "advice")
    return translateAdvice(entry.advice, entry.zodiac_sign);
  const values = await translateGogoEntries([entry], {
    includeColors: field === "lucky_color",
    includeItems: field === "lucky_item",
  });
  return values.get(entry.zodiac_sign)?.[`${field}_ko`] ?? null;
}

export async function translateEntries(
  entries: GogoEntry[],
  date: string,
  existing: GogoRow[],
  translate = translateField,
): Promise<GogoRow[]> {
  const cache = new Map<string, string | null>();
  const rows: GogoRow[] = [];
  for (const entry of entries) {
    const previous = existing.find(
      (row) => row.date === date && row.zodiac_sign === entry.zodiac_sign,
    );
    const row: GogoRow = {
      ...entry,
      date,
      zodiac_name: SIGN_NAMES[entry.zodiac_sign],
      advice_ko: null,
      lucky_color_ko: null,
      lucky_item_ko: null,
    };
    for (const field of FIELDS) {
      const key = `${field}_ko` as const;
      const saved = previous?.[key];
      if (previous?.[field] === entry[field] && validTranslation(saved))
        row[key] = saved;
      else {
        const cacheKey = `${field}:${entry[field]}`;
        if (!cache.has(cacheKey)) {
          // 한 항목의 번역 실패가 나머지 별자리의 원문 저장을 막지 않는다.
          let value: string | null = null;
          try {
            value = await translate(entry, field);
          } catch {
            /* 다음 예약에서 재시도 */
          }
          cache.set(cacheKey, validTranslation(value) ? value : null);
        }
        row[key] = cache.get(cacheKey) ?? null;
      }
    }
    rows.push(row);
  }
  return rows;
}

function validate(result: GogoParseResult): void {
  const entries = result.entries;
  if (
    entries.length !== 12 ||
    new Set(entries.map((e) => e.zodiac_sign)).size !== 12 ||
    new Set(entries.map((e) => e.rank)).size !== 12 ||
    entries.some(
      (e) =>
        !Object.hasOwn(SIGN_NAMES, e.zodiac_sign) ||
        !Number.isInteger(e.rank) ||
        e.rank < 1 ||
        e.rank > 12 ||
        FIELDS.some((field) => !e[field]?.trim()) ||
        [e.money_score, e.love_score, e.work_score, e.health_score].some(
          (score) => !Number.isInteger(score) || score < 1 || score > 6,
        ),
    )
  ) {
    throw new Error("[gogo] Incomplete horoscope data");
  }
}

/** 기존 horoscopes에는 쓰지 않는 고고 전용 일일 수집 경로. */
export async function collectAndSave(
  supabase: SupabaseClient,
  today: string,
  options: { dryRun?: boolean; input?: string } = {},
): Promise<{
  status: "saved" | "stale" | "dry_run";
  date: string;
  count: number;
}> {
  const result = parse(
    options.input ?? (await fetchHtml()),
    Number(today.slice(0, 4)),
  );
  validate(result);
  if (result.date !== today)
    return { status: "stale", date: result.date, count: 0 };
  if (options.dryRun)
    return { status: "dry_run", date: result.date, count: 12 };
  const { data, error } = await supabase
    .from("gogo_horoscopes")
    .select("*")
    .eq("date", today);
  if (error) throw new Error("[gogo] Existing rows query failed");
  const rows = await translateEntries(
    result.entries,
    today,
    (data ?? []) as GogoRow[],
  );
  const { error: saveError } = await supabase
    .from("gogo_horoscopes")
    .upsert(rows, { onConflict: "date,zodiac_sign" });
  if (saveError) throw new Error("[gogo] Save failed");
  return { status: "saved", date: result.date, count: rows.length };
}
