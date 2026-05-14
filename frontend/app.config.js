import 'dotenv/config';

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

export default {
  expo: {
    name: "kevend",
    slug: "kevend",
    scheme: "kevend",
    version: "1.0.0",
    orientation: "portrait",
    platforms: ["ios", "android"],
    icon: "./assets/logo.png",
    splash: {
      backgroundColor: "#101010",
    },
    assetBundlePatterns: ["**/*"],
    plugins: ["expo-notifications"],
    extra: {
      googleMapsApiKey,
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      },
    },

    ios: {
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      },
      config: {
        googleMapsApiKey,
      },
    },

    android: {
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  },
};
