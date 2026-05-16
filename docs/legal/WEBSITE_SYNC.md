# Website legal sync (theramate.co.uk)

The **authoritative consumer-facing** legal text for Theramate should live on the website. The mobile app ships **expanded summaries** that must stay aligned.

## Source files in this repo

| Topic          | Mobile (in-app)                                                                                                    | Website action                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terms          | [`theramate-ios-client/constants/legal/termsCopy.ts`](../../theramate-ios-client/constants/legal/termsCopy.ts)     | Publish full Terms at `/terms` matching: marketplace + practice management positioning; treatment exchange (credits, no cash value); voice + AI-assisted notes (assistance only, practitioner validates); messaging; acceptable use and safety reporting; plus intermediary role, independent practitioners, booking/payments, health notes, location, reviews, liability cap + UCTA carve-out, practitioner indemnity. |
| Privacy        | [`theramate-ios-client/constants/legal/privacyCopy.ts`](../../theramate-ios-client/constants/legal/privacyCopy.ts) | Publish full Privacy Policy at `/privacy`: controller/processor split, Art 9, voice/audio and AI subprocessors, messaging retention, treatment exchange data, location, subprocessors list, retention.                                                                                                                                                                                                                  |
| DPA            | [`theramate-ios-client/constants/legal/dpaCopy.ts`](../../theramate-ios-client/constants/legal/dpaCopy.ts)         | **Static page:** [`peer-care-connect/public/dpa.html`](../../peer-care-connect/public/dpa.html) (copied to `dist/dpa.html` on build). Vercel routes in root [`vercel.json`](../../vercel.json) map `/dpa` → `/dpa.html`. Footer: [`FooterClean.tsx`](../../peer-care-connect/src/components/FooterClean.tsx).                                                                                                           |
| Sub-processors | [`theramate-ios-client/constants/config.ts`](../../theramate-ios-client/constants/config.ts) `SUBPROCESSORS_URL`   | **Static page:** [`peer-care-connect/public/subprocessors.html`](../../peer-care-connect/public/subprocessors.html). Routes `/subprocessors` in `vercel.json`.                                                                                                                                                                                                                                                          |
| Cookies        | In-app [`cookies.tsx`](../../theramate-ios-client/app/cookies.tsx) + site policy                                   | Keep cookie policy and banner on `theramate.co.uk/cookies`.                                                                                                                                                                                                                                                                                                                                                             |

## Required URLs

- `https://theramate.co.uk/terms`
- `https://theramate.co.uk/privacy`
- `https://theramate.co.uk/cookies`
- `https://theramate.co.uk/dpa`
- `https://theramate.co.uk/subprocessors`

**Deploy:** Run `npm run build --workspace=peer-care-connect` and deploy `peer-care-connect/dist` with the root `vercel.json` (or equivalent) so `/dpa` is served before the SPA fallback.

Have **UK-qualified counsel** review the website documents before treating them as final.
