import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
// Install @electric-sql/pglite in a temporary directory; no production DB is contacted.
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const migration = await readFile(new URL('../migrations/20261001000000_community_safety.sql', import.meta.url), 'utf8');
const schema = `
create role anon; create role authenticated; create role service_role bypassrls;
grant usage on schema public to anon, authenticated, service_role;
create table question_answers (
 id uuid primary key default gen_random_uuid(), question_date date not null, device_id uuid not null,
 zodiac_sign text, body text not null, hidden_at timestamptz, report_count integer default 0,
 author_hash text generated always as (md5(device_id::text || 'ohaasa-author-hash-v1')) stored,
 unique(question_date, device_id)
);
create table question_answer_replies (
 id uuid primary key default gen_random_uuid(), answer_id uuid references question_answers on delete cascade,
 device_id uuid not null, zodiac_sign text, body text not null, hidden_at timestamptz,
 author_hash text generated always as (md5(device_id::text || 'ohaasa-author-hash-v1')) stored,
 unique(answer_id, device_id)
);
create table question_answer_reports (answer_id uuid references question_answers on delete cascade, device_id uuid, reason text, created_at timestamptz default now(), primary key(answer_id, device_id));
create table question_answer_reply_reports (reply_id uuid references question_answer_replies on delete cascade, device_id uuid, reason text, created_at timestamptz default now(), primary key(reply_id, device_id));
grant select, insert, update, delete on question_answers, question_answer_replies to anon, service_role;
grant insert on question_answer_reports, question_answer_reply_reports to anon;
`;
const author = '00000000-0000-4000-8000-000000000001';
const reporter = '00000000-0000-4000-8000-000000000002';
async function setup() {
  const db = new PGlite();
  try { await db.exec(schema); await db.exec(migration); return db; }
  catch (error) { await db.close(); throw error; }
}
async function answer(db, body = '안녕하세요') {
  return (await db.query("insert into question_answers(question_date,device_id,zodiac_sign,body) values ('2026-10-01',$1,'aries',$2) returning id", [author, body])).rows[0].id;
}

test('existing Android upsert payload works; filter rejects insert/update and punctuation/width bypasses', async () => {
  const db = await setup();
  try {
    await db.exec('set role anon');
    const id = await answer(db);
    await db.query("insert into question_answers(question_date,device_id,zodiac_sign,body) values ('2026-10-01',$1,'aries','수정된 답변') on conflict(question_date,device_id) do update set body=excluded.body", [author]);
    for (const body of ['씨.발', 'ＦＵＣＫ', '개 새 끼']) {
      await assert.rejects(db.query('update question_answers set body=$1 where id=$2', [body, id]), /COMMUNITY_CONTENT_REJECTED/);
    }
    await assert.rejects(db.query('insert into question_answer_replies(answer_id,device_id,body) values($1,$2,$3)', [id, reporter, '씨발']), /COMMUNITY_CONTENT_REJECTED/);
    await db.exec('reset role');
    assert.equal((await db.query('select body from question_answers')).rows[0].body, '수정된 답변');
  } finally { await db.close(); }
});

test('reports and blocks create private idempotent snapshots that survive content deletion', async () => {
  const db = await setup();
  try {
    const id = await answer(db);
    const reply = (await db.query('insert into question_answer_replies(answer_id,device_id,body) values($1,$2,$3) returning id', [id, author, '댓글 예시'])).rows[0].id;
    await db.exec('set role anon');
    await db.query('insert into question_answer_reports(answer_id,device_id,reason) values($1,$2,$3)', [id, reporter, 'other']);
    await db.query('insert into question_answer_reply_reports(reply_id,device_id,reason) values($1,$2,$3)', [reply, reporter, 'other']);
    for (let i = 0; i < 2; i++) await db.query("select submit_community_block('reply',$1,$2)", [reply, reporter]);
    await assert.rejects(db.query('select * from community_moderation_events'), /permission denied/);
    await assert.rejects(db.query('select * from community_bans'), /permission denied/);
    await assert.rejects(db.query("select resolve_community_event(gen_random_uuid(),'dismiss','test')"), /permission denied/);
    await db.exec('reset role');
    await db.query('delete from question_answers where id=$1', [id]);
    const events = (await db.query('select body_snapshot from community_moderation_events')).rows;
    assert.equal(events.length, 3);
    assert.ok(events.some(event => event.body_snapshot === '댓글 예시'));
  } finally { await db.close(); }
});

