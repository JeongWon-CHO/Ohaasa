/**
 * 메인 화면과 공통 헤더에 노출되는 영문 브랜드명.
 *
 * `app.config.js`의 `name`은 설치된 앱 이름인 '오하아사'를 사용하고,
 * 앱 안에서는 소문자 영문 워드마크 'ohaasa'를 사용한다.
 * `slug`·`bundleIdentifier`('ohaasa')는 별개다: slug는 EAS 프로젝트 식별자라
 * 바꾸면 프로젝트가 갈리고, bundleId는 스토어 등록 후 변경할 수 없다.
 *
 * 헤더 컴포넌트가 여럿이던 시절 각자 하드코딩해서 한쪽만 바뀐 적이 있다.
 * `FinalHeader`와 `WelcomeScreen`이 같은 브랜드명을 쓰도록 상수로 관리한다.
 */
export const APP_TITLE = 'ohaasa';
