# CLAUDE.md — ohaasa プロジェクト

## 프로젝트 개요

일본 아사히방송 おはようさんです！별자리 운세 JSON API → Supabase 저장 → React Native Expo 앱 표시 → Expo Push Notification 발송.

**MVP 방침**: 로그인 없음. `device_id`(AsyncStorage 영속 UUID) + `zodiac_sign` + `push_token`만 서버에 저장.

---

## 아키텍처

```
GitHub Actions (cron: UTC 20:59 = KST 05:59, 매일 1회)
  └─ backend (Node.js/TypeScript)
       ├─ 아사히 JSON API fetch → parse → 12개 HoroscopeEntry
       ├─ GPT 번역 (advice_ko — advice 불변 + advice_ko IS NOT NULL이면 skip)
       └─ Supabase horoscopes upsert (INSERT)
            │
            └─ Database Webhook (horoscopes INSERT → aries row 1회)
                 └─ Supabase Edge Function: send-horoscope-notifications
                      ├─ notification_log dedup (UNIQUE constraint on date)
                      ├─ horoscopes 12개 조회
                      ├─ user_devices 조회
                      └─ Expo Push API 발송 → FCM → 단말기

React Native Expo (app/)
  └─ Supabase horoscopes SELECT → advice_ko ?? advice 표시
```

---

## 코드 배치 규칙

> 파일 목록은 디렉토리를 직접 읽는다. 여기엔 **새 코드를 어디에 둘지**만 적는다.

```
app/app/                        expo-router 화면. (tabs)/ 안이 탭, 밖은 router.push 진입
app/src/context/                전역 상태 (ZodiacContext)
app/src/constants/              질문 목록 · 외부 URL 등 정적 데이터
app/src/lib/                    플랫폼·서버 경계 — supabase · AsyncStorage CRUD · notifications
app/src/hooks/                  화면 간 재사용 로직 (use<도메인>)
app/src/components/common/      화면 무관 공통 (BottomSheet 등)
app/src/components/<화면명>/     화면 전용 컴포넌트 (archive · daily-question · daily-review · journal · sketch · stats)
backend/src/                    crawler(fetcher · parser, 31 tests) · translator · main.ts
supabase/                       Edge Function + migrations — .gitignore 대상이라 git에 없다
```

- **화면은 orchestration만 한다** — 훅 호출 · state · 컴포넌트 조합. UI 섹션은 `components/<화면명>/`로, 데이터 로딩·가공은 `hooks/`로 내린다. `stats.tsx`가 이 패턴의 기준점.
- **로컬 데이터의 source of truth는 `lib/`의 AsyncStorage 모듈**(`dailyReviews` · `questionAnswers` · `moderation`). 화면에서 AsyncStorage를 직접 읽지 않는다.
- 서버 호출은 전부 `lib/supabase.ts`를 거친다.

---

## 주요 설계 결정

- **데이터 소스**: `https://www.asahi.co.jp/data/ohaasa2020/horoscope.json`
- **저장 필드**: `date · zodiac_sign · zodiac_name · rank · advice · advice_ko`
- **주말 데이터**: 고고별자리(`source=gogo`) 크롤링. 토·일 모두 고고 메인 소스.
- **일요일 cron**: 방송 없음이지만 매일 실행 (`59 20 * * *` = KST 05:59), 평일/주말 분기는 `isWeekendJST()`에서 처리.
- **DatePill**: "오늘"이 아닌 오하아사 방송 기준일(`date` 컬럼) 표시

---

## Supabase 설정

### user_devices RLS (중요)

anon key로 upsert하려면 세 정책 모두 필요. SELECT가 없으면 `"new row violates row-level security policy"` 발생.

```sql
CREATE POLICY "user_devices_anon_insert" ON public.user_devices FOR INSERT  TO anon WITH CHECK (true);
CREATE POLICY "user_devices_anon_update" ON public.user_devices FOR UPDATE  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "user_devices_anon_select" ON public.user_devices FOR SELECT  TO anon USING (true);
```

### question_answers / question_answer_likes (오늘의 질문 — 공개 UGC)

전체 스키마·RLS·트리거는 `supabase/migrations/20260807000000_question_answers.sql` 참고. `supabase db push`로 반영하거나 대시보드 SQL Editor에서 수동 실행.

- `user_devices`와 동일하게 `device_id`를 베어러 토큰처럼 신뢰하는 RLS(`USING(true)`)를 쓴다 — **앱은 공개 피드 조회 시 절대 `device_id` 컬럼을 select하지 않는다.** 이게 없으면 다른 사용자가 device_id를 알아내 남의 글을 수정/삭제할 수 있다.
- `question_answers`는 `unique(question_date, device_id)`로 기기당 하루 1개 공개글만 허용 — 작성/수정은 `upsert(onConflict: 'question_date,device_id')`.
- `like_count`는 `question_answer_likes` insert/delete 트리거(`sync_answer_like_count`)가 자동 동기화 — 클라이언트가 직접 증감시키지 않는다.
- **"공개글은 올린 날에만 수정" 정책은 현재 앱 UI에서만 막는다**(`canEditAnswer()`). 서버 RLS는 `USING(true)`라 앱을 거치지 않으면 지난 글도 수정 가능하다. 조여야 할 때는 UPDATE 정책에 `created_at::date = current_date` 조건을 건다.

### question_answer_reports (신고 · 자동 숨김)

`supabase/migrations/20260810000000_question_answer_reports.sql` 참고.

- `question_answers`에 컬럼 3개가 추가된다 — `author_hash`(생성 컬럼) · `report_count` · `hidden_at`.
- **`question_answer_reports`는 anon에게 INSERT만 연다.** SELECT를 열면 신고자들의 `device_id`가 노출된다(`question_answers`에서 `device_id`를 숨기는 것과 같은 이유). "내가 신고한 글"은 서버에서 되읽지 않고 `moderation.ts`(AsyncStorage)가 기억한다.
- 기기당 답변 1건 1회(`primary key (answer_id, device_id)`). 중복 신고는 23505로 거절되고 앱은 이를 성공으로 처리한다.
- `sync_answer_report_count` 트리거가 `report_count`를 동기화하고, **`hide_threshold` 도달 시 `hidden_at`을 세팅**한다(현재 4). 트리거 함수의 상수 한 줄이라 `create or replace function` 블록만 재실행하면 바뀐다 — 트리거는 함수를 이름으로 참조하므로 손댈 필요 없다.
- **임계값과 확인 주기는 연동된다.** 낮으면(2~3) 자동 숨김이 급한 건을 걷어내 주 1회 확인으로 충분하지만, 높으면 자동 숨김이 사실상 안 걸려 **매일 직접 확인해야 한다**. 글의 노출 수명이 24시간이라 하루를 넘기면 이미 늦는다.
- 임계값을 낮추면 악용이 쉬워진다 — `device_id`가 재설치 시 재생성되므로 **한 사람이 재설치를 반복해 아무 글이나 내릴 수 있다.** 로그인이 없는 한 근본적으로 막을 수 없고, 복구가 SQL 두 줄이라는 점으로 상쇄한다.
- 숨김 필터는 RLS가 아니라 쿼리(`.is('hidden_at', null)`)에 있다. RLS SELECT에 걸면 숨겨진 행이 `upsert`의 `ON CONFLICT` → UPDATE RLS에서 막혀 에러가 나고 `deletePublicAnswer`도 조용히 실패한다.
- **허위신고 복구는 두 단계**: 신고 기록 `delete` + `hidden_at = null`. 숨김만 풀면 `report_count`가 임계값 이상으로 남아 다음 신고 1건에 즉시 재숨김된다. 운영 SQL은 마이그레이션 파일 하단 주석 참고.

