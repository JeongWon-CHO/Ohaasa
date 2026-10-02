begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- The existing UGC tables grant service_role SELECT but not INSERT.
-- ON CONFLICT DO NOTHING needs INSERT and existing SELECT, not UPDATE/DELETE.
grant insert on public.question_answers, public.question_answer_replies to service_role;

commit;
