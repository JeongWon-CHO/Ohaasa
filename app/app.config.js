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
    version: '1.0.0',
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
