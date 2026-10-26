const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('@expo/config-plugins');

// Expo strips C++ extensions from its public Swift interface, since consumers
// cannot resolve those types. Swift 6.4 emits __ObjC:: instead of __ObjC.
const ORIGINAL_PATTERN = '/^extension __ObjC\\./,/^}/d';
const COMPATIBLE_PATTERN = '/^extension __ObjC[.:]/,/^}/d';

module.exports = function withExpoJsiSwiftCompatibility(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const packageRoot = path.dirname(
        require.resolve('expo-modules-jsi/package.json', {
          paths: [config.modRequest.projectRoot],
        }),
      );
      const scriptPath = path.join(packageRoot, 'apple/scripts/build-xcframework.sh');
      const script = fs.readFileSync(scriptPath, 'utf8');
      if (script.includes(COMPATIBLE_PATTERN)) return config;
      if (!script.includes(ORIGINAL_PATTERN)) {
        throw new Error('Expo JSI build script changed; review the Swift compatibility patch.');
      }
      // The build script is part of Expo's cache hash, so this also triggers
      // rebuilding the framework instead of reusing its incompatible interface.
      fs.writeFileSync(scriptPath, script.replace(ORIGINAL_PATTERN, COMPATIBLE_PATTERN));
      return config;
    },
  ]);
};
