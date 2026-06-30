/** Jest stub — real SDK not required for unit tests */
module.exports = {
  init: () => {},
  captureException: () => {},
  captureMessage: () => {},
  browserTracingIntegration: () => ({}),
};
