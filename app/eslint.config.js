// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // dist는 빌드 산출물, .expo/types는 expo-router가 생성하는 라우트 타입이다.
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // 테스트 파일의 jest 전역(it · expect …). 기본 설정에는 들어 있지 않아
    // 전부 no-undef로 잡힌다.
    files: ['**/__tests__/**', '**/*.test.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        jest: 'readonly',
        test: 'readonly',
      },
    },
  },
]);
