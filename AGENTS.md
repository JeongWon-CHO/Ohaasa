# AGENTS.md — ohaasa 작업 지침

## 프로젝트 개요

일본 아사히방송의 별자리 운세 JSON API를 수집·번역해 Supabase에 저장하고, React Native Expo 앱에 표시하며 푸시 알림을 발송하는 앱이다.

## 디렉터리 안내

- `app/app/`: Expo Router 화면
- `app/src/`: 컴포넌트, 훅, 컨텍스트, 라이브러리
- `backend/src/`: 크롤러, 번역, Supabase 저장 파이프라인
- `supabase/functions/`: Supabase Edge Functions

## 핵심 설계와 보안 규칙

- 앱에는 `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` 등 비밀값을 절대 포함하거나 출력하지 않는다.
- 앱에서는 `EXPO_PUBLIC_SUPABASE_URL`과 `EXPO_PUBLIC_SUPABASE_ANON_KEY`만 사용한다.
- `device_id`는 로그인 없는 사용자를 식별하는 AsyncStorage 영속 UUID다.
- 푸시 알림은 `send-horoscope-notifications` Edge Function이 발송한다. `backend/src/main.ts`에서 직접 발송하지 않는다.
- 알림 중복 방지는 `notification_log.date`의 UNIQUE 제약을 기준으로 한다.
- `expo-notifications`와 `expo-media-library`는 정적 import하지 않는다. 필요한 환경에서만 동적 import한다.
- 네트워크 또는 기기 등록 실패가 운세 조회 화면을 막아서는 안 된다.

## 작업 규칙

- 요청 범위 밖의 리팩터링이나 파일 정리는 하지 않는다.
- 기존 사용자 변경사항을 되돌리거나 덮어쓰지 않는다.
- DB 스키마나 API 구조를 변경하면 관련 테스트와 호출부를 함께 점검한다.
- 변경 후에는 영향 범위에 맞는 타입 검사, 테스트 또는 빌드를 실행한다.
- 환경변수 값, 액세스 토큰, 서비스 계정 JSON을 로그·문서·커밋에 남기지 않는다.

## 배포 규칙

- 배포 전 `app/app.config.js`의 `version`을 올린다.
- Play Console 업로드, EAS 배포, Supabase Function 배포처럼 외부 상태를 바꾸는 작업은 명시적으로 요청받았을 때만 수행한다.
- `google-services.json`은 앱 수신 설정 파일로 커밋할 수 있지만, Firebase 서비스 계정 JSON은 절대 커밋하지 않는다.