### question_answer_replies / _reply_likes / _reply_reports (답글)

`supabase/migrations/20260814000000_question_answer_replies.sql` 참고. 위 세 테이블의 규칙(RLS `USING(true)` · `device_id` 비노출 · `author_hash` · 자동 숨김 · GRANT 필수)이 그대로 반복된다.

- **`unique(answer_id, device_id)`** — 기기당 원글 1개에 답글 1개. 재작성은 `upsert(onConflict: 'answer_id,device_id')`.
- **부모 답변 삭제 → `on delete cascade`.** 답변 작성자가 자기 글을 지우면 남의 답글도 같이 사라진다(수용한 대가).
- **부모가 자동 숨김되면 트리거 없이 답글도 도달 불가**가 된다 — 부모 id가 `.in()` 목록에 안 들어가기 때문이다. 숨김 cascade 트리거를 달면 오신고 복구가 3단계가 되고, 빠뜨리면 복구된 답변의 답글이 영영 안 보인다.
- `author_hash`의 PEPPER(`'ohaasa-author-hash-v1'`)는 `question_answers`와 **바이트 단위로 동일해야 한다.** 한 글자만 달라도 같은 사람이 답변/답글에서 다른 해시를 갖게 되어 사용자의 차단이 절반만 걸린다.
- `hide_threshold`가 답변(4)보다 낮은 **3**이다 — 답글은 접힌 영역에 있어 노출이 훨씬 적어서, 같은 값이면 자동 숨김이 사실상 안 걸린다.
- `question_answer_reply_reports`도 anon에게 **INSERT만** 연다(신고자 `device_id` 노출 방지).

### 백업 (`.github/workflows/backup-db.yml`)

무료 티어는 자동 백업이 없다. 매일 KST 07:30(크롤링이 재시도까지 끝난 뒤)에 전 테이블을 떠서 GitHub Actions 아티팩트로 30일 보관한다.

- **가장 아픈 손실은 `horoscopes`다.** 아사히 API는 당일치만 주므로 누적분이 날아가면 **복구 수단이 아예 없고** 통계 화면의 추이를 처음부터 다시 모아야 한다. `user_devices`가 날아가면 전 사용자가 앱을 다시 열 때까지 알림이 끊긴다.
- **`pg_dump`가 아니라 PostgREST로 뜬다**(`.github/scripts/backup-tables.py`). DB 비밀번호가 필요 없고 크롤러가 이미 쓰는 `SUPABASE_SERVICE_ROLE_KEY` 하나로 끝나기 때문이다. pg_dump 경로는 Session pooler 접속·비밀번호 URL 인코딩·클라이언트 버전(서버가 PG17)까지 전부 맞아야 해서 실패 지점이 많았다.
  - **대신 스키마 DDL은 담기지 않는다 — 데이터만이다.** 테이블이 통째로 사라진 경우엔 `supabase/migrations/`로 스키마를 먼저 세워야 한다. 그런데 `horoscopes` · `user_devices` · `notification_log`는 **마이그레이션 파일 자체가 없다**(대시보드에서 수동 생성). 이 셋의 DDL을 마이그레이션으로 남겨두지 않으면 백업이 있어도 복원이 반쪽이다.
  - **반드시 `service_role` 키여야 한다.** `anon`은 `notification_log` · `question_answer_reports` · `question_answer_reply_reports`에 SELECT 권한이 없어 `permission denied`로 막힌다(신고자 `device_id` 비노출 정책의 결과 — → "Supabase 설정").
- **페이지 크기는 `db-max-rows`보다 작아야 한다**(`PAGE = 500`). 같거나 크면 "요청한 만큼 왔는가"로 다음 페이지 유무를 판정할 수 없어 조용히 잘린다. 정렬 키도 필수다 — 정렬 없는 OFFSET은 페이지 간 행 순서를 보장하지 않아 중복·누락이 난다(합성 PK 테이블은 두 컬럼 모두 지정).
- **조용한 실패를 막는 장치가 셋이다.** ① 응답이 배열이 아니면(에러 JSON) 즉시 중단 — 이걸 빈 결과로 흘리면 "0행짜리 정상 백업"이 된다. ② `horoscopes` · `user_devices`가 0행이면 실패. ③ `manifest.json`에 테이블별 행 수를 남겨 복원 전에 대조할 수 있게 한다.
- **복원**: 아티팩트를 풀면 테이블별 `.jsonl`이 나온다. `service_role` 키로 PostgREST에 `POST`(`Prefer: resolution=merge-duplicates`)하거나, JSONL을 `INSERT` 문으로 바꿔 SQL Editor에서 실행한다. 전체가 아니라 특정 테이블만 되돌릴 때는 해당 `.jsonl`만 쓰면 된다.
- 신고 처리용 `delete` SQL을 대시보드에서 손으로 실행하는 구조라(→ "Supabase 설정") `where` 절 사고가 이 백업이 막아주는 주된 시나리오다.

### 환경변수

| 변수                            | 용도                                   |
| ------------------------------- | -------------------------------------- |
| `SUPABASE_URL`                  | backend/Actions 전용                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | service_role JWT — 앱 절대 노출 금지   |
| `OPENAI_API_KEY`                | GPT 번역 — backend/Actions 전용        |
| `EXPO_PUBLIC_SUPABASE_URL`      | 앱용 anon 접속 URL                     |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 앱용 anon key                          |

---

## 열린 작업

> 완료된 Phase 이력은 git log에 있다. 여기엔 **아직 안 끝난 것**만 남긴다.

