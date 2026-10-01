/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const date = '2026-10-01';

async function setup({ existing = null, publicWrite = true, publicDelete = true } = {}) {
  let local = existing;
  let hook;
  let root;
  const calls = [];
  const modules = {
    react: React,
    '@ohaasa/shared/lib/contentFilter': { containsObjectionableContent: () => false },
    '@ohaasa/shared/lib/storage': { getOrCreateDeviceId: async () => 'test-device' },
    '@ohaasa/shared/lib/supabase': {
      upsertPublicAnswer: async () => { calls.push('publish'); return publicWrite; },
      deletePublicAnswer: async () => { calls.push('unpublish'); return publicDelete; },
    },
    '@ohaasa/shared/lib/questionAnswers': {
      getQuestionAnswer: async () => local,
      upsertQuestionAnswer: async value => { calls.push('local-save'); local = value; return value; },
      deleteQuestionAnswer: async () => { calls.push('local-delete'); local = null; },
    },
  };
  const filename = path.resolve(__dirname, '../../hooks/useQuestionAnswerForm.ts');
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require: id => {
    if (!(id in modules)) throw new Error(`Unexpected import: ${id}`);
    return modules[id];
  } });
  function Component() {
    hook = module.exports.useQuestionAnswerForm({ date, zodiacSign: 'aries', questionText: '오늘의 질문' });
    return null;
  }
  await React.act(async () => { root = renderer.create(React.createElement(Component)); });
  return {
    calls, local: () => local, hook: () => hook,
    dispose: () => React.act(async () => root.unmount()),
    draft: draft => React.act(async () => hook.setForm(draft)),
    save: async () => { let result; await React.act(async () => { result = await hook.save(); }); return result; },
    remove: async () => { let result; await React.act(async () => { result = await hook.remove(); }); return result; },
  };
}

test('rejected public publication preserves the previous local record', async () => {
  const original = { date, body: '기존 기록', visibility: 'private' };
  const app = await setup({ existing: original, publicWrite: false });
  try {
    await app.draft({ body: '새 공개 답변', visibility: 'public' });
    assert.equal(await app.save(), null);
    assert.equal(app.local(), original);
    assert.deepEqual(app.calls, ['publish']);
  } finally { await app.dispose(); }
});

test('failed public removal cannot claim that an answer is private', async () => {
  const original = { date, body: '공개 답변', visibility: 'public' };
  const app = await setup({ existing: original, publicDelete: false });
  try {
    await app.draft({ body: '나만 볼 답변', visibility: 'private' });
    assert.equal(await app.save(), null);
    assert.equal(app.local(), original);
    assert.deepEqual(app.calls, ['unpublish']);
  } finally { await app.dispose(); }
});

test('failed public deletion preserves the local answer and successful deletion removes it', async () => {
  for (const success of [false, true]) {
    const original = { date, body: '공개 답변', visibility: 'public' };
    const app = await setup({ existing: original, publicDelete: success });
    try {
      assert.equal(await app.remove(), success);
      assert.equal(app.local(), success ? null : original);
      assert.deepEqual(app.calls, success ? ['unpublish', 'local-delete'] : ['unpublish']);
    } finally { await app.dispose(); }
  }
});

test('private answers can be saved without a public network request', async () => {
  const app = await setup({ publicWrite: false });
  try {
    await app.draft({ body: '비공개 기록', visibility: 'private' });
    assert.equal((await app.save()).visibility, 'private');
    assert.deepEqual(app.calls, ['local-save']);
  } finally { await app.dispose(); }
});
