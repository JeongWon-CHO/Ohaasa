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

test('an interrupted close cannot hide a newly opened bottom sheet', async () => {
  const animations = [];
  const modules = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': {
      View: 'View', Modal: 'Modal', Pressable: 'Pressable',
      StyleSheet: { create: value => value, absoluteFill: {}, absoluteFillObject: {} },
      Animated: {
        View: 'AnimatedView',
        Value: class { setValue() {} },
        timing: () => ({}),
        parallel: () => {
          const animation = { start(callback) { this.callback = callback; }, stop() { this.stopped = true; } };
          animations.push(animation);
          return animation;
        },
      },
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@/src/constants/design': { layout: { maxContentWidth: 600 } },
  };
  const filename = path.resolve(__dirname, '../../components/common/BottomSheet.tsx');
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: id => modules[id] });
  const { BottomSheet } = module.exports;
  let root;
  const render = visible => React.createElement(BottomSheet, { visible }, 'terms');
  await React.act(async () => { root = renderer.create(render(false)); });
  try {
    const initialClose = animations.at(-1);
    await React.act(async () => { root.update(render(true)); });
    // RN can deliver completion of the stopped native animation later.
    await React.act(async () => { initialClose.callback({ finished: false }); });
    assert.equal(root.root.findByType('Modal').props.visible, true);
    await React.act(async () => { root.update(render(false)); });
    const close = animations.at(-1);
    await React.act(async () => { root.update(render(true)); });
    await React.act(async () => { close.callback({ finished: true }); });
    assert.equal(root.root.findByType('Modal').props.visible, true);
    await React.act(async () => { root.update(render(false)); });
    await React.act(async () => { animations.at(-1).callback({ finished: true }); });
    assert.equal(root.root.findByType('Modal').props.visible, false);
  } finally { await React.act(async () => { root.unmount(); }); }
});
