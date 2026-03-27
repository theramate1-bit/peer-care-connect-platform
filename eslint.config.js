export default [
  {
    // Temporary flat-config bridge so root lint-staged does not fail under ESLint v9.
    // Individual workspaces keep their own lint scripts/config.
    ignores: ["**/*"],
  },
];
