import { database } from './community-api.mjs';
const [eventId, action, note] = process.argv.slice(2);
if (!/^[0-9a-f-]{36}$/i.test(eventId ?? '') || !['dismiss', 'remove_and_ban'].includes(action) || !note?.trim()) {
  console.error('Usage: node resolve-community-event.mjs EVENT_UUID dismiss|remove_and_ban "review note"');
  process.exitCode = 1;
} else {
  try {
    await database('rpc/resolve_community_event', { method: 'POST', body: { p_event_id: eventId, p_action: action, p_note: note } });
    console.log('Moderation action recorded');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
