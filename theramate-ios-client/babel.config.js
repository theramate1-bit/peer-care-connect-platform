module.exports = function (api) {
  api.cache(true);
  // NativeWind 4's preset pulls in `react-native-worklets/plugin` for Reanimated 4+.
  // This app uses Reanimated 3; we dropped the native `react-native-worklets` package
  // (it broke `pod install` with New Arch off). Mirror css-interop's Babel setup without worklets.
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      () => ({
        plugins: [
          require("react-native-css-interop/dist/babel-plugin").default,
          [
            "@babel/plugin-transform-react-jsx",
            {
              runtime: "automatic",
              importSource: "react-native-css-interop",
            },
          ],
        ],
      }),
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};

