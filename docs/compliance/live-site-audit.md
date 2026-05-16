# Live site audit — theramate.co.uk

**Date:** 2026-04-18 (curl vs browser note added 2026-04-18)  
**Method:** Automated HTTP checks from repo environment + **manual browser pass required** for SPA content.

## `curl` vs browser — what each proves (2026)

| Check                                 | `curl -sI` (or GET body)                                                                           | Real browser                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **HTTP status / CDN**                 | Yes: 200/301/404, cache headers                                                                    | Same, plus redirects in DevTools Network                           |
| **Pretty URL → static legal HTML**    | **Yes:** `Content-Disposition` / length should match `*.html`, not `index.html`                    | **Yes:** address bar stays `/dpa`; body is DPA text, not app shell |
| **SPA route content** (e.g. `/terms`) | **No:** initial HTML is usually the **same shell** for all routes; cannot see React-rendered terms | **Yes:** only way to verify actual terms/privacy wording           |
| **Cookie banner / PECR**              | **No:** need to inspect Set-Cookie and scripts after load                                          | **Yes:** Application/Storage + visual banner                       |

**Quick production check (PowerShell):** `curl.exe -sI https://theramate.co.uk/dpa` — if you see `filename="index.html"` and ~6677 bytes, the **pretty URL is still serving the SPA**; `https://theramate.co.uk/dpa.html` should show `filename="dpa.html"` and a different length until `vercel.json` **rewrites** are deployed.

## Automated checks (completed)

| URL                               | HTTP status | Notes                                                                  |
| --------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `https://theramate.co.uk/`        | 200         | Vercel, HSTS, security headers present                                 |
| `https://theramate.co.uk/terms`   | 200         | Same shell as home (SPA); **title** in HTML is generic marketing title |
| `https://theramate.co.uk/privacy` | 200         | Same as above                                                          |
| `https://theramate.co.uk/cookies` | 200         | Same as above                                                          |
| `https://theramate.co.uk/pricing` | 200         | Same as above                                                          |
| `https://theramate.co.uk/help`    | 200         | Same as above                                                          |

**Implication:** Legal page **wording** is not verifiable from `curl` alone; the client-side router must render route-specific content. **Do not** rely on static HTML scrape for compliance proof.

## Manual browser checklist (assign owner)

Complete in **Chrome/Edge** with DevTools → disable cache.

### Navigation and discoverability

- [ ] Footer on home: **Terms**, **Privacy**, **Cookies** (and **Pricing** if applicable).
- [ ] Same links on **pricing**, **login**, **signup** flows.
- [ ] **DPA** or practitioner terms: link from practitioner signup or dashboard if counsel requires.

### Legal content

- [ ] **Terms:** platform disclaimer; independent contractors; liability limits; cancellation; governing law (England and Wales).
- [ ] **Privacy:** special category data; lawful bases; location/visit data; retention; subprocessors; ICO contact.
- [ ] **Cookies:** banner consent; categories; link to privacy.

### Marketing vs compliance

- [ ] No unsubstantiated **medical claims** (ASA-sensitive phrases).
- [ ] “Verified” / “qualified” language matches actual verification.

### Technical

- [ ] **HTTPS** only (no mixed content).
- [ ] Cookie banner does not drop non-essential cookies before consent (PECR/ePrivacy).

## Re-audit trigger

Re-run when: legal copy changes, new processor (AI, analytics), or new payment mode (e.g. cash bookings) goes live.