test('operator action atomically removes author content and rejects future answer/reply writes', async () => {
  const db = await setup();
  try {
    const id = await answer(db);
    const reply = (await db.query('insert into question_answer_replies(answer_id,device_id,body) values($1,$2,$3) returning id', [id, author, '댓글'])).rows[0].id;
    await db.query("select submit_community_block('answer',$1,$2)", [id, reporter]);
    const event = (await db.query('select id from community_moderation_events')).rows[0].id;
    await db.exec('set role service_role');
    await db.query("select resolve_community_event($1,'remove_and_ban','위반 확인')", [event]);
    await db.exec('reset role');
    assert.ok((await db.query('select hidden_at from question_answers')).rows[0].hidden_at);
    assert.ok((await db.query('select hidden_at from question_answer_replies')).rows[0].hidden_at);
    assert.equal((await db.query('select status from community_moderation_events')).rows[0].status, 'removed');
    await db.exec('set role anon');
    await assert.rejects(db.query("insert into question_answers(question_date,device_id,body) values('2026-10-02',$1,'다시 작성')", [author]), /COMMUNITY_USER_BANNED/);
    await assert.rejects(db.query("update question_answer_replies set body='수정' where id=$1", [reply]), /COMMUNITY_USER_BANNED/);
    await db.query('update question_answers set hidden_at=null where id=$1', [id]);
    await db.exec('reset role');
    assert.ok((await db.query('select hidden_at from question_answers')).rows[0].hidden_at);
  } finally { await db.close(); }
});

test('dismissal records review without banning author', async () => {
  const db = await setup();
  try {
    const id = await answer(db);
    await db.query("select submit_community_block('answer',$1,$2)", [id, reporter]);
    const event = (await db.query('select id from community_moderation_events')).rows[0].id;
    await db.query("select resolve_community_event($1,'dismiss','위반 아님')", [event]);
    assert.equal((await db.query('select count(*)::int n from community_bans')).rows[0].n, 0);
    assert.equal((await db.query('select status from community_moderation_events')).rows[0].status, 'dismissed');
  } finally { await db.close(); }
});


test('server and app filter dictionaries agree on normalized variants and clean content', async () => {
  const db = await setup();
  try {
    const source = await readFile(new URL('../../packages/shared/src/lib/contentFilter.ts', import.meta.url), 'utf8');
    const dictionary = source.split('] as const')[0].match(/'([^']+)'/g).map(value => value.slice(1, -1));
    for (const term of dictionary) {
      const variant = [...term].join('. ');
      assert.equal((await db.query('select community_content_is_objectionable($1) rejected', [variant])).rows[0].rejected, true, term);
    }
    for (const clean of ['시발점에서 시작', 'classic assignment', '오늘도 좋은 하루']) {
      assert.equal((await db.query('select community_content_is_objectionable($1) rejected', [clean])).rows[0].rejected, false);
    }
  } finally { await db.close(); }
});


test('migration preserves existing reports and their original reception time', async () => {
  const db = new PGlite();
  try {
    await db.exec(schema);
    const id = await answer(db);
    await db.query("insert into question_answer_reports(answer_id,device_id,reason,created_at) values($1,$2,'other','2026-09-30T00:00:00Z')", [id, reporter]);
    await db.exec(migration);
    const event = (await db.query('select status,body_snapshot,created_at from community_moderation_events')).rows[0];
    assert.equal(event.status, 'pending');
    assert.equal(event.body_snapshot, '안녕하세요');
    assert.equal(new Date(event.created_at).toISOString(), '2026-09-30T00:00:00.000Z');
  } finally { await db.close(); }
});
