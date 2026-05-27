import OpenAI from "openai";

import type { GogoEntry } from "./parser";

// ============================================================
// Color mapping table (hardcoded)
// 매핑된 색상은 OPENAI_API_KEY 없이도 한국어 반환.
// 매핑에 없는 색상만 GPT fallback.
// ============================================================

const COLOR_MAP: Record<string, string> = {
  // 한자 색상
  "赤": "빨간색",
  "青": "파란색",
  "黄色": "노란색",
  "黄": "노란색",
  "緑": "초록색",
  "白": "흰색",
  "黒": "검은색",
  "紫": "보라색",
  "茶色": "갈색",
  "茶": "갈색",
  "水色": "하늘색",
  "灰色": "회색",
  "灰": "회색",
  "橙色": "주황색",
  "橙": "주황색",
  "金色": "금색",
  "銀色": "은색",
  "桃色": "분홍색",
  // 카타카나 (loanwords)
  "ゴールド": "금색",
  "シルバー": "은색",
  "グレー": "회색",
  "ピンク": "분홍색",
  "ネイビー": "남색",
  "ベージュ": "베이지색",
  "ラベンダー": "연보라색",
  "オレンジ色": "주황색",
  "オレンジ": "주황색",
  "ブルー": "파란색",
  "イエロー": "노란색",
  "ホワイト": "흰색",
  "ブラック": "검은색",
  "グリーン": "초록색",
  "レッド": "빨간색",
  "パープル": "보라색",
  "ライトブルー": "연파란색",
  "スカイブルー": "하늘색",
  "マリンブルー": "마린 블루",
  "ボルドー": "버건디색",
  "ターコイズ": "청록색",
  "サーモンピンク": "연어핑크색",
};

// ============================================================
// OpenAI client (lazy init — translator/translate.ts와 동일 패턴)
// ============================================================

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_client) _client = new OpenAI();
  return _client;
}

function getModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o";
}

// ============================================================
// Internal helpers
// ============================================================

async function callGPT(
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
  logLabel: string,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: getModel(),
      temperature: 0,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      console.warn(`[gogo-ko] ${logLabel}: GPT returned empty response`);
      return null;
    }
    return text;
  } catch (err) {
    console.warn(
      `[gogo-ko] ${logLabel}: GPT call failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}

async function translateColor(color: string): Promise<string | null> {
  // COLOR_MAP 우선 — API key 없이도 동작
  if (Object.prototype.hasOwnProperty.call(COLOR_MAP, color)) {
    return COLOR_MAP[color];
  }
  // GPT fallback (key 없으면 null)
  if (!getClient()) {
    console.warn(`[gogo-ko] color "${color}": not in COLOR_MAP and no OPENAI_API_KEY, returning null`);
    return null;
  }
  return callGPT(
    "일본어 색상 이름을 한국어로 번역하세요. 색상 이름만 출력하세요.",
    color,
    20,
    `color "${color}"`,
  );
}

async function translateItem(item: string): Promise<string | null> {
  return callGPT(
    "일본어 명사구를 한국어 앱 UI에 표시할 짧고 자연스러운 한국어 명사구로 번역하세요.\n번역된 명사구만 출력하고 설명을 붙이지 마세요.",
    item,
    30,
    `item "${item}"`,
  );
}

// ============================================================
// Public API
// ============================================================

export interface GogoKoEntry {
  zodiac_sign: string;
  lucky_color_ko: string | null;
  lucky_item_ko: string | null;
}

/**
 * GogoEntry 배열을 받아 lucky_color_ko / lucky_item_ko를 번역해 반환한다.
 *
 * - unique 값만 번역해 중복 API 호출을 방지한다.
 * - COLOR_MAP 매핑은 OPENAI_API_KEY 없이도 동작한다.
 * - 개별 번역 실패 시 해당 필드만 null로 두고 계속 진행한다.
 *
 * @returns Map<zodiac_sign, GogoKoEntry>
 */
export async function translateGogoEntries(
  entries: GogoEntry[],
): Promise<Map<string, GogoKoEntry>> {
  const uniqueColors = [...new Set(entries.map((e) => e.lucky_color))];
  const uniqueItems = [...new Set(entries.map((e) => e.lucky_item))];

  const mappedCount = uniqueColors.filter((c) => Object.prototype.hasOwnProperty.call(COLOR_MAP, c)).length;
  const gptColorCount = uniqueColors.length - mappedCount;
  console.log(
    `[gogo-ko] ${uniqueColors.length} unique colors` +
    ` (${mappedCount} mapped, ${gptColorCount} GPT),` +
    ` ${uniqueItems.length} unique items (GPT)`
  );

  // 색상 번역 (unique 값별 1회)
  const colorKoMap = new Map<string, string | null>();
  for (const color of uniqueColors) {
    colorKoMap.set(color, await translateColor(color));
  }

  // 아이템 번역 (unique 값별 1회)
  const itemKoMap = new Map<string, string | null>();
  for (const item of uniqueItems) {
    itemKoMap.set(item, await translateItem(item));
  }

  return new Map(
    entries.map((e) => [
      e.zodiac_sign,
      {
        zodiac_sign: e.zodiac_sign,
        lucky_color_ko: colorKoMap.get(e.lucky_color) ?? null,
        lucky_item_ko: itemKoMap.get(e.lucky_item) ?? null,
      },
    ])
  );
}
