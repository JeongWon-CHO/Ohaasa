const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

// 생성된 android/ 파일 대신 prebuild마다 릴리스 R8 설정을 적용한다.
module.exports = function withAndroidReleaseOptimization(config) {
  config = withGradleProperties(config, (config) => {
    for (const key of [
      'android.enableMinifyInReleaseBuilds',
      'android.enableShrinkResourcesInReleaseBuilds',
    ]) {
      const existing = config.modResults.find(
        (item) => item.type === 'property' && item.key === key,
      );
      if (existing) {
        existing.value = 'true';
      } else {
        config.modResults.push({ type: 'property', key, value: 'true' });
      }
    }
    return config;
  });

  return withAppBuildGradle(config, (config) => {
    // Expo 템플릿의 기본 파일은 -dontoptimize를 포함하므로 교체한다.
    config.modResults.contents = config.modResults.contents.replace(
      /getDefaultProguardFile\((['"])proguard-android\.txt\1\)/g,
      'getDefaultProguardFile("proguard-android-optimize.txt")',
    );
    if (!/getDefaultProguardFile\((['"])proguard-android-optimize\.txt\1\)/.test(config.modResults.contents)) {
      throw new Error('Android release optimization: expected Expo ProGuard configuration was not found.');
    }
    return config;
  });
};
