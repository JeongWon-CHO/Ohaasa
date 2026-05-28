# CLAUDE.md — ohaasa プロジェクト

## 프로젝트 개요

일본 아사히방송 おはようさんです！별자리 운세 JSON API → Supabase 저장 → React Native Expo 앱 표시 → Expo Push Notification 발송.

**MVP 방침**: 로그인 없음. `device_id`(AsyncStorage 영속 UUID) + `zodiac_sign` + `push_token`만 서버에 저장. `user_id`는 nullable(추후 Auth 도입 여지).

---

## 아키텍처

```
GitHub Actions (cron: UTC 일~금 22:00 = KST 월~토 07:00)
  └─ backend (Node.js/TypeScript)
       ├─ 아사히 JSON API fetch
       ├─ parse → 12개 HoroscopeEntry
       ├─ GPT 번역 (advice_ko — 재번역 방지: advice 불변 + advice_ko IS NOT NULL이면 skip)
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
│       ├── index.tsx          # 오늘의 운세
│       ├── rankings.tsx       # 전체 순위
│       └── settings.tsx       # 알림 토글 · 별자리 변경
└── src/
    ├── lib/
    │   ├── storage.ts         # AsyncStorage: device_id · zodiac · pushToken · platform · notificationsEnabled
    │   ├── supabase.ts        # anon client + upsertDevice()
    │   └── notifications.ts   # requestPushToken() · setupForegroundHandler() — dynamic import 방식
    └── components/final/Toggle.tsx  # disabled prop 지원
backend/src/
├── crawler/   fetcher · parser (31 tests)
├── translator/translate.ts    # GPT 번역
└── main.ts    # 파이프라인 통합
supabase/migrations/
├── 20260428000001_create_horoscopes.sql
└── 20260428000002_create_user_devices.sql
```

---

## 주요 설계 결정

- **데이터 소스**: `https://www.asahi.co.jp/data/ohaasa2020/horoscope.json` (HTML 크롤링 폐기)
- **horoscope_text**: 탭(`\t`) → 줄바꿈, trim, 빈 줄 제거
- **저장 필드**: `date · zodiac_sign · zodiac_name · rank · advice · advice_ko`
- **일요일**: 방송 없음이지만 고고별자리 크롤링을 위해 cron은 매일 실행 (`0 22 * * *`). 평일/주말 분기는 `isWeekendJST()`에서 코드로 처리.
- **주말 데이터**: 고고별자리(`source=gogo`) 크롤링. 토·일 모두 고고 메인 소스.
- **DatePill**: "오늘"이 아닌 오하아사 방송 기준일(`date` 컬럼) 표시

---

## Supabase 설정

### GRANT

```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON TABLE horoscopes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE horoscopes TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE user_devices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_devices TO service_role;
```

### user_devices RLS (중요)

anon key로 upsert하려면 세 정책 모두 필요. SELECT가 없으면 `"new row violates row-level security policy"` 발생 — PostgREST upsert가 내부적으로 SELECT RLS를 검사하기 때문.

```sql
CREATE POLICY "user_devices_anon_insert" ON public.user_devices FOR INSERT  TO anon WITH CHECK (true);
CREATE POLICY "user_devices_anon_update" ON public.user_devices FOR UPDATE  TO anon USING (true) WITH CHECK (true);
CREATE POLICY "user_devices_anon_select" ON public.user_devices FOR SELECT  TO anon USING (true);
```

### 환경변수

| 변수                            | 용도                                              |
| ------------------------------- | ------------------------------------------------- |
| `SUPABASE_URL`                  | `https://xxxx.supabase.co` (backend/Actions 전용) |
| `SUPABASE_SERVICE_ROLE_KEY`     | service_role JWT — 앱 절대 노출 금지              |
| `OPENAI_API_KEY`                | GPT 번역 — backend/Actions 전용                   |
| `EXPO_PUBLIC_SUPABASE_URL`      | 앱용 anon 접속 URL                                |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 앱용 anon key                                     |

---

## 페이즈 진행 상황

| 페이즈    | 내용                                                | 상태 |
| --------- | --------------------------------------------------- | ---- |
| Phase 1~3 | 데이터 소스 확인 · 파서(31 tests) · Supabase 스키마 | ✅   |
| Phase 4-1 | fetch → parse → upsert 파이프라인                   | ✅   |
| Phase 4-2 | Expo Push 발송 (dry-run 검증 완료)                  | ✅   |
| Phase 5   | GitHub Actions cron 스케줄러                        | ✅   |
| Phase 6   | React Native Expo 앱 (Step 6 완료)                  | ✅   |

---

## Phase 6 앱 진행 상황

