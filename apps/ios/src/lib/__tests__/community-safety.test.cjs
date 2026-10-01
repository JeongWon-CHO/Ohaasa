/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, modules = {}, globals = {}) {
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, Date, Number, AbortController, setTimeout, clearTimeout, ...globals, require: (id) => {
    if (!(id in modules)) throw new Error(`Unexpected import: ${id}`);
    const value = modules[id];
    if (id === '@ohaasa/shared/lib/supabase' && value.supabase?.rpc) {
      return { ...value, supabase: { rpc: (...args) => ({ abortSignal: signal => value.supabase.rpc(...args, signal) }) } };
    }
    return value;
  } }, { filename: file });
  return module.exports;
}
function storage() {
  const data = new Map();
  return { data, getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } };
}
const file = name => path.resolve(__dirname, '..', `${name}.ts`);

test('terms require a valid current-version explicit consent and survive restart', async () => {
  const store = storage();
  const modules = { '@react-native-async-storage/async-storage': store };
  const terms = load(file('communityTerms'), modules);
  assert.equal(await terms.hasAcceptedCommunityTerms(), false);
  await terms.acceptCommunityTerms();
  assert.equal(await load(file('communityTerms'), modules).hasAcceptedCommunityTerms(), true);
  const key = [...store.data.keys()][0];
  for (const invalid of ['not json', '{}', JSON.stringify({ version: 'old', acceptedAt: new Date().toISOString() }), JSON.stringify({ version: terms.COMMUNITY_TERMS_VERSION, acceptedAt: 'invalid' })]) {
    store.data.set(key, invalid);
    assert.equal(await terms.hasAcceptedCommunityTerms(), false);
  }
});

test('block queue survives offline/restart, deduplicates targets, and retries every target', async () => {
  const store = storage();
  let offline = true;
  const sent = [];
  const modules = {
    '@react-native-async-storage/async-storage': store,
    '@ohaasa/shared/lib/storage': { getOrCreateDeviceId: async () => 'test-device' },
    '@ohaasa/shared/lib/supabase': { supabase: { rpc: async (name, params) => {
      assert.equal(name, 'submit_community_block');
      if (offline) return { error: { message: 'offline' } };
      sent.push(params.p_target_id); return { error: null };
    } } },
  };
  const queue = load(file('communityBlockQueue'), modules);
  await Promise.all([
    queue.queueCommunityBlock({ kind: 'answer', id: 'answer-a' }),
    queue.queueCommunityBlock({ kind: 'answer', id: 'answer-a' }),
    queue.queueCommunityBlock({ kind: 'reply', id: 'reply-b' }),
  ]);
  await queue.flushCommunityBlocks();
  assert.equal(JSON.parse([...store.data.values()][0]).length, 2);
  offline = false;
  await load(file('communityBlockQueue'), modules).flushCommunityBlocks();
  assert.deepEqual(sent, ['answer-a', 'reply-b']);
  assert.equal(JSON.parse([...store.data.values()][0]).length, 0);
});

test('concurrent enqueue/flush never loses a block, and exceptions preserve undelivered requests', async () => {
  const store = storage();
  let fail = true;
  const sent = [];
  const queue = load(file('communityBlockQueue'), {
    '@react-native-async-storage/async-storage': store,
    '@ohaasa/shared/lib/storage': { getOrCreateDeviceId: async () => 'test-device' },
    '@ohaasa/shared/lib/supabase': { supabase: { rpc: async (_, params) => {
      if (fail) throw new Error('connection lost');
      sent.push(params.p_target_id); return { error: null };
    } } },
  });
  await queue.queueCommunityBlock({ kind: 'answer', id: 'a' });
  await assert.rejects(queue.flushCommunityBlocks(), /connection lost/);
  fail = false;
  await Promise.all([queue.flushCommunityBlocks(), queue.queueCommunityBlock({ kind: 'reply', id: 'b' })]);
  await queue.flushCommunityBlocks();
  assert.deepEqual(sent, ['a', 'b']);
});

test('filter catches spacing, punctuation and full-width variants while allowing ordinary text', () => {
  const filter = load(path.resolve(__dirname, '../../../../../packages/shared/src/lib/contentFilter.ts'));
  for (const value of ['씨.발', '개 새 끼', 'ＦＵＣＫ', '죽여버릴 거야']) assert.equal(filter.containsObjectionableContent(value), true);
  for (const value of ['오늘도 좋은 하루', '시발점에서 시작', 'classic assignment', '댓글 사용 예시']) assert.equal(filter.containsObjectionableContent(value), false);
});


test('a hanging block request times out, preserves the queue and releases later enqueues', async () => {
  const store = storage();
  const queue = load(file('communityBlockQueue'), {
    '@react-native-async-storage/async-storage': store,
    '@ohaasa/shared/lib/storage': { getOrCreateDeviceId: async () => 'test-device' },
    '@ohaasa/shared/lib/supabase': { supabase: { rpc: (_, __, signal) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }) } },
  }, { setTimeout: callback => { process.nextTick(callback); return 1; }, clearTimeout: () => {} });
  await queue.queueCommunityBlock({ kind: 'answer', id: 'a' });
  await assert.rejects(queue.flushCommunityBlocks(), /aborted/);
  await queue.queueCommunityBlock({ kind: 'reply', id: 'b' });
  assert.equal(JSON.parse([...store.data.values()][0]).length, 2);
});
