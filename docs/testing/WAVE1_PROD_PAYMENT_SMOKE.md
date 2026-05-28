# Production payment smoke — device QA script

**Date:** 2026-05-27  
**Project:** `aikqnvltuwwgifuocvto` (eu-west-2)  
**Prerequisite:** EAS production build with `EXPO_PUBLIC_WEB_URL=https://theramate.co.uk` and `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_*`

Maps to W1-5 items in [WAVE1_QA_RELEASE_SIGNOFF.md](./WAVE1_QA_RELEASE_SIGNOFF.md).

---

## Ops checklist (before device)

| Check                        | How                                        | Pass                                                                   |
| ---------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| Supabase `APP_URL`           | Dashboard → Edge Functions → secrets       | `https://theramate.co.uk`                                              |
| Supabase `STRIPE_SECRET_KEY` | Dashboard → secrets (not readable via MCP) | Must be `sk_live_*` for prod smoke                                     |
| EAS publishable key          | `eas.json` / EAS env                       | `pk_live_*`                                                            |
| Edge functions               | MCP / Dashboard                            | `stripe-payment` v132+, `verify-checkout` v1+, `stripe-webhook` active |
| Web bundle                   | View page source on theramate.co.uk        | `pk_live_` in JS                                                       |

**MCP snapshot (2026-05-27):**

| Metric                        | Value                            |
| ----------------------------- | -------------------------------- |
| `payments` (7d)               | 0                                |
| `checkout_sessions` (7d)      | 0                                |
| Subscriptions `active`        | 7                                |
| Subscriptions `past_due`      | 1                                |
| Practitioners with Connect ID | 9                                |
| Recent `stripe-webhook`       | POST 200                         |
| `verify-checkout`             | Deployed v1 (was 404 pre-deploy) |

No recent checkout activity — **prod payment smoke on a real device is still required** before store submit.

---

## Device script (one session, ~45 min)

Use a **live** card with a **small** amount (£1–£5). Record checkout session id (`cs_…`) for each path.

### 1 — Clinic online (signed-in client)

1. Sign in as client → marketplace → clinic practitioner → book → **Pay online**.
2. Complete Stripe in **Secure checkout** WebView.
3. **Expect:** WebView closes → native **booking-success** with session id.
4. **Expect:** Session appears under client bookings within ~2 min.

| Pass | Notes     |
| ---- | --------- |
| ☐    | `cs_` id: |

### 2 — Guest card (WebView web booking)

1. Sign out → `/book/:slug` or booking with `guest=1` → **Pay online**.
2. **Expect:** Theramate WebView (not Safari) → complete pay on web.
3. **Expect:** Redirect to native **booking-success** (not stuck in WebView).
4. Close without paying once → **Expect:** returns to `/booking` (dismissPath).

| Pass | Notes |
| ---- | ----- |
| ☐    |       |

### 3 — Guest pay at clinic

1. Guest flow → **Pay at clinic** → name + email.
2. **Expect:** Alert “Booking confirmed” + Find my booking.

| Pass | Notes |
| ---- | ----- |
| ☐    |       |

### 4 — Mobile visit (signed-in)

1. Mobile request → submit → hosted checkout → success screen.
2. **Expect:** Hold/paid state on request detail.

| Pass | Notes     |
| ---- | --------- |
| ☐    | `cs_` id: |

### 5 — Platform subscription

1. Practitioner → Pricing or Settings → Subscribe → checkout WebView.
2. **Expect:** **subscription-success** → “Subscription active” after verify.

| Pass | Notes |
| ---- | ----- |
| ☐    |       |

### 6 — Stripe Connect onboarding

1. Practitioner → Stripe Connect → Start onboarding.
2. Complete Stripe forms → return URL hits `/onboarding/stripe-return`.
3. **Expect:** Native **Stripe setup received** → Connect status screen.

| Pass | Notes |
| ---- | ----- |
| ☐    |       |

### 7 — Customer portal

1. Profile → Payment methods / billing portal.
2. **Expect:** Billing WebView opens; Close returns to profile (manual close OK).

| Pass | Notes |
| ---- | ----- |
| ☐    |       |

### 8 — Qualification document (regression)

1. Practitioner → Qualification documents → **Open** on uploaded file.
2. **Expect:** In-app **Document** WebView (not Safari).

| Pass | Notes |
| ---- | ----- |
| ☐    |       |

---

## Post-smoke SQL (Supabase MCP or SQL editor)

```sql
select id, checkout_session_id, status, created_at
from payments
where created_at > now() - interval '1 day'
order by created_at desc
limit 10;
```

**Pass criteria:** At least one row per exercised path (or documented webhook delay with retry on booking-success).

---

## Sign-off

| Role | Name | Date | Result                     |
| ---- | ---- | ---- | -------------------------- |
| QA   |      |      | ☐ Pass / ☐ Fail            |
| PM   |      |      | ☐ W1-5 cleared for release |
