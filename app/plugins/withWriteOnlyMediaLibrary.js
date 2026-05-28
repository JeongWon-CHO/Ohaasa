const { withAndroidManifest } = require("@expo/config-plugins");

const READ_PERMISSIONS = [
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
];

// 갤러리 저장(write)만 사용하므로 READ 권한을 제거.
// 단순 필터링만으로는 expo-media-library AAR의 자체 manifest에서
// Gradle manifest merger가 다시 추가하기 때문에, tools:node="remove"로
// merger 단계에서도 제거되도록 명시해야 한다.
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