- **Phase 11** — Expo SDK 56 업그레이드 검증 (위젯 제외)
- **답글 푸시 알림** — 답글이 달렸는지 알려면 앱을 열어야 한다. 필요한 것은 `question_answer_replies` INSERT 트리거 → Edge Function → 부모 `device_id`의 push token 조회 (→ "오늘의 질문 — 내 답변 고정 카드 · 새 답글 배지").
- **무료 티어 egress(5GB/월)** — 현재 약 1GB/월(실측 2026-08-18). DAU 약 1,200에서 한도를 넘는다. 주범은 커뮤니티 피드가 아니라 **운세 화면의 중복 조회**다: `useHoroscope.ts`가 `select('*')`로 장문 `advice`까지 12행을 받고, 이걸 홈·순위·별자리상세·데일리리뷰가 **각자 독립 fetch**한다(`HoroscopeDateContext`처럼 Context로 올릴 자리). 더해서 `HoroscopeDateSheet`가 항상 마운트돼 열지 않아도 120행 쿼리가 화면당 1회 돌고, `useHoroscopeTrends`는 `compareSign`이 deps에 있어 클라이언트 필터일 뿐인 비교 토글마다 396행을 재조회한다.
- **피드 페이지네이션** — `fetchPublicAnswers`는 `ANSWER_FETCH_LIMIT = 1000`으로 상한만 걸어둔 상태다(도달 시 `console.warn`). 하루 답변이 ~400개를 넘으면 그 전에 `.in()`의 UUID 배열이 URL 길이 한계에 먼저 걸린다. 착수하면 답글이 지연 로딩으로 바뀌고 배지용 `reply_count`가 다시 필요해진다 (→ "오늘의 질문 — 답글").
- **`horoscopes` · `user_devices` · `notification_log`의 DDL이 마이그레이션에 없다** — 대시보드에서 수동 생성돼 스키마가 코드로 남아 있지 않다. 백업이 데이터만 담으므로 테이블이 통째로 사라지면 복원할 스키마가 없다 (→ "백업").
- **운영 확인 주기** — `hide_threshold`가 답변 4 · 답글 3으로 높은 편이라 자동 숨김이 잘 안 걸린다. 글의 노출 수명이 24시간이므로 신고 큐를 **매일** 봐야 한다 (→ "Supabase 설정").

> Phase 12·13·14(오늘의 질문 · 신고/차단 · 답글)는 마이그레이션 실행과 실기기 QA까지 끝났다(2026-08-17).

## 고정 정보

- 개인정보처리방침 URL: `https://jeongwon-cho.github.io/Ohaasa/privacy-policy.html`
- 커뮤니티 가이드라인 URL: `https://jeongwon-cho.github.io/Ohaasa/community-guidelines.html`
- `google-services.json`: 커밋 대상(앱 수신용) · Firebase service account JSON은 커밋 금지
- 앱 이름: **하루끄적** (부제 "하루 한 장, 그림일기" — App Store Connect에서 입력, 코드에 없다)
  - **`slug`·`bundleIdentifier`는 여전히 `ohaasa`다.** slug는 EAS 프로젝트 식별자라 바꾸면 프로젝트가 갈리고, bundleId는 스토어 등록 후 변경 불가다. 이름만 갈린 상태가 정상이다.
  - `app.config.js`의 `name`과 `JournalHeader.tsx`의 `APP_TITLE`은 **항상 같이 바꾼다.**
- 현재 버전: v1.7.0 - 보관함 탭 · 오늘의 질문 커뮤니티 탭 승격 · 앱 이름 변경

---

## 앱 구현 원칙

### 공통

- `service_role` 키는 앱에 절대 포함하지 않는다 — `EXPO_PUBLIC_` 접두사는 anon key만 사용
- `device_id`: `crypto.randomUUID()` 생성 후 AsyncStorage 영속화 (재설치 시 재생성)
- 네트워크 실패는 운세 조회를 막지 않는다. Supabase upsert 실패 → `console.warn`만 남김
- 별자리 전역 상태는 `ZodiacContext`로 관리 — 각 화면에서 AsyncStorage 직접 읽기 금지

### Push Notification

- **발송 주체**: Supabase Edge Function (`send-horoscope-notifications`). backend/main.ts는 알림을 직접 발송하지 않는다.
- **트리거**: horoscopes 테이블 INSERT → Database Webhook `horoscope_notify` → Edge Function. `zodiac_sign = 'aries'` row 1개만 처리해 중복 실행 방지.
- **dedup**: `notification_log` 테이블 — date 컬럼에 UNIQUE constraint 필수. INSERT 충돌(23505) 시 즉시 리턴.
- **기기 조회는 반드시 페이지네이션한다**(`fetchActiveDevices`, `DEVICE_PAGE_SIZE = 500`): PostgREST의 `db-max-rows`(기본 1000)는 초과분을 **에러 없이** 자른다. 상한 없이 받으면 발송 대상이 1000을 넘는 순간 1001번째부터 알림이 끊기는데 로그에는 `devices=1000`만 찍혀 정상으로 보인다. **이 상한은 플랜과 무관한 프로젝트 설정**(Settings → API → Max Rows)이라 Pro 전환으로 풀리지 않는다.
  - 페이지 크기는 `db-max-rows`보다 **작아야** 한다 — 같으면 "요청한 만큼 왔는가"로 다음 페이지 유무를 판정할 수 없다. 반대로 **`db-max-rows`를 `DEVICE_PAGE_SIZE` 이하로 낮추면 첫 페이지부터 500개 미만이 와서 루프가 즉시 끝난다** — 고치려던 조용한 잘림이 그대로 돌아온다. Max Rows를 건드릴 일이 생기면 이 상수도 같이 봐야 한다. (2026-08-18 실측: 이 프로젝트의 `db-max-rows`는 **1000**)
  - **`.order("device_id")`가 load-bearing이다.** `range`는 LIMIT/OFFSET이고 정렬 없는 OFFSET은 페이지 간 행 순서를 보장하지 않아 중복 발송·누락이 난다. **소규모 테이블에서는 재현되지 않으므로**(seq scan이 우연히 안정적) 테스트 통과를 근거로 빼면 안 된다.
- **재배포**: Edge Function 변경 시 `supabase functions deploy send-horoscope-notifications --project-ref khszicvinkgtqsyqiecc`
- **Android Expo Go (SDK 53+)**: remote push 제거됨. `push_token = NULL · platform = NULL · notifications_enabled = false`가 정상.
- **`expo-notifications` static import 금지**: `ExecutionEnvironment.StoreClient` guard 통과 후 `await import('expo-notifications')`로 동적 import.
- **`requestPushToken()`은 절대 throw하지 않는다**: 시뮬레이터·권한 거부·토큰 발급 실패 모두 `{ token: null, platform: null }` 반환.
- **push_token 없는 환경**: 알림 토글 `disabled` + "알림은 개발 빌드에서 사용할 수 있어요" 표시.
- **FCM V1 발송 자격증명**: `eas credentials` → Android → FCM V1 Google Service Account Key 등록. service account JSON은 절대 커밋 금지.

