// NativeWind v4 + Expo: https://www.nativewind.dev/docs/getting-started/installation
// Use absolute paths so `npx expo start ./theramate-ios-client` from the monorepo root still resolves
// tailwind.config + global.css (NativeWind defaults use process.cwd(), which breaks in workspaces).
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// npm workspaces hoist dependencies to the repo root; Metro must watch and resolve from both trees.
config.watchFolders = [...new Set([...(config.watchFolders ?? []), monorepoRoot])];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = withNativeWind(config, {
  input: path.join(projectRoot, "global.css"),
  configPath: path.join(projectRoot, "tailwind.config.js"),
  disableTypeScriptGeneration: true,
});
