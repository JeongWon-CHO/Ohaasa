// Chat Completions를 사용하는 이유:
// Responses API는 상태 유지·내장 도구 기반 에이전트용으로 설계됐습니다.
// 단순 1회성 텍스트 번역에는 chat.completions.create()가 더 단순하고
// 응답 파싱이 명확합니다.

import OpenAI from "openai";

// ============================================================
// Constants
// ============================================================

const SYSTEM_PROMPT = `당신은 일본어 별자리 운세 문장을 한국어 운세 앱 문체로 번역하는 전문가입니다.
다음 규칙을 반드시 지켜주세요:
1. 원문의 의미를 정확하게 전달하세요. 없는 내용을 추가하거나 의미를 바꾸지 마세요.
2. 자연스러운 한국어 존댓말로 작성하세요 (예: ~입니다, ~하세요, ~됩니다, ~보세요).
3. 직역투를 피하고 한국어 운세 앱에서 자연스럽게 읽히는 부드러운 문체로 다듬어 주세요.
4. 원문에 줄바꿈이 있으면 그대로 유지하세요.
5. 번역 결과 텍스트만 출력하고, 설명이나 주석을 붙이지 마세요.
6. 한자(漢字)를 포함한 일본어·중국어 문자는 절대 사용하지 마세요. 한국어 단어로 완전히 대체하세요.
7. 영어는 흐름상 자연스럽게 어울리는 감탄·표현(예: "So Good!", "Lucky!")에 한해 최소한으로만 허용합니다. 영어가 없어도 자연스러운 문장에는 영어를 억지로 넣지 마세요.`;

// ============================================================
// Client (lazy init)
// ============================================================

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!_client) {
    _client = new OpenAI();
  }
  return _client;
}

function getModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

// ============================================================
// Validation
// ============================================================

/**
 * 번역 결과에 히라가나·가타카나·CJK 한자가 포함되어 있으면 true를 반환한다.
 * - 히라가나 ぀-ゟ / 가타카나 ゠-ヿ
 * - CJK 한자  㐀-䶿, 一-鿿
 */
export function containsJapanese(text: string): boolean {
  return /[぀-ヿ㐀-䶿一-鿿]/.test(text);
}

/** containsJapanese(text) 가 true일 때 매칭된 문자들을 반환한다. */
function extractJapaneseChars(text: string): string {
  const matches = text.match(/[぀-ヿ㐀-䶿一-鿿]+/g);
  return matches ? matches.join("") : "";
}

// ============================================================
// Public API
// ============================================================

/**
 * 일본어 운세 문장을 한국어로 번역한다.
 * 번역 결과에 일본어/한자가 남아 있으면 1회 재번역한다.
 * 재번역 후에도 오염이 남으면 warning 로그를 남기고 retried 결과를 반환한다.
 * 실패하거나 OPENAI_API_KEY가 없으면 null을 반환한다.
 * 파이프라인을 중단하는 예외는 throw하지 않는다.
 *
 * @param adviceJa  번역할 일본어 원문
 * @param label     로그 식별자 (zodiac_sign 등). 생략 시 "unknown"
 */
export async function translateAdvice(
  adviceJa: string,
  label = "unknown",
): Promise<string | null> {
  const client = getClient();

  if (!client) {
    return null;
  }

  const model = getModel();

  // ── 1차 번역 ─────────────────────────────────────────────────
  let translated: string | null;
  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `다음 일본어 별자리 운세 문장을 한국어로 번역해주세요:\n\n${adviceJa}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      console.warn(`[translator] ${label}: GPT returned empty response`);
      return null;
    }
    translated = text;
  } catch (err) {
    console.warn(
      `[translator] ${label}: GPT call failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }

  // 1차 결과 검증 — 이상 없으면 바로 반환
  if (!containsJapanese(translated)) {
    return translated;
  }

  // ── 재번역 (1회) ──────────────────────────────────────────────
  console.warn(
    `[translator] ${label}: Japanese characters detected, retrying — "${extractJapaneseChars(translated)}"`
  );

  let retried: string | null;
  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `이전 번역에 일본어/한자 문자가 남아 있습니다. ` +
            `모든 한자·일본어 표현을 한국어 한글 표현으로 바꿔 다시 번역하세요.\n\n` +
            `원문:\n${adviceJa}\n\n` +
            `이전 번역 (수정 필요):\n${translated}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      console.warn(`[translator] ${label}: retry GPT returned empty response`);
      return translated; // 원래 결과라도 반환
    }
    retried = text;
  } catch (err) {
    console.warn(
      `[translator] ${label}: retry GPT call failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return translated; // 원래 결과라도 반환
  }

  // 재번역 결과 검증
  if (containsJapanese(retried)) {
    console.warn(
      `[translator] ${label}: non-Korean characters remained after retry — "${extractJapaneseChars(retried)}"`
    );
  }

  return retried;
}