| Step   | 내용                                                    | 상태 |
| ------ | ------------------------------------------------------- | ---- |
| Step 1 | 프로젝트 초기화 · Expo SDK 54 · Expo Router 6           | ✅   |
| Step 2 | 온보딩 · 별자리 선택 · AsyncStorage 영속화              | ✅   |
| Step 3 | Supabase 운세 조회 · advice_ko 번역 · 전체 순위         | ✅   |
| Step 4 | user_devices 등록 · push token 요청 · AsyncStorage 캐싱 | ✅   |
| Step 5 | 알림 토글 동기화 · push_token 없는 환경 disabled 처리   | ✅   |
| Step 6 | EAS dev build · FCM 설정 · 실기기 push_token 발급 · Supabase 저장 확인 | ✅   |
| Step 7 | FCM V1 자격증명 등록 · dry-run payload 확인 · 실기기 알림 수신 확인   | ✅   |
| Step 8 | GitHub Actions cron 실행 확인 · 포그라운드 알림 핸들러 구현           | ✅   |
| Step 9 | Expo Push Receipt polling 구현 · DeviceNotRegistered 기기 비활성화    | ✅   |

### Step 7 완료 내용

- `eas credentials` → Android `com.ohaasa.app` → FCM V1 Google Service Account Key 업로드
- `npm run crawl:dry` → `advice_ko` 한국어 body 확인 (`advice` 일본어 원문 fallback 버그 수정 포함)
- `npm run crawl` → `1/1 sent` · Receipt ID 발급 · 삼성 노트9 알림 수신 확인
- `notifications_enabled` 발송 후에도 `true` 유지 확인

### Step 8 완료 내용

- GitHub Actions cron 수동 실행 확인: secrets 로드 · 12개 파싱 · translation skip · upsert · 1/1 sent 전 단계 정상
- `setupForegroundHandler()` 구현: `shouldShowBanner: true` (SDK 54 기준 — `shouldShowAlert` deprecated)
- `addNotificationReceivedListener` 구독 + cleanup 반환 (`setNotificationHandler`는 앱 정책이므로 cleanup 제외)
- `app/_layout.tsx` `RootLayoutNav`에 `useEffect`로 마운트 시 설정, unmount 시 subscription 해제
- 실기기 포그라운드 배너 수신 확인 · Metro 로그 `[notifications] foreground notification received` 확인

### 수동 테스트 방법

```bash
cd backend
npm run crawl:dry   # payload 미리보기 (발송 없음)
npm run crawl       # 실발송
```

### Step 9 완료 내용

- `sender.ts`: `disableDevices` export, `NotifyResult`에 `receiptIds` · `receiptTokenMap` 추가
- `receipt-poller.ts` 신규: `pollReceipts()` — receipt-level DeviceNotRegistered 기기 비활성화 포함
- `main.ts` Step 3 추가: 15분 wait → receipt polling (polling 실패는 exit(1) 안 함)
- `POLL_DELAY_MS` 환경변수 지원: 기본 15분, 로컬 테스트 시 `POLL_DELAY_MS=0` 사용
- `crawl-and-notify.yml` `timeout-minutes: 30`으로 변경

---

## Phase 10 Android 릴리즈 준비

| Step   | 내용                                                              | 상태 |
| ------ | ----------------------------------------------------------------- | ---- |
| Step 1 | eas.json profile 분리 (development / preview / production)        | ✅   |
| Step 2 | 앱 표시명 "오하아사" 적용 (`expo.name`)                           | ✅   |
| Step 3 | icon · adaptive-icon · splash 에셋 교체 + backgroundColor 보정   | ✅   |
| Step 4 | EAS env 등록 · preview APK 빌드 · 실기기 아이콘 확인             | ✅   |
| Step 5 | 개인정보처리방침 작성 및 URL 확보                                 | ✅   |
| Step 6 | Play Console 내부 테스트 트랙 업로드 준비                         | ⬜   |

### Step 5 완료 내용

- `docs/privacy-policy.html` 작성 → GitHub Pages 배포
- 개인정보처리방침 URL: `https://jeongwon-cho.github.io/Ohaasa/privacy-policy.html`

### Step 1~4 완료 내용

- `eas.json`: `appVersionSource: remote` · preview(APK/internal) · production(AAB/store/autoIncrement) 추가
- `app.json`: `expo.name` → `"오하아사"`, `splash.backgroundColor` → `#FFF3E6`, `android.adaptiveIcon.backgroundColor` → `#FAD4C0`
- `android.versionCode`는 `app.json`에 추가하지 않음 — EAS remote autoIncrement에 위임
- `EXPO_PUBLIC_SUPABASE_URL` · `EXPO_PUBLIC_SUPABASE_ANON_KEY` → EAS env (development · preview · production 전체) 등록
  - `.env.local`은 Metro 로컬 개발 전용, EAS 클라우드 빌드는 읽지 않음
  - `.env`는 gitignore 적용 대상이라 EAS 빌드에 전달되지 않음
  - 앱 번들에는 anon/publishable key만 포함 가능, `service_role` key 절대 금지
