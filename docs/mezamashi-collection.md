# 메자마시 운세 수집

원본 `horoscopes`와 `mezamashi_horoscopes` 저장소는 유지한다.
주말 자동 수집에서 고고가 당일 12개 운세를 제공하지 못하면 메자마시 수집·번역·저장을 시도한다.
앱과 알림은 `resolved_horoscopes` 조회 뷰에서 날짜별로 선택된 한 소스만 읽는다.

## 앱 화면 시안

iOS·Android 개발 빌드의 `/mezamashi-preview`에서 최신 저장 데이터를 읽어 화면을 비교할 수 있다.
1위·일반 순위(2위)·12위 선택으로 추가 조언·인물·메뉴 유무에 따른 배치를 확인한다.
기존 운세의 배경·별자리 배지·본문 카드를 재사용하며, 날짜 옆에 메자마시 이름을 표시한다.
하단 출처 문구는 두지 않고 설정 ABOUT의 오하아사·고고별자리 링크와 함께 메자마시 공식 페이지 링크를 제공한다.
미리보기 경로와 순위 선택·공유 이미지 비교 버튼은 개발 모드에서만 열린다.
실제 앱은 선택된 소스가 메자마시일 때 이 카드 구성을 표시한다. 별도 메자마시 진입 버튼은 추가하지 않았다.

예: `apps/ios`에서 `npx expo start --web --port 8083` 실행 후
`http://localhost:8083/mezamashi-preview`에 접속한다.

## 주말 대체 규칙과 적용 순서

- 평일은 오하아사만 선택한다. 주말은 당일 고고 12개가 완전하면 고고, 그렇지 않으면 완전한 메자마시 12개를 선택한다.
- 순위/별자리의 누락·중복·빈 본문이 있는 소스는 선택하지 않는다. 미래 날짜도 공개하지 않는다.
- 둘 다 없으면 앱은 최근의 완전한 날짜를 실제 방송일과 함께 표시한다. 알림은 요청 날짜의 데이터만 사용하므로 지난 운세를 새 알림으로 보내지 않는다.
- 2026-10-26 이전 기록은 원래 출처로 유지한다. 과거에 평일 고고 운세로 저장한 날도 조회에서 사라지지 않는다.
- 고고가 늦게 복구되면 새 조회에서는 고고를 우선한다. 기존 리뷰의 출처/순위는 작성 당시 값으로 유지한다.
- 운세 순위 통계는 오하아사만 집계한다. 고고/메자마시 순위를 같은 평균에 합산하지 않는다.
- 기존 알림 배치의 `(notification_type, date, scheduled_time)` 중복 방지 기준을 유지한다.

운영 적용은 다음 순서로 진행한다. 이번 코드 작업에서 배포나 스케줄러 변경은 실행하지 않는다.

1. `20261026010000_resolved_horoscopes.sql` 적용. 새 읽기 전용 뷰만 추가하며 기존 테이블을 수정하지 않는다.
2. AWS 수집 스택(Lambda·상태 머신)과 `send-horoscope-notifications` Edge Function에 변경 코드 배포.
3. 알림 dry-run으로 당일 선택 소스를 확인한 뒤 앱 배포. 앱 배포 전 각 대상 `app.config.js` 버전을 올린다.

기존 스케줄이 주말에도 수집 Lambda를 호출하므로 별도 메자마시 스케줄은 필요하지 않다.
다만 기존 05:30 시작 + 20분 간격 2회 재시도만으로는 07:00 이후 갱신을 놓치므로,
세 번째 시도까지 실패한 주말에만 60분 대기 후 재시도하고, 필요하면 20분 뒤 한 번 더 확인한다.
평일 재시도 횟수는 유지한다. 수동 GitHub workflow도 주말에는 최대 6회까지 20분 간격으로 재시도한다.
뷰 적용 전에는 새 앱의 통합 운세 조회가 동작하지 않으므로 앱부터 배포하지 않는다.

