# Ohaasa AWS scheduler

정기 크롤링과 오전 알림 dispatcher를 GitHub Actions cron에서 분리한다.
모든 Scheduler는 첫 배포 시 `DISABLED` 상태다. 수동 검증과 기존 Supabase
Database Webhook 비활성화를 마친 뒤 명시적으로 활성화한다.

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
2. Step Functions를 수동 실행해 Supabase upsert를 확인한다.
3. notification dispatcher와 Edge Function을 dry-run으로 확인한다.
4. 기존 `horoscope_notify` Database Webhook을 비활성화한다.
5. 알림 Scheduler를 활성화한다.
6. Crawl Scheduler를 활성화한다.
7. GitHub Actions의 `crawl-and-notify` cron만 비활성화한다.

GitHub workflow 파일은 즉시 삭제하지 않고 수동 복구용으로 남긴다.

개발 앱과 배포 앱이 같은 Supabase DB를 사용하므로 실제 전환 전에는
[`DEPLOYMENT.md`](./DEPLOYMENT.md)의 production-only 절차를 따른다.
