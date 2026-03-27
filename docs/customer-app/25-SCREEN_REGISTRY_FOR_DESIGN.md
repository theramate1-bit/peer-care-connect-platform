# Screen registry — design & wireframe tracking

Use this table to **assign stable IDs** to screens for Figma pages, Jira, and QA. **Figma URL** is empty until assets exist.

**Wireframe reference:** [`24-SCREEN_WIREFRAMES_AND_LAYOUTS.md`](24-SCREEN_WIREFRAMES_AND_LAYOUTS.md)

| ID          | Screen name                      | Build ref | Priority | Figma / wireframe URL |
| ----------- | -------------------------------- | --------- | -------- | --------------------- |
| SCR-AUTH-01 | Login                            | A1        | P0       |                       |
| SCR-AUTH-02 | Register                         | A2        | P0       |                       |
| SCR-AUTH-03 | Forgot password                  | A3        | P1       |                       |
| SCR-AUTH-04 | Reset password confirm           | A4        | P1       |                       |
| SCR-AUTH-05 | Email verification               | A5        | P1       |                       |
| SCR-AUTH-06 | Role selection                   | A8        | P0       |                       |
| SCR-AUTH-07 | Auth callback (loading)          | A7        | P0       |                       |
| SCR-AUTH-08 | Registration success             | A6        | P1       |                       |
| SCR-AUTH-09 | OAuth completion (post-provider) | A9        | P1       |                       |
| SCR-AUTH-10 | Client onboarding                | A10       | P1       |                       |
| SCR-AUTH-11 | Stripe return (onboarding)       | A11       | P2       |                       |
| SCR-TAB-01  | Home / Dashboard                 | B1        | P0       |                       |
| SCR-TAB-02  | Sessions list                    | B2        | P0       |                       |
| SCR-TAB-03  | Session detail                   | B2        | P0       |                       |
| SCR-TAB-04  | Explore / Marketplace            | B3        | P0       |                       |
| SCR-TAB-05  | Messages list                    | B4        | P0       |                       |
| SCR-TAB-06  | Message thread                   | B4        | P0       |                       |
| SCR-TAB-07  | Profile                          | B5        | P0       |                       |
| SCR-BOOK-01 | Practitioner detail              | D1        | P0       |                       |
| SCR-BOOK-02 | Booking — service & slot         | D2        | P0       |                       |
| SCR-BOOK-03 | Pre-assessment                   | D8        | P0       |                       |
| SCR-BOOK-04 | Booking confirm                  | D2        | P0       |                       |
| SCR-BOOK-05 | Payment (PaymentSheet)           | D5        | P0       |                       |
| SCR-BOOK-06 | Booking success                  | D6        | P0       |                       |
| SCR-BOOK-07 | Hybrid chooser                   | D4        | P1       |                       |
| SCR-BOOK-08 | Mobile request flow              | D3        | P1       |                       |
| SCR-BOOK-09 | Mobile booking success           | D7        | P1       |                       |
| SCR-SEC-01  | Notifications                    | C1        | P1       |                       |
| SCR-SEC-02  | Settings root                    | C2        | P1       |                       |
| SCR-SEC-03  | Favorites                        | C5        | P1       |                       |
| SCR-SEC-04  | Progress                         | C6        | P1       |                       |
| SCR-SEC-05  | Goals                            | C7        | P1       |                       |
| SCR-SEC-06  | My exercises                     | C8        | P1       |                       |
| SCR-SEC-07  | Mobile requests                  | C10       | P1       |                       |
| SCR-SEC-08  | Settings — privacy & tools       | C3        | P2       |                       |
| SCR-SEC-09  | Settings — subscription          | C4        | P2       |                       |
| SCR-SEC-10  | Treatment plans                  | C9        | P2       |                       |
| SCR-SEC-11  | Find therapists                  | C11       | P2       |                       |
| SCR-GST-01  | Find booking                     | E3        | P1       |                       |
| SCR-GST-02  | Guest session view               | E4        | P1       |                       |
| SCR-GST-03  | Direct booking slug              | E1        | P1       |                       |
| SCR-GST-04  | Guest review                     | E5        | P2       |                       |
| SCR-GST-05  | Public therapist profile (guest) | E2        | P1       |                       |
| SCR-GST-06  | Guest mobile requests            | E6        | P2       |                       |
| SCR-MKT-01  | Landing (marketing)              | F1        | P2       |                       |
| SCR-MKT-02  | How it works (client)            | F2        | P2       |                       |
| SCR-MKT-03  | Pricing                          | F3        | P2       |                       |
| SCR-MKT-04  | Help / contact / legal           | F4        | P2       |                       |

---

## How to use

1. Create a **Figma page** “Customer mobile v1” with frames named **SCR-\***.
2. Paste **Figma frame links** into the table above (or in your design tool).
3. Link from [`17-DOCUMENTATION_GAPS_AND_TRACKER.md`](17-DOCUMENTATION_GAPS_AND_TRACKER.md) DG-02 when done.

---

## Revision

Add rows when new screens ship; never reuse deprecated IDs — append version suffix if replacing (e.g. `SCR-TAB-01-v2`).

| Date       | Change                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-26 | Added SCR-AUTH-08–11, SCR-BOOK-09, SCR-SEC-08–11, SCR-GST-05–06, SCR-MKT-01–04 (aligned with `16-MOBILE_SCREENS_BUILD_LIST.md`) |
