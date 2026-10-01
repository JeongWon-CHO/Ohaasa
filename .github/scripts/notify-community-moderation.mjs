import { database, required } from './community-api.mjs';

export async function notifyModeration(db = database, send = sendEmail, now = new Date()) {
  const events = await db('community_moderation_events?select=id,source,target_kind,reason,body_snapshot,created_at&status=eq.pending&notified_at=is.null&order=created_at.asc&limit=100');
  for (const event of events) {
    await send(event);
    await db(`community_moderation_events?id=eq.${event.id}&notified_at=is.null`, {
      method: 'PATCH', body: { notified_at: now.toISOString() },
    });
  }
  // Repeated reminders protect against an email being read but left unresolved.
  const cutoff = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
  const lastNotificationCutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const newlyNotified = new Set(events.map(event => event.id));
  const overdue = await db(`community_moderation_events?select=id,source,target_kind,reason,body_snapshot,created_at&status=eq.pending&notified_at=lt.${encodeURIComponent(lastNotificationCutoff)}&created_at=lt.${encodeURIComponent(cutoff)}&order=notified_at.asc&limit=100`);
  let reminded = 0;
  for (const event of overdue) {
    if (newlyNotified.has(event.id)) continue;
    await send(event, true);
    await db(`community_moderation_events?id=eq.${event.id}&status=eq.pending`, {
      method: 'PATCH', body: { notified_at: now.toISOString() },
    });
    reminded++;
  }
  const retentionCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await db(`community_moderation_events?status=neq.pending&resolved_at=lt.${encodeURIComponent(retentionCutoff)}`, { method: 'DELETE' });
  return { notified: events.length, reminded };
}

let lastSendStartedAt = 0;
async function sendEmail(event, reminder = false) {
  // Leave headroom for provider limits and other requests using the same account.
  const wait = Math.max(0, lastSendStartedAt + 600 - Date.now());
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  lastSendStartedAt = Date.now();
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${required('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': reminder ? `community-reminder-${event.id}-${new Date().toISOString().slice(0, 13)}` : `community-${event.id}`,
    },
    body: JSON.stringify({
      from: required('MODERATION_EMAIL_FROM'), to: [required('MODERATION_EMAIL_TO')],
      subject: `[오하아사] ${reminder ? '12시간 이상 미처리' : '새 신고·차단'} — 24시간 내 검토 필요`,
      text: `접수 ID: ${event.id}\n접수 시각: ${event.created_at}\n유형: ${event.source} / ${event.target_kind}\n사유: ${event.reason}\n\n콘텐츠:\n${event.body_snapshot}\n\nSupabase Dashboard의 community_moderation_events에서 검토하세요. 위반이면 remove_and_ban, 위반이 아니면 dismiss로 처리하세요. 개인 차단은 위반 확정이 아닙니다.`,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Moderation email failed (${response.status})`);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try { console.log(await notifyModeration()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
