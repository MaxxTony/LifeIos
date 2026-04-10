const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to add the local Maven repository for @react-native-async-storage/async-storage
 * to the android/build.gradle file.
 */
const withAsyncStorageRepo = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addRepo(config.modResults.contents);
    }
    return config;
  });
};

function addRepo(contents) {
  const repoUrl = '$rootDir/../node_modules/@react-native-async-storage/async-storage/android/local_repo';
  const repoStr = `maven { url "${repoUrl}" }`;
  
  if (contents.includes(repoUrl)) {
    return contents;
  }

  // Find allprojects { repositories { and inject the new repo
  const regex = /allprojects\s*\{\s*repositories\s*\{/;
  if (regex.test(contents)) {
    return contents.replace(regex, (match) => `${match}\n        ${repoStr}`);
  }
  
  return contents;
}

module.exports = withAsyncStorageRepo;
