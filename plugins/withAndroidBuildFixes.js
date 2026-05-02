const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to fix Android build issues:
 * 1. Conflict in appComponentFactory (Manifest merger failed)
 * 2. Java heap space error (Out of memory during Jetifier)
 */
const withAndroidBuildFixes = (config) => {
  // 1. Add tools:replace="android:appComponentFactory" to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    if (application) {
      application.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';
      application.$['tools:replace'] = 'android:appComponentFactory';
    }
    return config;
  });

  // 2. Increase Java heap space and enable Jetifier in gradle.properties
  config = withGradleProperties(config, (config) => {
    // Remove existing if any to avoid duplicates
    config.modResults = config.modResults.filter(
      (item) => item.key !== 'org.gradle.jvmargs' && item.key !== 'android.enableJetifier'
    );
    
    // Add increased memory for Gradle
    config.modResults.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx4096m -XX:MaxMetaspaceSize=512m',
    });
    
    // Enable Jetifier for legacy library support
    config.modResults.push({
      type: 'property',
      key: 'android.enableJetifier',
      value: 'true',
    });
    
    return config;
  });

  return config;
};

module.exports = withAndroidBuildFixes;
