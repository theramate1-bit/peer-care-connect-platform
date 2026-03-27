# Two native codebases (important)

The monorepo can contain **two** Expo/React Native folders. Only one is **Theramate**.

| Folder                          | Role                                                                                                  | Theramate?                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **`theramate-ios-client/`**     | Expo app in **npm workspaces** (`package.json` root); `npm run typecheck:mobile` targets this package | **Yes — canonical** customer native app (iOS + Android).       |
| **`customer-app/`** (repo root) | Separate Expo app (`Localito Marketplace` in `app.config.js`); **not** in workspaces                  | **No** — different product; do not use for Theramate features. |

## Documentation rule

- **Product** docs (routes, parity, rules) → always under **`docs/customer-app/`** (this folder).
- **Theramate code** → **`theramate-ios-client/`** only.

## Choosing one codebase

**Decided:** **`theramate-ios-client/`** is the single canonical Theramate customer app. Ignore repo-root `customer-app/` unless you explicitly maintain Localito.

Update [`05-PARITY_MATRIX.md`](05-PARITY_MATRIX.md) when native parity changes; keep this file in sync if another Theramate native tree is ever added.
