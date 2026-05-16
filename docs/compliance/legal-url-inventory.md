# Legal URL and surface inventory

**Date:** 2026-04-18  
**Owner:** Product / Legal (assign named owners in your tracker)

This matrix maps the **7 legal page checklist** and related items to **canonical URLs**, **in-app surfaces**, and **gaps**. Production base URL: `https://theramate.co.uk` (also `WEB_URL` in mobile).

## Canonical URLs (from code)

Defined in [`theramate-ios-client/constants/config.ts`](../../theramate-ios-client/constants/config.ts):

| Key                 | URL                                     |
| ------------------- | --------------------------------------- |
| `WEB_URL` (default) | `https://theramate.co.uk`               |
| `PRIVACY_URL`       | `https://theramate.co.uk/privacy`       |
| `TERMS_URL`         | `https://theramate.co.uk/terms`         |
| `HELP_URL`          | `https://theramate.co.uk/help`          |
| `DPA_URL`           | `https://theramate.co.uk/dpa`           |
| `SUBPROCESSORS_URL` | `https://theramate.co.uk/subprocessors` |
| Support email       | `support@theramate.co.uk`               |

In-app legal copy defers to the website for the **full** terms: [`theramate-ios-client/constants/legal/termsCopy.ts`](../../theramate-ios-client/constants/legal/termsCopy.ts).

## Checklist mapping

| Checklist item                  | Production URL (expected)                        | In-app / repo link                                                                                                                                              | Status / action                                                       |
| ------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Terms of Service (clients)      | `/terms`                                         | Native: `/terms` screen; `TERMS_URL`; [`termsCopy.ts`](../../theramate-ios-client/constants/legal/termsCopy.ts)                                                 | **Verify** footer/nav on live site; keep app summary in sync with web |
| Practitioner / seller terms     | _(often `/terms#practitioners` or separate URL)_ | Stripe Connect embedded flow uses `WEB_URL` — see [`embedded.tsx`](<../../theramate-ios-client/app/(practitioner)/stripe-connect/embedded.tsx>)                 | **Counsel:** confirm single doc vs separate practitioner agreement    |
| Privacy Policy                  | `/privacy`                                       | Native: `/privacy`; [`privacyCopy.ts`](../../theramate-ios-client/constants/legal/privacyCopy.ts); `PRIVACY_URL`                                                | **Verify** health + location sections match product                   |
| Cookie Policy                   | `/cookies`                                       | Native: `/cookies` — points to site: [`cookies.tsx`](../../theramate-ios-client/app/cookies.tsx)                                                                | **Verify** cookie banner + policy on web                              |
| Data Processing Agreement (DPA) | `/dpa`                                           | Native: `/dpa`; [`dpaCopy.ts`](../../theramate-ios-client/constants/legal/dpaCopy.ts); static [`dpa.html`](../../peer-care-connect/public/dpa.html); `DPA_URL`  | **Deploy** web build + `vercel.json` routes.                          |
| Sub-processors list             | `/subprocessors`                                 | [`subprocessors.html`](../../peer-care-connect/public/subprocessors.html); `SUBPROCESSORS_URL` in [`config.ts`](../../theramate-ios-client/constants/config.ts) | Update HTML table when vendors change.                                |
| Acceptable Use Policy (AUP)     | \_(often section in Terms or `/acceptable-use`)` | Not in mobile constants                                                                                                                                         | **Counsel:** standalone vs Terms section                              |
| Home-visit / safety policy      | _(often `/safety` or Terms section)_             | Product behaviour: `visit_address` on sessions — see [notes-location-rls-audit.md](./notes-location-rls-audit.md)                                               | **Counsel:** publish + link from mobile booking flow                  |

## HTTP smoke (2026-04-18)

`curl.exe -sI` returned **200** for `/`, `/terms`, `/privacy`, `/cookies`, `/pricing`, `/help`. Responses are consistent with a **SPA** (same `Content-Length` across routes in sample); **legal text must be verified in a browser** (see [live-site-audit.md](./live-site-audit.md)).

For **`/dpa` and `/subprocessors`**: compare `curl.exe -sI https://theramate.co.uk/dpa` with `.../dpa.html`. After deploy, the pretty URL should **not** return the same `index.html` fingerprint as `/` (see `rewrites` in root [`vercel.json`](../../vercel.json)).

## Email and edge functions

`SITE_URL` / `https://theramate.co.uk` used in:

- [`supabase/functions/send-email/_email-templates.ts`](../../supabase/functions/send-email/_email-templates.ts) — footer links to `/privacy`, `/terms#cancellation`
- [`supabase/functions/send-booking-notification/index.ts`](../../supabase/functions/send-booking-notification/index.ts)
- [`supabase/functions/_shared/cors.ts`](../../supabase/functions/_shared/cors.ts) — allowed origins include `theramate.co.uk`, `www`, `app`

**Action:** When DPA or refund URLs are finalised, add them to email footers if required by counsel.

## Source-of-truth rule

1. **Website** = authoritative legal text for consumers and (unless counsel splits) practitioners.
2. **Mobile** = short summaries + deep links; update `lastUpdated` strings when web changes.
3. **Matrix** — copy this table to your PM tool and add **Owner** and **Last reviewed** columns.
