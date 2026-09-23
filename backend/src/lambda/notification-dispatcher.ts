import "dotenv/config";

const FIRST_SLOT_MINUTES = 6 * 60;
const LAST_SLOT_MINUTES = 10 * 60;
const SLOT_INTERVAL_MINUTES = 30;
const EDGE_TIMEOUT_MS = 240_000;

interface DispatchEvent {
  dryRun?: boolean;
  date?: string;
  throughTime?: string;
}

interface SlotResult {
  scheduledTime: string;
  ok: boolean;
  status: number;
  body: unknown;
}

export interface DispatchResult {
  date: string;
  throughTime: string;
  slots: SlotResult[];
}

function getKstParts(): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

function parseMinutes(time: string): number {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error(`[dispatcher] Invalid time: ${time}`);
  }
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getDueSlots(throughTime: string): string[] {
  const throughMinutes = Math.min(parseMinutes(throughTime), LAST_SLOT_MINUTES);
  if (throughMinutes < FIRST_SLOT_MINUTES) return [];

  const slots: string[] = [];
  for (
    let minute = FIRST_SLOT_MINUTES;
    minute <= throughMinutes;
    minute += SLOT_INTERVAL_MINUTES
  ) {
    slots.push(formatMinutes(minute));
  }
  return slots;
}

export async function handler(event: DispatchEvent = {}): Promise<DispatchResult> {
  const now = getKstParts();
  const date = event.date ?? now.date;
  const throughTime = event.throughTime ?? now.time;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("[dispatcher] Missing Supabase environment variables");
  }

  const slots: SlotResult[] = [];
  for (const scheduledTime of getDueSlots(throughTime)) {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-horoscope-notifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          scheduled_time: scheduledTime,
          dry_run: event.dryRun === true,
        }),
        signal: AbortSignal.timeout(EDGE_TIMEOUT_MS),
      },
    );

    const raw = await response.text();
    let body: unknown = raw;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      // 진단을 위해 JSON이 아닌 응답 원문을 보존한다.
    }

    slots.push({ scheduledTime, ok: response.ok, status: response.status, body });
  }

  const failed = slots.filter((slot) => !slot.ok);
  if (failed.length > 0) {
    throw new Error(
      `[dispatcher] ${failed.length}/${slots.length} slot(s) failed: ` +
      failed.map((slot) => `${slot.scheduledTime}=${slot.status}`).join(", "),
    );
  }

  return { date, throughTime, slots };
}
