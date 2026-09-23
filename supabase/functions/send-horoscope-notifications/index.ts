import { createClient } from "npm:@supabase/supabase-js@2";

const NOTIFICATION_TYPE = "daily_horoscope";
const DEVICE_PAGE_SIZE = 500;
const EXPO_CHUNK_SIZE = 100;

interface RequestBody {
  date: string;
  scheduled_time: string;
  dry_run?: boolean;
}

interface DeviceRow {
  device_id: string;
  push_token: string;
  zodiac_sign: string;
}

interface HoroscopeRow {
  zodiac_sign: string;
  advice_ko: string;
}

const ZODIAC_NAME: Record<string, string> = {
  aries: "양자리", taurus: "황소자리", gemini: "쌍둥이자리", cancer: "게자리",
  leo: "사자자리", virgo: "처녀자리", libra: "천칭자리", scorpio: "전갈자리",
  sagittarius: "사수자리", capricorn: "염소자리", aquarius: "물병자리", pisces: "물고기자리",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isValidInput(body: Partial<RequestBody>): body is RequestBody {
  return /^\d{4}-\d{2}-\d{2}$/.test(body.date ?? "")
    && /^(0[6-9]:(00|30)|10:00)$/.test(body.scheduled_time ?? "");
}

function firstLine(text: string): string {
  const line = text.split("\n")[0] ?? "";
  return line.length <= 150 ? line : `${line.slice(0, 149)}…`;
}

Deno.serve(async (request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("OHAASA_SERVICE_ROLE_KEY")
    ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server configuration is incomplete" }, 500);
  }

  if (request.headers.get("Authorization") !== `Bearer ${serviceRoleKey}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: Partial<RequestBody>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!isValidInput(body)) {
    return json({ error: "Invalid date or scheduled_time" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const date = body.date;
  const scheduledTime = body.scheduled_time;
  const dryRun = body.dry_run === true;
  let succeeded = 0;
  let failed = 0;
  let disabled = 0;

  const finish = async (status: string, metadata: Record<string, unknown> = {}) => {
    const { error } = await supabase.rpc("finish_notification_batch", {
      p_notification_type: NOTIFICATION_TYPE,
      p_date: date,
      p_scheduled_time: scheduledTime,
      p_status: status,
      p_succeeded_count: succeeded,
      p_failed_count: failed,
      p_metadata: metadata,
    });
    if (error) console.error(`[notify] Failed to finish batch: ${error.message}`);
  };

  if (!dryRun) {
    const { data: claimed, error } = await supabase.rpc("claim_notification_batch", {
      p_notification_type: NOTIFICATION_TYPE,
      p_date: date,
      p_scheduled_time: scheduledTime,
    });
    if (error) return json({ error: `Batch claim failed: ${error.message}` }, 500);
    if (claimed !== true) {
      return json({ status: "already_claimed", date, scheduled_time: scheduledTime });
    }
  }

  const { data: horoscopeData, error: horoscopeError } = await supabase
    .from("horoscopes")
    .select("zodiac_sign, advice_ko")
    .eq("date", date);

  const horoscopeRows = (horoscopeData ?? []) as HoroscopeRow[];
  const uniqueSigns = new Set(horoscopeRows.map((row) => row.zodiac_sign));
  const ready = !horoscopeError
    && horoscopeRows.length === 12
    && uniqueSigns.size === 12
    && horoscopeRows.every((row) => Boolean(row.advice_ko));

  if (!ready) {
    if (!dryRun) {
      await finish("deferred", {
        reason: horoscopeError ? "query_failed" : "horoscopes_not_ready",
        row_count: horoscopeRows.length,
      });
    }
    return json({ status: "deferred", date, row_count: horoscopeRows.length }, 409);
  }

  const horoscopeMap = new Map(
    horoscopeRows.map((row) => [row.zodiac_sign, row.advice_ko]),
  );

  if (dryRun) {
    const { count, error } = await supabase
      .from("user_devices")
      .select("device_id", { count: "exact", head: true })
      .eq("notifications_enabled", true)
      .eq("notification_time", scheduledTime)
      .not("push_token", "is", null);
    if (error) return json({ error: error.message }, 500);
    return json({ status: "dry_run", date, scheduled_time: scheduledTime, candidates: count ?? 0 });
  }

  let afterDeviceId: string | null = null;
  try {
    while (true) {
      const claimedAt = new Date().toISOString();
      const { data, error } = await supabase.rpc("claim_daily_horoscope_devices", {
        p_scheduled_time: scheduledTime,
        p_notification_date: date,
        p_claimed_at: claimedAt,
        p_after_device_id: afterDeviceId,
        p_limit: DEVICE_PAGE_SIZE,
      });
      if (error) throw new Error(`Device claim failed: ${error.message}`);

      const devices = (data ?? []) as DeviceRow[];
      if (devices.length === 0) break;
      afterDeviceId = devices[devices.length - 1].device_id;

      for (let offset = 0; offset < devices.length; offset += EXPO_CHUNK_SIZE) {
        const chunk = devices.slice(offset, offset + EXPO_CHUNK_SIZE);
        const retryIds: string[] = [];
        const messages: Array<Record<string, unknown>> = [];
        const messageDevices: DeviceRow[] = [];
        const invalidIds: string[] = [];

        for (const device of chunk) {
          const advice = horoscopeMap.get(device.zodiac_sign);
          if (!advice) {
            retryIds.push(device.device_id);
            failed++;
            continue;
          }
          if (!/^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/.test(device.push_token)) {
            invalidIds.push(device.device_id);
            disabled++;
            continue;
          }
          messages.push({
            to: device.push_token,
            sound: "default",
            title: `${ZODIAC_NAME[device.zodiac_sign] ?? device.zodiac_sign} 오늘의 운세`,
            body: firstLine(advice),
            data: { zodiac_sign: device.zodiac_sign, date },
          });
          messageDevices.push(device);
        }

        if (invalidIds.length > 0) {
          const { error } = await supabase
            .from("user_devices")
            .update({ notifications_enabled: false })
            .in("device_id", invalidIds);
          if (error) console.error(`[notify] Failed to disable invalid devices: ${error.message}`);
        }

        if (messages.length > 0) {
          try {
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(messages),
              signal: AbortSignal.timeout(30_000),
            });
            if (!response.ok) throw new Error(`Expo HTTP ${response.status}`);
            const payload = await response.json() as {
              data?: Array<{ status: "ok" | "error"; details?: { error?: string } }>;
            };
            const tickets = payload.data ?? [];
            if (tickets.length !== messageDevices.length) {
              throw new Error("Expo ticket count mismatch");
            }

            tickets.forEach((ticket, index) => {
              const device = messageDevices[index];
              if (ticket.status === "ok") {
                succeeded++;
              } else if (ticket.details?.error === "DeviceNotRegistered") {
                invalidIds.push(device.device_id);
                disabled++;
              } else {
                retryIds.push(device.device_id);
                failed++;
              }
            });

            if (invalidIds.length > 0) {
              const { error } = await supabase
                .from("user_devices")
                .update({ notifications_enabled: false })
                .in("device_id", invalidIds);
              if (error) console.error(`[notify] Failed to disable devices: ${error.message}`);
            }
          } catch (error) {
            retryIds.push(...messageDevices.map((device) => device.device_id));
            failed += messageDevices.length;
            console.error(`[notify] Expo request failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        if (retryIds.length > 0) {
          const { error } = await supabase.rpc("rollback_daily_horoscope_devices", {
            p_device_ids: [...new Set(retryIds)],
            p_claimed_at: claimedAt,
          });
          if (error) throw new Error(`Claim rollback failed: ${error.message}`);
        }
      }

      if (devices.length < DEVICE_PAGE_SIZE) break;
    }
  } catch (error) {
    await finish("failed", {
      error: error instanceof Error ? error.message.slice(0, 500) : "unknown_error",
    });
    return json({ status: "failed", date, scheduled_time: scheduledTime }, 500);
  }

  const status = failed > 0 ? "partial" : "succeeded";
  await finish(status, { disabled });
  return json(
    { status, date, scheduled_time: scheduledTime, succeeded, failed, disabled },
    failed > 0 ? 500 : 200,
  );
});
