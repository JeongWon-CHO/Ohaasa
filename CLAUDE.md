# CLAUDE.md — ohaasa / 하루끄적

## 프로젝트 개요

아사히방송 별자리 운세 JSON을 수집·번역해 Supabase에 저장하고, React Native Expo 앱에서 운세·그림일기·오늘의 질문을 제공한다.

- 앱 이름: **하루끄적** / 부제: `하루 한 장, 그림일기`
- 로그인 없음. 사용자는 AsyncStorage의 영속 UUID `device_id`로 식별한다.
- 현재 버전: `1.8.0`

## 구조

```text
app/app/                     Expo Router 화면
app/src/components/          공통 및 화면별 UI
app/src/hooks/               화면 간 재사용 로직
app/src/context/             전역 상태
app/src/lib/                 Supabase·AsyncStorage·플랫폼 경계
app/src/constants/           정적 데이터
backend/src/                 운세 수집·번역·저장 파이프라인
supabase/functions/          Edge Functions
supabase/migrations/         DB 스키마와 RLS
.github/workflows/           크롤링·백업 자동화
docs/                        개인정보처리방침·커뮤니티 가이드라인
```

화면은 훅 호출, 상태, 컴포넌트 조합만 담당한다. UI 섹션은 `components/<화면명>/`, 데이터 로딩과 가공은 `hooks/`, 플랫폼·서버·로컬 저장 경계는 `lib/`에 둔다. `stats.tsx`가 기준 구현이다.

## 데이터 흐름

```text
GitHub Actions (매일 KST 05:59)
  → backend: 아사히 API 또는 주말 고고별자리 수집
  → GPT 번역
  → Supabase horoscopes upsert
  → Database Webhook (aries INSERT 1회)
  → send-horoscope-notifications Edge Function
  → Expo Push API
```

- 원본 API: `https://www.asahi.co.jp/data/ohaasa2020/horoscope.json`
- 주말은 고고별자리를 사용하며 `isWeekendJST()`에서 분기한다.
- 운세 필드: `date`, `zodiac_sign`, `zodiac_name`, `rank`, `advice`, `advice_ko`.
- 앱 표시는 `advice_ko ?? advice`이며 날짜는 로컬 오늘이 아니라 최신 방송일 기준이다.
- 번역은 원문이 같고 `advice_ko`가 있으면 건너뛴다.

## 보안과 환경변수

- 앱에는 `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, Firebase 서비스 계정 JSON을 절대 포함하거나 출력하지 않는다.
- 앱은 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`만 사용한다.
- `google-services.json`은 앱 수신 설정이므로 커밋 가능하다.
- 공개 피드 쿼리에서 `device_id`를 절대 select하지 않는다.
- 새 Supabase 테이블은 RLS 정책뿐 아니라 필요한 `GRANT`를 `anon`과 `service_role`에 명시한다.
- 환경변수 값과 토큰을 로그·문서·커밋에 남기지 않는다.

## 앱 데이터 원칙

- `device_id`는 `crypto.randomUUID()`로 만들고 AsyncStorage에 영속화한다. 재설치 시 바뀐다.
- 별자리는 `ZodiacContext`가 소유한다. 화면에서 AsyncStorage를 직접 읽지 않는다.
- 로컬 데이터의 source of truth는 `src/lib/`의 저장 모듈이다.
- 서버 호출은 `src/lib/supabase.ts`를 거친다.
- 네트워크·기기 등록 실패가 운세 조회 화면을 막아서는 안 된다.
- `expo-notifications`, `expo-media-library`는 지원 환경 확인 뒤 동적 import한다.

### 운세 조회

- 날짜별 12행은 `useHoroscope.ts`의 세션 캐시와 `inFlight` Map을 공유한다.
- 빈 결과를 캐시하면 크론이 늦은 날 해당 세션에서 계속 빈 화면이 되므로 캐시하지 않는다.
- 최신 방송일은 KST 05:59에 바뀌므로 캐시 고정 금지, TTL은 5분이다.
- `HOROSCOPE_COLUMNS`와 `types/horoscope.ts` 필드는 함께 변경한다.
- 일본어 `advice`는 번역 실패 시 유일한 fallback이므로 조회 컬럼에서 빼지 않는다.
- `HoroscopeDateSheet`는 닫혀도 마운트되므로 `visible`을 조회 훅에 전달한다. 그렇지 않으면 화면 진입마다 열지도 않은 시트가 120행을 조회한다.
- 트렌드 쿼리는 기간에만 의존한다. 별자리 값을 deps에 넣으면 필터 토글마다 30일치 전체 행을 다시 받는다.

### 로컬 기록

