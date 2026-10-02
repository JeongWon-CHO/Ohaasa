# iOS UGC 심사 대응 — 적용 및 운영

운영 DB 마이그레이션 `20261001000000_community_safety.sql`은 연결된 ohaasa 프로젝트에 Supabase CLI로 적용했다. 운영 스키마 확인 및 변경 전 로컬 백업을 수행했고, 정상 답변·댓글 작성, 서버 필터, 신고·차단 접수, 비공개 권한, 운영자 제재를 롤백 트랜잭션으로 검증했다. 마이그레이션 이력도 일치한다. GitHub Secrets/Variables 설정, 워크플로 실행, 앱 배포 및 실물 기기 녹화는 별도 단계다. 이 문서의 설정 값에는 비밀값을 붙여넣지 않는다.

## 적용 순서

1. 현재 DB 스키마와 백업을 확인한다. 기존 UGC 생성 마이그레이션 일부가 저장소에 없으므로 운영 DB의 `question_answers`, `question_answer_replies`, 두 신고 테이블의 컬럼/트리거/권한과 비교한다. 임시 PostgreSQL 테스트는 최소 호환 스키마를 사용하며 운영 스키마 검증을 대신하지 않는다.
2. `supabase/migrations/20261001000000_community_safety.sql`을 검토 후 적용한다. 동의 필드를 기존 Android 요청에 요구하지 않는다. 금칙어 및 작성자 제재는 두 플랫폼 모두에 적용된다.
3. GitHub Pages의 커뮤니티 가이드라인·개인정보처리방침 변경을 공개한다. iOS 앱의 동의 링크가 새 문서로 연결되는지 확인한다.
4. 아래 이메일/샘플 설정을 완료하고 워크플로를 수동 실행하여 확인한다. 이때 실제 메일 발송과 공용 DB 샘플 등록이 발생한다.
5. 운영자가 신고를 처리할 수 있고 이메일 알림이 도착하는 것을 확인한 뒤 스케줄을 켠다. GitHub Actions 실패 알림도 수신하도록 설정한다.
6. iOS 실물 기기 검증·녹화를 완료하고 `apps/ios/app.config.js` version을 올려 제출한다. 앱 배포 전 서버 적용이 먼저다.

## 운영자 이메일

메일 발송은 Resend Email API를 사용한다. GitHub Secrets:

- 기존 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `MODERATION_EMAIL_FROM`: 발송 권한을 확인한 발신 주소
- `MODERATION_EMAIL_TO`: 실제 확인하는 운영자 주소

도메인 인증 전 자기 이메일 수신 테스트에서는 발신 주소를 `onboarding@resend.dev`로 설정하고 수신 주소를 Resend 가입 이메일과 동일하게 사용한다. 다른 수신자에게 발송할 때는 소유한 도메인의 인증이 필요하다.

Repository Variable `COMMUNITY_MODERATION_ENABLED=true`로 15분 주기 폴링을 활성화한다. 새 접수는 이메일로 전달되고 12시간 이상 미처리 건은 마지막 알림에서 1시간이 지난 뒤 재알림한다. 오래 알림을 받지 않은 건부터 처리하며 같은 실행에서 처음 알린 건은 재알림하지 않는다. `notified_at`은 가장 최근 알림 시각이다. 시간 단위 중복 방지 키와 발송 간격 제한을 함께 적용한다. GitHub 스케줄은 지연되거나 실행 실패할 수 있으므로 24시간 대응을 보장하는 시스템이 아니다. 운영자는 최소 하루 두 번 Dashboard를 확인하고 접수 시각부터 24시간 안에 검토·조치한다. 알림 실패는 다음 실행에서 재시도되며, 실제 수신 성공 여부도 확인해야 한다.

## 신고 검토와 제재

Supabase Dashboard에서 `community_moderation_events`를 `status=pending`으로 필터하고 `created_at` 오름차순으로 확인한다. `body_snapshot`은 작성자가 원문을 삭제해도 남는다. 단순 개인 차단만으로 위반을 확정하거나 자동 제재하지 않는다.

- 위반 확인: 관리용 스크립트 `node .github/scripts/resolve-community-event.mjs EVENT_UUID remove_and_ban "위반 내용 및 조치 사유"`
- 위반 아님: `node .github/scripts/resolve-community-event.mjs EVENT_UUID dismiss "검토 사유"`