## 소스와 항목

- 공식 페이지: https://www.fujitv.co.jp/meza/uranai/index.html
- 공식 페이지 스크립트가 사용하는 JSON: https://www.fujitv.co.jp/meza/uranai/data/uranai.json
- 2026-10-26 공식 JSON의 12개 별자리 응답 확인. 저장된 HTML 중 운세 섹션만 테스트 fixture로 보관한다.
- JSON `text` → 본문 `advice`, JSON `advice` → `extra_advice`.
- `point`는 물건·장소·음식 등을 포함하므로 `lucky_point`로 저장한다.
- `color`, `person`, `menu` → `lucky_color`, `lucky_person`, `lucky_menu`.
- 1위의 추가 조언은 アドバイス, 12위의 추가 조언은 おまじない(행운 행동)에 해당한다.
- 2~11위에 없는 추가 항목은 null. 메자마시에 없는 재물·연애·일·건강 점수는 생성하지 않는다.

## 로컬 미리보기

`backend` 디렉터리에서 실행한다. 기본 실행은 DB 접근과 번역 API 호출을 하지 않는다.

```sh
npm run crawl:mezamashi
npm run crawl:mezamashi -- --html src/mezamashi/fixtures/2026-10-26.html --year 2026
npm run crawl:mezamashi -- --json /path/to/uranai.json
```

HTML에는 연도가 없으므로 `--year`가 필수이며 HTML은 미리보기만 허용한다.
`--translate`를 추가하면 기존 백엔드의 `OPENAI_API_KEY`, 선택적 `OPENAI_MODEL`로 한국어 미리보기를 만든다.
키는 백엔드 환경에서만 설정한다.

## 저장 준비와 실행

먼저 `supabase/migrations/20261026000000_mezamashi_horoscopes.sql`을 적용해야 한다.
이 변경에는 마이그레이션 배포나 실제 운영 DB 저장이 포함되지 않는다.

