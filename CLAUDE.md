# CLAUDE.md — ohaasa プロジェクト

## 프로젝트 개요

**목적**: 일본 아사히방송의 おはようさんです！星占い JSON API에서 별자리 운세 데이터를 가져와
Supabase에 저장하고, React Native Expo 앱에서 표시하며, 사용자 별자리에 맞는 Expo Push Notification을 전송한다.

**MVP 방침**:

- 로그인/Auth 없음 — 핵심 기능 진입 장벽을 낮추기 위해 제외
- 사용자 식별: 앱 최초 실행 시 `crypto.randomUUID()`를 생성해 AsyncStorage에 영속화
- 서버에는 `device_id`, `push_token`, `zodiac_sign`만 저장
- `user_devices.user_id`는 nullable — 추후 Supabase Auth 도입 여지를 남겨둠

---

## 아키텍처

```
GitHub Actions (cron: UTC 일~금 22:00 = JST/KST 월~토 07:00)
  └─ backend (Node.js/TypeScript)
       ├─ 1. 아사히 JSON API fetch
       ├─ 2. parse → 12개 HoroscopeEntry
       ├─ 3. Supabase horoscopes upsert
       ├─ 4. user_devices 조회 (Phase 4-2)
       └─ 5. Expo Push API 발송 (Phase 4-2)

React Native Expo (Phase 6)
  └─ Supabase horoscopes SELECT → 오늘 운세 표시
```

---

## 디렉토리 구조

```
ohaasa/
├── app/                           # React Native Expo 앱 (Phase 6)
│   ├── app/                       # Expo Router 파일 기반 라우팅
│   │   ├── _layout.tsx            # Root layout
│   │   ├── index.tsx              # 진입점: 온보딩 완료 여부 분기
│   │   ├── onboarding.tsx         # 최초 실행 온보딩 (별자리 선택)
│   │   └── (tabs)/
│   │       ├── _layout.tsx        # Tab navigator
│   │       ├── today.tsx          # 오늘의 운세 (메인)
│   │       └── settings.tsx       # 설정/별자리 변경
│   ├── src/
│   │   ├── constants/
│   │   │   └── zodiac.ts          # ZodiacSign 타입, ZODIAC_LIST, ZODIAC_MAP
│   │   ├── types/
│   │   │   └── env.d.ts           # EXPO_PUBLIC_ 환경변수 타입 선언
│   │   ├── lib/
│   │   │   ├── storage.ts         # AsyncStorage 헬퍼 (device_id, zodiac)
│   │   │   ├── supabase.ts        # Supabase anon client
│   │   │   └── notifications.ts   # Expo Push 권한 요청 + token 등록
│   │   ├── hooks/
│   │   │   ├── useZodiac.ts       # zodiac_sign 읽기/쓰기
│   │   │   └── useHoroscope.ts    # 운세 조회 (오하아사 최신 방송 기준)
│   │   └── components/
│   │       ├── ZodiacPicker.tsx   # 12 별자리 선택 UI
│   │       ├── HoroscopeCard.tsx  # 운세 카드
│   │       └── DateBadge.tsx      # 오하아사 방송 기준일 표시
│   ├── .env.example               # EXPO_PUBLIC_ 환경변수 템플릿
│   ├── app.json                   # Expo 설정 (name: Ohaasa)
│   └── package.json               # Expo SDK 54
├── backend/
│   ├── src/
│   │   ├── crawler/
│   │   │   ├── fetcher.ts         # 아사히 JSON API fetch
│   │   │   ├── parser.ts          # JSON → HoroscopeEntry[] 변환
│   │   │   ├── parser.test.ts     # 31 tests
│   │   │   └── sample.json        # 테스트용 픽스처
│   │   ├── db/
│   │   │   └── supabase.ts        # createAdminClient() — service_role 전용
│   │   └── main.ts                # fetch → parse → upsert 파이프라인
│   ├── .env                       # 로컬 개발용 (Git 비추적)
│   ├── .env.example               # 환경변수 템플릿
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
├── supabase/
│   ├── migrations/
│   │   ├── 20260428000001_create_horoscopes.sql
│   │   └── 20260428000002_create_user_devices.sql
│   └── verify.sql                 # GRANT 확인용 쿼리
├── .gitignore
└── CLAUDE.md
```

---

## 데이터 소스

**API 엔드포인트**: `https://www.asahi.co.jp/data/ohaasa2020/horoscope.json`

> HTML 크롤링(cheerio) 방식은 폐기. 실제 HTML에는 운세 데이터가 없고,
> JavaScript 실행 후 별도 JSON API에서 DOM에 주입되는 구조임을 확인.

**응답 예시**:

