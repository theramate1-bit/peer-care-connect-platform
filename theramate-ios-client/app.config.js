/**
 * Single Expo config (no app.json) — satisfies expo-doctor and keeps dynamic linking from EXPO_PUBLIC_WEB_URL / EAS_PROJECT_ID.
 * `extra.EXPO_PUBLIC_*` mirrors `.env` so `expo-constants` can read Supabase URL/anon key at runtime if Metro env inlining differs (e.g. CI).
 * @see https://docs.expo.dev/workflow/configuration/
 */

const path = require("path");

try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  /* optional devDependency */
}

const baseExpo = {
  name: "Theramate",
  slug: "theramate-client",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "theramate",
  userInterfaceStyle: "automatic",
  newArchEnabled: false,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FFFDF8",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.theramate.client",
    buildNumber: "1",
    associatedDomains: [
      "applinks:theramate.com",
      "applinks:www.theramate.com",
    ],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleDisplayName: "Theramate",
      UIBackgroundModes: ["remote-notification"],
      NSLocationWhenInUseUsageDescription:
        "Theramate uses your location to find therapists near you.",
      NSLocationAlwaysUsageDescription:
        "Theramate uses your location to find therapists near you.",
      NSCameraUsageDescription:
        "Theramate needs camera access to take profile photos.",
      NSPhotoLibraryUsageDescription:
        "Theramate needs photo library access to select profile photos.",
      NSCalendarsUsageDescription:
        "Theramate can add your appointments to your calendar.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FFFDF8",
    },
    package: "com.theramate.client",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: "theramate.com", pathPrefix: "/" },
          { scheme: "https", host: "www.theramate.com", pathPrefix: "/" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#7A9E7E",
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow Theramate to use your location to find nearby therapists.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Theramate to access your photos for your profile picture.",
      },
    ],
    "expo-document-picker",
    [
      "expo-av",
      {
        microphonePermission:
          "Theramate can record short voice memos to transcribe into clinical notes (optional).",
      },
    ],
    [
      "expo-calendar",
      {
        calendarPermission:
          "Allow Theramate to add appointments to your calendar.",
      },
    ],
    [
      "@stripe/stripe-react-native",
      {
        merchantIdentifier: "merchant.com.theramate",
        enableGooglePay: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {},
    /** Passthrough for `constants/config.ts` via `expo-constants` (see `API_CONFIG`). */
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_WEB_URL: process.env.EXPO_PUBLIC_WEB_URL,
    EXPO_PUBLIC_POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  },
};

function getWebHostVariants(webUrl) {
  try {
    const hostname = new URL(webUrl).hostname.toLowerCase().replace(/\/$/, "");
    if (!hostname) return [];

    const out = new Set([hostname]);
    if (hostname.startsWith("www.")) out.add(hostname.replace(/^www\./, ""));
    else out.add(`www.${hostname}`);

    return Array.from(out);
  } catch {
    return [];
  }
}

const defaultWebUrl = "https://theramate.com";
const webUrlForLinks = process.env.EXPO_PUBLIC_WEB_URL || defaultWebUrl;
const webHostVariants = getWebHostVariants(webUrlForLinks);

const existingIosAssociatedDomains = Array.isArray(
  baseExpo.ios?.associatedDomains,
)
  ? baseExpo.ios.associatedDomains
  : [];

const iosHosts = new Set(
  existingIosAssociatedDomains
    .map((d) =>
      typeof d === "string"
        ? d.replace(/^applinks:/, "").trim().toLowerCase()
        : null,
    )
    .filter(Boolean),
);

for (const h of webHostVariants) iosHosts.add(h);

const updatedIosAssociatedDomains = Array.from(iosHosts).map(
  (h) => `applinks:${h}`,
);

const existingAndroidIntentFilters = Array.isArray(
  baseExpo.android?.intentFilters,
)
  ? baseExpo.android.intentFilters
  : [];

function hasSchemeIntentFilter(intentFilters, scheme) {
  return (intentFilters || []).some((f) =>
    Array.isArray(f?.data) ? f.data.some((d) => d?.scheme === scheme) : false,
  );
}

const updatedAndroidIntentFilters = existingAndroidIntentFilters.map(
  (filter) => {
    if (!filter || !Array.isArray(filter.data)) return filter;
    if (filter.action !== "VIEW") return filter;

    const isHttpsFilter = filter.data.some((d) => d && d.scheme === "https");
    if (!isHttpsFilter) return filter;

    const hostSet = new Set(
      filter.data
        .map((d) => (d?.host ? String(d.host).toLowerCase() : null))
        .filter(Boolean),
    );

    for (const h of webHostVariants) hostSet.add(h);

    const baseData = filter.data.filter((d) => d && d.scheme === "https");
    const pathPrefix = baseData[0]?.pathPrefix ?? "/";

    const nextData = Array.from(hostSet).map((host) => ({
      scheme: "https",
      host,
      pathPrefix,
    }));

    return {
      ...filter,
      autoVerify: filter.autoVerify ?? true,
      data: nextData,
    };
  },
);

const scheme = baseExpo.scheme;
const androidIntentFiltersWithScheme = hasSchemeIntentFilter(
  updatedAndroidIntentFilters,
  scheme,
)
  ? updatedAndroidIntentFilters
  : [
      ...(updatedAndroidIntentFilters || []),
      {
        action: "VIEW",
        category: ["BROWSABLE", "DEFAULT"],
        data: [{ scheme }],
      },
    ];

module.exports = {
  expo: {
    ...baseExpo,
    ios: {
      ...(baseExpo.ios || {}),
      associatedDomains: updatedIosAssociatedDomains,
    },
    android: {
      ...(baseExpo.android || {}),
      intentFilters: androidIntentFiltersWithScheme,
    },
    extra: {
      ...baseExpo.extra,
      eas: {
        ...baseExpo.extra.eas,
        ...(process.env.EAS_PROJECT_ID
          ? { projectId: process.env.EAS_PROJECT_ID }
          : {}),
      },
    },
  },
};
