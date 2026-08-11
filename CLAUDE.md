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

## 핵심 디렉토리

```
app/
├── app/
│   ├── index.tsx              # 온보딩 완료 여부 분기
│   ├── onboarding.tsx         # 별자리 선택 → user_devices 선반영
│   ├── daily-review.tsx       # 운세 리뷰 입력 화면 (router.push로 진입)
│   ├── daily-question.tsx     # 오늘의 질문 작성/커뮤니티 화면 (router.push로 진입, date 파라미터 지원)
│   └── (tabs)/
│       ├── _layout.tsx        # 탭 진입 시 device registration (fire-and-forget)
│       ├── index.tsx          # 오늘의 운세 + TodayQuestionSection + DailyReviewEntryCard + PushPermissionSheet
│       ├── rankings.tsx       # 전체 순위
│       ├── stats.tsx          # 운세 통계 — [흐름/기록] 세그먼트 + 흐름(그래프·순위) / 기록(캘린더·아카이브) — orchestration only
│       └── settings.tsx       # 알림 토글 · 별자리 변경 · NotificationDeniedSheet
└── src/
    ├── context/ZodiacContext.tsx     # 별자리 전역 상태 (ZodiacProvider · useZodiacContext)
    ├── constants/
    │   ├── dailyQuestions.ts         # 질문 60~80개 + getQuestionByDate(date) — day-of-year 기반 순환
    │   └── links.ts                  # 개인정보처리방침 · 커뮤니티 가이드라인(EULA) 외부 URL
    ├── lib/
    │   ├── storage.ts                # device_id · zodiac · pushToken · platform · notificationsEnabled · hasAskedPushPermission
    │   ├── supabase.ts               # anon client + upsertDevice() + 오늘의 질문 공개 답변 CRUD/좋아요/신고 함수
    │   ├── dailyReviews.ts           # AsyncStorage CRUD — getDailyReview · upsertDailyReview · deleteDailyReview · getAllDailyReviews
    │   ├── questionAnswers.ts        # AsyncStorage CRUD — getQuestionAnswer · upsertQuestionAnswer · deleteQuestionAnswer · getAllQuestionAnswers
    │   ├── moderation.ts             # 로컬 신고/차단 상태 — getBlockedAuthors · addBlockedAuthor · clearBlockedAuthors · getHiddenAnswerIds · REPORT_REASONS
    │   └── notifications.ts          # requestPushToken() · checkPermissionStatus() · setupForegroundHandler() — dynamic import
    ├── hooks/
    │   ├── useZodiac · useHoroscope · useShareHoroscope · useToast
    │   ├── useDailyReview.ts         # 리뷰 폼 상태 + save (upsert)
    │   ├── useReviewHistory.ts       # 월별 리뷰 집계 — summary · ratingDist · topItems · noteArchive
    │   ├── useDailyQuestion.ts       # 홈 배너용 — questionText · myAnswer · hasAnswered (로컬, useFocusEffect 리로드)
    │   ├── useQuestionAnswerForm.ts  # 작성 폼 상태 + save/remove (로컬 upsert + 공개 시 서버 미러링)
    │   ├── useAnswerFeed.ts          # 커뮤니티 피드 — answers · likedIds · myAnswerId · toggleLike(낙관적 업데이트)
    │   ├── useQuestionAnswerHistory.ts  # 월별 답변 집계 — answersByDate (기록 탭 캘린더용)
    │   └── useHoroscopeTrends.ts     # 통계 데이터 훅 — periodLabel · getSummaryComment · SignAverage 타입 export
    └── components/
        ├── PushPermissionSheet.tsx   # 최초 알림 권한 요청 바텀시트
        ├── NotificationDeniedSheet.tsx  # 알림 거부 후 시스템 설정 유도
        ├── common/BottomSheet.tsx    # 공통 바텀시트 (슬라이드 애니메이션)
        ├── final/Toggle.tsx          # disabled prop 지원
        ├── daily-question/           # 오늘의 질문 전용 컴포넌트
        │   ├── TodayQuestionSection.tsx  # 운세 탭 내 질문 진입 배너 (미답변/답변완료 상태 분기)
        │   ├── QuestionAnswerForm.tsx    # 답변 입력(120자 제한) + 공개/비공개 Toggle
        │   ├── AnswerCard.tsx            # 커뮤니티 피드의 짧은 생각 카드 — 공감 버튼 + (남의 글일 때) ⋯ 신고/차단 메뉴
        │   ├── AnswerModerationSheet.tsx # 신고/차단 바텀시트 — 메뉴 → 신고 사유 2단계
        │   ├── AnswerFeedTabs.tsx        # 전체/내 별자리 세그먼트 + 별자리 필터 버튼·칩
        │   ├── AnswerSortToggle.tsx      # 최신순/공감순 텍스트 토글
        │   └── ZodiacFilterSheet.tsx     # 12별자리 필터 바텀시트 (ZodiacSelectBottomSheet 패턴 적응)
        ├── daily-review/             # 운세 리뷰 전용 컴포넌트
        │   ├── DailyReviewEntryCard.tsx  # 운세 탭 내 리뷰 진입 배너 (미작성/작성 상태 분기)
        │   ├── StarRatingInput.tsx       # 1~5점 별점 입력
        │   ├── MemorableItemChips.tsx    # 기억에 남는 항목 칩 선택
        │   ├── BoardingPassNoteInput.tsx # 보딩패스 스타일 한 줄 메모 입력 (플립 애니메이션)
        │   └── PostcardNoteInput.tsx     # 엽서 스타일 메모 입력 (대안 UI)
        └── stats/                    # 통계 화면 전용 컴포넌트
            ├── SummaryCard.tsx       # 내 별자리 요약 (평균 · 최고·최저 · 자세히 토글)
            ├── ChartCard.tsx         # 순위 흐름 그래프 + 별자리 비교 + 공유 버튼
            ├── RankingCard.tsx       # 별자리별 평균 순위 리스트
            ├── ErrorState.tsx        # 에러 일러스트 + 재시도
            ├── PeriodSelector.tsx    # 7일/30일 세그먼트 컨트롤 (stats.tsx에서 직접 사용 안 함 — FinalHeader rightSlot 텍스트 토글로 대체)
            ├── RankTrendChart.tsx    # SVG 라인 차트
            ├── StatsLoadingState.tsx # 로딩 스켈레톤
            ├── FloatingBadge.tsx     # 별자리 아이콘 (placeholder용)
            ├── ZodiacSelectBottomSheet.tsx  # 비교 별자리 선택
            ├── ReviewHistoryTab.tsx  # 기록 탭 오케스트레이터 (월 탐색 state + 하위 카드 조합)
            ├── ReviewCalendar.tsx    # 월 캘린더 — 리뷰 있는 날 apricot 원, 일/토 색상, 이전/다음 월 네비게이션
            ├── ReviewDetailSheet.tsx # 날짜 탭 바텀시트 — 리뷰 상세 또는 "기록 없음" + 수정하기
            ├── ReviewSummaryCard.tsx # 이달 기록 요약 (2×2 그리드 — 리뷰/별점/메모/기억항목 남긴 날)
            ├── RatingDistributionCard.tsx  # 5★→1★ 별점 분포 바 차트
            ├── TopMemorableItemsCard.tsx   # 기억 항목 빈도 바 차트
            └── NoteArchiveCard.tsx   # 한 줄 기록 최신순 목록
backend/src/
├── crawler/   fetcher · parser (31 tests)
├── translator/translate.ts    # GPT 번역
└── main.ts    # 크롤 + 번역 + 저장 (알림 발송 제외)
supabase/
├── functions/send-horoscope-notifications/index.ts  # Deno Edge Function — 알림 발송
└── migrations/  # 스키마 SQL (수동 실행 — supabase/ 전체가 .gitignore 대상이라 git에는 포함되지 않음)
```

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