```json
{
  "horoscope_id": "2897",
  "onair_date": 20260428,
  "open_st": 2,
  "detail": [
    {
      "ranking_no": "1",
      "horoscope_st": "12",
      "horoscope_text": "理想的な形で進展するか？\t..."
    }
  ]
}
```

---

## 주요 설계 결정사항

### horoscope_st 매핑

```
"01" → aries       (おひつじ座)
"02" → taurus      (おうし座)
"03" → gemini      (ふたご座)
"04" → cancer      (かに座)
"05" → leo         (しし座)
"06" → virgo       (おとめ座)
"07" → libra       (てんびん座)
"08" → scorpio     (さそり座)
"09" → sagittarius (いて座)
"10" → capricorn   (やぎ座)
"11" → aquarius    (みずがめ座)
"12" → pisces      (うお座)
```

### 저장 필드

`date`, `zodiac_sign`, `zodiac_name`, `rank`, `advice`

제거한 필드: `score`, `lucky_color`, `lucky_item`, `source_url`
→ 실제 API 응답에 존재하지 않거나 모든 row에 동일해 DB 컬럼이 불필요함.

### open_st 처리

`open_st !== "2"`이면 경고만 출력하고 저장은 진행한다.
detail 12개가 존재하면 유효 데이터로 판단하며, open_st의 다른 값 의미가 아직 불명확하기 때문.

### advice 정규화

`horoscope_text`의 탭 문자(`\t`)를 줄바꿈(`\n`)으로 변환 후 trim 및 빈 줄 제거.

### cron 스케줄

```yaml
cron: "0 22 * * 0-5" # UTC 기준. JST/KST 월~토 07:00 실행. 일요일 스킵.
```

일요일은 방송 없음 → 크롤링 없음, 알림 없음.

### 주말 데이터 처리 방침

- 오하아사(おはよう朝日です)는 월~토 방송이며, 일요일에는 데이터가 없다.
- 주말 대체 콘텐츠(고고별자리 / グッド!モーニング 기반)는 추후 별도 Phase에서 제공한다.
- **Step 3 Supabase 연동 단계에서는 주말 fallback 로직을 구현하지 않는다.**
- 앱은 오하아사 최신 방송 데이터를 그대로 표시하며, 날짜 표시는 "오늘"이 아닌 "오하아사 방송 기준일"을 명시한다.
- 방송 데이터가 없는 날(일요일 등)에는 데이터 없음 상태를 표시한다.

---

## Supabase 설정

### 테이블 구조

**horoscopes** — 날짜·별자리별 운세

- `UNIQUE(date, zodiac_sign)` → 동일 날짜 재실행 시 중복 없이 upsert 가능

**user_devices** — 푸시 알림용 기기 정보

- `updated_at`은 `clock_timestamp()`로 자동 갱신 (같은 트랜잭션 내에서도 정확)

### GRANT (중요)

RLS 정책만으로는 부족하다. SQL 마이그레이션으로 직접 생성한 테이블에는
PostgreSQL 수준 GRANT가 필요하다. `verify.sql` 참조.

```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON TABLE horoscopes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE horoscopes TO service_role;
GRANT INSERT, UPDATE ON TABLE user_devices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_devices TO service_role;
```

이 GRANT가 누락되면 upsert 시 `permission denied for table horoscopes` 오류가 발생한다.

### 환경변수

| 변수명                      | 설명                                                           |
| --------------------------- | -------------------------------------------------------------- |
| `SUPABASE_URL`              | `https://xxxx.supabase.co` 형식 (`/rest/v1` 붙이면 안 됨)      |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy service_role JWT 키. **앱/프론트엔드에 절대 노출 금지** |

---

## 페이즈 진행 상황

| 페이즈    | 내용                                       | 상태                                                       |
| --------- | ------------------------------------------ | ---------------------------------------------------------- |
| Phase 1   | 데이터 소스 조사·API 확인                  | ✅ 완료                                                    |
| Phase 2   | JSON 파서 구현 (31 tests passed)           | ✅ 완료                                                    |
| Phase 3   | Supabase 스키마 설계·마이그레이션          | ✅ 완료                                                    |
| Phase 4-1 | fetch → parse → Supabase upsert 파이프라인 | ✅ 완료                                                    |
| Phase 4-2 | Expo 푸시 알림 발송                        | ✅ 완료 (dry-run 검증. 실발송은 Phase 6 앱 이후)           |
| Phase 5   | GitHub Actions 스케줄러                    | ✅ 완료 (수동 dry-run·live 검증. cron 자동 실행 확인 예정) |
| Phase 6   | React Native Expo 앱                       | 🔄 진행 중 (Step 1 완료)                                   |

---

## Phase 4-2 구현 내용

`backend/src/notifications/sender.ts` 구현 완료.

