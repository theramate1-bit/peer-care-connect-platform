# Fix: Stripe Connect / Tawk blocked by CSP

**If the "Complete Payment Setup" box is empty and the console shows "Failed to load Connect.js" or Tawk blocked, a strict Content-Security-Policy is being applied.** This doc explains where CSP comes from and how to fix it.

## Official: headers only from vercel.json (no Dashboard "Headers")

Per [Vercel's docs](https://vercel.com/docs/project-configuration/vercel-json#headers), **custom response headers (including CSP) are configured only via `vercel.json`** (or `vercel.ts`) in the repo. There is **no** "Settings → Headers" or "Response headers" UI in the Vercel Dashboard; [Project Settings](https://vercel.com/docs/projects/project-configuration/project-settings) lists General, Build and deployment, Domains, Environment Variables, Git, Integrations, Deployment Protection, Functions, Cron Jobs, Security, etc., but **not** Headers.

So you **cannot** "remove CSP in Vercel → theramate → Settings → Headers" — that path does not exist. If the live site sends a stricter CSP than this repo's `vercel.json`, the cause is one of the following.

---

## What this repo does

- **vercel.json** (both [peer-care-connect/vercel.json](../../peer-care-connect/vercel.json) and the repo root [vercel.json](../../vercel.json)) defines a **production-safe** `Content-Security-Policy` that includes **`https://connect-js.stripe.com`** in `script-src` and `script-src-elem`, plus `https://js.stripe.com`, `embed.tawk.to`, frame-src, connect-src, and related directives required for Stripe Connect and Tawk.
- If the **live site** still sends a **stricter** CSP (e.g. only `script-src 'self' 'unsafe-inline' https://js.stripe.com` with **no** `connect-js.stripe.com`), that policy is coming from somewhere other than "Dashboard Headers" — see below.

## Deploy from this folder (Vercel CLI)

From the directory that contains the `vercel.json` you want (e.g. `peer-care-connect`):

```bash
cd peer-care-connect
npx vercel --prod
```

If theramate is linked (e.g. via `vercel link`), production will use that directory's `vercel.json` (including the CSP that allows connect-js.stripe.com and Tawk).

## Vercel MCP and CLI

- **Vercel MCP** can read project info and deployments; it has **no tool to edit project headers**. Headers are defined only in `vercel.json` in the repo.
- **Vercel CLI** has no command to set or remove headers; headers come from `vercel.json`. Deploying with `vercel --prod` from the correct directory applies that directory's config.

## Dropdowns, modals, and UI components broken by CSP

If **dropdowns, selects, modals, popovers, or tooltips** do not open or behave correctly, and the browser console shows CSP violations (e.g. "Refused to apply inline style"), the policy is blocking **inline styles** required by Radix UI.

**Required directives for UI components:**

- **`style-src 'self' 'unsafe-inline';`** – Radix UI (dropdowns, dialogs, etc.) uses inline styles for positioning. If `style-src` is omitted, the browser falls back to `default-src 'self'`, which blocks inline styles and breaks these components.
- **`script-src`** must include `'self'` and `'unsafe-inline'` for the app bundle and the inline script in `index.html`.

The repo’s [peer-care-connect/vercel.json](../../peer-care-connect/vercel.json) already includes these directives. The root [vercel.json](../../vercel.json) has been updated to include `style-src 'self' 'unsafe-inline'` so that if the root config is used, dropdowns still work.

**Fix:** Ensure the deployment uses the app’s `vercel.json` (see Root Directory below) and that no stricter **Content-Security-Policy** override is applied in **Vercel Team Settings → Security** (or Firewall). Remove or relax any such override so the repo policy is used.

**Verification:** After deployment, open dropdowns, selects, modals, and popovers on key pages (e.g. Profile, Practice Client Management, navigation). In DevTools → Console there should be no CSP violations ("Refused to apply inline style…"). In DevTools → Network → first document request → Response Headers, confirm **Content-Security-Policy** includes `style-src 'self' 'unsafe-inline'`.

## Why the live site might still send a stricter CSP

1. **Wrong Root Directory** – In Vercel: **Settings → General → Root Directory**. If the project is set to the repo root but the app that serves theramate.co.uk is built from `peer-care-connect/`, set Root Directory to **`peer-care-connect`** so a single `vercel.json` controls headers (and so the full CSP including `style-src 'self' 'unsafe-inline'` is applied).
2. **Framework or build step** – The app or a plugin might inject a CSP. Check for `Content-Security-Policy` in `index.html`, server middleware, or build config.
3. **Security / Firewall** – In **Settings → Security** (and Team settings), check for rules that might add or override response headers. If a **Content-Security-Policy** header is set there and is stricter than the repo (e.g. no `style-src` or no `'unsafe-inline'`), remove it or align it with the repo so dropdowns and UI work.

After changing Root Directory or code: **Redeploy** (Deployments → … on latest → Redeploy). Then hard-refresh https://theramate.co.uk/onboarding (Ctrl+Shift+R / Cmd+Shift+R).

**Removed:** The doc previously said to remove CSP in "Vercel → theramate → Settings → Headers". That path does not exist; Vercel configures response headers only via `vercel.json` in the repo (see [vercel.json#headers](https://vercel.com/docs/project-configuration/vercel-json#headers)). If the live site still sends a stricter CSP, use the causes above (Root Directory, framework, Security/Firewall) to fix it.

## Proxy workaround (no CSP change needed)

If you cannot get the desired CSP to apply, the app already loads Stripe Connect and Tawk via **same-origin proxies** so they are not blocked by a strict `script-src`:

- **Stripe Connect**: loaded via `/api/proxy/connect` (see [EmbeddedStripeOnboarding](../../peer-care-connect/src/components/onboarding/EmbeddedStripeOnboarding.tsx)).
- **Tawk**: loaded via `/api/proxy/tawk?widget=...` (see [LiveChat](../../peer-care-connect/src/components/LiveChat.tsx)).

Ensure the project's Root Directory and rewrites serve `/api/*` from the app (e.g. `peer-care-connect/vercel.json` rewrites exclude `/api` from the SPA fallback). After a redeploy, onboarding and chat should work even under a strict CSP.

## CORS error on stripe-payment

If you see:

`Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header`

then the **OPTIONS** preflight to `https://…supabase.co/functions/v1/stripe-payment` is getting a response without CORS headers.

**Causes and fixes:**

1. **Function not deployed or old version**  
   Redeploy the `stripe-payment` Edge Function (it returns full CORS headers and handles OPTIONS with `204` and `Access-Control-Allow-*`). From repo root:  
   `supabase functions deploy stripe-payment`

2. **OPTIONS blocked before the function runs**  
   If the function is set to **require authentication**, the Supabase gateway can respond to OPTIONS with 401 (no `Authorization` header on preflight). That response often has no CORS headers, so the browser fails the preflight.  
   In **Supabase Dashboard → Edge Functions → stripe-payment**: ensure the function can be **invoked by anon** for OPTIONS, or turn off "Enforce JWT" for this function if you rely on CORS from the app origin (theramate.co.uk). The function itself still validates the JWT for POST requests inside the handler.

3. **Verify CORS from the function**  
   The handler returns `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` on every response and uses status `204` for OPTIONS. After redeploying, hard-refresh the app and check the Network tab: the OPTIONS request to `stripe-payment` should show these headers in the response.