### 환경변수

| 변수                            | 용도                                   |
| ------------------------------- | -------------------------------------- |
| `SUPABASE_URL`                  | backend/Actions 전용                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | service_role JWT — 앱 절대 노출 금지   |
| `OPENAI_API_KEY`                | GPT 번역 — backend/Actions 전용        |
| `EXPO_PUBLIC_SUPABASE_URL`      | 앱용 anon 접속 URL                     |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 앱용 anon key                          |

---

## 진행 상황

| Phase / Step | 내용 | 상태 |
| --- | --- | --- |
| Phase 1~5 | 파서 · Supabase 스키마 · 파이프라인 · Push 발송 · cron | ✅ |
| Phase 6 Step 1~9 | Expo 앱 · FCM · Push (Receipt polling 제거됨) | ✅ |
| Phase 10 Step 1~5 | EAS profile · 아이콘/splash · 개인정보처리방침 | ✅ |
| Phase 10 Step 6 | Play Console 내부 테스트 트랙 업로드 | ✅ |
| Phase 11 | Expo SDK 56 업그레이드 검증 (위젯 제외) | ⬜ |
| Phase 12 | 오늘의 카드 → 오늘의 질문 교체 (작성·공개/비공개·커뮤니티 피드·공감·기록 탭 통합) | ✅ (구현 완료, Supabase 마이그레이션 수동 실행 및 실기기 QA 필요) |
| Phase 13 | 신고 · 작성자 차단 · 자동 숨김 · 커뮤니티 가이드라인(iOS 심사 대비) | ✅ (구현 완료, 마이그레이션 실행 · GitHub Pages 반영 · 실기기 QA 필요) |

