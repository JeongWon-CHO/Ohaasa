const { withGradleProperties } = require("@expo/config-plugins");

// Gradle 데몬 JVM 메모리.
//
// Expo 템플릿 기본값은 `-Xmx2048m -XX:MaxMetaspaceSize=512m`인데,
// Gradle 9 + AGP + Kotlin 조합에서 512m로는 Metaspace가 모자라 빌드
// 막바지(725 tasks 전부 실행된 뒤)에 데몬이 죽는다. 증상은 코드 에러처럼
// 보이지 않고 아래 두 줄로만 나온다:
//   Failed to notify root build lifecycle listener. > Metaspace
//   Could not receive a message from the daemon.
//
// android/는 .gitignore 대상이라 gradle.properties를 직접 고치면 다음
// prebuild에 날아간다. EAS(로컬 포함)는 레포를 새로 prebuild하므로
// 반드시 config plugin으로 넣어야 한다.
const JVM_ARGS = "-Xmx4096m -XX:MaxMetaspaceSize=1024m";

module.exports = function withGradleJvmArgs(config) {
  return withGradleProperties(config, (config) => {
    const key = "org.gradle.jvmargs";
    const existing = config.modResults.find(
      (item) => item.type === "property" && item.key === key,
    );

    if (existing) {
      existing.value = JVM_ARGS;
    } else {
      config.modResults.push({ type: "property", key, value: JVM_ARGS });
    }

    return config;
  });
};
