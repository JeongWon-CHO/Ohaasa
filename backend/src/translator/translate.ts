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
5. 번역 결과 텍스트만 출력하고, 설명이나 주석을 붙이지 마세요.`;

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
// Public API
// ============================================================

/**
 * 일본어 운세 문장을 한국어로 번역한다.
 * 실패하거나 OPENAI_API_KEY가 없으면 null을 반환한다.
 * 파이프라인을 중단하는 예외는 throw하지 않는다.
 */
export async function translateAdvice(adviceJa: string): Promise<string | null> {
  const client = getClient();

  if (!client) {
    return null;
  }

  const model = getModel();

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
      console.warn("[translator] GPT returned empty response");
      return null;
    }
    return text;
  } catch (err) {
    console.warn(
      `[translator] GPT call failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}
