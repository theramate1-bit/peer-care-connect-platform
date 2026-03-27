# Mobile customer app — UI & UX foundations (BMAD-aligned)

This document translates **BMAD BMM “Create UX Design”** concerns into **actionable foundations** for the **native customer app** (Expo / React Native). It is **not** a substitute for running the full interactive workflow (`_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md`), which produces a collaborative **UX Design Specification** artifact. Use this as **engineering-ready guidance** and **input** to that workflow.

**BMAD reference steps:** Design system (6), Visual foundation (8), Component strategy (11), UX patterns (12), Responsive & accessibility (13).

---

## 1. Design intent (BMAD: core experience + emotional tone)

| Dimension   | Direction                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| **Product** | Healthcare booking + wellness — **trust**, **calm**, **clarity** over novelty.                               |
| **Feel**    | Modern, **soft** (cream/sage palette already in native tokens), **low anxiety** for clinical-adjacent tasks. |
| **Motion**  | **Purposeful** — feedback on tap, smooth transitions between steps; avoid distracting loops.                 |
| **Voice**   | Short sentences, **reassuring** copy on payments and health data.                                            |

---

## 2. Visual foundation (BMAD Step 8)

### 2.1 Color

**Native source of truth today:** `theramate-ios-client/constants/colors.ts` — cream background, **sage** primary, **terracotta** secondary, **charcoal** text, semantic success/warning/error.

**Web source:** Tailwind + CSS variables in `peer-care-connect` (green-tinted header for clients, etc.).

| Principle            | Rule                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Semantic mapping** | `primary` = booking / main CTA; `secondary` = alternate actions; **never** rely on raw hex in screens — use semantic tokens. |
| **Contrast**         | Body text vs background **≥ WCAG AA** (4.5:1 for normal text); validate sage-on-cream and charcoal on cream.                 |
| **States**           | Every interactive color has **pressed** / **disabled** (see `LightTheme` in `colors.ts`).                                    |

**Gap:** Unify naming with web (`primary` vs `sage-500`) via a shared doc table or shared package — see [`17-DOCUMENTATION_GAPS_AND_TRACKER.md`](17-DOCUMENTATION_GAPS_AND_TRACKER.md) UX-01.

### 2.2 Typography

**Web (`peer-care-connect/tailwind.config.ts`):** **Inter Variable** as sans; rich **clamp()** scale with `mobile-*` sizes; **4px-based** rhythm; line-heights tuned for readability.

**Native (`theramate-ios-client`):** **Outfit** (Regular, Medium, SemiBold, Bold) loaded in `app/_layout.tsx`.

| Principle     | Recommendation                                                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alignment** | **Choose one:** (A) adopt **Inter** on native via `expo-font` + `@expo-google-fonts/inter` for parity with web, or (B) keep **Outfit** and document **brand exception** (web + native intentionally different). **Do not** mix both without a system. |
| **Scale**     | Mirror web **levels**: Display / H1–H3 / Body / Caption / Overline. Map to RN `Text` `style` or NativeWind classes with fixed **lineHeight** per level.                                                                                               |
| **Hierarchy** | **One** primary action per screen (weight + color); secondary actions **outline** or **ghost**.                                                                                                                                                       |
| **Numbers**   | Tabular figures for **prices** and **times** if font supports them; otherwise consistent monospace for money.                                                                                                                                         |

**Minimum sizes (touch + legibility):** Body **≥ 16px** equivalent on iOS; avoid long paragraphs on mobile — chunk with headings.

### 2.3 Spacing & layout

**Web:** Tailwind `spacing` scale — **4px base** (`1` = 4px); container padding responsive.

**Native:**

| Token                         | Use                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| **4 / 8 / 12 / 16 / 24 / 32** | Default rhythm (same as web base unit)                                                             |
| **Screen padding**            | 16–20px horizontal; respect **safe area** (`SafeAreaView` / `useSafeAreaInsets`).                  |
| **Cards**                     | 12–16px internal padding; 8–12px gap between stacked cards.                                        |
| **Lists**                     | Minimum **44×44 pt** row height for tappable rows (Apple HIG); Android **48dp** minimum touch.     |
| **Bottom tab bar**            | Account for **home indicator**; avoid placing primary CTAs under thumb dead zones without padding. |

### 2.4 Grid & density

