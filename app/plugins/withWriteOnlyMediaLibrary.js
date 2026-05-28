const { withAndroidManifest } = require('@expo/config-plugins');

const READ_PERMISSIONS = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
];

// 갤러리 저장(write)만 사용하므로 READ 권한을 manifest에서 제거.
// expo-media-library 플러그인이 자동으로 추가하는 권한을 빌드 후 걷어냄.
module.exports = function withWriteOnlyMediaLibrary(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? [];
    manifest['uses-permission'] = permissions.filter(
      (p) => !READ_PERMISSIONS.includes(p.$?.['android:name'])
    );
    return config;
  });
};
