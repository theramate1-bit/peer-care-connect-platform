/**
 * Dynamic Expo config — keeps `app.json` as source of truth and allows EAS project id from env.
 * @see https://docs.expo.dev/workflow/configuration/
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require("./app.json");

// Ensure Universal Links / App Links include whatever web origin you build against.
// - EXPO_PUBLIC_WEB_URL is available at build time.
// - We dynamically add `applinks:<host>` and Android `https://<host>/` intent data for that host (+ www variant).
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

// Extract existing iOS associated domains like `applinks:theramate.com`.
const existingIosAssociatedDomains = Array.isArray(
  appJson.expo?.ios?.associatedDomains,
)
  ? appJson.expo.ios.associatedDomains
  : [];

const iosHosts = new Set(
  existingIosAssociatedDomains
    .map((d) =>
      typeof d === "string"
        ? d
            .replace(/^applinks:/, "")
            .trim()
            .toLowerCase()
        : null,
    )
    .filter(Boolean),
);

for (const h of webHostVariants) iosHosts.add(h);

const updatedIosAssociatedDomains = Array.from(iosHosts).map(
  (h) => `applinks:${h}`,
);

// Extract existing Android HTTPS hosts from intent filter and extend with build-time web host variants.
const existingAndroidIntentFilters = Array.isArray(
  appJson.expo?.android?.intentFilters,
)
  ? appJson.expo.android.intentFilters
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

    // Only adjust HTTPS view filters (leave custom schemes / other actions alone).
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

// Add explicit intent filter for custom scheme handling on Android (defensive).
// Expo generally wires this automatically from `expo.scheme`, but this ensures predictable behavior.
const scheme = appJson.expo?.scheme;
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
    ...appJson.expo,
    ios: {
      ...(appJson.expo.ios || {}),
      associatedDomains: updatedIosAssociatedDomains,
    },
    android: {
      ...(appJson.expo.android || {}),
      intentFilters: androidIntentFiltersWithScheme,
    },
    extra: {
      ...appJson.expo.extra,
      eas: {
        ...appJson.expo.extra.eas,
        projectId:
          process.env.EAS_PROJECT_ID || appJson.expo.extra.eas.projectId,
      },
    },
  },
};
