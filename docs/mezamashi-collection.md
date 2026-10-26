# 메자마시 운세 수집

기존 오하아사·고고별자리 수집, `horoscopes`, 앱 조회, 알림 경로를 유지하고
메자마시만 `mezamashi_horoscopes`에 별도로 저장한다. 자동 실행/앱 선택 UI는 아직 연결하지 않았다.

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
- 키 미설정/번역 실패/일본어 잔존은 해당 `_ko`를 null로 저장한다. `saved`는 원문 저장 성공을 뜻하며 번역 완료를 보장하지 않는다.
- 클라이언트는 RLS로 읽기만 가능하며, 쓰기는 백엔드 service role만 허용한다.

## 검증

```sh
npx tsc --noEmit
npm test
```

파서 검증은 날짜·필수 필드·중복 순위·중복 별자리와 실제 저장 HTML을 포함한다.
파이프라인 검증은 기존 번역 재사용, 번역 실패, 날짜 불일치의 DB 미접근,
별도 테이블 upsert 및 기존 번역 조회 실패 시 저장 중단을 포함한다.