### 알림 권한 요청 플로우

- **최초 요청**: `hasAskedPushPermission = false` AND `pushToken = null`일 때 `(tabs)/index.tsx`에서 로딩 완료 후 1초 딜레이로 `PushPermissionSheet` 표시
  - "받을게요" → `requestPushToken()` → 토큰 저장 · `notificationsEnabled = true` · Supabase upsert
  - "나중에" → `hasAskedPushPermission = true`만 저장, 재표시 없음
- **설정 화면 토글**: `useFocusEffect` + `AppState` 리스너로 진입·포그라운드 복귀 시 권한 상태 재동기화
  - `canAskAgain = true` → 네이티브 권한 다이얼로그
  - `canAskAgain = false` → `NotificationDeniedSheet` → `Linking.openSettings()` → 복귀 시 `pendingActivationRef`로 자동 활성화
  - 시스템 권한 철회 시 토글 강제 `false` 동기화

### 보관함 탭 (archive)

홈 달력과 역할이 겹치지 않게 나눴다 — 달력은 "이번 달을 채우는" 자리고, 보관함은 "지금까지 그린 걸 훑는" 자리다. 그래서 빈칸을 그리지 않고 기록이 있는 날만 최신순으로 붙인다.

- **칸 폭이 90px을 넘으면 안 된다.** `SketchThumbnail`은 `TEXTURE_ABOVE = 90` 위에서 모눈·질감을 살리려고 Skia `<Canvas>`로 그리는데, Canvas 하나하나가 네이티브 뷰라 스크롤로 칸이 계속 쌓이는 격자에서는 그 비용이 그대로 붙는다. 그래서 **넓은 화면에서 칸을 키우지 않고 열을 늘린다**(`columnsFor()`) — iPhone 4~5열, iPad(`maxContentWidth` 600 상한) 6열, 칸은 항상 88px 이하다. 상한이 90이 아니라 88인 건 반올림으로 경계에 걸치지 않게 하는 여유. **3열로 바꾸면 iPhone에서 칸이 114px이라 이 함정에 곧장 걸린다.**
- **달 목록과 본문을 분리해서 읽는다**(`useJournalArchive`). `loadJournalDates()`는 AsyncStorage 키만 훑어 파싱이 없고, 본문은 화면에 닿은 달만 `loadMonthJournals()`로 2달씩 붙인다. 한 번에 다 읽으면 1년치 1.9MB를 첫 진입에 역직렬화하게 된다(→ `journal.ts`의 PREFIX 주석).
- **`refresh()`는 이미 읽은 달도 다시 읽는다.** 일기를 고치고 돌아왔을 때 내용이 바뀌었는지는 키 목록만으로 알 수 없기 때문이다. 달이 쌓일수록 이 재조회가 무거워지므로 expo-file-system으로 옮길 때 같이 손봐야 한다.
- **아직 본문을 안 읽은 달은 섹션으로 내보내지 않는다.** 넘기면 "0장" 헤더가 먼저 떴다가 그림이 뒤늦게 채워지는 게 보인다.
- **월 헤더는 sticky + 알약이다.** 배경이 그라데이션(`#FAF6F0`→`#EAD5CE`)이라 불투명 띠를 깔면 스크롤할수록 헤더 색만 제자리에 남아 경계가 드러난다. `stickySectionHeadersEnabled`는 **안드로이드 기본값이 `false`**라 명시해야 한다.
- **안전영역(`insets.top`)은 `contentContainerStyle`이 아니라 리스트 바깥에 준다.** sticky 헤더는 콘텐츠 패딩을 무시하고 스크롤 뷰포트 맨 위에 붙으므로, 다른 화면들처럼 `paddingTop: insets.top + spacing.md`를 콘텐츠에 주면 **달 알약이 상태바와 겹친다.** 이 화면만 `ResponsiveContainer`가 위쪽 인셋을 갖는 이유다.
- 칸을 누르면 `/journal-view`로 간다. 상세 시트를 따로 두지 않는다 — 정식 읽기 화면이 이미 있다.
- **`sketchbook.tsx`는 조회 화면이 아니라 샘플 데이터 도구다**(설정 > DEV > "샘플 데이터"). 달력을 여기서까지 그리면 홈·보관함과 세 벌이 되므로 걷어냈다. 달 스테퍼로 **지난 달을 채울 수 있어야 한다** — 월초에는 "이번 달 채우기"가 며칠치밖에 안 만들어 보관함의 스크롤·달 페이지네이션을 확인할 수 없다.

### 통계 화면 (stats.tsx)

- **역할 분리**: `stats.tsx`는 orchestration(훅 호출 · state · 카드 조합)만 담당하고, UI 섹션은 `src/components/stats/`의 독립 컴포넌트로 둔다.
- **데이터 훅**: `useHoroscopeTrends(zodiacSign, period, compareSign?)` — 기간 내 전체 별자리 rank rows를 한 번에 받아 클라이언트에서 가공. `CUTOFF_BUFFER_DAYS = 3`으로 크론 미실행 날 대응.
- **등수 표시**: 기본은 `roundedRank`(반올림값이 같으면 공동 등수 부여 후 다음 번호 스킵 — 3.4·6.1·6.8 → 1/2/2/4위), 자세히 모드는 `exactRank` + 소수점 1자리. `detailMode`는 저장하지 않아 재진입 시 리셋되고, 공유 카드는 토글과 무관하게 항상 정수.
- **화살표 트렌드 기준**: 그날의 원본 운세 순위(1~12)가 아니라 **기간 평균 공동 등수(`roundedRank`)의 어제 대비 변화** — 같은 길이의 윈도우를 하루 앞당겨 재계산한다.

### 오늘의 질문

이 앱에서 처음으로 서버에 저장되는 공개 UGC. "내 생각을 먼저 남기게" 하는 것이 핵심이라 작성 전에는 커뮤니티 피드를 보여주지 않는다.

- **보안**: 공개 피드 조회는 `device_id` 컬럼을 절대 select하지 않는다 (→ Supabase 설정 섹션). "내 글" 판별은 `fetchMyAnswerId()`로 따로 조회.
- **로컬 우선 저장**: 공개/비공개 무관하게 `questionAnswers.ts`(AsyncStorage)가 source of truth. 공개일 때만 `question_answers` 테이블에 미러링.
- **질문 콘텐츠**: `getQuestionByDate(date)` — 반복 주기를 길게 하려고 날짜의 일(day)이 아닌 day-of-year 기준 순환.
- **수정 가능 기간**: 비공개 답변은 언제든, 공개 답변은 **올린 날에만** 수정 가능하고 이후에는 삭제만 남긴다(`canEditAnswer()`). 남들이 읽고 공감한 글의 내용이 뒤바뀌는 걸 막기 위함. 판단 기준은 `date`(= 방송일)가 아니라 `createdAt` — 방송일은 실제 오늘과 어긋날 수 있다.
- **자동 욕설 필터 없음**: 사전 검열은 하지 않는다. 사후 대응(신고 → 임계값 자동 숨김 → 수동 검토)만으로 간다.

