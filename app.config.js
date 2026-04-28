const { withAndroidManifest } = require('@expo/config-plugins');

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      eas: config.extra?.eas,
      sentryDsn: process.env.SENTRY_DSN || null,
      sentryAuthToken: process.env.SENTRY_AUTH_TOKEN || null,
    },
  };
};