- **Mobile-first:** single column; **two columns** only for stats or image+text on large phones.
- **Breathing room:** prefer **slightly airy** over dense — healthcare UX; match web’s generous container padding where possible.

---

## 3. Component strategy (BMAD Step 11)

| Layer           | Approach                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **Primitives**  | `Button`, `Input`, `Card`, `Avatar` — already started under `theramate-ios-client/components/ui/`.       |
| **Composition** | Screen = layout + sections; **lists** use `FlashList` / `FlatList` for performance.                      |
| **Forms**       | `react-hook-form` + **zod** (already in deps) — same pattern as web.                                     |
| **Sheets**      | Booking flows: **modal stack** or **full-screen** steps; **Stripe** PaymentSheet as system UI.           |
| **Feedback**    | **Toast** (e.g. `sonner` equivalent on RN or `react-native-toast-message`), loading skeletons for lists. |

---

## 4. UX patterns (BMAD Step 12)

| Pattern             | Native behavior                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Navigation**      | **Bottom tabs** for P0 surfaces (Home, Sessions, Explore, Messages, Profile) + **stack** for settings, booking, auth. |
| **Back**            | Platform **back** (Android) + **swipe from edge** (iOS) — consistent with stack.                                      |
| **Pull to refresh** | Lists (sessions, marketplace) — match web’s expectation of updated data.                                              |
| **Empty states**    | Illustration or icon + **one** sentence + **primary CTA** (e.g. “Browse marketplace”).                                |
| **Errors**          | **Network** vs **validation** vs **permission** — different copy; never raw Supabase errors to users.                 |
| **Booking**         | **Step indicator** if multi-step; allow **save progress** where possible (aligns with web `BookingFlow`).             |

---

## 5. Responsive & accessibility (BMAD Step 13)

| Topic                      | Rule                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Breakpoints**            | RN: **screen width** hooks — adapt **two-column** only above ~768px if needed (tablet).                           |
| **Dynamic type**           | Respect **iOS Dynamic Type** / Android font scale where feasible (`allowFontScaling`, max scale caps for layout). |
| **Touch**                  | Min **44pt** targets; **8px+** between adjacent destructive actions.                                              |
| **Focus / screen readers** | `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` on icons and CTAs.                                 |
| **Motion**                 | Respect **Reduce Motion** (`prefers-reduced-motion` equivalent via `AccessibilityInfo` on RN).                    |
| **Color alone**            | Never rely on color only for status — add **icon** or **label**.                                                  |

---

## 6. Motion & polish (smooth experience)

| Use                   | Guideline                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| **Screen transition** | `slide_from_right` (stack) already in `_layout`; keep **duration** ~250–300ms.                          |
| **Tab switch**        | Subtle or instant; avoid heavy cross-fades on every tap.                                                |
| **Press**             | `opacity` or `scale` 0.98 on pressable cards (Reanimated).                                              |
| **Lists**             | **Stagger** first paint optional; avoid layout jump when images load — fixed aspect ratio placeholders. |

---

## 7. Alignment with web (TheraMate)

| Area                   | Action                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| **Colors**             | Map `Colors.sage` / `cream` to web primary/background in a **single table** (owner: design or FE). |
| **Typography**         | Decide Inter vs Outfit; then **document** in Storybook / Storybook-for-RN or MD table.             |
| **Components**         | Shadcn patterns on web → **similar affordances** on native (card elevation, button radius).        |
| **Design system page** | Web `/design-system` — use as **reference** for native QA checklists.                              |

---

## 8. Next step (BMAD formal artifact)

To produce a **stakeholder-reviewed UX spec** (not just dev foundations):

1. Run **`_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md`** with the BMAD UX agent / facilitator.
2. Store output using **`ux-design-template.md`** as a base.
3. Link the artifact from [`README.md`](README.md) and [`17-DOCUMENTATION_GAPS_AND_TRACKER.md`](17-DOCUMENTATION_GAPS_AND_TRACKER.md) DG-01.

---

## Related docs

- [`12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md`](12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md)
- [`15-MOBILE_PLATFORM_READINESS.md`](15-MOBILE_PLATFORM_READINESS.md)
- [`16-MOBILE_SCREENS_BUILD_LIST.md`](16-MOBILE_SCREENS_BUILD_LIST.md)
- [`17-DOCUMENTATION_GAPS_AND_TRACKER.md`](17-DOCUMENTATION_GAPS_AND_TRACKER.md)
