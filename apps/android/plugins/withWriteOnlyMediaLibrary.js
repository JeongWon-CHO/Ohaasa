const { withAndroidManifest } = require("@expo/config-plugins");

const READ_PERMISSIONS = [
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
];

// 갤러리 저장(write)만 사용하므로 READ 권한을 제거.
//
// 1차 방어는 app.config.js의 `granularPermissions: []`다. 그걸로
// READ_MEDIA_IMAGES/VIDEO/AUDIO가 애초에 추가되지 않으므로 이 플러그인은
// 이제 이중 안전장치에 가깝다.
//
// tools:node="remove"를 유지하는 이유: 예전 expo-media-library는 AAR 자체
// manifest에 READ 권한을 선언해서 Gradle manifest merger가 되살렸다.
// SDK 56(56.0.10) 소스 매니페스트에는 더 이상 없지만, 버전이 올라가며
// 되돌아와도 막히도록 둔다. 지울 대상이 없으면 merger에서 no-op이다.
module.exports = function withWriteOnlyMediaLibrary(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // tools 네임스페이스 선언 (없으면 tools:node 속성이 무시됨)
    manifest.$ = manifest.$ ?? {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    // 기존 항목 제거 (중복 방지)
    for (const key of ["uses-permission", "uses-permission-sdk-23"]) {
      if (manifest[key]) {
        manifest[key] = manifest[key].filter(
          (p) => !READ_PERMISSIONS.includes(p.$?.["android:name"]),
        );
      }
    }

    // tools:node="remove" 항목 추가 → manifest merger가 AAR에서 와도 제거
    manifest["uses-permission"] = manifest["uses-permission"] ?? [];
    for (const permission of READ_PERMISSIONS) {
      manifest["uses-permission"].push({
        $: { "android:name": permission, "tools:node": "remove" },
      });
    }

    return config;
  });
};
