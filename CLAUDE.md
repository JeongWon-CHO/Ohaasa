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
cron: '0 22 * * 0-5'   # UTC 기준. JST/KST 월~토 07:00 실행. 일요일 스킵.
```
일요일은 방송 없음 → 크롤링 없음, 알림 없음.

### 일요일 fallback (앱 측)
오늘 날짜 데이터가 없으면 가장 최근 날짜의 운세를 표시한다.
반드시 실제 방송 날짜를 UI에 함께 표시해 사용자가 오늘 운세로 오해하지 않도록 한다.

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

| 변수명 | 설명 |
|--------|------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` 형식 (`/rest/v1` 붙이면 안 됨) |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy service_role JWT 키. **앱/프론트엔드에 절대 노출 금지** |

---

## 페이즈 진행 상황

| 페이즈 | 내용 | 상태 |
|--------|------|------|
| Phase 1 | 데이터 소스 조사·API 확인 | ✅ 완료 |
| Phase 2 | JSON 파서 구현 (31 tests passed) | ✅ 완료 |
| Phase 3 | Supabase 스키마 설계·마이그레이션 | ✅ 완료 |
| Phase 4-1 | fetch → parse → Supabase upsert 파이프라인 | ✅ 완료 |
| Phase 4-2 | Expo 푸시 알림 발송 | ✅ 완료 (dry-run 검증. 실발송은 Phase 6 앱 이후) |
| Phase 5 | GitHub Actions 스케줄러 | ✅ 완료 (수동 dry-run·live 검증. cron 자동 실행 확인 예정) |
| Phase 6 | React Native Expo 앱 | 🔲 다음 단계 |

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

| Secret 이름 | 값 |
|-------------|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
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