#### 진입 경로가 둘이다 (커뮤니티 탭 · 스택 라우트)

화면 몸통은 `DailyQuestionView`가 갖고, 라우트는 둘이 공유한다.

| | 커뮤니티 탭 `(tabs)/community.tsx` | 스택 `daily-question.tsx` |
|---|---|---|
| 날짜 | `latestDate`(방송일), 파라미터 없음 | `date` 파라미터 |
| 용도 | 오늘 질문 | 지난 글 수정(`mode=edit`, 기록 탭) |

- **한 라우트로 합치면 안 된다.** 탭은 언마운트되지 않아 `date`·`mode` 파라미터로 다시 진입시켜도 `stepInitialized` 가드에 막혀 수정 화면이 안 열린다.
- **탭이 넘기는 날짜는 로컬 "오늘"이 아니라 `latestDate`(오하아사 방송일)다.** `question_answers`가 `unique(question_date, device_id)`라, 크롤러가 늦은 날이나 KST 05:59 이전 시간대에 로컬 날짜로 쓰기 시작하면 안드로이드 v1과 **다른 행**에 저장돼 같은 날 피드가 조용히 둘로 쪼개진다. 대가로 커뮤니티 탭이 `horoscopes` 조회(`HoroscopeDateContext`)를 기다린다 — 그림일기 앱인데 커뮤니티가 운세 테이블에 묶여 있는 셈이다.
- **`useBottomTabBarHeight()`는 탭 네비게이터 바깥에서 부르면 throw한다.** `DailyQuestionView`는 스택 라우트도 쓰므로 안에서 부를 수 없어, 탭 래퍼가 읽어 `chrome={{ kind: 'tab', tabBarHeight }}`로 넘긴다. 값이 'tab'일 때만 존재하도록 묶어 타입이 강제한다.
- **탭에서는 `useFocusEffect` 자동 재조회를 붙이지 않는다.** 탭이 되면서 마운트가 1회로 줄어 egress는 오히려 좋아졌는데, 습관적으로 붙이면 **탭 전환마다 1000행 쿼리 두 개**(`fetchPublicAnswers` + `fetchRepliesForAnswers`)가 돈다. 당겨서 새로고침이 이미 있다.
- **방송일 경계에서 단계를 리셋한다.** 탭이 안 죽으니 05:59를 넘겨도 상태가 그대로라, 어제 답을 썼다는 이유로 오늘 질문에서 작성 화면을 건너뛰고 피드가 먼저 열린다. effect가 아니라 렌더 중 조정으로 처리한다(effect면 낡은 단계가 한 프레임 보인다).
- **탭의 뒤로가기 버튼은 수정 중(`returnToCommunity`)일 때만 보인다.** 탭엔 나갈 곳이 없어 평소엔 감추는데, 그대로 두면 "수정하기"로 작성 화면에 들어간 뒤 저장 말고는 빠져나올 길이 없다. 삭제 후에도 `router.back()` 대신 작성 단계로 되돌린다.
- **"작성 먼저" 원칙은 탭에서도 유지한다** — 탭을 눌러도 답을 남기기 전에는 피드가 안 열린다. 데이터 계층에도 걸려 있다(`useAnswerFeed(step === "community" ? questionDate : null, ...)`).
- 진입 경로 정리: `horoscope.tsx`의 오늘의 질문 카드는 **`isLatest`일 때만** 탭으로 보낸다. 과거 날짜를 골라 본 상태면 그 날짜의 질문을 열어야 하므로 스택 진입을 유지한다.

### 오늘의 질문 — 신고 · 차단

로그인이 없어도 `device_id`가 이미 "같은 사람이 100번 신고 못 하게" 막는 식별자 역할을 한다. 진짜 문제는 차단이었다 — 피드에 `device_id`를 절대 내려보내지 않으므로 클라이언트에 "이 사람" 을 가리킬 키가 없었다.

- **`author_hash`가 차단 키**: `sha256(device_id || PEPPER)`를 생성 컬럼으로 두고 피드에 함께 내려보낸다. `device_id`는 v4 UUID(122비트)라 역산이 불가능하고, 해시로는 어떤 RLS도 통과할 수 없다(쓰기 경로는 전부 `device_id` 매칭). **PEPPER를 바꾸면 사용자들의 차단 목록이 전부 무효화되므로 고정 값으로 둔다.**
- **차단은 기기 로컬 전용**(`moderation.ts`). 서버에 사용자별 차단 목록을 걸 주체가 없다. `author_hash`가 기기별로 안정적이라 차단이 다음 날 올라오는 글에도 계속 적용된다. 재설치 시 초기화되지만 `device_id`도 함께 재생성되므로 감수한다.
- **신고는 낙관적이되 실패는 되돌린다**: 먼저 숨기고, 서버 전송이 실패하면 숨김을 취소하고 토스트로 알린다. 실패를 삼키면 사용자는 접수됐다고 믿는데 서버엔 아무것도 없어 그 글이 영영 검토되지 않는다. "그냥 안 보고 싶다"는 요구는 차단(로컬 전용이라 항상 성공)이 담당한다.
- **RLS 정책만으로는 안 된다 — GRANT가 필요하다**: 이 프로젝트는 `public` 스키마 기본 권한이 `anon`에게 DML(SELECT/INSERT/UPDATE/DELETE)을 주지 않는다. `TRUNCATE·REFERENCES·TRIGGER`만 딸려온다. 정책은 GRANT로 허용된 것 중 어떤 행인지를 거르는 층이라, **GRANT 없이 정책만 만들면 `permission denied`로 전부 막힌다.** 새 테이블을 만들 때마다 `grant ... to anon;`을 마이그레이션에 명시할 것. (`question_answer_reports`가 이 함정에 걸려 신고가 한 건도 안 들어갔다.)
- **GRANT는 `anon`만으로 끝나지 않는다 — `service_role`도 챙겨야 한다.** 기존 마이그레이션이 전부 `to anon`만 줘서 `question_answers` 계열 6개 테이블은 **service_role로도 `permission denied`**가 났다. 앱이 anon으로만 접근하니 그동안 드러나지 않았고, 대시보드에서 만든 `horoscopes`·`user_devices`·`notification_log`는 기본 권한이 붙어 정상이라 대비 때문에 더 헷갈렸다. 백업 워크플로우가 service_role로 전 테이블을 훑다가 처음 걸렸다(`supabase/migrations/20260819000000_grant_service_role_select.sql`). **답글 푸시 알림도 같은 벽에 부딪힌다** — Edge Function이 service_role로 `question_answer_replies`를 읽어야 하기 때문이다.
- **Modal 중첩 금지**: 차단 확인은 별도 `ConfirmDialog`가 아니라 `AnswerModerationSheet`의 3번째 단계(`confirmBlock`)로 처리한다. `BottomSheet`는 닫기 애니메이션(240ms)이 끝난 뒤에야 내부 Modal을 언마운트하므로, 시트를 내리면서 곧바로 두 번째 Modal을 present하면 iOS가 조용히 무시해 **다이얼로그가 아예 뜨지 않는다**. 시트 위에 뭔가를 더 띄워야 하면 항상 시트 안의 단계로 만들 것.
- **`author_hash` 방어**: 값이 비어 있으면 차단을 건너뛴다. `Set`에 `undefined`가 들어가면 `author_hash` 없는 글이 전부 한꺼번에 사라진다.
- **EULA(App Store 심사 지침 1.2)**: 공개 답변 작성 화면(`QuestionAnswerForm`)에 무관용 정책 고지 + `docs/community-guidelines.html` 링크를 노출한다. 기본 visibility가 `public`이라 별도 조작 없이 보인다. 설정 > COMMUNITY에서도 접근 가능하고, 같은 섹션에 "차단한 사용자 N명 · 전체 해제"를 둔다 — **해제 수단이 없으면 심사에서 문제가 된다.** 답글 작성창에는 이 고지를 **두지 않는다** — 커뮤니티 피드는 답변을 남겨야만 들어올 수 있어서 답글을 쓸 수 있는 사람은 전원 `QuestionAnswerForm`의 고지를 이미 거쳤다. 1.2가 실제로 요구하는 신고·차단 수단은 답글의 ⋯ 메뉴에 있다.

