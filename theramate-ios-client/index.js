// URL / URLSearchParams polyfills — Supabase Auth expects web-like APIs (Expo RN quickstart).
import "react-native-url-polyfill/auto";
// Must run before expo-router. Fixes blank / non-interactive root on iOS when using RNGH + native stack.
// @see https://docs.swmansion.com/react-native-gesture-handler/docs/installation
import "react-native-gesture-handler";
import "expo-router/entry";
import "./splashBootstrap";
