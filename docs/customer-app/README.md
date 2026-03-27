# Customer app — documentation hub

**New or junior developer?** Start with **[`00-JUNIOR_DEV_START_HERE.md`](00-JUNIOR_DEV_START_HERE.md)** — plain-language overview, diagram, and reading order — then come back here for the full index.

This folder holds **customer-facing** (client + guest) documentation only. It is intentionally separate from practitioner/admin surfaces so mobile and web work can be scoped without mixing roles.

**Native code (Theramate):** [`../../theramate-ios-client/README.md`](../../theramate-ios-client/README.md) — the repo-root [`customer-app/`](../../customer-app/README.md) folder is **not** Theramate.

**Related (whole product):** [`../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md`](../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md)

**Mobile readiness (summary table):** [`15-MOBILE_PLATFORM_READINESS.md`](15-MOBILE_PLATFORM_READINESS.md)

**Screens to build (full list):** [`16-MOBILE_SCREENS_BUILD_LIST.md`](16-MOBILE_SCREENS_BUILD_LIST.md)

**Gaps & missing items:** [`17-DOCUMENTATION_GAPS_AND_TRACKER.md`](17-DOCUMENTATION_GAPS_AND_TRACKER.md)

**Mobile UI/UX (BMAD-aligned foundations):** [`18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md`](18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md)

**Native analytics & observability:** [`19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md`](19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md)

**BMAD workflows index:** [`20-BMAD_WORKFLOWS_INDEX.md`](20-BMAD_WORKFLOWS_INDEX.md)

**BMAD planning artifact (interim UX stub):** [`../../_bmad-output/planning-artifacts/ux-design-customer-mobile.md`](../../_bmad-output/planning-artifacts/ux-design-customer-mobile.md)

**Developer quickstart (run web + native):** [`21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md`](21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md)

**Screens & wireframes (ASCII + flows):** [`24-SCREEN_WIREFRAMES_AND_LAYOUTS.md`](24-SCREEN_WIREFRAMES_AND_LAYOUTS.md) · **Design registry:** [`25-SCREEN_REGISTRY_FOR_DESIGN.md`](25-SCREEN_REGISTRY_FOR_DESIGN.md)

**Release & store:** [`26-RELEASE_AND_STORE_READINESS.md`](26-RELEASE_AND_STORE_READINESS.md)

## Documents in this folder

