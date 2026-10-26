import {
  containsJapanese,
  translateAdvice,
  translateHoroscopePhrase,
  type HoroscopePhraseKind,
} from "../translator/translate";

const PHRASE_KIND: Record<string, HoroscopePhraseKind> = {
  "mezamashi lucky_color": "color",
  "mezamashi lucky_menu": "food",
  "mezamashi lucky_point": "point",
  "mezamashi lucky_person": "person",
  "mezamashi extra_advice": "action",
};

const COLORS: Record<string, string> = {
  グリーン: "초록색",
  ブラック: "검은색",
  ホワイト: "흰색",
  レッド: "빨간색",
  イエロー: "노란색",
  ピンク: "분홍색",
  パープル: "보라색",
  ライトグリーン: "연두색",
  グレー: "회색",
  ベージュ: "베이지색",
  ライトブルー: "연파란색",
  ブルー: "파란색",
  オレンジ: "주황색",
  ゴールド: "금색",
  シルバー: "은색",
  ネイビー: "남색",
};

export function isValidTranslation(
  field: string,
  original: string,
  translated: string | null | undefined,
): translated is string {
  if (!translated?.trim() || containsJapanese(translated)) return false;
  if (
    /죄송|번역해 드리|제공해 주|처리할 수 없|번역할 수 없|번역 요청|운세 문장|도와드릴|도와드리겠/.test(
      translated,
    )
  )
    return false;
  if (field === "lucky_color" && COLORS[original])
    return translated === COLORS[original];
  if (
    field !== "advice" &&
    translated.length > (field === "lucky_color" ? 20 : 60)
  )
    return false;
  return true;
}

export async function translateMezamashiText(
  text: string,
  label = "mezamashi advice",
): Promise<string | null> {
  if (label === "mezamashi advice") return translateAdvice(text, label);
  if (label === "mezamashi lucky_color" && COLORS[text]) return COLORS[text];
  return translateHoroscopePhrase(text, PHRASE_KIND[label] ?? "point");
}