스크립트는 서버용 환경변수만 읽는다. 키를 명령 인자나 커밋 파일에 넣지 않는다. Dashboard SQL Editor에서도 다음 함수 호출로 처리할 수 있다. 실제 접수 ID와 사유를 사용한다.

```sql
select public.resolve_community_event('접수 UUID'::uuid, 'remove_and_ban', '검토 후 확인한 위반 사유');
```

`remove_and_ban`은 하나의 트랜잭션에서 작성자를 제재하고 그 작성자의 기존 공개 답변·댓글에 `hidden_at`을 설정하여 전체 공개 피드에서 제거한다. 관련 미처리 접수도 처리 완료로 기록한다. 물리 삭제 대신 운영 검토 및 이의 대응용 원문을 보존한다. 추가 작성·수정은 서버 트리거가 거부한다. 운영자 확인 전 제재 해제나 숨김 해제를 하지 않는다.

기존 신고 4건은 원래 접수 시각과 현재 원문 사본을 유지하여 새 검토 목록에 이관했다. 과거 접수 당시 원문이 아니라 마이그레이션 시점의 사본이며, 자동으로 처리 완료하지 않는다. 운영자가 기존 건도 검토해야 한다.

익명 `device_id`는 기기 저장소 UUID라 재설치에 따른 제재 회피를 완전히 막을 수 없다. 기존 앱의 익명 쓰기 권한 모델을 이번 작업에서 변경하지 않는다. 차단 검토 접수와 작성자 ID, 신고자 ID는 anon/authenticated에 공개하지 않는다.

접수 스냅샷은 검토 및 이의 대응 후 이메일 워크플로가 처리 완료 후 90일이 지난 기록을 자동 정리한다. 워크플로를 끈 경우에는 운영자가 직접 정리한다. 관련 기록은 기본적으로 처리 완료 후 90일 이내 삭제하고,  제재 유지에 필요한 기기 식별자와 사유는 제재 기간 동안 보관한다. 운영 적용 후 백업 대상에 새 검토·제재 테이블을 포함할지도 확인한다. 백업에 포함한다면 아티팩트 접근 권한과 보존 기간을 함께 관리한다.

## AI 예시 답변 자동 생성

운영 테이블의 기존 `service_role` 권한은 조회만 허용되어 자동 등록이 403으로 실패할 수 있다. `20261002000000_community_automation_insert.sql`로 답변·댓글 두 테이블에 서버 계정 INSERT 권한만 추가한다. 기존 사용자 권한과 RLS·필터·제재 트리거는 유지한다.

`Prepare community AI examples` 워크플로는 매일 KST/JST 오전 06:00(UTC 전날 21:00)에 실행한다. main 반영 후 기본 활성화이며 Repository Variable `COMMUNITY_REVIEW_CONTENT_ENABLED=false`로 중지할 수 있다. GitHub 예약 실행은 지연될 수 있다.

기존 `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` Secrets를 사용한다. `gpt-5.4-mini`로 앱과 동일한 `getQuestionByDate` 질문에 맞는 한국어 답변 1개와 해당 답변에 공감하는 댓글 1개를 만든다. 프롬프트는 `.github/scripts/seed-community-review.mjs`의 `COMMUNITY_EXAMPLE_PROMPT`에서 관리한다. 짧은 한국어 댓글체와 선택적인 인터넷 표현을 사용하되 욕설·초성 욕설·실명 공격·성별 비하를 금지한다. 본문에 AI·예시 접두사를 붙이지 않고 일반 답변·댓글과 같은 UI에 표시한다. 전용 작성자 ID는 유지하므로 운영자는 합성 작성자의 콘텐츠를 구분할 수 있다. 길이·공용 금칙어 필터·서버 필터를 통과한 내용만 저장한다. 잘못된 AI 출력은 최대 두 번 시도하고, 여전히 실패하면 고정 문구로 대체하지 않고 실패 처리한다. 개인 이용자 게시물은 OpenAI로 전송하지 않는다.

