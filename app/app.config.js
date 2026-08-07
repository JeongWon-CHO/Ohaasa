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
    version: '1.4.0',
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
        },
      ],
      './plugins/withWriteOnlyMediaLibrary',
      [
        'react-native-android-widget',
        {
          widgets: [
            {
              name: 'TodayHoroscopeSmall',
              label: '오늘의 운세 (아이콘)',
              description: '오늘의 순위를 홈 화면 아이콘 크기로 바로 확인해요.',
              minWidth: '40dp',
              minHeight: '40dp',
              updatePeriodMillis: 21600000,
              previewImage: './assets/images/adaptive-icon.png',
              resizeMode: 'none',
            },
            {
              name: 'TodayHoroscope',
              label: '오늘의 운세',
              description: '오늘의 운세 등수와 한마디를 홈 화면에서 바로 확인해요.',
              minWidth: '220dp',
              minHeight: '110dp',
              updatePeriodMillis: 21600000,
              previewImage: './assets/images/adaptive-icon.png',
              resizeMode: 'horizontal|vertical',
            },
            {
              name: 'TodayHoroscopeLarge',
              label: '오늘의 운세 (크게)',
              description: '오늘의 운세를 더 크게, 조언 전체를 홈 화면에서 확인해요.',
              minWidth: '250dp',
              minHeight: '180dp',
              updatePeriodMillis: 21600000,
              previewImage: './assets/images/adaptive-icon.png',
              resizeMode: 'horizontal|vertical',
            },
          ],
        },
      ],
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
