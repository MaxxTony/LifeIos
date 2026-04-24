const { withAndroidManifest } = require('@expo/config-plugins');

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      sentryDsn: process.env.SENTRY_DSN || null,
      eas: config.extra?.eas,
    },
  };
};
