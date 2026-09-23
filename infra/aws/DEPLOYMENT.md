# Production-only database rollout

이 프로젝트는 개발 앱과 배포 앱이 같은 Supabase 프로젝트를 사용한다. 따라서
마이그레이션, Edge Function, Scheduler를 한꺼번에 켜지 않는다. 모든 작업은 오전
알림 시간이 끝난 뒤 수행하고, 각 단계가 확인되기 전에는 다음 단계로 넘어가지 않는다.

## 1. Read-only preflight

환경변수 값은 출력하지 않는다.

```sh
set -a
source backend/.env
set +a
node infra/aws/scripts/preflight-supabase.mjs before
```

현재 운영 기준은 다음과 같다.

- `user_devices`에는 아직 `notification_time`, `notification_state`가 없다.
- `notification_log`에는 `date`, `sent_at`이 있다.
- `notification_log.date`가 단일 Primary Key다.

이 조건이 다르면 마이그레이션을 실행하지 말고 실제 스키마에 맞춰 다시 검토한다.

## 2. Backup before any write

1. 기존 `send-horoscope-notifications` 함수 소스를 별도 보관한다.
2. `horoscopes`, `user_devices`, `notification_log`를 백업한다.
3. Supabase Dashboard에서 `horoscope_notify` Database Webhook 설정을 캡처한다.
4. Webhook은 아직 비활성화하지 않는다.

서비스 계정 JSON, service role key, OpenAI key는 백업 파일이나 저장소에 넣지 않는다.

## 3. Migration transaction rehearsal

Supabase SQL Editor에서 migration SQL 전체를 `begin`과 `rollback` 사이에 넣거나,
아래 스크립트로 먼저 검증한다. 성공 메시지를 확인해도 이 단계에서는 반드시
rollback한다.

```sh
node infra/aws/scripts/rehearse-notification-migration.mjs
```

```sql
begin;

-- supabase/migrations/20260922000000_notification_scheduling.sql 내용

select notification_type, date, scheduled_time, status
from public.notification_log
order by date desc, notification_type, scheduled_time
limit 20;

rollback;
```

DDL은 짧은 잠금을 잡을 수 있으므로 트래픽이 적고 오전 알림이 끝난 시간에 실행한다.

## 4. Apply migration

리허설이 성공하면 migration을 한 번 실제 적용한 후 read-only 검사를 실행한다.

```sh
node infra/aws/scripts/preflight-supabase.mjs after
```

마이그레이션은 기존 행을 다음 값으로 보존한다.

- `notification_type = daily_horoscope`
- `scheduled_time = 06:00`
- `status = succeeded`

기존 Edge Function이 `date`만 INSERT해도 나머지 컬럼은 기본값으로 채워지므로,
이 시점에는 기존 Webhook 발송이 계속 동작한다.

## 5. Deploy AWS with schedules disabled

`template.yaml`의 세 Scheduler는 기본적으로 `DISABLED`다.

1. SAM stack을 배포한다.
2. Crawler Lambda를 `dryRun=true`로 수동 호출한다.
3. Step Functions를 수동 실행한다.
4. CloudWatch 로그에 secret 원문이 없는지 확인한다.
5. DLQ와 SNS topic이 생성됐는지 확인한다.

SNS topic에는 운영자가 실제로 확인하는 이메일 또는 알림 채널을 구독시킨다.

## 6. Replace notification trigger

이 단계부터는 짧은 알림 점검 시간이 생긴다.

1. `horoscope_notify` Database Webhook을 비활성화한다.
2. 새 `send-horoscope-notifications` Edge Function을 배포한다.
3. Edge Function을 `dry_run=true`로 호출해 06:00 후보 수를 확인한다.
4. 알림 Scheduler 두 개만 활성화한다.
5. Database Webhook은 다시 활성화하지 않는다.

Edge Function 검증이 실패하면 새 Scheduler를 켜지 않고 기존 함수 소스를 복원한 뒤
Webhook을 다시 활성화한다.

## 7. Switch the crawler

1. AWS Crawl Scheduler를 활성화한다.
2. 수동 실행으로 당일 데이터 12개와 번역 12개를 확인한다.
3. GitHub Actions `crawl-and-notify`의 schedule 실행을 비활성화한다.
4. workflow 파일과 `workflow_dispatch`는 비상 수동 실행용으로 남긴다.

두 크롤러를 동시에 예약 실행하지 않는다. 데이터 upsert는 멱등적이지만 OpenAI 호출과
운영 로그가 중복되고, 전환 상태를 판단하기 어려워진다.

## 8. Operational rollback

DB 컬럼과 복합 PK는 기존 앱에 영향을 주지 않으므로 급하게 되돌리지 않는다.
문제가 발생하면 다음처럼 실행 주체만 롤백한다.

1. AWS Crawl Scheduler와 알림 Scheduler를 비활성화한다.
2. GitHub Actions crawler schedule을 다시 활성화한다.
3. 새 Edge Function에 문제가 있으면 보관한 기존 함수를 복원한다.
4. 기존 함수를 복원한 경우에만 Database Webhook을 다시 활성화한다.

복합 PK를 단일 `date` PK로 되돌리는 스키마 롤백은 여러 시간 슬롯 행을 삭제해야 하므로
긴급 롤백 절차에 포함하지 않는다.
