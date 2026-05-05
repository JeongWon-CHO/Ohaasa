import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Constants
// ============================================================

const KOREAN_ZODIAC_NAME: Record<string, string> = {
  aries:       "양자리",
  taurus:      "황소자리",
  gemini:      "쌍둥이자리",
  cancer:      "게자리",
  leo:         "사자자리",
  virgo:       "처녀자리",
  libra:       "천칭자리",
  scorpio:     "전갈자리",
  sagittarius: "사수자리",
  capricorn:   "염소자리",
  aquarius:    "물병자리",
  pisces:      "물고기자리",
};

// ============================================================
// Types
// ============================================================

interface DeviceRow {
  push_token: string;
  zodiac_sign: string;
}

interface HoroscopeRow {
  date: string;
  zodiac_sign: string;
  zodiac_name: string;
  rank: number;
  advice: string;
  advice_ko: string | null;
}

export interface NotifyResult {
  date: string;
  total: number;
  succeeded: number;
  failed: number;
  disabled: number;
  receiptIds: string[];
  // receipt polling 시 DeviceNotRegistered 처리를 위해 receiptId → pushToken 매핑을 같이 반환한다.
  // Expo Receipt API 응답에는 token이 포함되지 않으므로, sender 단계에서 미리 구성해 전달한다.
  receiptTokenMap: Record<string, string>;
}

// ============================================================
// Helpers
// ============================================================

function firstLine(text: string, maxLen: number): string {
  const line = text.split("\n")[0] ?? "";
  return line.length <= maxLen ? line : `${line.slice(0, maxLen - 1)}…`;
}

// ============================================================
// DB queries
// ============================================================

/**
 * 2-step 조회: 최신 date를 먼저 확정한 뒤 해당 date의 row만 가져온다.
 * ORDER BY date DESC LIMIT 12로 단일 쿼리하면 최신 날짜가 12개 미만일 때
 * 이전 날짜 row가 섞일 수 있어 이 방식을 사용한다.
 */
async function fetchLatestHoroscopes(
  supabase: SupabaseClient
): Promise<Map<string, HoroscopeRow>> {
  // Step 1: 최신 date 확정
  const { data: dateRow, error: dateError } = await supabase
    .from("horoscopes")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (dateError) {
    throw new Error(`[sender] No horoscope data in DB: ${dateError.message}`);
  }

  const latestDate = (dateRow as { date: string }).date;

  // Step 2: 해당 date의 전체 row 조회
  const { data: rows, error: rowsError } = await supabase
    .from("horoscopes")
    .select("date, zodiac_sign, zodiac_name, rank, advice, advice_ko")
    .eq("date", latestDate);

  if (rowsError) {
    throw new Error(
      `[sender] Failed to fetch horoscopes for ${latestDate}: ${rowsError.message}`
    );
  }

  const horoscopes = (rows ?? []) as HoroscopeRow[];

  // 12개 미만이면 일부 별자리에만 알림이 가는 상황이 되므로 전체 중단
  if (horoscopes.length < 12) {
    throw new Error(
      `[sender] Incomplete horoscopes for ${latestDate}: ` +
      `expected 12, got ${horoscopes.length}. Aborting to avoid partial notifications.`
    );
  }

  console.log(`[sender] Loaded ${horoscopes.length} horoscopes  date=${latestDate}`);

  const map = new Map<string, HoroscopeRow>();
  for (const row of horoscopes) {
    map.set(row.zodiac_sign, row);
  }
  return map;
}

async function fetchActiveDevices(supabase: SupabaseClient): Promise<DeviceRow[]> {
  const { data, error } = await supabase
    .from("user_devices")
    .select("push_token, zodiac_sign")
    .eq("notifications_enabled", true)
    .not("push_token", "is", null);

  if (error) {
    throw new Error(`[sender] Failed to fetch devices: ${error.message}`);
  }

  return (data ?? []) as DeviceRow[];
}

// ============================================================
// Message building
// ============================================================

function buildMessages(
  devices: DeviceRow[],
  horoscopeMap: Map<string, HoroscopeRow>
): { messages: ExpoPushMessage[]; invalidTokens: string[]; skippedZodiac: number } {
  const messages: ExpoPushMessage[] = [];
  const invalidTokens: string[]     = [];
  let skippedZodiac = 0;

  for (const device of devices) {
    // 토큰 형식 검증 — 형식 오류 토큰은 DeviceNotRegistered와 동일하게 disable 처리.
    // 앱이 다음 실행 시 정상 토큰으로 upsert하면 notifications_enabled가 true로 복구된다.
    if (!Expo.isExpoPushToken(device.push_token)) {
      // isExpoPushToken이 `token is ExpoPushToken` 가드이고 ExpoPushToken = string이므로
      // 부정 분기에서 TypeScript가 push_token을 Exclude<string, string> = never로 좁힌다.
      // 실제로는 string이므로 as string으로 복원한다.
      const rawToken = device.push_token as string;
      console.warn(
        `[sender] Invalid push token format, will disable: ${rawToken.slice(0, 24)}...`
      );
      invalidTokens.push(rawToken);
      continue;
    }

    const horoscope = horoscopeMap.get(device.zodiac_sign);
    if (!horoscope) {
      console.warn(
        `[sender] No horoscope for zodiac_sign "${device.zodiac_sign}", skipping device`
      );
      skippedZodiac++;
      continue;
    }

    const koreanName = KOREAN_ZODIAC_NAME[device.zodiac_sign] ?? device.zodiac_sign;

    messages.push({
      to:    device.push_token,
      title: `${koreanName} 오늘의 운세`,
      body:  firstLine(horoscope.advice_ko ?? horoscope.advice, 150),
      data:  { zodiac_sign: device.zodiac_sign, date: horoscope.date },
      sound: "default",
    });
  }

  return { messages, invalidTokens, skippedZodiac };
}

