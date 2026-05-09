const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FILE_NAME = 'adi-registration.properties';

module.exports = function withAndroidRegistration(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const src = path.join(config.modRequest.projectRoot, FILE_NAME);

      if (!fs.existsSync(src)) {
        throw new Error(
          `[withAndroidRegistration] ${FILE_NAME} not found at project root. ` +
          'Play Console 스니펫을 파일에 붙여넣은 후 빌드하세요.'
        );
      }

      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/assets'
      );
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.copyFileSync(src, path.join(assetsDir, FILE_NAME));

      return config;
    },
  ]);
};
