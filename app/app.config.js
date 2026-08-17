const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const appName = IS_DEV ? '오하아사 Dev' : IS_PREVIEW ? '오하아사 Preview' : '오하아사';
const packageName = IS_DEV
  ? 'com.ohaasa.app.dev'
  : IS_PREVIEW
  ? 'com.ohaasa.app.preview'
  : 'com.ohaasa.app';

module.exports = {
  expo: {
    name: appName,
    slug: 'ohaasa',
    version: '1.6.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'ohaasa',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FFF3E6',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: packageName,
      config: {
        usesNonExemptEncryption: false,
      },
      // ExpoFileSystem.framework가 DiskSpace required-reason API
      // (NSFileSystemFreeSize · NSURLVolumeAvailableCapacityForImportantUsageKey
      // · NSURLVolumeTotalCapacityKey)를 참조하는데, 이를 선언해야 할
      // ExpoFileSystem_privacy.bundle이 빌드에 Info.plist만 담긴 빈 껍데기로
      // 들어간다. 선언이 IPA 어디에도 없으면 업로드 시 ITMS-91053이 뜬다.
      // 사유 코드는 expo-file-system/ios/PrivacyInfo.xcprivacy 원본과 동일.
      // 이 키는 기존 항목을 덮어쓰지 않고 병합된다(PrivacyInfo.js:91 mergePrivacyInfo).
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
            NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#FAD4C0',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: packageName,
      googleServicesFile: './google-services.json',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-notifications',
      'expo-dev-client',
      'expo-font',
      'expo-sharing',
      'expo-splash-screen',
      'expo-status-bar',
      'expo-web-browser',
      './plugins/withAndroidRegistration',
      [
        'expo-media-library',
        {
          photosPermission: '갤러리에 이미지를 저장하기 위해 접근 권한이 필요해요.',
          savePhotosPermission: '갤러리에 이미지를 저장하기 위해 접근 권한이 필요해요.',
          isAccessMediaLocationEnabled: false,
          // 갤러리 저장(write)만 쓰므로 READ_MEDIA_IMAGES/VIDEO/AUDIO를 아예 추가하지 않는다.
          // 기본값이 ['photo','video','audio']라 두면 셋 다 매니페스트에 박힌다.
          granularPermissions: [],
        },
      ],
      './plugins/withWriteOnlyMediaLibrary',
      './plugins/withoutSystemAlertWindow',
      './plugins/withGradleJvmArgs',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '88347b86-3873-4cc2-a510-954cfca1c4dc',
      },
    },
    owner: 'jeongwon0312',
  },
};