// ============================================================
// Device management
// ============================================================

/**
 * push_token 목록에 해당하는 기기를 비활성화한다.
 * DeviceNotRegistered 처리와 invalid token 처리 양쪽에서 호출된다.
 * 실패해도 throw하지 않는다 — cleanup 작업이므로 메인 파이프라인을 멈추지 않는다.
 */
export async function disableDevices(
  supabase: SupabaseClient,
  pushTokens: string[]
): Promise<void> {
  if (pushTokens.length === 0) return;

  const { error } = await supabase
    .from("user_devices")
    .update({ notifications_enabled: false })
    .in("push_token", pushTokens);

  if (error) {
    console.error(
      `[sender] Failed to disable ${pushTokens.length} device(s): ${error.message}`
    );
  } else {
    console.log(`[sender] Disabled ${pushTokens.length} device(s)`);
  }
}

// ============================================================
// Public API
// ============================================================

export async function sendNotifications(
  supabase: SupabaseClient,
  isDryRun: boolean
): Promise<NotifyResult> {
  const horoscopeMap = await fetchLatestHoroscopes(supabase);
  const devices      = await fetchActiveDevices(supabase);

  console.log(`[sender] Active devices: ${devices.length}`);

  // 최신 운세의 date를 결과에 포함하기 위해 미리 추출
  const date = [...horoscopeMap.values()][0]?.date ?? "unknown";

  if (devices.length === 0) {
    console.log("[sender] No active devices to notify.");
    return { date, total: 0, succeeded: 0, failed: 0, disabled: 0, receiptIds: [], receiptTokenMap: {} };
  }

  const { messages, invalidTokens, skippedZodiac } = buildMessages(devices, horoscopeMap);

  if (skippedZodiac > 0) {
    console.warn(`[sender] Skipped ${skippedZodiac} device(s): no matching horoscope`);
  }

  // ---- DRY RUN ----
  if (isDryRun) {
    if (invalidTokens.length > 0) {
      console.log(`[dry-run] Would disable ${invalidTokens.length} invalid token(s)`);
    }
    console.log(`\n[dry-run] Would send ${messages.length} notification(s):`);
    for (const msg of messages.slice(0, 5)) {
      const token = String(msg.to);
      console.log(
        `  to=${token.slice(0, 32)}...` +
        `  title="${msg.title}"` +
        `  body="${String(msg.body).slice(0, 50)}..."`
      );
    }
    if (messages.length > 5) {
      console.log(`  ... and ${messages.length - 5} more`);
    }
    return {
      date,
      total:           messages.length,
      succeeded:       0,
      failed:          0,
      disabled:        invalidTokens.length,
      receiptIds:      [],
      receiptTokenMap: {},
    };
  }

  // ---- LIVE RUN ----

  // invalid token 기기 비활성화 (발송 전)
  await disableDevices(supabase, invalidTokens);

  if (messages.length === 0) {
    console.log("[sender] No valid messages to send after filtering.");
    return { date, total: 0, succeeded: 0, failed: 0, disabled: invalidTokens.length, receiptIds: [], receiptTokenMap: {} };
  }

  const expo   = new Expo();
  const chunks = expo.chunkPushNotifications(messages);

  let succeeded = 0;
  let failed    = 0;
  const tokensToDisable:  string[]           = [];
  const receiptIds:       string[]           = [];
  const receiptTokenMap:  Record<string, string> = {};

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    let tickets: ExpoPushTicket[];

    try {
      tickets = await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sender] Chunk ${ci + 1}/${chunks.length} HTTP error: ${msg}`);
      failed += chunk.length;
      continue;
    }

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      // chunk[i].to와 tickets[i]는 순서가 동일함을 Expo SDK가 보장한다.
      const to    = chunk[i].to;
      const token = (Array.isArray(to) ? to[0] : to) as string;

      if (ticket.status === "ok") {
        succeeded++;
        receiptIds.push(ticket.id);
        // Expo Receipt API 응답에 token이 없으므로 receipt polling에서 DeviceNotRegistered 처리를
        // 위해 receiptId → token 매핑을 sender 단계에서 미리 구성한다.
        receiptTokenMap[ticket.id] = token;
      } else {
        failed++;
        const errCode = ticket.details?.error;
        if (errCode === "DeviceNotRegistered") {
          tokensToDisable.push(token);
        } else {
          console.warn(
            `[sender] Ticket error (${errCode ?? "unknown"})` +
            ` for ...${token.slice(-8)}: ${ticket.message}`
          );
        }
      }
    }
  }

  // DeviceNotRegistered 기기 비활성화
  await disableDevices(supabase, tokensToDisable);

  console.log(`[sender] Receipt IDs collected: ${receiptIds.length}`);

  return {
    date,
    total:      messages.length,
    succeeded,
    failed,
    disabled:   invalidTokens.length + tokensToDisable.length,
    receiptIds,
    receiptTokenMap,
  };
}