- `google-services.json`: 커밋 대상 (앱 수신용 public config) · Firebase service account JSON은 커밋 금지

### Phase 10 후보 (이후)

- 고고별자리 데이터 연동 fallback

---

## 앱 구현 원칙

### 공통

- `service_role` 키는 앱에 절대 포함하지 않는다 — `EXPO_PUBLIC_` 접두사는 anon key만 사용
- `device_id`: `crypto.randomUUID()` 생성 후 AsyncStorage 영속화 (재설치 시 재생성)
- 네트워크 실패는 운세 조회를 막지 않는다. Supabase upsert 실패 → `console.warn`만 남김

### Push Notification

- **Android Expo Go (SDK 53+)**: remote push 제거됨. `push_token = NULL · platform = NULL · notifications_enabled = false`가 정상.
- **`expo-notifications` static import 금지**: 모듈 로딩 시 Android Expo Go LogBox 에러 발생. `ExecutionEnvironment.StoreClient` guard 통과 후 `await import('expo-notifications')`로 동적 import.
- **`requestPushToken()`은 절대 throw하지 않는다**: 시뮬레이터·권한 거부·토큰 발급 실패 모두 `{ token: null, platform: null }` 반환.
- **push_token 없는 환경**: 알림 토글 `disabled` + "알림은 개발 빌드에서 사용할 수 있어요" 표시.
- **실제 push token 검증**: EAS development build에서만 가능.
- **FCM 설정**: Firebase 콘솔에서 Android 앱(`com.ohaasa.app`) 등록 → `google-services.json` 취득 → `app/` 배치 → `app.json`의 `android.googleServicesFile` 참조. `google-services.json`은 APK에 번들되므로 커밋 대상 (service account 키와 다름).
- **FCM V1 발송 자격증명**: `eas credentials` → Android → FCM V1 Google Service Account Key 등록. `google-services.json`(앱 수신용)과 별개. service account JSON은 절대 커밋 금지 (`.gitignore` 적용됨).

### 이미지 저장 (갤러리 저장)

- **라이브러리**: `expo-media-library` + `react-native-view-shot`
- **저장 전용 원칙**: `saveToLibraryAsync()`만 사용하므로 READ 권한 불필요. `requestPermissionsAsync(true)` (writeOnly 모드) 사용.
- **READ 권한 제거 필수**: `expo-media-library` 플러그인은 `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`를 manifest에 자동 추가함. `plugins/withWriteOnlyMediaLibrary.js` 커스텀 플러그인으로 빌드 후 제거.
- **`isAccessMediaLocationEnabled: false`**: `app.config.js`에서 반드시 false로 설정. true이면 불필요한 위치 권한까지 추가됨.
- **Play Console 경고**: READ 권한이 manifest에 있으면 "선언되지 않은 사진 및 동영상 권한" 경고 발생 → 위 조치로 해결.
- **동적 import**: `await import('expo-media-library')` — push notification과 동일하게 static import 금지.

### SNS 공유 (시스템 공유 시트)

- **라이브러리**: `expo-sharing` + `react-native-view-shot`
- **추가 권한 없음**: `shareAsync()`는 OS 시스템 공유 시트를 띄우는 것이므로 미디어 READ/WRITE 권한 불필요.
- **흐름**: `captureRef()` → 임시 파일 URI 생성 → `shareAsync(uri, { mimeType: 'image/png' })` → 시스템 공유 시트.
- **구현 위치**: `src/hooks/useShareHoroscope.ts` — `share()`(공유)와 `saveImage()`(저장) 함께 관리.

### 데이터 흐름

- 별자리 선택: AsyncStorage 우선 저장 → Supabase background upsert (네트워크 실패 허용)
- `onboarding.tsx` 완료 시: zodiac 선반영 upsert (fire-and-forget) → `_layout.tsx` effect에서 최종 반영
- 알림 토글 변경: AsyncStorage 즉시 반영 → Supabase background sync

---

## 개발 원칙

- 한 번에 하나의 Phase/Step만 구현한다
- Secret 키 원문을 로그에 출력하지 않는다
- 크롤링 실패와 알림 실패는 분리해서 처리한다 (crawl 실패 → warning, notify 실패 → exit 1)
- 스키마/API 구조 변경은 테스트로 먼저 감지한다
