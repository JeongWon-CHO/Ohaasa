/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// 실제 직렬화/저장 코드를 실행하고 기기 저장소만 메모리로 대체한다.
function setup() {
  const data = new Map();
  const storage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
  function load(name) {
    const file = path.resolve(__dirname, '..', `${name}.ts`);
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    });
    const module = { exports: {} };
    vm.runInNewContext(outputText, {
      module, exports: module.exports,
      Date: class extends Date {
        constructor(...args) {
          super(...(args.length ? args : [2026, 8, 9, 12]));
        }
      },
      require: (id) => id === '@react-native-async-storage/async-storage' ? storage : load(id),
    }, { filename: file });
    return module.exports;
  }
  return { journal: load('journal'), storage, data };
}

test('저장된 일기를 연도 경계 너머로 옮겨도 내용과 생성 시각을 보존한다', async () => {
  const { journal } = setup();
  const draft = { ...journal.emptyDraft(), mood: 80, summary: '소중한 그림' };
  draft.sketch.strokes.push({ points: [[0.1, 0.2], [0.8, 0.6]], color: '#E4572E', width: 0.01, brush: 'pen' });
  const original = await journal.saveJournal('2025-12-31', draft);
  const moved = await journal.saveJournal('2026-01-01', draft, original.date);
  assert.equal(await journal.loadJournal(original.date), null);
  assert.equal(moved.date, '2026-01-01');
  assert.equal(moved.createdAt, original.createdAt);
  assert.equal(JSON.stringify(moved.sketch), JSON.stringify(original.sketch));
  assert.equal(moved.summary, draft.summary);
  assert.equal(moved.mood, draft.mood);
});

test('아직 저장하지 않은 일기는 선택한 날짜에만 저장한다', async () => {
  const { journal } = setup();
  await journal.saveJournal('2026-09-08', journal.emptyDraft(), '2026-09-09');
  assert.equal(await journal.loadJournal('2026-09-09'), null);
  assert.ok(await journal.loadJournal('2026-09-08'));
});

test('다른 일기가 있는 날짜는 원본과 대상 모두 보존한다', async () => {
  const { journal, data } = setup();
  await journal.saveJournal('2026-09-08', journal.emptyDraft());
  await journal.saveJournal('2026-09-09', journal.emptyDraft());
  const before = [...data];
  await assert.rejects(journal.saveJournal('2026-09-08', journal.emptyDraft(), '2026-09-09'), /이미 일기/);
  assert.deepEqual([...data], before);
});

test('새 날짜 저장 실패 시 원본을 남긴다', async () => {
  const { journal, storage } = setup();
  await journal.saveJournal('2026-09-09', journal.emptyDraft());
  storage.setItem = async () => { throw new Error('disk full'); };
  await assert.rejects(journal.saveJournal('2026-09-08', journal.emptyDraft(), '2026-09-09'), /disk full/);
  assert.ok(await journal.loadJournal('2026-09-09'));
  assert.equal(await journal.loadJournal('2026-09-08'), null);
});

test('원본 제거 실패 시 복사본을 되돌리고 재시도를 허용한다', async () => {
  const { journal, storage } = setup();
  await journal.saveJournal('2026-09-09', journal.emptyDraft());
  const remove = storage.removeItem;
  storage.removeItem = async (key) => {
    if (key.endsWith('2026-09-09')) throw new Error('remove failed');
    await remove(key);
  };
  await assert.rejects(journal.saveJournal('2026-09-08', journal.emptyDraft(), '2026-09-09'), /remove failed/);
  assert.ok(await journal.loadJournal('2026-09-09'));
  assert.equal(await journal.loadJournal('2026-09-08'), null);
  storage.removeItem = remove;
  await journal.saveJournal('2026-09-08', journal.emptyDraft(), '2026-09-09');
  assert.ok(await journal.loadJournal('2026-09-08'));
});

test('날짜 선택 시 중복을 확인하고 원래 날짜와 빈 날짜는 허용한다', async () => {
  const { journal, data } = setup();
  await journal.saveJournal('2026-09-08', journal.emptyDraft());
  const before = [...data];
  await assert.rejects(
    journal.assertJournalDateAvailable('2026-09-08', '2026-09-09'),
    { message: '이미 일기가 있는 날짜예요.\n다른 날짜를 골라주세요.' },
  );
  await journal.assertJournalDateAvailable('2026-09-08', '2026-09-08');
  await journal.assertJournalDateAvailable('2026-09-07', '2026-09-08');
  assert.deepEqual([...data], before);
});

test('내일부터는 날짜 선택과 저장을 막고 오늘은 허용한다', async () => {
  const { journal, data } = setup();
  await journal.assertJournalDateAvailable('2026-09-09', '2026-09-08');
  await journal.saveJournal('2026-09-09', journal.emptyDraft());
  const before = [...data];
  for (const future of ['2026-09-10', '2026-10-01', '2027-01-01']) {
    await assert.rejects(journal.assertJournalDateAvailable(future, future), /미래 날짜/);
    await assert.rejects(journal.saveJournal(future, journal.emptyDraft(), '2026-09-09'), /미래 날짜/);
    await assert.rejects(journal.saveJournal(future, journal.emptyDraft()), /미래 날짜/);
  }
  assert.deepEqual([...data], before);
});

test('날짜를 바꾸지 않은 수정은 기존 생성 시각을 보존한다', async () => {
  const { journal } = setup();
  const original = await journal.saveJournal('2026-09-09', journal.emptyDraft());
  const edited = await journal.saveJournal(original.date, { ...journal.emptyDraft(), summary: '수정' });
  assert.equal(edited.createdAt, original.createdAt);
  assert.equal((await journal.loadJournal(original.date)).summary, '수정');
});
