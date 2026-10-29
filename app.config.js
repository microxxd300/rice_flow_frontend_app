// Extends app.json with values that must not be committed.
//
// Android maps (react-native-maps) use Google Maps. Expo Go ships its own key, but a
// built APK needs ours: set GOOGLE_MAPS_API_KEY in .env (local builds) or as an EAS
// secret (`eas secret:create --name GOOGLE_MAPS_API_KEY`). Without it the APK shows a
// blank map. Restrict the key to the Android package com.riceflow.app and the
// "Maps SDK for Android" API in Google Cloud Console.
module.exports = ({ config }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return config;
  return {
    ...config,
    android: {
      ...config.android,
      config: { ...config.android?.config, googleMaps: { apiKey } },
    },
  };
};
