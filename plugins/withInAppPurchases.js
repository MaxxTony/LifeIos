const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to enable In-App Purchase capability for iOS.
 *
 * react-native-purchases v10 does not ship its own Expo config plugin,
 * so this custom plugin adds the In-App Purchase system capability to the
 * Xcode project during prebuild.
 *
 * It directly patches the TargetAttributes dictionary in the pbxproj so
 * that Xcode recognises the capability in "Signing & Capabilities".
 */
const withInAppPurchases = (config) => {
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const targetUuid = project.getFirstTarget()?.uuid;

    if (!targetUuid) {
      console.warn('[withInAppPurchases] Could not find main target UUID');
      return config;
    }

    // Navigate to the TargetAttributes section inside the root project object.
    // Structure: rootObject → attributes.TargetAttributes.<targetUuid>.SystemCapabilities
    const pbxProject = project.pbxProjectSection();
    const projectUuid = project.getFirstProject()?.uuid;

    if (projectUuid && pbxProject[projectUuid]) {
      const attrs = pbxProject[projectUuid].attributes;

      if (!attrs.TargetAttributes) {
        attrs.TargetAttributes = {};
      }
      if (!attrs.TargetAttributes[targetUuid]) {
        attrs.TargetAttributes[targetUuid] = {};
      }
      if (!attrs.TargetAttributes[targetUuid].SystemCapabilities) {
        attrs.TargetAttributes[targetUuid].SystemCapabilities = {};
      }

      // Enable In-App Purchase capability
      attrs.TargetAttributes[targetUuid].SystemCapabilities[
        'com.apple.InAppPurchase'
      ] = { enabled: 1 };

      console.log('[withInAppPurchases] ✅ Added In-App Purchase capability');
    } else {
      console.warn('[withInAppPurchases] Could not find pbxProject section');
    }

    return config;
  });

  return config;
};

module.exports = withInAppPurchases;
