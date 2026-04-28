import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Debug helper — 키 원문을 출력하지 않고 진단 정보만 출력
// ============================================================

function debugKeyInfo(key: string): void {
  // prefix + length 출력 (원문 노출 없이 어떤 키인지 구분)
  const prefix = key.slice(0, 12);
  console.log(`[supabase] key prefix : ${prefix}...`);
  console.log(`[supabase] key length : ${key.length} chars`);

  // JWT 여부 판별 (eyJ... 형식은 header.payload.signature 구조)
  const parts = key.split(".");
  if (parts.length === 3) {
    // JWT payload = parts[1], base64url 디코딩
    try {
      const padded =
        parts[1].replace(/-/g, "+").replace(/_/g, "/") +
        "=".repeat((4 - (parts[1].length % 4)) % 4);
      const payload = JSON.parse(
        Buffer.from(padded, "base64").toString("utf-8")
      ) as Record<string, unknown>;

      // "role" 클레임: "anon" vs "service_role" 중 어떤 키인지 확인
      console.log(`[supabase] key format : JWT`);
      console.log(`[supabase] key role   : ${payload["role"] ?? "(not found)"}`);
    } catch {
      console.log("[supabase] key format : JWT (payload decode failed)");
    }
  } else {
    // 새 Supabase 키 형식 (sb_publishable_... / sb_secret_...)
    console.log("[supabase] key format : non-JWT (new Supabase key format?)");
  }
}

// ============================================================
// Client factory
// ============================================================

/**
 * service_role 기반 Supabase 관리자 클라이언트를 생성한다.
 *
 * - service_role은 RLS를 우회하므로 반드시 백엔드(서버)에서만 사용해야 한다.
 * - 앱(클라이언트) 코드에서 이 함수를 호출해서는 안 된다.
 * - 환경변수가 누락되면 명확한 메시지와 함께 즉시 에러를 던진다.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 로드 여부 확인 (값 자체는 출력 안 함)
  console.log(`[supabase] SUPABASE_URL loaded             : ${!!url}`);
  console.log(`[supabase] SUPABASE_SERVICE_ROLE_KEY loaded: ${!!key}`);

  if (!url) {
    throw new Error("[supabase] Missing environment variable: SUPABASE_URL");
  }
  if (!key) {
    throw new Error(
      "[supabase] Missing environment variable: SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  debugKeyInfo(key);

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