- 운세 리뷰: AsyncStorage `ohaasa:daily_reviews:v1`, id는 `{date}:{zodiacSign}`.
- 보관함은 키 목록을 먼저 읽고 본문은 월 단위로 지연 로딩한다.
- `SketchThumbnail`이 90px을 넘으면 Skia Canvas가 생기므로 보관함 셀은 88px 이하를 유지한다.
- 보관함 `refresh()`는 수정된 본문을 감지할 수 있도록 이미 읽은 달도 다시 읽는다.
- sticky 월 헤더의 상단 inset은 `contentContainerStyle`이 아니라 리스트 바깥에 둔다. 내부 패딩은 sticky 위치에 적용되지 않아 상태바와 겹친다.
- `stickySectionHeadersEnabled`는 Android 기본값이 false이므로 명시한다.
- `expo-media-library` 저장은 `requestPermissionsAsync(true)`와 동적 import를 사용한다.

## 푸시 알림

- 발송 주체는 `send-horoscope-notifications` Edge Function이다. `backend/src/main.ts`에서 발송하지 않는다.
- Webhook은 `horoscopes` INSERT 중 `zodiac_sign = 'aries'` 행 하나만 처리한다.
- 중복 방지는 `notification_log.date`의 UNIQUE 제약과 충돌 코드 `23505`를 기준으로 한다.
- 기기 조회는 `fetchActiveDevices`에서 `device_id` 정렬 + 500개 페이지네이션을 유지한다.
- PostgREST는 `db-max-rows` 초과분을 에러 없이 자른다. 페이지 크기는 max rows보다 작아야 하며, max rows를 500 이하로 낮추면 종료 판정이 다시 깨진다.
- 정렬 없는 OFFSET 페이지네이션은 중복·누락될 수 있다. 소규모 데이터에서 우연히 안정적으로 보여도 `.order("device_id")`를 제거하지 않는다.
- `requestPushToken()`은 시뮬레이터·권한 거부·발급 실패에도 throw하지 않고 null 값을 반환한다.
- Android Expo Go에서는 원격 푸시가 없으므로 토큰과 플랫폼 null, 알림 비활성이 정상이다.
- 권한 설정에서 돌아오면 `AppState`로 재동기화한다. 시스템 권한이 꺼졌다면 앱 토글도 false로 맞춘다.
- 토큰 없는 환경에서는 알림 토글을 비활성화한다. 네트워크·등록 실패를 운세 화면 실패로 전파하지 않는다.
- FCM 서비스 계정 JSON은 EAS credentials에만 등록한다.

## 오늘의 질문과 공개 UGC

- 공개/비공개 답변 모두 `questionAnswers.ts`가 로컬 source of truth이고, 공개 답변만 Supabase에 미러링한다.
- `question_answers`는 `(question_date, device_id)` UNIQUE이며 upsert로 수정한다. delete+insert는 답글 cascade 삭제를 일으키므로 금지한다.
- 질문 날짜는 로컬 날짜가 아니라 최신 방송일을 사용한다.
- 비공개 답변은 언제든 수정 가능하고 공개 답변·답글은 작성 당일에만 수정 가능하다. 현재 서버가 아닌 UI 정책이다.
- 피드는 답변 작성 전에는 조회하거나 보여주지 않는다.
- 탭 라우트는 오늘 질문, 스택 라우트는 과거 기록 수정을 담당한다.
- 두 라우트를 합치지 않는다. 탭은 언마운트되지 않아 재진입 파라미터가 초기화 가드에 막힌다.
- 탭은 KST 05:59 방송일 경계에서 작성/피드 단계를 리셋한다. 그렇지 않으면 어제의 작성 상태로 오늘 피드가 먼저 열린다.
- 탭 전환마다 자동 refetch하지 않는다. 새로고침은 사용자의 pull-to-refresh로 수행한다.

### 신고·차단

- `author_hash = sha256(device_id || PEPPER)`가 차단 키다. 테이블 간 PEPPER를 바꾸거나 다르게 쓰지 않는다.
- 차단과 신고 완료 상태는 `moderation.ts`에 로컬 저장한다.
- 신고는 낙관적으로 숨기되 서버 실패 시 되돌린다.
- 신고 테이블은 anon INSERT만 허용한다. SELECT를 열어 신고자 `device_id`를 노출하지 않는다.
- 답변·답글의 자동 숨김 임계값은 각각 4·3이다. 숨김 쿼리는 `hidden_at IS NULL`을 적용한다.
- 숨김 필터를 RLS SELECT에 넣지 않는다. 숨겨진 기존 행의 upsert UPDATE와 작성자 삭제까지 RLS에 막혀 조용히 실패한다.
- 임계값을 낮추면 재설치로 `device_id`를 재생성해 신고를 반복할 수 있다. 로그인이 없는 구조에서는 근본 차단이 불가능하다.
- 허위신고 복구는 신고 레코드를 지운 뒤 `hidden_at`도 null로 바꾼다. 마이그레이션 하단 운영 SQL을 참고한다.
- `hidden_at`만 풀면 높은 `report_count`가 남아 다음 신고 한 건에 즉시 다시 숨겨진다.
- `author_hash`가 비어 있으면 차단을 건너뛴다.
- 빈 hash를 차단 Set에 넣으면 hash가 없는 글이 전부 함께 사라진다.
- 모더레이션 시트 위에 다른 Modal을 중첩하지 않는다.
- 공개 작성 화면의 무관용 정책 고지와 신고·차단·차단 해제 수단을 유지한다.

