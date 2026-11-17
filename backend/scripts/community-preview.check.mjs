// Explicit node:test suite; kept separate from the backend's Vitest file discovery.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { COMMUNITY_EXAMPLE_PROMPT } from './community-prompt.mjs';
import { generateExample, seedReviewContent } from '../../.github/scripts/seed-community-review.mjs';
import { runPreview } from './community-preview.mjs';

test('actual generation request includes all three writing sources in one call and accepts brief content', async () => {
  for (const [tag, path] of [
    ['writing_rules', '../prompts/community-writing.md'],
    ['good_examples', '../skills/ohaasa-community-writing/references/good-examples.md'],
    ['review_examples', '../skills/ohaasa-community-writing/references/bad-examples.md'],
  ]) {
    assert.ok(COMMUNITY_EXAMPLE_PROMPT.includes(`<${tag}>\n${readFileSync(new URL(path, import.meta.url), 'utf8')}\n</${tag}>`));
  }
  let calls = 0;
  const result = await generateExample('카페를 만든다면?', '회사', () => 'test-only', async (_, options) => {
    calls++;
    const request = JSON.parse(options.body);
    assert.equal(request.messages[0].content, COMMUNITY_EXAMPLE_PROMPT);
    assert.deepEqual(JSON.parse(request.messages[1].content), { question: '카페를 만든다면?', existingAnswer: '회사', variation: { avoidRepeating: ['바다'], avoidRepeatingReplies: ['그거 좋네'] } });
    return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ answer: '집', reply: '22' }) } }] }) };
  }, { avoidRepeating: ['바다'], avoidRepeatingReplies: ['그거 좋네'] });
  assert.equal(calls, 1);
  assert.deepEqual(result, { answer: '집', reply: '22' });
});

test('preview needs no database configuration and passes the prior answers and existing answer', async () => {
  const writes = [];
  const inputs = [];
  const samples = await runPreview(['질문', '--count', '2', '--answer', '기존 글'], {
    env: name => { assert.equal(name, 'OPENAI_API_KEY'); return 'test-only'; },
    generate: async (question, existingAnswer, env, request, context) => {
      assert.equal(env('OPENAI_API_KEY'), 'test-only');
      inputs.push({ question, existingAnswer, context });
      return { answer: `답${inputs.length}`, reply: 'ㅇㅇ' };
    },
    write: text => writes.push(JSON.parse(text)),
  });
  assert.equal(samples.length, 2);
  assert.deepEqual(inputs.map(item => item.context.avoidRepeating), [[], ['답1']]);
  assert.deepEqual(inputs.map(item => item.context.avoidRepeatingReplies), [[], ['ㅇㅇ']]);
  assert.ok(inputs.every(item => item.question === '질문' && item.existingAnswer === '기존 글'));
  assert.equal(writes[1].reply, 'ㅇㅇ');
});

test('scheduled dry run passes accepted generated replies to the next generation without database writes', async () => {
  const contexts = [];
  const db = async (route, options) => {
    assert.equal(options, undefined);
    return route.startsWith('horoscopes?') ? [{ date: '2026-11-17' }] : [];
  };
  await seedReviewContent(db, () => { throw new Error('no configuration needed'); }, async (_, existing, env, request, context) => {
    contexts.push(context);
    return { answer: `답변${contexts.length}`, reply: `댓글${contexts.length}` };
  }, new Date('2026-11-16T21:00:00Z'), true);
  assert.equal(contexts.length, 10);
  assert.deepEqual(contexts[0].avoidRepeatingReplies, []);
  assert.deepEqual(contexts[1].avoidRepeatingReplies, ['댓글1']);
  assert.deepEqual(contexts[9].avoidRepeatingReplies, Array.from({ length: 9 }, (_, i) => `댓글${i + 1}`));
});

test('help and invalid preview arguments never generate', async () => {
  const options = { generate: () => { throw new Error('must not generate'); }, write: () => {} };
  assert.deepEqual(await runPreview(['--help'], options), []);
  for (const args of [[], [''], ['a', 'b'], ['a', '--count', '0'], ['a', '--count', '11'], ['a', '--count', '1.5'], ['a', '--answer', ' ']]) {
    await assert.rejects(runPreview(args, options), /Invalid preview arguments/);
  }
});