- `fetchLatestHoroscopes()`: 2-step 쿼리로 최신 date 12개 확정 (날짜 혼합 방지)
- `fetchActiveDevices()`: `notifications_enabled = true AND push_token IS NOT NULL`
- `buildMessages()`: `Expo.isExpoPushToken()` 검증, 한국어 제목 + 일본어 본문, invalid token 수집
- `disableDevices()`: `DeviceNotRegistered` 및 invalid token → `notifications_enabled = false`
- 발송: 100개 단위 chunk, index 기반 ticket 처리, receipt ID 로그 (Phase 5 이후 polling 예정)
- dry-run: Supabase 조회만 수행, Expo API 호출·DB update 없이 payload 콘솔 출력

`main.ts` 통합:

- crawl 실패 → warning 후 계속 (기존 DB 데이터로 알림 시도)
- notify 실패 → `exit(1)` (crawl 결과 무관)

**실발송 테스트**: Phase 6 Expo 앱에서 실제 push_token 등록 후 진행

---

## GitHub Actions 설정

### Secrets 등록 (필수)

GitHub repo → Settings → Secrets and variables → Actions → New repository secret

| Secret 이름                 | 값                         |
| --------------------------- | -------------------------- |
| `SUPABASE_URL`              | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy service_role JWT 키 |

### workflow 파일

`.github/workflows/crawl-and-notify.yml`

- **cron**: `0 22 * * 0-5` (UTC) = JST/KST 월~토 07:00, 일요일 스킵
- **concurrency**: 중복 실행 방지 (`cancel-in-progress: false`)
- **timeout-minutes**: 10 (hang 방지)
- **permissions**: `contents: read` (최소 권한)
- **dry_run input**: `workflow_dispatch` 수동 실행 시 체크박스로 선택

### 검증 순서

1. Secrets 등록 확인
2. Actions 탭 → `Crawl horoscopes and send notifications` → Run workflow → `dry_run=true` → 로그 확인
   - `[crawl] dry-run: upsert skipped`
   - `[main] Parsed 12 entries`
   - `[sender] Active devices: N` (또는 0건 정상 종료)
3. `dry_run=false`로 수동 실행 → Supabase horoscopes 실제 upsert 확인
4. 다음 cron 자동 실행 확인

---

## Phase 6 React Native Expo 앱

### 앱 환경

| 항목         | 값     |
| ------------ | ------ |
| Expo SDK     | 54     |
| Expo Router  | 6      |
| React Native | 0.81.5 |
| 앱 디렉토리  | `app/` |

### 단계별 구현 로드맵

| Step     | 내용                                                            | 상태       |
| -------- | --------------------------------------------------------------- | ---------- |
| Step 1   | 프로젝트 초기화 · 패키지 설치 · 폴더 구조                       | ✅ 완료    |
| Step 2   | 로컬 상태 기반: 온보딩 화면 · 별자리 선택 · AsyncStorage 영속화 | ✅ 완료    |
| Step 2-1 | Phase 6 UI polish: F1~F5 디자인 반영 · 실제 기기 QA · 미세 조정 | 🔄 진행 중 |
| Step 3   | Supabase 연동: 오하아사 운세 조회 · 방송 기준일 표시 · 로딩/에러/데이터 없음 상태 | 🔲         |
| Step 4   | user_devices 등록: device_id upsert · 푸시 토큰 요청            | 🔲         |
| Step 5   | 설정 화면: 별자리 변경 · 알림 on/off 토글                       | 🔲         |
| Step 6   | E2E 검증: 실기기 push_token 등록 · 실발송 확인                  | 🔲         |

### Step 1 완료 내용

- `npx create-expo-app@latest app --template tabs` 로 Expo Router 프로젝트 생성
- 추가 패키지 설치 (`npx expo install` — SDK 54 호환 버전 고정)
  - `@react-native-async-storage/async-storage` 2.2.0
  - `expo-notifications` ~0.32.17
  - `expo-device` ~8.0.10
  - `@supabase/supabase-js` ^2.105.1
  - `date-fns` ^4.1.0
