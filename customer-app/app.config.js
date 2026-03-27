/**
 * Expo config. Uses app.config.js so Android can get the Google Maps API key at build time.
 * Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env or EAS secrets when building.
 */

module.exports = {
  expo: {
    owner: "localitomarketplace",
    jsEngine: "hermes",
    name: "Localito Marketplace",
    slug: "localito-marketplace",
    version: "1.0.7",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "com.localito.marketplace",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    description:
      "Localito - Discover local businesses, artisans, and services in your community. Shop local, support small businesses.",
    primaryColor: "#094b9e",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#E6F4FE",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.localito.marketplace",
      // Must increase each App Store upload.
      buildNumber: "10",
      // Required for Sign in with Apple on iOS
      usesAppleSignIn: true,
      infoPlist: {
        CFBundleAllowMixedLocalizations: true,
        CFBundleLocalizations: ["fr", "en"],
      },
      config: {
        usesNonExemptEncryption: false,
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        },
      },
    },
    android: {
      package: "com.localito.marketplace",
      // Must stay above highest versionCode in Play Console — bump every Play upload.
      versionCode: 93,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/adaptive-icon.png",
      },
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "POST_NOTIFICATIONS",
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        },
      },
      // Required for Expo push notifications on Android (FCM credentials)
      googleServicesFile: "./google-services.json",
    },
    web: {
      output: "static",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#094b9e",
        },
      ],
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.localito",
          enableGooglePay: false,
        },
      ],
      // Native module for Sign in with Apple
      "expo-apple-authentication",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme:
            "com.googleusercontent.apps.447847841313-ch4qfgc5tiqs284hnv6ih093uq6c205t",
        },
      ],
      ["@react-native-community/datetimepicker"],
    ],
    experiments: {
      typedRoutes: true,
    },
    updates: {
      url: "https://u.expo.dev/f9a5cfb7-50da-410c-a9fd-0cf39088577c",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      eas: {
        projectId: "f9a5cfb7-50da-410c-a9fd-0cf39088577c",
      },
    },
  },
};
