-- 온보딩에서 별자리를 건너뛴 사용자도 커뮤니티 답변과 답글을 작성할 수 있게 한다.
-- 별자리별 피드는 `zodiac_sign = <sign>`으로 조회하므로 NULL 행은 전체 피드에만 나타난다.

alter table public.question_answers
  alter column zodiac_sign drop not null;

alter table public.question_answer_replies
  alter column zodiac_sign drop not null;
