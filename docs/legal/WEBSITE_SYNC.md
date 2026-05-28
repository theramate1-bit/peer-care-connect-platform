# Website legal sync (theramate.co.uk)

The **authoritative consumer-facing** legal text for Theramate should live on the website. The mobile app ships **expanded summaries** that must stay aligned.

## Source files in this repo

| Topic          | Mobile (in-app)                                                                                                    | Website action                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terms          | [`theramate-ios-client/constants/legal/termsCopy.ts`](../../theramate-ios-client/constants/legal/termsCopy.ts)     | Publish full Terms at `/terms` matching: marketplace + practice management positioning; treatment exchange (credits, no cash value); voice + AI-assisted notes (assistance only, practitioner validates); messaging; acceptable use and safety reporting; plus intermediary role, independent practitioners, booking/payments, health notes, location, reviews, liability cap + UCTA carve-out, practitioner indemnity.                |
| Privacy        | [`theramate-ios-client/constants/legal/privacyCopy.ts`](../../theramate-ios-client/constants/legal/privacyCopy.ts) | Publish full Privacy Policy at `/privacy`: controller/processor split, Art 9, voice/audio and AI subprocessors, messaging retention, treatment exchange data, location, subprocessors list, retention.                                                                                                                                                                                                                                 |
| DPA            | [`theramate-ios-client/constants/legal/dpaCopy.ts`](../../theramate-ios-client/constants/legal/dpaCopy.ts)         | **Static page:** `dpa.html` must ship at the **web deploy root** (e.g. `dist/dpa.html`) so root [`vercel.json`](../../vercel.json) can map `/dpa` → `/dpa.html`. Source is often the web app’s `public/dpa.html` (workspace name may still be `peer-care-connect` in `package.json`); **search the repo** for `dpa.html` if paths differ on your branch. Consumer-site footer links: search repo-root **`src/`** for DPA/legal routes. |
| Sub-processors | [`theramate-ios-client/constants/config.ts`](../../theramate-ios-client/constants/config.ts) `SUBPROCESSORS_URL`   | **Static page:** `subprocessors.html` at the **web deploy root** (e.g. `dist/subprocessors.html`); root [`vercel.json`](../../vercel.json) maps `/subprocessors` → `/subprocessors.html`. Source often `public/subprocessors.html` in the web package — **search the repo** for that filename.                                                                                                                                         |
| Cookies        | In-app [`cookies.tsx`](../../theramate-ios-client/app/cookies.tsx) + site policy                                   | Keep cookie policy and banner on `theramate.co.uk/cookies`.                                                                                                                                                                                                                                                                                                                                                                            |

## Required URLs

- `https://theramate.co.uk/terms`
- `https://theramate.co.uk/privacy`
- `https://theramate.co.uk/cookies`
- `https://theramate.co.uk/dpa`
- `https://theramate.co.uk/subprocessors`

**Deploy:** From the repo root, run the web build script in root [`package.json`](../../package.json) (today that is often `npm run build`, which targets the `peer-care-connect` workspace when that package exists). Deploy the **web `dist/` output** together with root [`vercel.json`](../../vercel.json) so `/dpa` and `/subprocessors` resolve to the static HTML files before the SPA fallback.

Have **UK-qualified counsel** review the website documents before treating them as final.
