# Node.js 보안 패치 기준 (#76)

2026-10-21 Node.js 보안 릴리스에 맞춰 프로젝트의 실행·빌드 기준을 Node **22.23.4**로 정한다.
Node 24/26으로 메이저 버전을 변경하지 않는다. 공식 공지상 CVE-2026-105482,
CVE-2026-106069, CVE-2026-111497은 Node 22에도 해당하며,
CVE-2026-105483은 Node 24/26에 해당한다.

## 적용 범위

- 루트 `.nvmrc`: 로컬 버전 관리자와 CI가 읽는 정확한 버전.
- 백엔드·Android·iOS `package.json`의 `engines.node`: `>=22.23.4 <23`.
  npm 기본 설정에서 engines는 경고 기준이며 자동으로 Node를 교체하지 않는다.
  lockfile은 루트 패키지의 engines 메타데이터만 맞추고 의존성 버전은 유지한다.
- Node를 실행하는 GitHub Actions 3개는 `.nvmrc`를 읽는다.
- `checkout`, `setup-node`, `upload-artifact`는 Node 24 기반 v6로 변경했다.
  액션 자체의 런타임은 GitHub runner가 제공하며, 우리 스크립트의 Node 22와 별개다.
- 두 앱의 EAS 빌드 프로필은 Node 22.23.4를 명시한다.
  Android `production-apk`는 `production`의 설정을 상속한다.
  이후 클라우드 빌드에서 적용되는 설정이며, 이번 작업에서는 EAS 빌드·앱 배포를 하지 않았다.

## 로컬 적용 기록 (2026-10-27)

Homebrew `node@22`를 22.23.2에서 **22.23.4**로 업데이트했다.
함께 업데이트한 의존성은 Brotli 1.2.1, c-ares 1.34.9, libuv 1.53.0,
ca-certificates 2026-10-20, simdjson 5.0.5, readline 8.3.6, SQLite 3.54.1이다.
실제 실행 바이너리의 `process.versions`에서도 Node 22.23.4, Brotli 1.2.1,
c-ares 1.34.9를 확인했다. 과거 패키지 자동 정리는 하지 않았다.

다른 개발 환경에서는 루트에서 `nvm install && nvm use`로 `.nvmrc` 버전을 적용하거나,
기존에 사용하는 버전 관리 도구로 같은 버전을 설치한다.
이미 실행 중인 Metro 등 Node 프로세스에는 바이너리 업데이트가 소급 적용되지 않으므로 재시작한다.

## AWS 배포·검증 기록 (2026-10-27)

운영 Lambda 3개는 `nodejs22.x` 관리형 런타임이며, 조회 시 모두 `UpdateRuntimeOn=Auto`였다.
배포 전 방송별 수집기의 초기화 로그는 `nodejs:22.mainline.v154`,
알림 발송기는 `nodejs:22.mainline.v105`였다. 메인 수집기도 별도 런타임 ARN을 사용한다.
AWS 런타임 식별자는 Node의 패치 버전과 다른 번호 체계이므로,
이 정보만으로 이번 보안 패치가 적용됐다고 판정하지 않는다.

세 Lambda 진입점에 `[runtime]` 로그를 추가하고 사용자 승인 후 순차 배포했다.
`node`, `brotli`, `ares`, `openssl`의 실제 버전을 확인할 수 있다.
환경변수·인증키는 기록하지 않고, 버전 확인 때문에 운세 저장이나 알림을 차단하지 않는다.
공급자가 패치를 백포트한 경우에는 버전 문자열 외에 공급자의 패치 근거도 확인한다.

방송별 수집기 → 메인 수집기 → 발송기 순서로, 각 단계의 배포·dry-run 검증을 마친 뒤 다음 단계로 진행했다.
두 스택 모두 `UPDATE_COMPLETE`, 세 Lambda 모두 `Active` / `Successful`이다.
각 변경 세트의 처리 완료 템플릿이 대상 함수의 `Code` 외에는 동일하고,
배포 ZIP의 파일들이 SAM 빌드 결과와 바이트 단위로 일치하는 것을 확인했다.

세 함수 모두 실제 실행 로그에서 **Node v22.23.4**를 확인했다.
AWS가 사용하는 라이브러리 버전은 Brotli 1.1.0, c-ares 1.34.9, OpenSSL 3.5.8이었다.
Node 공식 22.23.4 릴리스는 Brotli 수정 커밋의 cherry-pick을 명시하므로,
Brotli 버전 문자열을 로컬 Homebrew의 1.2.1과 단순 비교해 미패치로 판정하지 않는다.

- 방송별 수집기: 2026-10-27 고고·메자마시 각각 12개, `dry_run` 성공.
- 메인 수집기: 당일 오하아사 dry-run 성공. Today's Cat fallback 실행 로그도 확인했다.
  메인 수집기에는 이번에 #75 fallback도 함께 반영됐다.
- 발송기: `dryRun=true`, `throughTime=06:00`으로 한 슬롯을 검증했다.
  Edge Function이 HTTP 200 / `status: dry_run`으로 응답했다. 실제 푸시는 요청하지 않았다.

운영 런타임 자동 업데이트 설정과 모든 예약의 상태·시간·대상, 알림 상태 머신 정의는 유지했다.
검증 전후 당일 메인·고고·메자마시 데이터와 전체 `notification_log` 해시가 같았다.
EAS·Supabase Function·GitHub Actions의 수동 실행 또는 배포는 하지 않았다.
기존 코드 ZIP·템플릿 백업과 검증 기록은 `/private/tmp/ohaasa-76-deploy-YAPho8`에 있다 (임시 경로).

## 검증

- 새 Node에서 백엔드 테스트 183개 통과. 기존 `gogo_sample.html`이 없는 공식 파서 테스트는 제외했다.
- 백엔드·Android·iOS 타입 검사 통과.
- Lambda 진입점 3개의 Node 22 대상 번들 빌드 통과.
- `.nvmrc`·engines·EAS 프로필의 버전 일치, lockfile 의존성 불변,
  workflow의 예약·권한·실행 명령 불변을 확인했다.
- Brotli 압축/해제 정상 동작과 DNS 함수의 NUL 포함 호스트명 거부를 확인했다.
- 런타임 로그에 Node·Brotli·c-ares·OpenSSL 버전 네 항목만 포함되는 것을 확인했다.

## 근거

- [Node.js 공식 보안 공지](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [Node.js 22.23.4 릴리스](https://nodejs.org/en/blog/release/v22.23.4)
- [GitHub setup-node](https://github.com/actions/setup-node)
- [EAS Build의 Node 버전 설정](https://docs.expo.dev/eas/json/)
- [AWS 런타임 업데이트 방식](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-update.html)
- [AWS 런타임 버전 식별](https://docs.aws.amazon.com/lambda/latest/dg/runtime-management-identify.html)
