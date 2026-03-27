# Deploy Localito Customer App to Google Play & App Store

## What's been done

1. **Expo project** – `localitomarketplace` / project ID `f9a5cfb7-50da-410c-a9fd-0cf39088577c`.
2. **Store version (1.0.6)** – Bump in `app.config.js` and `package.json` before each release:
   - **iOS:** `expo.version` + `ios.buildNumber` (must increase every App Store upload).
   - **Android:** `expo.version` + `android.versionCode` (integer must exceed Play Console’s highest).
3. **Deploy script** – `scripts/deploy-expo.ps1` (build + submit).

### Google Play non-interactive submit

Place your Play Console API JSON key at **`customer-app/google-play-service-account.json`** (gitignored). `eas.json` → `submit.production.android.serviceAccountKeyPath` points there. Then:

`npx eas-cli submit --platform android --profile production --latest --non-interactive`

Without that file, run **`npx eas-cli submit --platform android --profile production --latest`** once interactively and follow the prompts (or upload the key in [Expo credentials](https://expo.dev)).

## Current build status

View builds: https://expo.dev/accounts/localitomarketplace/projects/localito-marketplace/builds

## After Android build completes (~15–25 min)

### Submit to Google Play

```powershell
cd customer-app
npx eas-cli submit --platform android --profile production --latest
```

If asked for credentials, choose one of:

- **Use existing credentials** (if configured)
- **Create new service account** – follow EAS prompts

### Submit to Apple App Store

1. **First-time iOS setup** – run interactively:

   ```powershell
   npx eas-cli build --platform ios --profile production
   ```

   Then follow prompts for:
   - Apple Developer account
   - Distribution certificate
   - Provisioning profile

2. **Submit** (requires `ascAppId` + `appleTeamId` in `eas.json` submit profile — already set for Localito):

   ```powershell
   npx eas-cli submit --platform ios --profile production --latest --wait
   ```

   Non-interactive: add `--non-interactive` (needs App Store Connect API key on EAS — already configured).

3. **After upload** — Apple processes the build (~5–10 min). Then in [App Store Connect](https://appstoreconnect.apple.com/apps/6759418652/testflight/ios) assign the build to a TestFlight group or submit for App Review.

## Using the deploy script

```powershell
cd customer-app
.\scripts\deploy-expo.ps1                    # Build + submit
.\scripts\deploy-expo.ps1 -BuildOnly         # Build only
.\scripts\deploy-expo.ps1 -SubmitOnly        # Submit latest build
.\scripts\deploy-expo.ps1 -AndroidOnly       # Build Android only
```

## Notes

- **Owner change**: `app.config.js` owner is now `localitomarketplace` (replacing `localito-marketplace-ltd`) because of access rights. If you need the org project back, add this account to the `localito-marketplace-ltd` Expo org.
- **Push notifications**: The new project ID is used for Expo push tokens.
- **Android `versionCode` (Google Play)**: Must always be **greater** than the highest version code already in Play Console (check **Test and release → Latest releases and bundles**). `eas.json` uses `appVersionSource: "local"` and `app.config.js` sets `android.versionCode` so it does not drift below the store. With `app.config.js`, EAS does not support `autoIncrement` in the production profile — **manually bump `versionCode`** in `app.config.js` before each Play upload.
