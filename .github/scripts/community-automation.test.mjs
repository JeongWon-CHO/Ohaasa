import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seedReviewContent } from './seed-community-review.mjs';
import { notifyModeration } from './notify-community-moderation.mjs';
const env = name => ({ REVIEW_ANSWER_DEVICE_ID: '00000000-0000-4000-8000-000000000001', REVIEW_REPLY_DEVICE_ID: '00000000-0000-4000-8000-000000000002' })[name];

test('sample uses broadcast date, ignores existing rows, and keeps distinct authors', async () => {
  const writes = [];
  const date = await seedReviewContent(async (route, opts) => {
    if (route.startsWith('horoscopes?')) return [{ date: '2026-09-30' }];
    if (route.startsWith('community_bans?')) return [];
    if (opts?.method === 'POST') { writes.push(opts); return null; }
    return [{ id: 'sample-answer', hidden_at: null }];
  }, env);
  assert.equal(date, '2026-09-30');
  assert.equal(writes[0].body.question_date, date);
  assert.notEqual(writes[0].body.device_id, writes[1].body.device_id);
  assert.ok(writes.every(write => write.prefer.includes('ignore-duplicates')));
  assert.ok(writes.every(write => write.body.body.startsWith('[사용 예시]') || write.body.body.startsWith('[댓글 사용 예시]')));
});

test('sample does not restore moderated author or hidden content', async () => {
  let writes = 0;
  await assert.rejects(seedReviewContent(async route => route.startsWith('horoscopes?') ? [{ date: '2026-10-01' }] : [{ device_id: 'banned' }], env), /banned/);
  await assert.rejects(seedReviewContent(async (route, opts) => {
    if (route.startsWith('horoscopes?')) return [{ date: '2026-10-01' }];
    if (route.startsWith('community_bans?')) return [];
    if (opts?.method === 'POST') { writes++; return null; }
    return [{ id: 'a', hidden_at: '2026-10-01' }];
  }, env), /hidden/);
  assert.equal(writes, 1); // ignore-duplicates for answer; never insert a reply to hidden content.
});

test('mail failure leaves event pending for retry; successful delivery records notification', async () => {
  const event = { id: 'event-a', created_at: '2026-10-01T00:00:00Z' };
  const patches = [];
  const db = async (route, opts) => {
    if (opts?.method === 'PATCH') { patches.push(opts.body); return null; }
    return route.includes('notified_at=is.null') ? [event] : [];
  };
  await assert.rejects(notifyModeration(db, async () => { throw new Error('mail unavailable'); }), /mail unavailable/);
  assert.equal(patches.length, 0);
  const result = await notifyModeration(db, async () => {}, new Date('2026-10-01T01:00:00Z'));
  assert.equal(result.notified, 1);
  assert.equal(patches[0].notified_at, '2026-10-01T01:00:00.000Z');
});

test('unresolved older reports receive reminders', async () => {
  const reminders = [];
  const result = await notifyModeration(async (route, opts) => opts?.method ? null : route.includes('notified_at=is.null') ? [] : [{ id: 'old-event' }], async (event, reminder) => reminders.push([event.id, reminder]));
  assert.equal(result.reminded, 1);
  assert.deepEqual(reminders, [['old-event', true]]);
});


test('retention cleanup removes only resolved events older than 90 days', async () => {
  const deletes = [];
  await notifyModeration(async (route, opts) => {
    if (opts?.method === 'DELETE') { deletes.push(route); return null; }
    return [];
  }, async () => {}, new Date('2026-10-01T00:00:00Z'));
  assert.equal(deletes.length, 1);
  assert.ok(deletes[0].includes('status=neq.pending'));
  assert.ok(decodeURIComponent(deletes[0]).includes('resolved_at=lt.2026-07-03T00:00:00.000Z'));
});


test('newly notified old reports do not receive a second email in the same run', async () => {
  const event = { id: 'just-notified', created_at: '2026-09-01T00:00:00Z' };
  const sent = [];
  await notifyModeration(async (_, opts) => opts?.method ? null : [event], async (item, reminder) => sent.push([item.id, Boolean(reminder)]));
  assert.deepEqual(sent, [['just-notified', false]]);
});

test('reminder rotation updates the latest notification time and prioritizes least recently notified', async () => {
  const queries = [];
  const patches = [];
  const now = new Date('2026-10-01T13:00:00Z');
  await notifyModeration(async (route, opts) => {
    if (opts?.method === 'PATCH') { patches.push(opts.body); return null; }
    if (opts?.method) return null;
    queries.push(route);
    return route.includes('notified_at=is.null') ? [] : [{ id: 'old-event' }];
  }, async () => {}, now);
  assert.equal(patches[0].notified_at, now.toISOString());
  assert.ok(queries[1].includes('order=notified_at.asc'));
  assert.ok(decodeURIComponent(queries[1]).includes('notified_at=lt.2026-10-01T12:00:00.000Z'));
});
