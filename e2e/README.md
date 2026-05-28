# Web E2E (Playwright)

Treatment exchange UI is implemented on **Theramate mobile** (`theramate-ios-client`). This repo checkout does not include a web exchange module under `peer-care-connect/`.

## Recommended automated tests

| Layer               | Command                                       | Coverage                                            |
| ------------------- | --------------------------------------------- | --------------------------------------------------- |
| **Staging RPC E2E** | `npm run test:exchange:e2e`                   | Two-practitioner happy path + reschedule cap        |
| **Mobile unit**     | `npm run test:mobile`                         | Tier, credits, conflict message helpers             |
| **Maestro (UI)**    | `maestro test theramate-ios-client/.maestro/` | Sign-in → exchange screens (needs staging accounts) |

When web exchange is restored, add `playwright.config.ts` here and port flows from `test-scripts/treatment-exchange-staging-e2e.js` as UI steps.
