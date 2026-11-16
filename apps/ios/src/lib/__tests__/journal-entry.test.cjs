/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

function setup(loadJournal) {
  let focused = true;
  const pushes = [];
  const modules = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { Pressable: 'Pressable', Text: 'Text', StyleSheet: { create: x => x } },
    '@expo/vector-icons': { Feather: () => null },
    'expo-router': {
      router: { push: href => pushes.push(href) },
      useFocusEffect: callback => {
        const isFocused = focused;
        React.useEffect(() => isFocused ? callback() : undefined, [callback, isFocused]);
      },
    },
    '@/src/constants/design': { colors: {}, radius: {}, spacing: {} },
    '@/src/lib/dateKeys': { toDateString: () => '2026-11-17' },
    '@/src/lib/journal': { loadJournal },
  };
  const filename = path.resolve(__dirname, '../../components/journal/JournalEntryButton.tsx');
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, require: id => modules[id] });
  const Component = module.exports.JournalEntryButton;
  let root;
  const render = async (date = '2026-11-17') => {
    await React.act(async () => {
      const element = React.createElement(Component, { date });
      if (root) root.update(element);
      else root = renderer.create(element);
    });
  };
  return {
    render, pushes,
    button: () => root.root.findByType('Pressable'),
    refocus: async () => {
      focused = false;
      await render();
      focused = true;
      await render();
    },
    empty: () => root.toJSON() === null,
    close: async () => { await React.act(async () => root.unmount()); },
  };
}

test('운세 날짜에 새 일기를 쓰고 복귀하면 기존 일기 보기로 갱신한다', async () => {
  let journal = null;
  const app = setup(async () => journal);
  try {
    await app.render();
    assert.equal(app.button().props.accessibilityLabel, '오늘 일기 쓰기');
    await React.act(async () => app.button().props.onPress());
    assert.equal(app.pushes[0].pathname, '/journal-write');
    assert.equal(app.pushes[0].params.date, '2026-11-17');
    journal = { date: '2026-11-17' };
    await app.refocus();
    assert.equal(app.button().props.accessibilityLabel, '오늘 일기 보기');
    await React.act(async () => app.button().props.onPress());
    assert.equal(app.pushes[1].pathname, '/journal-view');
  } finally { await app.close(); }
});

test('과거 운세는 그날의 일기로 연결하고 미래 날짜는 진입을 숨긴다', async () => {
  const app = setup(async () => null);
  try {
    await app.render('2026-11-13');
    assert.equal(app.button().props.accessibilityLabel, '이날 일기 쓰기');
    await React.act(async () => app.button().props.onPress());
    assert.equal(app.pushes[0].params.date, '2026-11-13');
    await app.render('2026-11-18');
    assert.ok(app.empty());
  } finally { await app.close(); }
});

test('이전 운세의 느린 조회가 새 날짜의 버튼을 덮지 않는다', async () => {
  let resolveOld;
  const app = setup(date => date === '2026-11-13'
    ? new Promise(resolve => { resolveOld = resolve; })
    : Promise.resolve(null));
  try {
    await app.render('2026-11-13');
    assert.ok(app.button().props.disabled);
    await app.render();
    await React.act(async () => resolveOld({ date: '2026-11-13' }));
    assert.equal(app.button().props.accessibilityLabel, '오늘 일기 쓰기');
  } finally { await app.close(); }
});

test('저장소 조회 실패 후 재시도하며 확인 없이 새 일기를 열지 않는다', async () => {
  let failed = true;
  const app = setup(async () => {
    if (failed) throw new Error('storage unavailable');
    return { date: '2026-11-17' };
  });
  try {
    await app.render();
    assert.equal(app.button().props.accessibilityLabel, '일기 다시 확인');
    failed = false;
    await React.act(async () => app.button().props.onPress());
    assert.equal(app.pushes.length, 0);
    assert.equal(app.button().props.accessibilityLabel, '오늘 일기 보기');
  } finally { await app.close(); }
});
