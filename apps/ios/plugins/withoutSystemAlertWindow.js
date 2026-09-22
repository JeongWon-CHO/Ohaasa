const { withAndroidManifest } = require("@expo/config-plugins");

const PERMISSION = "android.permission.SYSTEM_ALERT_WINDOW";

// 다른 앱 위에 그리는 오버레이 권한. 앱은 이 기능을 쓰지 않는데,
// expo prebuild가 bare 템플릿 보일러플레이트("OPTIONAL PERMISSIONS,
// REMOVE WHATEVER YOU DO NOT NEED")를 그대로 넣어서 매번 되살아난다.
//
// withWriteOnlyMediaLibrary와 달리 tools:node="remove"를 쓰지 않는다.
// 이 권한을 main 매니페스트에 넣는 AAR이 없으므로 단순 필터로 충분하고,
// remove를 걸면 react-native의 debug 매니페스트까지 지워져
// 개발 빌드의 개발자 메뉴·레드박스 오버레이가 깨진다.
module.exports = function withoutSystemAlertWindow(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    for (const key of ["uses-permission", "uses-permission-sdk-23"]) {
      if (manifest[key]) {
        manifest[key] = manifest[key].filter(
          (p) => p.$?.["android:name"] !== PERMISSION,
        );
      }
    }

    return config;
  });
};