### 오늘의 질문 — 답글

`AnswerCard` 안에서 인라인으로 펼쳐지는 1단계 답글(답글의 답글은 없다). 서버 스키마는 위 "Supabase 설정" 참고.

- **`reply_count` 비정규화 컬럼을 두지 않았다.** 배지에 보여야 하는 건 "서버의 답글 수"가 아니라 **"이 기기에 보이는 답글 수"**인데, 차단·로컬 숨김은 서버가 알 수 없고 자동 숨김도 부모 카운트를 줄여주지 않는다. 대신 하루치를 `fetchRepliesForAnswers(answerIds)` 한 번으로 받아 배지와 목록을 **같은 배열**에서 뽑는다 — 둘이 어긋날 수가 없다.
- **이 설계는 "피드가 무페이지네이션"이라는 전제 위에 있다.** 페이지네이션을 도입하는 순간 답글은 펼칠 때 지연 로딩으로 가야 하고, 그때는 배지용 `reply_count`가 (부정확함을 감수하고) 다시 필요해진다. `REPLY_FETCH_LIMIT = 1000`이 그 한계선이다.
- **차단 Set은 `useAnswerFeed`가 소유하고 `useAnswerReplies`는 넘겨받는다.** 각자 `getBlockedAuthors()`를 읽으면 답글에서 차단했을 때 그 사람의 답변 카드는 화면에 남고 그 아래 답글만 사라진다.
- **`upsertPublicAnswer`가 `ON CONFLICT DO UPDATE`여야 답글이 산다.** delete + insert로 바꾸면 답변을 수정할 때마다 달린 답글이 cascade로 전부 날아간다.
- **소유권 판정은 `fetchMyReplyIds`**(`answer_id → reply_id`). `device_id`가 클라이언트에 없어 피드만으로는 내 글을 알 수 없다. 이 조회는 **`hidden_at`을 필터하지 않는다** — 자동 숨김된 내 답글이 있는데 작성창을 다시 열어주면 숨김을 우회해 새로 쓸 수 있다. 대신 "숨겨졌어요 + 삭제" 안내만 남긴다.
- **저장은 낙관적이지 않다**(`saveReply`). `id`·`created_at`·`author_hash`가 서버 생성인데 공감·삭제·수정기한 판정에 즉시 필요해서, `.select().single()`로 저장된 행을 받아 목록에 끼워 넣는다. 삭제·공감·신고는 낙관적 + 롤백(답변과 동일).
- **"올린 날에만 수정"은 답글도 같다**(`canEditByCreatedAt`). 로컬 미러가 없어 서버 `created_at`으로 판단하며, 답변과 마찬가지로 **앱 UI에서만 막는다**(RLS는 `USING(true)`).
- **본문 100자가 두 곳에 정의돼 있다** — SQL `check`와 `ReplyComposer.MAX_LENGTH`. 어긋나면 앱은 통과시키고 서버가 거절해 `console.warn`만 남고 조용히 실패한다.
- **`ConfirmDialog`가 두 개(답변 삭제·답글 삭제)다.** 동시에 `visible`이 되면 iOS가 하나를 조용히 무시하므로 `pendingDeleteReplyId !== null && !deleteDialogVisible`로 구조적으로 막아둔다. 모더레이션 시트가 열린 상태에서 다이얼로그를 띄우는 경로는 만들지 않는다.
- **당겨서 새로고침**은 커뮤니티 단계에만 붙는다(`RefreshControl`). 실시간 구독이 없어 남이 쓴 답글은 재진입해야 보였다. `refreshing`을 내릴 때 `sawBusyRef`를 거치는 이유: `refetch`는 tick만 올리는 동기 함수라 그 렌더의 `feedLoading`이 아직 `false`다 — 그대로 비교하면 로딩이 시작되기도 전에 스피너가 꺼진다.
- **키보드**: 인라인 작성창이 생기면서 `TouchableWithoutFeedback onPress={Keyboard.dismiss}`를 `step === "answer"` 분기만 감싸도록 옮겼다. 커뮤니티 단계까지 감싸면 작성창 여백·카운터를 눌러도 키보드가 내려간다. iOS는 `behavior="padding"`이 포커스된 입력창을 스크롤해주지 않으므로 포커스 시 `measureInWindow` + `scrollTo`로 직접 올린다(`androidKeyboardHeight`는 안드로이드 전용 패딩이라 별도 `keyboardHeightRef`를 쓴다 — 섞으면 iOS에서 이중 패딩이 된다).

### 오늘의 질문 — 내 답변 고정 카드 · 새 답글 배지

