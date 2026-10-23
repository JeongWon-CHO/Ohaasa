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

test('archive refresh shows newly filled, edited and cleared journals in a cached month', async () => {
  let journals = [{ date: '2026-10-06', summary: 'original' }];
  const modules = {
    react: React,
    '@/src/lib/journal': {
      loadJournalDates: async () => journals.map(j => j.date).sort().reverse(),
      loadMonthJournals: async () => new Map(journals.map(j => [j.date, j])),
    },
  };
  const filename = path.resolve(__dirname, '../../hooks/useJournalArchive.ts');
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: id => modules[id] });
  let archive;
  function Harness() { archive = module.exports.useJournalArchive(); return null; }
  let root;
  await React.act(async () => { root = renderer.create(React.createElement(Harness)); });
  try {
    assert.equal(archive.sections[0].journals.length, 1);
    journals = [{ date: '2026-10-08', summary: 'sample' }, { date: '2026-10-06', summary: 'edited' }];
    await React.act(async () => { archive.refresh(); });
    assert.equal(archive.sections[0].journals.length, 2);
    assert.equal(archive.sections[0].journals[0].summary, 'sample');
    assert.equal(archive.sections[0].journals[1].summary, 'edited');
    journals = [];
    await React.act(async () => { archive.refresh(); });
    assert.equal(archive.sections.length, 0);
    assert.equal(archive.isEmpty, true);
  } finally { await React.act(async () => { root.unmount(); }); }
});
