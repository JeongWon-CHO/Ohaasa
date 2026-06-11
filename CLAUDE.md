# CLAUDE.md — ohaasa プロジェクト

## 프로젝트 개요

일본 아사히방송 おはようさんです！별자리 운세 JSON API → Supabase 저장 → React Native Expo 앱 표시 → Expo Push Notification 발송.

**MVP 방침**: 로그인 없음. `device_id`(AsyncStorage 영속 UUID) + `zodiac_sign` + `push_token`만 서버에 저장.

---

## 아키텍처

```
GitHub Actions (cron: UTC 일~금 22:00 = KST 월~토 07:00)
  └─ backend (Node.js/TypeScript)
       ├─ 아사히 JSON API fetch → parse → 12개 HoroscopeEntry
       ├─ GPT 번역 (advice_ko — advice 불변 + advice_ko IS NOT NULL이면 skip)
       ├─ Supabase horoscopes upsert
       └─ user_devices 조회 → Expo Push API 발송

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
│   └── (tabs)/
│       ├── _layout.tsx        # 탭 진입 시 device registration (fire-and-forget)
│       ├── index.tsx          # 오늘의 운세 + PushPermissionSheet (최초 알림 권한 요청)
│       ├── rankings.tsx       # 전체 순위
│       └── settings.tsx       # 알림 토글 · 별자리 변경 · NotificationDeniedSheet
└── src/
    ├── context/ZodiacContext.tsx     # 별자리 전역 상태 (ZodiacProvider · useZodiacContext)
    ├── lib/
    │   ├── storage.ts                # device_id · zodiac · pushToken · platform · notificationsEnabled · hasAskedPushPermission
    │   ├── supabase.ts               # anon client + upsertDevice()
    │   └── notifications.ts          # requestPushToken() · checkPermissionStatus() · setupForegroundHandler() — dynamic import
    ├── hooks/                        # useZodiac · useHoroscope · useShareHoroscope · useToast
    └── components/
        ├── PushPermissionSheet.tsx   # 최초 알림 권한 요청 바텀시트
        ├── NotificationDeniedSheet.tsx  # 알림 거부 후 시스템 설정 유도
        ├── common/BottomSheet.tsx    # 공통 바텀시트 (슬라이드 애니메이션)
        └── final/Toggle.tsx          # disabled prop 지원
backend/src/
├── crawler/   fetcher · parser (31 tests)
├── translator/translate.ts    # GPT 번역
└── main.ts    # 파이프라인 통합
```

---

## 주요 설계 결정

- **데이터 소스**: `https://www.asahi.co.jp/data/ohaasa2020/horoscope.json`
- **저장 필드**: `date · zodiac_sign · zodiac_name · rank · advice · advice_ko`
- **주말 데이터**: 고고별자리(`source=gogo`) 크롤링. 토·일 모두 고고 메인 소스.
- **일요일 cron**: 방송 없음이지만 매일 실행 (`0 22 * * *`), 평일/주말 분기는 `isWeekendJST()`에서 처리.
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
| Phase 6 Step 1~9 | Expo 앱 · FCM · Push Receipt polling | ✅ |
| Phase 10 Step 1~5 | EAS profile · 아이콘/splash · 개인정보처리방침 | ✅ |
| Phase 10 Step 6 | Play Console 내부 테스트 트랙 업로드 | ⬜ |

- 개인정보처리방침 URL: `https://jeongwon-cho.github.io/Ohaasa/privacy-policy.html`
- `google-services.json`: 커밋 대상(앱 수신용) · Firebase service account JSON은 커밋 금지
- 현재 버전: v1.0.3

---

## 앱 구현 원칙

### 공통

- `service_role` 키는 앱에 절대 포함하지 않는다 — `EXPO_PUBLIC_` 접두사는 anon key만 사용
- `device_id`: `crypto.randomUUID()` 생성 후 AsyncStorage 영속화 (재설치 시 재생성)
- 네트워크 실패는 운세 조회를 막지 않는다. Supabase upsert 실패 → `console.warn`만 남김
- 별자리 전역 상태는 `ZodiacContext`로 관리 — 각 화면에서 AsyncStorage 직접 읽기 금지

### Push Notification

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

### 이미지 저장 / SNS 공유

- **라이브러리**: `expo-media-library` + `expo-sharing` + `react-native-view-shot`
- **저장**: `saveToLibraryAsync()` + `requestPermissionsAsync(true)` (writeOnly). `plugins/withWriteOnlyMediaLibrary.js`로 READ 권한 manifest에서 제거 필수 (Play Console 경고 방지).
- **공유**: `captureRef()` → `shareAsync(uri, { mimeType: 'image/png' })` — 추가 권한 불필요.
- **동적 import**: `await import('expo-media-library')` — static import 금지.
- **구현 위치**: `src/hooks/useShareHoroscope.ts`

---

## 개발 원칙

- 한 번에 하나의 Phase/Step만 구현한다
- Secret 키 원문을 로그에 출력하지 않는다
- 크롤링 실패와 알림 실패는 분리해서 처리한다 (crawl 실패 → warning, notify 실패 → exit 1)
- 스키마/API 구조 변경은 테스트로 먼저 감지한다