- `app.json`: name/slug/scheme → `ohaasa`, `expo-notifications` 플러그인 등록
- `src/constants/zodiac.ts`: `ZodiacSign` 타입, `ZODIAC_LIST`, `ZODIAC_MAP` 구현 완료
- `src/types/env.d.ts`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` 타입 선언
- `.env.example` 추가 (anon key 전용 — service_role key 항목 없음)
- `src/lib/`, `src/hooks/`, `src/components/` 폴더 구조 생성 (각 Step에서 순차 구현)

### Step 2 완료 내용

- `app/app/index.tsx`
  - AsyncStorage의 `ohaasa:zodiac_sign` 확인
  - 저장된 별자리가 없으면 `/onboarding`으로 이동
  - 저장된 별자리가 있으면 `/(tabs)`로 이동
- `app/app/onboarding.tsx`
  - F1 온보딩 intro 화면 구현
  - F2 별자리 선택 화면 구현
  - 별자리 선택 시 `getOrCreateDeviceId()` 호출
  - 선택한 별자리를 AsyncStorage에 저장
  - 저장 후 `router.replace('/(tabs)')`로 메인 탭 진입
- `app/src/lib/storage.ts`
  - `device_id` 생성 및 영속화
  - `zodiac_sign` 저장/조회
  - 유효하지 않은 zodiac 값 제거 처리
- 하단 탭 구성 완료
  - Today: `app/app/(tabs)/index.tsx`
  - 전체 순위: `app/app/(tabs)/rankings.tsx`
  - 설정: `app/app/(tabs)/settings.tsx`
- 로그인 없는 MVP 흐름 유지
- Supabase 연동 전까지 로컬/mock 기반 UI 흐름으로 구성

### Step 2-1 진행 내용 — Phase 6 UI Polish

Claude Design의 `design-handoff/ohaasa.html` Final Flow를 기준으로 F1~F5 화면을 React Native Expo 앱에 반영했다.

기준 화면:

- F1 `FinalOnboarding`
- F2 `FinalSignSelection`
- F3 `FinalMainRevised`
- F4 `FinalAllRankings`
- F5 `FinalSettings`

현재 상태:

- F1 온보딩 화면 1차 polish 완료
- F2 별자리 선택 화면 1차 polish 완료
- F3 오늘의 운세 화면 1차 polish 완료
- F4 전체 순위 화면 1차 polish 완료
- F5 설정 화면 1차 polish 완료
- F1 중앙 노란 glow는 단색 원처럼 보이는 문제를 임시로 4겹 동심원 방식으로 수정
- TypeScript 컴파일 통과 확인

현재 진행 중인 QA:

- F3 중앙 별자리 원형 배경이 단색 원처럼 보이는 문제 확인
- 목표 디자인처럼 다홍빛에서 노란빛으로 부드럽게 퍼지는 radial gradient glow 느낌으로 개선 예정
- 여러 개의 반투명 View 원을 겹치는 방식은 사용하지 않고, `react-native-svg`의 `RadialGradient` 기반 구현을 우선 검토한다.

주의사항:

- F1/F2/F3/F4/F5의 큰 레이아웃 변경 금지
- 기능 로직 변경 금지
- AsyncStorage/storage/routing 변경 금지
- Supabase 연동은 Step 3에서 진행
- Push Notification 구현은 Step 4 이후 진행
- `backend/`, `supabase/`, `.github/` 폴더는 Phase 6 UI polish 중 수정하지 않는다.

### 앱 설계 원칙

- `service_role` 키는 앱에 절대 포함하지 않는다 — anon key만 `EXPO_PUBLIC_` 접두사로 사용
- `device_id`는 `crypto.randomUUID()`로 생성해 AsyncStorage에 영속화 (앱 재설치 시 재생성)
- 별자리 선택은 로컬 AsyncStorage 우선 저장 → Supabase background upsert (네트워크 실패 허용)
- 알림 권한 거부 시 운세 조회 기능은 정상 동작 유지 — 알림은 선택 사항
- DatePill은 "오늘"이 아닌 오하아사 방송 기준일을 명시한다 — 주말 fallback 로직은 구현하지 않음

### 앱 로컬 개발

```bash
cd app

# .env.local 준비 (처음 한 번)
cp .env.example .env.local
# EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY 값 입력

npm start          # Expo Go / 에뮬레이터
npm run android
npm run web
```

---

## 로컬 개발

```bash
cd backend
npm install

# .env 준비
cp .env.example .env
# SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 기입

npm run test        # 파서 테스트 (31 tests)
npm run crawl       # fetch → parse → upsert 실행
npm run crawl:dry   # DB 쓰기 없는 dry-run
```

---

## 개발 원칙

- 한 번에 너무 많은 기능을 구현하지 않는다
- 각 Phase마다 로컬 검증 방법을 포함한다
- Secret 키 원문을 로그에 출력하지 않는다 (prefix + length만)
- `service_role` 키는 backend / GitHub Actions Secrets에서만 사용한다
- 앱/프론트엔드에는 anon / publishable 키만 사용한다
- 크롤링 실패와 알림 실패는 가능한 한 분리해서 처리한다
- 에러 메시지는 원인을 특정할 수 있을 만큼 명확하게 출력한다
- 스키마/API 구조 변경은 테스트로 먼저 감지할 수 있도록 유지한다
