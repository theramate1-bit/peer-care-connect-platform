# Client — profile, onboarding & settings

## Web

| File                                            | Role                                                                                                                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`src/pages/onboarding/ClientOnboarding.tsx`** | Multi-step client onboarding (personal, health, preferences, goals). Uses **`useAuth`** from **`@/contexts/AuthContext`** — ensure the web shell provides that provider wherever this page is mounted. |

## Native (`app/(tabs)/profile/`)

Representative screens:

| Area                                | Files                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Profile home / edit                 | **`profile/index.tsx`**, **`profile/edit-profile.tsx`**, **`profile/settings.tsx`**          |
| Privacy / security                  | **`profile/privacy-security.tsx`**                                                           |
| Notifications                       | **`profile/notifications.tsx`**                                                              |
| Payment methods                     | **`profile/payment-methods.tsx`**                                                            |
| Credits                             | **`profile/credits.tsx`**                                                                    |
| Treatment plans / exercises / goals | **`profile/treatment-plans/*`**, **`profile/exercises/*`**, **`profile/progress-goals.tsx`** |
| Help                                | **`profile/help-centre.tsx`**                                                                |

## Role selection

**`app/(auth)/role-selection.tsx`** — choosing **`user_role: "client"`** vs practitioner variants.

## Practitioner parity

Some **`profile/*`** screens are **re-exported** under **`app/(practitioner)/(ptabs)/profile/`** so practitioners can open the same stack (see thin `export { default } from ...` files).
