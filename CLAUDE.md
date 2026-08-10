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
    │   └── dailyQuestions.ts         # 질문 60~80개 + getQuestionByDate(date) — day-of-year 기반 순환
    ├── lib/
    │   ├── storage.ts                # device_id · zodiac · pushToken · platform · notificationsEnabled · hasAskedPushPermission
    │   ├── supabase.ts               # anon client + upsertDevice() + 오늘의 질문 공개 답변 CRUD/좋아요 함수
    │   ├── dailyReviews.ts           # AsyncStorage CRUD — getDailyReview · upsertDailyReview · deleteDailyReview · getAllDailyReviews
    │   ├── questionAnswers.ts        # AsyncStorage CRUD — getQuestionAnswer · upsertQuestionAnswer · deleteQuestionAnswer · getAllQuestionAnswers
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
        │   ├── AnswerCard.tsx            # 커뮤니티 피드의 짧은 생각 카드 — 공감 버튼 + (내 글일 때) 수정/삭제
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

- 개인정보처리방침 URL: `https://jeongwon-cho.github.io/Ohaasa/privacy-policy.html`
- `google-services.json`: 커밋 대상(앱 수신용) · Firebase service account JSON은 커밋 금지
- 현재 버전: v1.4.0 - iOS·Android 모두 기록 탭까지 배포 완료

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
- **모더레이션/신고 없음**: MVP는 120자 제한뿐 — 욕설 필터·신고는 후속 과제.

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
- **저장**: `saveToLibraryAsync()` + `requestPermissionsAsync(true)` (writeOnly). `plugins/withWriteOnlyMediaLibrary.js`로 READ 권한 manifest에서 제거 필수 (Play Console 경고 방지).
- **공유**: `captureRef()` → `shareAsync(uri, { mimeType: 'image/png' })` — 추가 권한 불필요.
- **동적 import**: `await import('expo-media-library')` — static import 금지.
- **구현 위치**: `src/hooks/useShareHoroscope.ts`

---

## 배포 전 체크리스트

> **배포 전 반드시 수기로 확인할 것. 자동으로 올라가지 않는다.**

- [ ] `app/app.config.js`의 `version` 필드를 올렸는가?
- [ ] 이 파일(`CLAUDE.md`) 하단의 "현재 버전"을 같은 값으로 수정했는가?

버전은 `app.config.js` 한 곳만 고치면 EAS 빌드에 반영된다. CLAUDE.md의 "현재 버전"은 대화 맥락용 메모이므로 같이 맞춰줘야 한다.

---

## 개발 원칙

- 한 번에 하나의 Phase/Step만 구현한다
- Secret 키 원문을 로그에 출력하지 않는다
- 크롤링 실패 → exit 1. 알림은 Edge Function이 독립적으로 처리하므로 backend에서 관여하지 않는다.
- 스키마/API 구조 변경은 테스트로 먼저 감지한다
