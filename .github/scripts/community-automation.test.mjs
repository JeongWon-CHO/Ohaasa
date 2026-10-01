import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seedReviewContent, generateExample } from './seed-community-review.mjs';
import { notifyModeration } from './notify-community-moderation.mjs';
import dailyQuestions from '../../packages/shared/src/constants/dailyQuestions.ts';
const { getQuestionByDate } = dailyQuestions;
const env = name => ({ REVIEW_ANSWER_DEVICE_ID: '00000000-0000-4000-8000-000000000001', REVIEW_REPLY_DEVICE_ID: '00000000-0000-4000-8000-000000000002', OPENAI_API_KEY: 'test-only' })[name];
const generated = { answer: '[AI 예시] 따뜻한 차를 마시며 잠깐 쉬고 싶어요.', reply: '[AI 댓글 예시] 잠깐의 여유가 큰 힘이 되겠네요.' };
const now = new Date('2026-10-01T21:00:00Z'); // Oct 2 06:00 KST
function mockDatabase(latest = '2026-10-01') {
  const answers = new Map();
  const replies = new Map();
  const writes = [];
  const db = async (route, opts) => {
    if (route.startsWith('horoscopes?')) return latest ? [{ date: latest }] : [];
    if (route.startsWith('community_bans?')) return [];
    if (opts?.method === 'POST') {
      writes.push(opts);
      if (route.startsWith('question_answers?')) answers.set(opts.body.question_date, { id: opts.body.question_date, body: opts.body.body, hidden_at: null });
      else replies.set(opts.body.answer_id, { id: 'reply', hidden_at: null });
      return null;
    }
    const date = route.match(/(?:question_date|answer_id)=eq\.([^&]+)/)?.[1];
    const row = (route.startsWith('question_answers?') ? answers : replies).get(date);
    return row ? [row] : [];
  };
  return { db, answers, replies, writes };
}

test('6am prepares the KST calendar date and currently visible broadcast date with matching questions', async () => {
  const state = mockDatabase();
  const questions = [];
  const generate = async question => { questions.push(question); return generated; };
  await seedReviewContent(state.db, env, generate, now);
  assert.deepEqual(questions, [getQuestionByDate('2026-10-02'), getQuestionByDate('2026-10-01')]);
  assert.equal(state.writes.length, 4);
  assert.notEqual(state.writes[0].body.device_id, state.writes[1].body.device_id);
  assert.ok(state.writes.every(write => write.prefer.includes('ignore-duplicates')));
  await seedReviewContent(state.db, env, generate, now);
  assert.equal(questions.length, 2); // Repeated runs do not call the AI.
  assert.equal(state.writes.length, 4);
});

test('same-date and empty horoscope data produce only one pair; default synthetic authors need no secrets', async () => {
  for (const latest of ['2026-10-02', null]) {
    const state = mockDatabase(latest);
    await seedReviewContent(state.db, () => { throw new Error('Missing configuration'); }, async () => generated, now);
    assert.equal(state.writes.length, 2);
    assert.notEqual(state.writes[0].body.device_id, state.writes[1].body.device_id);
  }
});

test('moderated authors, hidden answers and hidden replies are never regenerated', async () => {
  const failGeneration = async () => { throw new Error('must not generate'); };
  await assert.rejects(seedReviewContent(async route => route.startsWith('horoscopes?') ? [{ date: '2026-10-02' }] : [{ device_id: 'banned' }], env, failGeneration, now), /banned/);
  for (const target of ['answer', 'reply']) {
    const state = mockDatabase('2026-10-02');
    state.answers.set('2026-10-02', { id: '2026-10-02', body: 'saved', hidden_at: target === 'answer' ? 'hidden' : null });
    if (target === 'reply') state.replies.set('2026-10-02', { id: 'reply', hidden_at: 'hidden' });
    await assert.rejects(seedReviewContent(state.db, env, failGeneration, now), /hidden/);
    assert.equal(state.writes.length, 0);
  }
});

test('partial previous publication creates only a reply using the existing answer', async () => {
  const state = mockDatabase('2026-10-02');
  state.answers.set('2026-10-02', { id: '2026-10-02', body: 'saved answer', hidden_at: null });
  await seedReviewContent(state.db, env, async (_, body) => { assert.equal(body, 'saved answer'); return generated; }, now);
  assert.equal(state.writes.length, 1);
  assert.equal(state.writes[0].body.answer_id, '2026-10-02');
});

test('dry run and rejected unsafe/oversized generated content never write to the database', async () => {
  const state = mockDatabase('2026-10-02');
  await seedReviewContent(state.db, env, async () => generated, now, true);
  assert.equal(state.writes.length, 0);
  for (const answer of ['[AI 예시] 씨 발', '[AI 예시] ' + '가'.repeat(120), 'unlabelled']) {
    await assert.rejects(seedReviewContent(state.db, env, async () => ({ ...generated, answer }), now));
    assert.equal(state.writes.length, 0);
  }
});

function aiResponse(content, finish = 'stop') {
  return { ok: true, json: async () => ({ choices: [{ finish_reason: finish, message: { content } }] }) };
}
test('AI request uses JSON mode, labels content and contains only the question and synthetic answer', async () => {
  const result = await generateExample('어떤 하루를 보내고 싶나요?', 'saved', env, async (url, opts) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    const request = JSON.parse(opts.body);
    assert.equal(request.response_format.type, 'json_object');
    assert.equal(request.model, 'gpt-5.4-mini');
    assert.deepEqual(JSON.parse(request.messages[1].content), { question: '어떤 하루를 보내고 싶나요?', existingAnswer: 'saved' });
    return aiResponse(JSON.stringify({ answer: '좋아하는 음악을 듣고 싶어요.', reply: '편안한 하루가 되겠네요.' }));
  });
  assert.ok(result.answer.startsWith('[AI 예시]'));
  assert.ok(result.reply.startsWith('[AI 댓글 예시]'));
});

test('invalid or unsafe model output is retried twice at most without logging its content', async () => {
  for (const response of [aiResponse('not JSON'), aiResponse('{}'), aiResponse(JSON.stringify({ answer: '씨 발', reply: '괜찮아요' })), aiResponse('{}', 'length'), { ok: false, status: 429 }]) {
    let calls = 0;
    await assert.rejects(generateExample('question', undefined, env, async () => { calls++; return response; }), /AI/);
    assert.equal(calls, 2);
  }
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