### 답글

- 답글은 1단계이며 `(answer_id, device_id)` UNIQUE다.
- 부모 답변 삭제 시 답글은 cascade 삭제된다.
- 부모가 자동 숨김되면 부모 id 조회에서 빠져 답글도 자연히 도달 불가가 된다. 별도 숨김 cascade를 만들면 오신고 복구가 불완전해질 수 있다.
- `reply_count`를 저장하지 않고 하루 답글 배열에서 보이는 개수를 계산한다.
- 답글 페이지네이션을 도입하면 지연 로딩과 배지용 count 설계를 함께 변경한다.
- `useAnswerFeed`가 차단 Set을 소유하고 `useAnswerReplies`에 전달한다.
- 내 답글 소유권은 `fetchMyReplyIds`로 판정한다. 숨겨진 내 답글도 조회 대상이다.
- 답글 저장은 서버 생성 `id`, `created_at`, `author_hash`가 즉시 필요하므로 낙관적으로 만들지 않고 `.select().single()` 결과를 사용한다.
- 답글 본문 100자 제한은 SQL CHECK와 `ReplyComposer.MAX_LENGTH`를 함께 변경한다.
- 읽음 기준은 기기 `now()`가 아니라 서버 `created_at`을 저장한다.
- 읽음 처리는 펼침 이벤트 한 번이 아니라 펼쳐진 상태 동안 갱신한다. 새로고침으로 답글이 들어오면 이벤트 방식은 이미 보이는 답글에 다시 배지를 붙인다.
- `replySeen.ts`와 `moderation.ts`를 합치지 않는다. 차단 해제 시 읽음 기록까지 지우면 새 답글 배지가 되살아난다.
- 답글 푸시 알림은 아직 구현되지 않았다.

관련 스키마·RLS·복구 SQL은 다음 마이그레이션을 source of truth로 삼는다.

- `supabase/migrations/*question_answers*.sql`
- `supabase/migrations/*question_answer_reports*.sql`
- `supabase/migrations/*question_answer_replies*.sql`
- `supabase/migrations/*grant_service_role*.sql`

## UI 불변조건

- 공통 헤더는 `FinalHeader`, 앱 내 이름은 `src/constants/app.ts`의 `APP_TITLE`을 사용한다.
- `APP_TITLE`을 바꿀 때 `app.config.js`의 `name`도 함께 바꾼다.
- `slug`와 bundle identifier `ohaasa`는 변경하지 않는다.
- `FinalHeader`가 상단 안전영역을 처리한다. 부모가 이미 처리하면 `withTopInset={false}`를 사용한다.
- 본문 좌우 패딩 안에 헤더를 넣으면 `bleed`를 사용한다.
- `FinalHeader`의 `alignSelf: "stretch"`를 제거하면 `alignItems: "center"`인 홈에서 헤더가 글자 폭으로 줄어든다.
- 탭바가 레이아웃 공간을 차지하므로 탭 화면에 `useBottomTabBarHeight()`를 더하지 않는다.
- 탭바 높이를 다시 더하면 화면 하단에 빈 띠가 생긴다. 탭바가 absolute일 때만 별도 보정이 필요하다.
- `stats.tsx`, `rankings.tsx`는 스택 화면이라 `useBottomTabBarHeight()`를 호출하면 렌더 경로에 따라 throw한다. 하위 컴포넌트까지 확인한다.
- iOS에서 Modal을 동시에 두 개 present하지 않는다.

## 네이티브 설정