오전 6시에는 새 운세 방송일이 아직 수집되지 않았을 수 있어 KST 오늘 날짜의 예시를 미리 준비하고, 앱에 표시되는 최신 방송일이 다르면 해당 날짜에도 예시를 준비한다. 날짜당 답변·댓글 한 쌍만 등록하고 기존 한 쌍이 있으면 AI 호출과 DB 쓰기를 건너뛴다. 기존 답변만 있다면 이를 바꾸지 않고 그 답변에 맞는 댓글만 생성한다. 주말에도 최신 방송일의 기존 예시를 덮어쓰지 않는다. Android에도 같은 AI 예시가 보인다.

합성 작성자 UUID는 스크립트에 전용 기본값을 두었다. 별도 작성자가 필요하면 서로 다른 UUID를 `REVIEW_ANSWER_DEVICE_ID`, `REVIEW_REPLY_DEVICE_ID` Secrets로 재정의할 수 있다. 실제 사용자 device_id는 사용하지 않는다. 숨김·제재된 예시는 자동 복구하지 않는다. 이전 날짜 예시는 삭제하지 않는다.

수동 `Run workflow`의 `dry_run`은 기본 true다. AI 생성과 검증만 하고 DB에 쓰지 않는다. 실제 등록을 확인할 때만 false로 실행한다. 실패 시 GitHub Actions 로그에는 본문·API 키·작성자 ID를 기록하지 않는다.

작성자가 고정이므로 한 번 차단한 기기에서는 다음 날에도 숨겨진다. 재테스트할 때 설정 > 커뮤니티 > 차단한 사용자에서 해제한다. AI 예시도 일반 글과 같은 신고·차단 기능으로 검증한다.

## 실물 검증과 영상

- 새 설치: 체크박스 기본 미선택, 약관 링크 열기, 미동의 시 딥링크/알림으로 진입 불가, 동의 후 온보딩
- 기존 사용자: 약관 화면 표시, 동의 후 기존 온보딩 완료 상태와 개인 기록 유지
- 공개 답변/댓글 작성·수정 필터; 비공개 일기는 영향 없음
- 공개 저장 거부 또는 삭제 실패 시 기존 로컬 기록 유지; 서버 삭제 실패 시 나만 보기 전환을 성공으로 표시하지 않음
- 더보기에서 답변 신고와 댓글 신고, Dashboard 접수 및 이메일 수신
- 작성자 차단 직후 답변·댓글 제거, 앱 재실행 후 유지, 새 날짜에도 적용
- 오프라인 차단 후 연결 복구/앱 복귀 시 접수 재전송; 요청 대기 15초 제한으로 후속 차단이 영구 대기하지 않는지 확인
- 운영자 제재 후 다른 기기 피드 새로고침에서 제거 및 해당 작성자 추가 저장 거부
- 기존 Android 공개 저장·수정·신고 경로의 정상 이용/서버 거부 시 오류 처리

실제 iPhone 또는 iPad에서 약관 동의, 신고, 차단과 즉시 제거를 녹화한다. 녹화에는 운영자 비밀값이나 다른 사용자의 식별 정보가 나오지 않게 한다. App Store Connect 답변에 영상을 제공하고 App Review Information Notes에 녹화 링크 및 재현 경로를 안내한다.

## 테스트

```sh
cd apps/ios
npx tsc --noEmit
node --test src/lib/__tests__/*.test.cjs
```

저장소 루트에서 자동화 테스트:

```sh
node --import ./backend/node_modules/tsx/dist/loader.mjs --test .github/scripts/community-automation.test.mjs
```

운영 DB 대신 임시 PostgreSQL(PGlite)로 SQL을 검증하려면 임시 디렉터리에 `@electric-sql/pglite`를 설치하고 해당 패키지의 ESM 진입점을 `PGLITE_MODULE`에 지정한다:

```sh
npm install --prefix /tmp/ohaasa-ugc-validation @electric-sql/pglite --no-audit --no-fund
PGLITE_MODULE=/tmp/ohaasa-ugc-validation/node_modules/@electric-sql/pglite/dist/index.js node --test supabase/tests/community-safety.test.mjs
```

금칙어 목록은 `packages/shared/src/lib/contentFilter.ts`와 SQL 함수에서 함께 관리한다. 한국어/영어 일부 명백한 표현과 공백·구두점·전각 우회를 검사하는 초기 필터이며 문맥 판단·모든 우회 표현을 포괄하지 않는다. 운영 중 신고에 따라 보완하고 오탐도 검토한다.