백엔드에 기존과 동일한 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`를 설정한 뒤:

```sh
npm run crawl:mezamashi -- --save
```

- JSON의 날짜가 실행 시점 JST/KST 오늘과 다르면 `status: stale`, `count: 0`으로 저장을 건너뛴다.
- 일요일 신규 운세 제공 여부는 아직 확인하지 않았다. 토요일 데이터가 남아 있어도 일요일 날짜로 바꾸지 않는다.
- 12개 별자리와 1~12위의 고유성을 확인한 뒤 12행을 한 번에 upsert한다.
- PK `(date, zodiac_sign)`로 재실행을 처리한다.
- 원문과 기존 한국어가 같으면 필드별 번역을 재사용한다. 변경되거나 번역이 없으면 다시 번역한다.
- 운세 본문은 기존 운세 번역기를 사용하고, 짧은 항목은 단어·구절 전용 지침으로 번역한다.
- 짧은 항목은 색상·음식(메뉴)·행운 포인트·인물·행동으로 구분하여 각 종류의 번역 예시를 제공한다.
  행운 포인트는 음식·물건·장소가 섞이므로 음식으로 한정하지 않는다.
- 알려진 색상은 고정 한국어 매핑을 사용한다. 번역 거절 문구나 짧은 항목의 과도한 설명은 유효한 번역으로 인정하지 않는다.
- 키 미설정/번역 실패/일본어 잔존은 해당 `_ko`를 null로 저장한다. `saved`는 원문 저장 성공을 뜻하며 번역 완료를 보장하지 않는다.
- 클라이언트는 RLS로 읽기만 가능하며, 쓰기는 백엔드 service role만 허용한다.

## 검증

저장소 루트에서 공유 패키지와 Edge Function 파일을 직접 열어도 올바른 타입 환경을 사용하도록
각 경로에 `tsconfig.json`을 둔다. 공유 패키지는 peer dependency를 별도 설치하지 않고
원본 경로에서는 설치된 iOS 앱 타입을, 각 앱의 `node_modules/@ohaasa/shared` 링크 경로에서는
해당 앱 타입을 사용한다. 링크 위치에 따라 상대 `extends` 경로가 깨지지 않도록 JSX 등 검사 옵션을 명시한다.
두 앱의 실제 빌드는 각 앱 설정으로 별도 검사한다.
Edge Function의 편집기 검사는 백엔드 개발 의존성인 `@types/deno`와 Supabase 타입을 사용하며,
런타임의 `npm:` import는 그대로 유지한다. 백엔드는 Node 타입만 사용한다.

저장소 루트에서 독립 검사:

```sh
apps/ios/node_modules/.bin/tsc -p packages/shared/tsconfig.json --noEmit
apps/android/node_modules/.bin/tsc -p apps/android/node_modules/@ohaasa/shared/tsconfig.json --noEmit
apps/ios/node_modules/.bin/tsc -p apps/ios/node_modules/@ohaasa/shared/tsconfig.json --noEmit
backend/node_modules/.bin/tsc -p supabase/functions/tsconfig.json --noEmit
```

별도로 실제 Deno CLI의 `deno check --no-config --no-lock supabase/functions/send-horoscope-notifications/index.ts`도 통과했다.

```sh
npx tsc --noEmit
npm test
```

파서 검증은 날짜·필수 필드·중복 순위·중복 별자리와 실제 저장 HTML을 포함한다.
파이프라인 검증은 기존 번역 재사용, 번역 실패, 날짜 불일치의 DB 미접근,
별도 테이블 upsert 및 기존 번역 조회 실패 시 저장 중단을 포함한다.

주말 연결 변경 검증:

- iOS·Android·백엔드 타입 검사 통과.
- `backend`에서 `npx vitest run --exclude src/gogo/parser.test.ts --silent`: 116개 통과.
  기존 고고 파서 테스트는 저장소 루트의 `gogo_sample.html` fixture가 없어 제외한다.
- PGlite에서 실제 마이그레이션 SQL을 실행해 평일/주말 우선순위, 불완전 데이터,
  과거 기록 유지, 익명 읽기 전용 권한과 원본 RLS 적용을 검증한다.
- 실제 Edge Function 코드를 DB/Expo 대역과 실행해 당일 데이터 없음·번역 누락·중복 배치의 발송 차단과 메자마시 출처를 검증한다. 실제 푸시는 발송하지 않는다.
- 실제 리뷰 저장 코드를 메모리 저장소와 실행해 작성 당시 출처·순위 보존을 검증한다.
- Android 웹 export 통과. 브라우저에서 메자마시 본문·추가 항목·공유 카드 배치를 확인했다.
- 기기에서의 이미지 캡처/갤러리 저장 및 운영 스케줄 실행은 배포 후 별도 검증이 필요하다.

## 2026-10-26 실제 실행 검증

- 공식 JSON을 수집·번역해 `mezamashi_horoscopes`에 당일 12행 저장 후 재조회했다.
- 별자리와 순위가 각각 12개 고유값이며, 원문 필드가 공식 응답과 일치함을 확인했다.
- 원문이 있는 번역 대상 41개 필드가 채워졌다. 추가 항목이 없는 별자리는 null을 유지한다.
- 첫 실행에서 본문용 지침을 짧은 항목에도 적용해 색상의 운세 문장 생성과 음식 이름 번역 거절이 발생했다.
  짧은 항목 전용 번역·색상 매핑·결과 검증을 추가한 뒤 잘못된 저장값을 교정했다.
- 재조회한 데이터로 번역 단계를 재실행했을 때 추가 번역 호출이 0회임을 확인했다.
- 타입 검사와 메자마시/기존 운세 번역기 관련 테스트 35개를 통과했다.
- 토요일·일요일 갱신은 이번 월요일 실행만으로 검증되지 않았다. 자동 일정과 앱 대체 로직은 아직 연결하지 않았다.