- 개인정보처리방침 URL: `https://jeongwon-cho.github.io/Ohaasa/privacy-policy.html`
- 커뮤니티 가이드라인 URL: `https://jeongwon-cho.github.io/Ohaasa/community-guidelines.html`
- `google-services.json`: 커밋 대상(앱 수신용) · Firebase service account JSON은 커밋 금지
- 현재 버전: v1.5.0 - 오늘의 질문 기능 추가

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

### 오늘의 질문 — 신고 · 차단

로그인이 없어도 `device_id`가 이미 "같은 사람이 100번 신고 못 하게" 막는 식별자 역할을 한다. 진짜 문제는 차단이었다 — 피드에 `device_id`를 절대 내려보내지 않으므로 클라이언트에 "이 사람" 을 가리킬 키가 없었다.

- **`author_hash`가 차단 키**: `sha256(device_id || PEPPER)`를 생성 컬럼으로 두고 피드에 함께 내려보낸다. `device_id`는 v4 UUID(122비트)라 역산이 불가능하고, 해시로는 어떤 RLS도 통과할 수 없다(쓰기 경로는 전부 `device_id` 매칭). **PEPPER를 바꾸면 사용자들의 차단 목록이 전부 무효화되므로 고정 값으로 둔다.**
- **차단은 기기 로컬 전용**(`moderation.ts`). 서버에 사용자별 차단 목록을 걸 주체가 없다. `author_hash`가 기기별로 안정적이라 차단이 다음 날 올라오는 글에도 계속 적용된다. 재설치 시 초기화되지만 `device_id`도 함께 재생성되므로 감수한다.
- **신고는 낙관적이되 실패는 되돌린다**: 먼저 숨기고, 서버 전송이 실패하면 숨김을 취소하고 토스트로 알린다. 실패를 삼키면 사용자는 접수됐다고 믿는데 서버엔 아무것도 없어 그 글이 영영 검토되지 않는다. "그냥 안 보고 싶다"는 요구는 차단(로컬 전용이라 항상 성공)이 담당한다.
- **RLS 정책만으로는 안 된다 — GRANT가 필요하다**: 이 프로젝트는 `public` 스키마 기본 권한이 `anon`에게 DML(SELECT/INSERT/UPDATE/DELETE)을 주지 않는다. `TRUNCATE·REFERENCES·TRIGGER`만 딸려온다. 정책은 GRANT로 허용된 것 중 어떤 행인지를 거르는 층이라, **GRANT 없이 정책만 만들면 `permission denied`로 전부 막힌다.** 새 테이블을 만들 때마다 `grant ... to anon;`을 마이그레이션에 명시할 것. (`question_answer_reports`가 이 함정에 걸려 신고가 한 건도 안 들어갔다.)
- **Modal 중첩 금지**: 차단 확인은 별도 `ConfirmDialog`가 아니라 `AnswerModerationSheet`의 3번째 단계(`confirmBlock`)로 처리한다. `BottomSheet`는 닫기 애니메이션(240ms)이 끝난 뒤에야 내부 Modal을 언마운트하므로, 시트를 내리면서 곧바로 두 번째 Modal을 present하면 iOS가 조용히 무시해 **다이얼로그가 아예 뜨지 않는다**. 시트 위에 뭔가를 더 띄워야 하면 항상 시트 안의 단계로 만들 것.
- **`author_hash` 방어**: 값이 비어 있으면 차단을 건너뛴다. `Set`에 `undefined`가 들어가면 `author_hash` 없는 글이 전부 한꺼번에 사라진다.
- **EULA(App Store 심사 지침 1.2)**: 공개 답변 작성 화면(`QuestionAnswerForm`)에 무관용 정책 고지 + `docs/community-guidelines.html` 링크를 노출한다. 기본 visibility가 `public`이라 별도 조작 없이 보인다. 설정 > COMMUNITY에서도 접근 가능하고, 같은 섹션에 "차단한 사용자 N명 · 전체 해제"를 둔다 — **해제 수단이 없으면 심사에서 문제가 된다.**

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
- [ ] `app/app/(tabs)/settings.tsx` 푸터의 `v1.5.0` 텍스트도 같이 고쳤는가? (하드코딩되어 있다)
- [ ] `docs/` 변경분을 push해 GitHub Pages에 반영했는가? (앱 내 링크가 404가 되면 심사에서 걸린다)
- [ ] `supabase/migrations/` 신규 SQL을 실행했는가? (`supabase/`는 .gitignore 대상이라 CI가 대신 해주지 않는다)

버전은 `app.config.js` 한 곳만 고치면 EAS 빌드에 반영된다. CLAUDE.md의 "현재 버전"은 대화 맥락용 메모이므로 같이 맞춰줘야 한다.

---

## 개발 원칙

- 한 번에 하나의 Phase/Step만 구현한다
- Secret 키 원문을 로그에 출력하지 않는다
- 크롤링 실패 → exit 1. 알림은 Edge Function이 독립적으로 처리하므로 backend에서 관여하지 않는다.
- 스키마/API 구조 변경은 테스트로 먼저 감지한다
