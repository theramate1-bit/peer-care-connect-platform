# Universal Links / App Links templates

Use these files on every production host used by mobile links (`theramate.com`, `www.theramate.com`, and any `EXPO_PUBLIC_WEB_URL` host used for release builds).

## 1) iOS: `/.well-known/apple-app-site-association`

Serve **without** `.json` extension and with `application/json` content type.

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "<APPLE_TEAM_ID>.com.theramate.client",
        "paths": [
          "/book/*",
          "/booking/*",
          "/review*",
          "/guest/mobile-requests*",
          "/auth/*",
          "/oauth-callback*",
          "/mobile-booking/*",
          "/onboarding/*",
          "/booking-success*"
        ]
      }
    ]
  }
}
```

## 2) Android: `/.well-known/assetlinks.json`

`package_name` must match Expo config (`com.theramate.client`).  
Add your real release cert fingerprint(s) from Play Console or `keytool`.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.theramate.client",
      "sha256_cert_fingerprints": ["<RELEASE_CERT_SHA256_FINGERPRINT>"]
    }
  }
]
```

## 3) Quick verification commands

```bash
curl -I https://theramate.com/.well-known/apple-app-site-association
curl -I https://theramate.com/.well-known/assetlinks.json
curl -I https://www.theramate.com/.well-known/apple-app-site-association
curl -I https://www.theramate.com/.well-known/assetlinks.json
```

## 4) Notes

- iOS links only verify on installed builds signed with matching team/bundle.
- Android App Links require `autoVerify` (already set in app config) + valid hosted `assetlinks.json`.
- Rebuild native binaries after changing associated domains / intent filters.
