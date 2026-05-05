import { Expo } from "expo-server-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import { disableDevices } from "./sender";

// ============================================================
// Types
// ============================================================

export interface PollResult {
  total: number;
  ok: number;
  failed: number;
  disabled: number;
}

// ============================================================
// Public API
// ============================================================

/**
 * Expo Push Receipt API로 최종 발송 결과를 확인한다.
 *
 * receiptTokenMap: sender가 발송 시 구성한 receiptId → pushToken 매핑.
 * Expo Receipt API 응답에 token이 포함되지 않으므로, DeviceNotRegistered 기기
 * 비활성화를 위해 이 매핑을 통해 token을 역추적한다.
 *
 * receipt polling 실패 자체는 throw하지 않는다 — 사후 확인 단계이므로
 * 메인 파이프라인 exit code에 영향을 주지 않는다.
 */
export async function pollReceipts(
  supabase: SupabaseClient,
  receiptIds: string[],
  receiptTokenMap: Record<string, string>
): Promise<PollResult> {
  if (receiptIds.length === 0) {
    return { total: 0, ok: 0, failed: 0, disabled: 0 };
  }

  console.log(`[receipt-poller] Polling ${receiptIds.length} receipt(s)...`);

  const expo   = new Expo();
  const chunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  let ok = 0;
  let failed = 0;
  const tokensToDisable: string[] = [];

  for (const chunk of chunks) {
    let receipts: Awaited<ReturnType<typeof expo.getPushNotificationReceiptsAsync>>;

    try {
      receipts = await expo.getPushNotificationReceiptsAsync(chunk);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[receipt-poller] Failed to fetch receipts chunk: ${msg}`);
      failed += chunk.length;
      continue;
    }

    for (const [receiptId, receipt] of Object.entries(receipts)) {
      if (receipt.status === "ok") {
        ok++;
        continue;
      }

      // status === "error"
      failed++;
      const errCode  = receipt.details?.error;
      const shortId  = receiptId.slice(-8);
      const token    = receiptTokenMap[receiptId];
      const shortTok = token ? `...${token.slice(-8)}` : "(unknown token)";

      switch (errCode) {
        case "DeviceNotRegistered":
          console.warn(
            `[receipt-poller] DeviceNotRegistered  receipt=...${shortId}  token=${shortTok}`
          );
          if (token) tokensToDisable.push(token);
          break;

        case "InvalidCredentials":
          console.error(
            `[receipt-poller] InvalidCredentials  receipt=...${shortId}` +
            " — FCM/APNs 자격증명 문제. 수동 확인 필요."
          );
          break;

        case "MessageTooBig":
          console.warn(
            `[receipt-poller] MessageTooBig  receipt=...${shortId}  token=${shortTok}`
          );
          break;

        case "MessageRateExceeded":
          console.warn(
            `[receipt-poller] MessageRateExceeded  receipt=...${shortId}  token=${shortTok}`
          );
          break;

        default:
          console.warn(
            `[receipt-poller] Error (${errCode ?? "unknown"})  receipt=...${shortId}  token=${shortTok}` +
            (receipt.message ? `: ${receipt.message}` : "")
          );
      }
    }
  }

  await disableDevices(supabase, tokensToDisable);

  const disabled = tokensToDisable.length;

  console.log(
    `[receipt-poller] Summary: total=${receiptIds.length}` +
    `  ok=${ok}  failed=${failed}  disabled=${disabled}`
  );

  return { total: receiptIds.length, ok, failed, disabled };
}