| #      | File                                                                                                 | Contents                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **00** | **[`00-JUNIOR_DEV_START_HERE.md`](00-JUNIOR_DEV_START_HERE.md)**                                     | **Read first (junior-friendly):** big picture, reading order, common mistakes  |
| 01     | [`01-WEB_ROUTES.md`](01-WEB_ROUTES.md)                                                               | Authenticated `/client/*` routes and wrappers                                  |
| 02     | [`02-GUEST_AND_PUBLIC_FLOWS.md`](02-GUEST_AND_PUBLIC_FLOWS.md)                                       | Public URLs guests use (booking, mobile requests, reviews)                     |
| 03     | [`03-REACT_COMPONENTS_AND_SUBFLOWS.md`](03-REACT_COMPONENTS_AND_SUBFLOWS.md)                         | Major components embedded in customer pages (booking, marketplace, timeline)   |
| 04     | [`04-NATIVE_EXPO_CUSTOMER_APP.md`](04-NATIVE_EXPO_CUSTOMER_APP.md)                                   | `theramate-ios-client` — Expo routes, gaps vs web                              |
| 05     | [`05-PARITY_MATRIX.md`](05-PARITY_MATRIX.md)                                                         | Web ↔ native checklist by feature                                              |
| 06     | [`06-DATA_SUPABASE_REALTIME.md`](06-DATA_SUPABASE_REALTIME.md)                                       | Tables, hooks, and Edge Functions relevant to clients                          |
| 07     | [`07-TESTING_AND_SCREEN_CAPTURES.md`](07-TESTING_AND_SCREEN_CAPTURES.md)                             | How to regression-test and capture customer screens                            |
| 08     | [`08-GUEST_VS_CLIENT_PRODUCT_RULES.md`](08-GUEST_VS_CLIENT_PRODUCT_RULES.md)                         | Summary of guest vs client rules + pointers to canonical docs                  |
| 09     | [`09-EMAIL_PUSH_AND_NOTIFICATIONS.md`](09-EMAIL_PUSH_AND_NOTIFICATIONS.md)                           | Email, in-app, and push alignment                                              |
| 10     | [`10-TWO_NATIVE_CODEBASES.md`](10-TWO_NATIVE_CODEBASES.md)                                           | `customer-app/` vs `theramate-ios-client/` at repo root                        |
| 11     | [`11-SCREEN_BY_SCREEN_WEB_CLIENT.md`](11-SCREEN_BY_SCREEN_WEB_CLIENT.md)                             | **Web:** every `/client/*` screen, data + components (code-traced)             |
| 12     | [`12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md`](12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md)                 | Header, sidebar, mobile drawer behavior                                        |
| 13     | [`13-NATIVE_SCREENS_IMPLEMENTATION_STATUS.md`](13-NATIVE_SCREENS_IMPLEMENTATION_STATUS.md)           | **Native:** Expo screens vs mocks vs web gaps                                  |
| 14     | [`14-CLIENT_SHARED_LIBRARIES.md`](14-CLIENT_SHARED_LIBRARIES.md)                                     | `lib/` + hooks client code depends on                                          |
| 15     | [`15-MOBILE_PLATFORM_READINESS.md`](15-MOBILE_PLATFORM_READINESS.md)                                 | **Backend, types, native UI, rules, Stripe, deep links** — status + checklist  |
| 16     | [`16-MOBILE_SCREENS_BUILD_LIST.md`](16-MOBILE_SCREENS_BUILD_LIST.md)                                 | **All screens to build** (auth, tabs, stacks, guest, booking flows) + priority |
| 17     | [`17-DOCUMENTATION_GAPS_AND_TRACKER.md`](17-DOCUMENTATION_GAPS_AND_TRACKER.md)                       | **Gaps & missing** — docs, product, UX (living tracker)                        |
| 18     | [`18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md`](18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md)                         | **UI/UX foundations** — BMAD-aligned typography, spacing, motion, a11y         |
| 19     | [`19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md`](19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md)               | Screen events, parity with web `RouteChangeTracker`, errors                    |
| 20     | [`20-BMAD_WORKFLOWS_INDEX.md`](20-BMAD_WORKFLOWS_INDEX.md)                                           | Links to BMAD workflows + interim UX artifact                                  |
| 21     | [`21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md`](21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md)           | Run web + Expo, env vars, where to read first                                  |
| 22     | [`22-ERROR_EMPTY_LOADING_NETWORK_STATES.md`](22-ERROR_EMPTY_LOADING_NETWORK_STATES.md)               | Loading, empty, error, offline UX patterns                                     |
| 23     | [`23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md`](23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md) | Supabase redirects, Universal Links, Stripe                                    |
| 24     | [`24-SCREEN_WIREFRAMES_AND_LAYOUTS.md`](24-SCREEN_WIREFRAMES_AND_LAYOUTS.md)                         | **ASCII wireframes**, tab shell, key flows, Mermaid                            |
| 25     | [`25-SCREEN_REGISTRY_FOR_DESIGN.md`](25-SCREEN_REGISTRY_FOR_DESIGN.md)                               | **SCR-\*** IDs + Figma URL column for design tracking                          |
| 26     | [`26-RELEASE_AND_STORE_READINESS.md`](26-RELEASE_AND_STORE_READINESS.md)                             | TestFlight / store checklist, PHI notes                                        |
| 27     | [`27-WELL_KNOWN_LINK_FILES_TEMPLATES.md`](27-WELL_KNOWN_LINK_FILES_TEMPLATES.md)                     | AASA + `assetlinks.json` templates and verification commands                   |
| —      | [`GLOSSARY.md`](GLOSSARY.md)                                                                         | Terms used across this folder                                                  |

## Scope definition

**In scope (customer app):**

- **Authenticated client** — `user_role === 'client'` flows under `/client/*` and shared `/profile` when resolved to client.
- **Guest** — flows that do not require a full account (or use limited guest tokens), e.g. direct booking links, find booking, guest review.
- **Shared read-only** — `public` therapist profile, marketplace discovery when used as a client.

**Out of scope (see main inventory):**

- **Practitioner** dashboards, practice management, credits administration, treatment exchange **offer** side, admin verification.

## Naming

- **Customer app** = product experience for **clients and guests** (this folder).
- **Practitioner app** = not documented here (use [`../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md`](../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md) Phase 1.4–1.5).
