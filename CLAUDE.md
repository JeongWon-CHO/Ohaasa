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
    │   └── notifications.ts   # requestPushToken() — dynamic import 방식
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
- **일요일**: 방송 없음 → cron 스킵 (`0 22 * * 0-5`)
- **주말 데이터**: MVP에서는 fallback 없음. 데이터 없는 날은 빈 상태 표시. 고고별자리 연동은 별도 Phase.
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

### Step 7 완료 내용

- `eas credentials` → Android `com.ohaasa.app` → FCM V1 Google Service Account Key 업로드
- `npm run crawl:dry` → `advice_ko` 한국어 body 확인 (`advice` 일본어 원문 fallback 버그 수정 포함)
- `npm run crawl` → `1/1 sent` · Receipt ID 발급 · 삼성 노트9 알림 수신 확인
- `notifications_enabled` 발송 후에도 `true` 유지 확인

### 수동 테스트 방법

```bash
cd backend
npm run crawl:dry   # payload 미리보기 (발송 없음)
npm run crawl       # 실발송
```

### Phase 7 후보

- Receipt polling: Expo Push Receipt API 2단계 검증 구현
- 앱 포그라운드 알림 핸들러 추가 (현재 포그라운드에서 배너 미표시)
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
