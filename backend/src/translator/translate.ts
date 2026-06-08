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
6. 출력에는 한글과 영어(규칙 7 범위 내)만 허용됩니다. 한자·히라가나·가타카나·중국어 문자는 단 한 글자도 절대 출력하지 마세요. 한국어에서도 쓰이는 한자(困·愛·怒 등)라도 예외 없이 한글 단어로만 표현하세요.
7. 영어는 흐름상 자연스럽게 어울리는 감탄·표현(예: "So Good!", "Lucky!")에 한해 최소한으로만 허용합니다. 영어가 없어도 자연스러운 문장에는 영어를 억지로 넣지 마세요.`;

// 3차 시도용: 문체보다 한글 출력 보장을 최우선으로 하는 간소화 프롬프트
const SYSTEM_PROMPT_STRICT = `일본어 문장을 한국어로 번역하세요.
출력 규칙:
- 한글과 영어(감탄 표현 한정)만 출력 가능합니다.
- 한자·히라가나·가타카나는 단 한 글자도 허용되지 않습니다. 한국어 한자(困·愛·怒 등)도 예외 없이 한글 단어로만 쓰세요.
- 번역 결과 텍스트만 출력하세요.`;

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
  return process.env.OPENAI_MODEL ?? "gpt-4o";
}

// ============================================================
// Validation
// ============================================================

const DISALLOWED_JA_HAN_REGEX =
  /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}々〆〇〻ー]/u;

export function containsJapanese(text: string): boolean {
  return DISALLOWED_JA_HAN_REGEX.test(text);
}

/** containsJapanese(text) 가 true일 때 매칭된 문자들을 반환한다. */
function extractJapaneseChars(text: string): string {
  const matches = text.match(
    /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}々〆〇〻ー]+/gu,
  );
  return matches ? matches.join("") : "";
}

// ============================================================
// Public API
// ============================================================

async function callGPT(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  label: string,
): Promise<string | null> {
  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 300,
      messages,
    });
    const text = response.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      console.warn(`[translator] ${label}: GPT returned empty response`);
      return null;
    }
    return text;
  } catch (err) {
    console.warn(
      `[translator] ${label}: GPT call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

/**
 * 일본어 운세 문장을 한국어로 번역한다.
 * 번역 결과에 일본어/한자가 남아 있으면 최대 3회까지 재시도한다.
 * - 2차: 이전 결과를 포함해 재번역 요청
 * - 3차: 한글 출력만 허용하는 간소화 프롬프트로 재시도
 * 3회 모두 실패해도 마지막 결과를 반환한다.
 * OPENAI_API_KEY가 없거나 GPT 호출 자체가 실패하면 null을 반환한다.
 */
export async function translateAdvice(
  adviceJa: string,
  label = "unknown",
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const model = getModel();

  // ── 1차 번역 ──────────────────────────────────────────────────
  const first = await callGPT(
    client, model,
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `다음 일본어 별자리 운세 문장을 한국어로 번역해주세요:\n\n${adviceJa}` },
    ],
    label,
  );
  if (!first) return null;
  if (!containsJapanese(first)) return first;

  // ── 2차 번역 ──────────────────────────────────────────────────
  console.warn(`[translator] ${label}: attempt 1 — Japanese chars detected: "${extractJapaneseChars(first)}"`);

  const second = await callGPT(
    client, model,
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `이전 번역에 일본어/한자 문자가 남아 있습니다. ` +
          `모든 한자·일본어 표현을 한국어 한글 표현으로 바꿔 다시 번역하세요.\n\n` +
          `원문:\n${adviceJa}\n\n` +
          `이전 번역 (수정 필요):\n${first}`,
      },
    ],
    label,
  );
  if (!second) return first;
  if (!containsJapanese(second)) return second;

  // ── 3차 번역 (간소화 프롬프트) ────────────────────────────────
  console.warn(`[translator] ${label}: attempt 2 — Japanese chars detected: "${extractJapaneseChars(second)}"`);

  const third = await callGPT(
    client, model,
    [
      { role: "system", content: SYSTEM_PROMPT_STRICT },
      { role: "user", content: adviceJa },
    ],
    label,
  );
  if (!third) return second;

  if (containsJapanese(third)) {
    console.warn(`[translator] ${label}: attempt 3 — Japanese chars still remain: "${extractJapaneseChars(third)}"`);
  }

  return third;
}

const PLACE_SYSTEM_PROMPT =
  "일본어 장소 명사구를 한국어 운세 앱 UI에 표시할 짧고 자연스러운 한국어 명사구로 번역하세요. " +
  "번역된 명사구만 출력하고 설명을 붙이지 마세요.";

/**
 * "행운의 장소" 명사구를 한국어로 번역한다 (단발성 호출, 재시도 없음).
 * OPENAI_API_KEY가 없거나 GPT 호출이 실패하면 null을 반환한다.
 */
export async function translatePlace(place: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  return callGPT(
    client, getModel(),
    [
      { role: "system", content: PLACE_SYSTEM_PROMPT },
      { role: "user", content: place },
    ],
    `place "${place}"`,
  );
}