- `android/`, `ios/` 생성물을 직접 고치지 말고 Expo config/plugin에서 관리한다.
- Android media granular 권한은 `granularPermissions: []`를 유지한다.
- `SYSTEM_ALERT_WINDOW` 제거는 `plugins/withoutSystemAlertWindow.js`가 담당한다.
- `SYSTEM_ALERT_WINDOW`에 `tools:node="remove"`를 쓰면 React Native debug manifest까지 제거되어 개발자 메뉴와 레드박스가 깨진다.
- `expo prebuild --clean`은 생성물을 재작성하므로 명시적 필요 없이 실행하지 않는다.
- 단, Android 권한 검증 시 기존 생성물에 남은 권한을 배제하려면 깨끗한 prebuild가 필요하다. EAS는 새 clone에서 시작한다.
- 권한 검증은 소스 Manifest가 아니라 manifest merger를 거친 APK/AAB 최종 산출물로 한다. 소스의 `tools:node` 때문에 정적 검사는 오탐할 수 있다.
- iOS required-reason API는 코드 실행 여부가 아니라 링크된 바이너리 심볼 기준으로 검사된다.
- `ExpoFileSystem_privacy.bundle`과 `ExpoMediaLibrary_privacy.bundle`이 IPA에서 빈 껍데기가 되어 DiskSpace 선언이 사라지고 `ITMS-91053`이 발생한 사례가 있다. `app.config.js`의 `ios.privacyManifests` 앱 레벨 선언을 유지한다.
- privacy manifest는 프레임워크 내부뿐 아니라 앱 루트의 `<Pod>_privacy.bundle`도 합쳐서 확인한다. 프레임워크 폴더만 보는 스캐너는 누락을 오탐한다.
- IPA 검증 시 실제 심볼(`nm`)과 모든 `PrivacyInfo.xcprivacy` 선언 집합을 대조한다.

## Supabase 및 백업

- `user_devices` anon upsert에는 SELECT, INSERT, UPDATE 정책이 모두 필요하다.
- `question_answers.zodiac_sign`과 `question_answer_replies.zodiac_sign`은 온보딩 건너뛰기를 위해 nullable이다.
- `author_hash` PEPPER는 답변과 답글 테이블에서 바이트 단위로 같아야 한다.
- 백업은 `.github/workflows/backup-db.yml`과 `.github/scripts/backup-tables.py`가 service role로 JSONL을 생성한다.
- 백업은 데이터만 포함한다. DDL은 migrations가 source of truth다.
- `horoscopes`, `user_devices`, `notification_log` DDL은 아직 migration에 없어 열린 작업이다.
- 백업 페이지 크기는 Supabase `db-max-rows`보다 작게 유지하고 안정적인 키로 정렬한다.
- 합성 PK 테이블은 모든 PK 컬럼으로 정렬하지 않으면 OFFSET 페이지 간 중복·누락이 생길 수 있다.
- 백업 응답이 배열이 아니면 즉시 실패시킨다. 에러 JSON을 빈 결과로 처리하면 0행짜리 정상 백업처럼 보인다.
- `horoscopes`와 `user_devices`가 0행이면 실패하며, `manifest.json`의 테이블별 행 수를 복원 전 대조한다.
- 백업은 반드시 service role로 읽는다. anon은 신고·알림 테이블 SELECT 권한이 없어 전체 백업이 되지 않는다.

## 열린 작업

- Expo SDK 56 업그레이드 검증(위젯 제외).
- 답글 INSERT → Edge Function → 부모 기기 토큰으로 답글 푸시 알림 구현.
- 커뮤니티 추가 후 월간 Supabase egress 재측정.
- 공개 피드와 답글 페이지네이션 설계.
- `horoscopes`, `user_devices`, `notification_log` DDL migration 작성.
- 자동 숨김 임계값이 높으므로 신고 큐를 매일 확인.

완료 이력과 구현 배경은 git log와 해당 코드 주석을 확인한다. 완료된 Phase를 이 파일에 누적하지 않는다.

## 변경 및 검증 원칙

- 요청 범위 밖 리팩터링이나 파일 정리를 하지 않는다.
- 기존 사용자 변경사항을 되돌리거나 덮어쓰지 않는다.
- DB 스키마/API 변경 시 migration, 타입, 호출부, 테스트를 함께 점검한다.
- 변경 후 영향 범위에 맞는 타입 검사·테스트·빌드를 실행한다.
- 크롤링 실패는 exit 1로 끝낸다. 알림 발송은 backend에서 대신 처리하지 않는다.
- Expo 패치 버전은 일부 패키지만 올리지 않는다. 네이티브 모듈 두 벌이 설치될 수 있으므로 `npx expo install --fix`로 세트 전체를 맞추거나 현재 lockfile을 유지한다.

## 배포 전 체크리스트

- [ ] `app/app.config.js`의 marketing `version`을 올렸는가?
- [ ] 설정 화면 푸터와 이 문서의 현재 버전을 맞췄는가?
- [ ] `docs/` 변경을 push해 GitHub Pages 링크를 확인했는가?
- [ ] 신규 Supabase migration을 실제 프로젝트에 적용했는가?
- [ ] 새 테이블의 RLS와 `anon`/`service_role` GRANT를 확인했는가?
- [ ] 답변·답글 `author_hash` PEPPER가 일치하는가?

`versionCode`와 `buildNumber`는 EAS remote autoIncrement가 관리하므로 로컬에 추가하지 않는다. Play Console, EAS, Supabase Function 등 외부 배포는 명시적으로 요청받았을 때만 수행한다.