내 글에 달린 답글을 보려면 피드를 스크롤해 내 카드를 찾아야 했다. 사용자가 늘수록 나빠지는 구조라 **내 답변을 목록에서 빼고 상단 고정 카드(`MyAnswerCard`)가 전담**하게 했다. 스크롤 위치를 계산해 이동시키는 대신 자리를 고정한 이유: `ScrollView` + `map` 구조라 카드마다 `onLayout`을 달아야 하고, 그래도 사용자는 "가서 봐야" 한다.

- **`MyAnswerCard`는 로컬·서버 혼합이다.** 본문·공개여부·수정가능 판정은 AsyncStorage(`existingAnswer`)가 source of truth고, 공감 수와 답글만 서버에서 온다. 비공개 답변은 서버에 행이 없어 답글이 달릴 수 없으므로 `replies` prop 자체를 넘기지 않는다 — 전부 있거나 전부 없거나라서 값 하나로 묶어 타입이 강제하게 했다.
- **`answerIds`는 `feedAnswers`가 아니라 `answers` 기준이어야 한다.** 목록에서 뺀 내 답변의 답글까지 조회에서 빠지면 고정 카드가 빈 채로 남는다. 다른 별자리 필터를 걸면 `answers`에서도 내 답변이 빠지므로 그때는 `myAnswerId`를 따로 얹는다(공감 수는 못 받아오므로 `likeCount = null`로 숫자를 감춘다).
- **읽음 기준값은 `now()`가 아니라 본 답글의 `created_at`이다**(`lib/replySeen.ts`). `created_at`은 서버 시계라, 기기 시계가 조금이라도 뒤처지면 `now()`로 저장한 순간 방금 읽은 답글이 그 기준보다 미래가 되어 영영 새 답글로 남는다.
- **읽음 처리는 펼침 이벤트가 아니라 "펼쳐져 있는 동안"의 상태로 잡는다**(`useNewReplyBadge`). 당겨서 새로고침으로 답글이 들어오는 경로가 있어서, 이벤트에만 걸면 이미 화면에 보이는 답글에 배지가 다시 붙는다.
- `replySeen.ts`를 `moderation.ts`와 나눈 이유: 저쪽은 "안 보기로 한 것"의 목록이고 이쪽은 열람 기록이라 `clearModerationState()`가 같이 지우면 안 된다(차단만 풀었는데 배지가 되살아난다).
- 피드가 비었을 때 문구가 갈린다 — 내 공개 답변이 있으면 "아직 다른 사람의 생각이 없어요", 없으면 "아직 남겨진 생각이 없어요".
- **답글 푸시 알림은 아직 없다.** 위치 문제는 이걸로 사라지지만 "반응이 왔는지"를 알려면 앱을 열어야 한다. 하려면 `question_answer_replies` INSERT 트리거 → Edge Function → 부모 `device_id`의 push token 조회가 필요하다(피드에 `device_id`를 안 내려보내므로 발송 판단은 서버에서만 가능).

### 운세 리뷰

- **저장소**: AsyncStorage 로컬 전용(`ohaasa:daily_reviews:v1`, 레코드 id = `{date}:{zodiacSign}`). `syncedAt/remoteId`는 미래 서버 동기화용 예약 필드.
- **키보드 대응**: Android는 `keyboardDidShow`로 높이를 직접 관리, iOS는 `KeyboardAvoidingView behavior="padding"`.
- **`date` URL 파라미터**: 기록 탭 "수정하기"로 특정 날짜에 진입할 때 사용. 날짜는 항상 fallback 체인을 거쳐 Supabase 조회가 실패해도 기존 리뷰를 열 수 있게 한다.

### 통계 기록 탭

- **리로드**: `useReviewHistory`는 `useFocusEffect`로 탭 진입·복귀 시 자동 리로드(리뷰 작성 후 돌아와도 즉시 반영). `useQuestionAnswerHistory`는 화면 이동 없이 삭제가 일어나므로 수동 `refetch()`도 노출한다.
- **오늘의 질문 통합**: 별도 탭 없이 기존 캘린더에 리뷰 마커와 구분되는 보조 마커로 표시.
- **바 차트 width**: percentage string 타입 에러 회피를 위해 `flex: count` / `flex: maxCount - count` 방식 사용.

### 이미지 저장 / SNS 공유

- **라이브러리**: `expo-media-library` + `expo-sharing` + `react-native-view-shot`
- **저장**: `saveToLibraryAsync()` + `requestPermissionsAsync(true)` (writeOnly). writeOnly면 granular 권한(READ_MEDIA_*)은 런타임에 아예 요청되지 않는다(`MediaLibraryModule.kt`의 `shouldIncludeGranular = ... && !writeOnly`) — 매니페스트에 남아도 죽은 선언이지만 스토어 권한 목록에는 그대로 노출된다.
- **공유**: `captureRef()` → `shareAsync(uri, { mimeType: 'image/png' })` — 추가 권한 불필요.
- **동적 import**: `await import('expo-media-library')` — static import 금지.
- **구현 위치**: `src/hooks/useShareHoroscope.ts`

#### Android 권한 다이어트

매니페스트는 `expo prebuild`가 생성하고 `android/`는 .gitignore 대상이라, **직접 고친 건 다음 빌드에 전부 날아간다. 반드시 config plugin으로 처리할 것.**

- **granular 권한은 `granularPermissions: []`로 끈다** — `expo-media-library` 플러그인 옵션. 기본값이 `['photo','video','audio']`라 두면 READ_MEDIA_IMAGES/VIDEO/AUDIO 셋이 다 박힌다. 애초에 안 넣는 공식 옵션이 있으므로 넣었다가 빼는 방식보다 낫다.
- **`SYSTEM_ALERT_WINDOW`는 우리 것도, 라이브러리 것도 아니다** — `@expo/config-plugins`의 bare 템플릿 보일러플레이트(`withAndroidBaseMods.js`, 주석에 "REMOVE WHATEVER YOU DO NOT NEED"라고 적혀 있다). prebuild마다 되살아나므로 `plugins/withoutSystemAlertWindow.js`가 걷어낸다.
- **이 권한에는 `tools:node="remove"`를 쓰면 안 된다** — main 매니페스트에 넣는 AAR이 없어서 단순 필터로 충분하고, remove를 걸면 `react-native`의 **debug** 매니페스트까지 지워져 개발 빌드의 개발자 메뉴·레드박스 오버레이가 깨진다.
- **`--clean` 없는 prebuild로는 검증이 안 된다**: 기존 매니페스트에 덧쓰기만 하므로 예전에 추가된 권한은 그대로 남는다. EAS는 레포를 새로 클론해 `android/`가 없는 상태로 시작하니 실제 빌드에는 문제없다.
- 남아야 정상인 것: `INTERNET · VIBRATE · POST_NOTIFICATIONS · READ/WRITE_EXTERNAL_STORAGE · READ_MEDIA_VISUAL_USER_SELECTED`. 뒤의 셋은 expo-media-library 소스 매니페스트에서 온다.
- **검증은 반드시 산출물로 한다** — `android/app/src/main/AndroidManifest.xml`은 소스일 뿐이고, `tools:node="remove"` 항목이 그대로 남아 있어 정적 스캐너가 오탐한다. Gradle manifest merger를 거친 최종 결과를 봐야 한다.
  - APK: `$ANDROID_HOME/build-tools/<ver>/aapt2 dump permissions <파일>.apk`
  - AAB: aapt2로는 못 읽는다(proto 포맷). `unzip -p <파일>.aab base/manifest/AndroidManifest.xml | strings | grep -o "android\.permission\.[A-Z_]*" | sort -u`

