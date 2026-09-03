/**
 * 화면에 노출되는 앱 이름.
 *
 * `app.config.js`의 `name`과 **항상 같은 값**이어야 한다 — 홈 화면 아이콘 라벨과
 * 앱 안 헤더가 다른 이름을 말하면 같은 앱으로 안 읽힌다.
 * `slug`·`bundleIdentifier`('ohaasa')는 별개다: slug는 EAS 프로젝트 식별자라
 * 바꾸면 프로젝트가 갈리고, bundleId는 스토어 등록 후 변경할 수 없다.
 *
 * 헤더가 둘(`FinalHeader` · `JournalHeader`)이라 각자 하드코딩하면 한쪽만 바뀐다 —
 * 실제로 그렇게 어긋난 적이 있어서 상수로 묶었다.
 */
export const APP_TITLE = '하루끄적';
