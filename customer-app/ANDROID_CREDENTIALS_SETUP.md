# Android Keystore Setup (Play Store Signing)

**Production (current):** **`credentialsSource: "local"`** + **`EAS_USE_LOCAL_ANDROID_KEYSTORE=1`**. The build must use the **same upload key** Google Play expects (SHA-1 in Play Console → App integrity). That file is **`credentials/play-upload-keystore.jks`** (gitignored; included via `.easignore` `!credentials/`).

1. Find the `.jks` whose SHA-1 matches Play: `.\scripts\find-play-upload-keystore.ps1` (add `-Paths` for USB/backups).
2. Copy it to **`credentials/play-upload-keystore.jks`**.
3. Run **`.\scripts\setup-play-upload-keystore.ps1`** to push `ANDROID_KEY_*` + `EAS_USE_LOCAL_ANDROID_KEYSTORE` to EAS production env.
4. **`eas build --platform android --profile production`**

Fingerprint reference: **`android-signing/PLAY_UPLOAD_KEY.md`**.

Optional: set secret **`ANDROID_KEYSTORE_REL_PATH`** only if the keystore lives at a different path (default `credentials/play-upload-keystore.jks`).

## Troubleshooting: "Keystore was tampered with" / "alias does not exist"

If EAS build fails at `signReleaseBundle` with:

- `Failed to read key upload from store: Keystore was tampered with, or password was incorrect`
- `The alias specified for this keystore does not exist`

1. **Find the correct alias:**

   ```powershell
   .\scripts\list-keystore-alias.ps1
   ```

   Enter the keystore password when prompted. Look for `Alias name:` in the output.

2. **Update EAS secrets** to match the keystore:

   ```powershell
   npx eas-cli env:create ANDROID_KEY_ALIAS --value "YOUR_ACTUAL_ALIAS" --environment production
   npx eas-cli env:create ANDROID_KEYSTORE_PASSWORD --value "YOUR_KEYSTORE_PASSWORD" --environment production --visibility sensitive
   npx eas-cli env:create ANDROID_KEY_PASSWORD --value "YOUR_KEY_PASSWORD" --environment production --visibility sensitive
   ```

3. **If using `credentials.json`:** Ensure `keyAlias`, `keystorePassword`, and `keyPassword` match exactly.

4. **Ensure keystore is uploaded:** The `credentials/` folder and `credentials.json` must be included (`.easignore` has `!credentials/` and `!credentials.json`). Run `eas build` from the machine that has `credentials/localito-marketplace.jks` locally.

5. **If using remote EAS credentials:** Run `npx eas-cli credentials --platform android` and choose "Remove" for the existing keystore, then set up local credentials again, or ensure the keystore in EAS matches your Play Store key.

## Quick setup (keystore already in place)

**Option A – Interactive (recommended):**

```powershell
cd customer-app
.\scripts\setup-android-eas-complete.ps1
```

You'll be prompted for the keystore password. The script reads the alias and sets all EAS secrets.

**Option B – Non-interactive (env vars):**

```powershell
cd customer-app
$env:ANDROID_KEYSTORE_PASSWORD="your-password"
$env:ANDROID_KEY_ALIAS="upload"   # or run list-keystore-alias.ps1 to confirm
$env:ANDROID_KEY_PASSWORD="your-key-password"
.\scripts\setup-android-from-env.ps1
```

Then build and submit:

```powershell
npx eas-cli build --platform android --profile production
npx eas-cli submit --platform android --profile production --latest
```

## Option 1: EAS Secrets (recommended for CI)

1. Add these **Secrets** in [Expo Dashboard](https://expo.dev/accounts/localitomarketplace/projects/localito-marketplace/credentials) → **Secrets**:
   - `ANDROID_KEYSTORE_PASSWORD` – keystore password
   - `ANDROID_KEY_ALIAS` – key alias (e.g. `upload`, `key0`, `release`)
   - `ANDROID_KEY_PASSWORD` – key password

2. Or via CLI:

   ```powershell
   cd customer-app
   npx eas-cli env:create ANDROID_KEYSTORE_PASSWORD --value "YOUR_PASSWORD" --environment production --visibility sensitive
   npx eas-cli env:create ANDROID_KEY_ALIAS --value "upload" --environment production
   npx eas-cli env:create ANDROID_KEY_PASSWORD --value "YOUR_KEY_PASSWORD" --environment production --visibility sensitive
   ```

3. The `eas-build-pre-install` hook will create `credentials.json` from these secrets during the build.

## Option 2: Local credentials.json

1. Create `credentials.json` in the `customer-app` folder:

   ```powershell
   .\scripts\create-credentials-json.ps1
   ```

   (You’ll be prompted for keystore password, key alias, and key password.)

2. Or copy from the example:
   ```powershell
   copy credentials.json.example credentials.json
   ```
   Then edit and set real values for:
   - `keystorePassword`
   - `keyAlias`
   - `keyPassword`

## Build & Submit

```powershell
cd customer-app
npx eas-cli build --platform android --profile production
npx eas-cli submit --platform android --profile production --latest
```

Or use the script:

```powershell
.\scripts\build-android-production.ps1 -Submit
```