#### iOS privacy manifest (ITMS-91053)

애플은 required reason API를 **바이너리 심볼 기준으로** 검사한다. 코드가 실제로 그 경로를 타는지는 무관하고, 링크된 프레임워크에 심볼이 있으면 선언이 있어야 한다. 선언은 앱 레벨 `PrivacyInfo.xcprivacy`와 각 pod의 `<Pod>_privacy.bundle`을 **합집합**으로 본다.

- **`ExpoFileSystem_privacy.bundle` / `ExpoMediaLibrary_privacy.bundle`은 빈 껍데기로 빌드된다** — podspec에 `resource_bundles`가 선언돼 있고 `node_modules/expo-file-system/ios/PrivacyInfo.xcprivacy` 원본도 있는데, IPA에는 `Info.plist`만 담겨 들어온다. 다른 pod들(`React-Core_privacy` 등)은 정상이라 이 둘만의 문제다.
- 그 결과 **DiskSpace 선언이 IPA 어디에도 없는데** `ExpoFileSystem.framework`는 `NSFileSystemFreeSize` · `NSURLVolumeAvailableCapacityForImportantUsageKey` · `NSURLVolumeTotalCapacityKey`를 참조한다 → 업로드 시 ITMS-91053. `app.config.js`의 `ios.privacyManifests`로 앱 레벨에 직접 선언해 막았다.
- **`ios.privacyManifests`는 덮어쓰지 않고 병합한다**(`@expo/config-plugins`의 `PrivacyInfo.js` `mergePrivacyInfo`) — 기본 생성되는 FileTimestamp·UserDefaults·SystemBootTime은 그대로 남으므로 부족한 카테고리만 추가하면 된다.
- expo/RN 프레임워크가 자체 `PrivacyInfo.xcprivacy`를 안 갖고 있다고 지적하는 스캐너는 **오탐이다.** CocoaPods는 privacy manifest를 프레임워크 안이 아니라 앱 번들 루트의 `<Pod>_privacy.bundle`로 내보낸다. 프레임워크 디렉토리만 뒤지면 전부 "missing"으로 보인다.
- 검증 (IPA 압축 해제 후 `Payload/*.app` 기준):
  - 선언 집합: `find . -name "PrivacyInfo.xcprivacy" -exec plutil -p {} \; | grep NSPrivacyAccessedAPIType\"`
  - 실제 사용: `nm -um Frameworks/<X>.framework/<X> | grep -i "volume\|systemfree\|statfs"`
  - 이 둘을 대조해 **사용은 있는데 선언이 없는 카테고리**를 찾는다.

---

## 배포 전 체크리스트

> **배포 전 반드시 수기로 확인할 것. 자동으로 올라가지 않는다.**

- [ ] `app/app.config.js`의 `version` 필드를 올렸는가?
- [ ] 이 파일(`CLAUDE.md`) 하단의 "현재 버전"을 같은 값으로 수정했는가?
- [ ] `app/app/(tabs)/settings.tsx` 푸터의 버전 텍스트(현재 `v1.6.0`)도 같이 고쳤는가? (하드코딩되어 있다)
- [ ] `docs/` 변경분을 push해 GitHub Pages에 반영했는가? (앱 내 링크가 404가 되면 심사에서 걸린다)
- [ ] `supabase/migrations/` 신규 SQL을 실행했는가? (`supabase/`는 .gitignore 대상이라 CI가 대신 해주지 않는다)
- [ ] **GRANT가 실제로 붙었는지 확인했는가?** 새 테이블마다 필수다 — `question_answer_reports`가 이 함정에 걸려 신고가 한 건도 안 들어간 적이 있다. 검증 SQL은 답글 마이그레이션 하단 `-- (f)` 주석 참고.
- [ ] **`author_hash` PEPPER가 테이블 간 일치하는가?** 오타 하나면 차단이 절반만 걸린다. 검증 SQL은 같은 파일 `-- (g)` 주석 참고.

버전은 `app.config.js` 한 곳만 고치면 EAS 빌드에 반영된다. CLAUDE.md의 "현재 버전"은 대화 맥락용 메모이므로 같이 맞춰줘야 한다.

- **`versionCode`·`buildNumber`는 손대지 않는다** — `eas.json`이 `appVersionSource: "remote"` + production `autoIncrement: true`라 EAS가 서버에서 관리한다. `app.config.js`에 적으면 원격 값과 두 개의 진실이 된다. 수기로 올릴 것은 마케팅 버전(`version`)뿐이다.
- **`expo-doctor`의 "Patch version mismatches"는 세트로만 움직인다.** doctor가 말하는 `expected`는 설치된 expo의 `bundledNativeModules`가 아니라 **Expo API의 최신 패치 목록**이다(그래서 expo 자신이 요구하는 버전보다 높게 뜬다). 일부만 올리면 `expo`가 요구하는 예전 버전이 `node_modules/expo/` 아래에 중첩 설치되어 **같은 네이티브 모듈이 두 벌**이 된다 — 오토링킹 사고. `npx expo install --fix`로 전부 같이 올리거나, 전부 두거나 둘 중 하나다. 패치 차이만 남은 상태로 배포하는 건 문제없다(EAS는 lockfile로 설치하고, lockfile은 내부적으로 일관된 한 세대다). 2026-08-17에는 `expo@56.0.20`이 요구하는 `expo-file-system@~56.0.10`이 npm에 없어서(`sdk-56` 태그가 56.0.9에서 멈춤) `--fix` 자체가 불가능했다 — 업스트림 publish 누락이므로 기다렸다가 다시 돌린다.

---

## 개발 원칙

- 한 번에 하나의 Phase/Step만 구현한다
- Secret 키 원문을 로그에 출력하지 않는다
- 크롤링 실패 → exit 1. 알림은 Edge Function이 독립적으로 처리하므로 backend에서 관여하지 않는다.
- 스키마/API 구조 변경은 테스트로 먼저 감지한다
