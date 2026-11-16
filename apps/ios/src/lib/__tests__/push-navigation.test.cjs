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

test('알림은 최신 날짜로 복원하고 상세 화면에서 오늘 탭으로 돌아가며 중복 탭을 무시한다', async () => {
  let rootSegment = 'journal-view';
  let listener;
  const calls = [];
  const claimed = new Set();
  const resetToLatestDate = () => calls.push('latest');
  const modules = {
    react: React,
    'expo-router': {
      router: { dismissTo: href => calls.push(href) },
      useRootNavigationState: () => ({ key: 'ready' }),
      useSegments: () => [rootSegment],
    },
    '@ohaasa/shared/context/HoroscopeDateContext': {
      useHoroscopeDateContext: () => ({ resetToLatestDate }),
    },
    '@/src/lib/notifications': {
      claimNotificationTap: id => {
        if (claimed.has(id)) return false;
        claimed.add(id);
        return true;
      },
      subscribeToNotificationTaps: async callback => {
        listener = callback;
        return () => { listener = null; };
      },
    },
  };
  const filename = path.resolve(__dirname, '../../hooks/usePushNavigation.ts');
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, require: id => modules[id] });
  function Harness() { module.exports.usePushNavigation(); return null; }
  let root;
  await React.act(async () => { root = renderer.create(React.createElement(Harness)); });
  try {
    await React.act(async () => listener({ id: 'first', date: '2026-01-01' }));
    assert.deepEqual(calls, ['latest', '/(tabs)']);
    await React.act(async () => listener({ id: 'first' }));
    assert.equal(calls.length, 2);

    rootSegment = 'onboarding';
    await React.act(async () => root.update(React.createElement(Harness)));
    await React.act(async () => listener({ id: 'second' }));
    assert.equal(calls.length, 2, '온보딩 중에는 화면을 이동하지 않는다');
    rootSegment = '(tabs)';
    await React.act(async () => root.update(React.createElement(Harness)));
    assert.deepEqual(calls, ['latest', '/(tabs)', 'latest', '/(tabs)']);
  } finally { await React.act(async () => root.unmount()); }
});
