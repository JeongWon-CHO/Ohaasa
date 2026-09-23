# Ohaasa AWS scheduler

정기 크롤링과 오전 알림 dispatcher를 GitHub Actions cron에서 분리한다.
모든 Scheduler는 첫 배포 시 `DISABLED` 상태다. 수동 검증과 기존 Supabase
Database Webhook 비활성화를 마친 뒤 명시적으로 활성화한다.
운영 전환 시 CloudFormation의 `NotificationScheduleState`와
`CrawlScheduleState` 파라미터를 각각 `ENABLED`로 변경한다.

## Secret

Secrets Manager에 다음 키를 가진 JSON secret을 만든다. 실제 값은 저장소나
SAM 설정 파일에 기록하지 않는다.

```json
{
  "SUPABASE_URL": "...",
  "SUPABASE_SERVICE_ROLE_KEY": "...",
  "OPENAI_API_KEY": "..."
}
```

## Build and deploy

```sh
cd infra/aws
sam validate --lint
sam build
cp samconfig.toml.example samconfig.toml
sam deploy --guided
```

배포 후 순서는 다음과 같다.

1. Crawler Lambda를 dry-run으로 수동 호출한다.
2. 기존 Edge Function 소스와 `horoscope_notify` Webhook 설정을 백업한다.
3. Webhook을 비활성화하고 새 Edge Function을 배포한다. 함수의 `OHAASA_SERVICE_ROLE_KEY` secret에는 AWS dispatcher와 같은 운영 service role key를 설정한다.
4. Edge Function, notification dispatcher, Step Functions를 차례로 dry-run으로 확인한다.
5. SNS 알람 수신자를 설정하고 알림 Scheduler를 활성화한다.
6. 실제 알림 한 슬롯과 `notification_log`를 확인한다.
7. Crawl Scheduler를 활성화하고 다음 05:30 실행을 확인한다.
8. GitHub Actions의 `crawl-and-notify` cron만 비활성화한다.

GitHub workflow 파일은 즉시 삭제하지 않고 수동 복구용으로 남긴다.

개발 앱과 배포 앱이 같은 Supabase DB를 사용하므로 실제 전환 전에는
[`DEPLOYMENT.md`](./DEPLOYMENT.md)의 production-only 절차를 따른다.
