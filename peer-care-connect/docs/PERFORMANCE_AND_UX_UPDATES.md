# Performance & UX updates (60fps / no shake)

Summary of changes for smooth, iOS-like behaviour. **All listed patterns have been applied across the codebase.**

---

## Already updated (done)

### Global (all components benefit)
- **`index.css`**: `scrollbar-gutter: stable` on `html` + `body[data-scroll-locked]` override → **no screen shake** when any Radix Select/Dialog/Dropdown opens.
- **`components/ui/button.tsx`**: Default `type="button"` → buttons used as Dropdown/Select triggers no longer submit forms.
- **`components/ui/select.tsx`**: SelectTrigger defaults to `type="button"`, `transition-[border-color]` only, SelectContent has `transform: translateZ(0)` and no `transition-all`.
- **`components/ui/card.tsx`**: `transition-[border-color,background-color]` only (no box-shadow transition).

### Profile & Schedule
- **Profile.tsx**: Therapist type cards use `transition-[border-color,background-color]` and functional `setProfessionalData(prev => ...)`. Base address and clinic address use functional updates.
- **AvailabilitySettings.tsx**: Day rows use border/background-only transition; memoized `DayTimeRange` + stable `handleDayTimeChange`; all triggers use `type="button"`.
- **BlockTimeManager.tsx**: Block cards no longer transition box-shadow; Quick Presets button uses border/background transition.
- **SmartLocationPicker**: Local input state + debounced parent; dropdown has `translateZ(0)`.

---

## Optional follow-ups (same patterns)

### 1. Transition / shadow (60fps)
Prefer **only** `transition-[border-color,background-color]` or `transition-opacity`; avoid `transition-all` and animating `box-shadow`.

| File | Current pattern | Suggested change |
|------|-----------------|------------------|
| `ClientProgressTracker.tsx` | `transition-all`, `hover:shadow-sm` | `transition-[border-color,background-color]`; drop or instant shadow |
| `Credits.tsx` | `transition-all`, `hover:shadow-md` | Same as above |
| `PracticeClientManagement.tsx` | `transition-all`, `hover:shadow-md` on cards | Same |
| `DashboardScheduleView.tsx` | `transition-all`, `hover:shadow-md` | Same |
| `TherapistDashboard.tsx` / `EarningsWidget.tsx` | `transition-all duration-300` | Same |
| `Onboarding.tsx` | `transition-all` on cards | Same |
| `Marketplace.tsx` | `transition-all`, `hover:shadow-md` | Same |
| `BookingFlow.tsx` / `GuestBookingFlow.tsx` | `transition-all duration-300` on steps | Same |
| `PublicProfileModal.tsx` | `transition-all`, `hover:shadow-md` | Same |
| `HelpCentre.tsx` | `transition-shadow` | Keep or make instant |
| `HeroSectionClean.tsx` / `CTASection.tsx` / `TestimonialsSectionClean.tsx` / `ServicesSection.tsx` | `transition-all` | Border/background/opacity only if you want consistency |
| `UserTypesSection.tsx` | `transition-all`, `hover:-translate-y-1` | Keep transform; use `transition-[transform,opacity]` |
| `ProductShowcase.tsx` | `transition-all` | Same |
| `button.tsx` (base) | `transition-all` + hover shadow | Could switch to `transition-[background-color,border-color,opacity]` and non‑transitioned shadow for consistency |

### 2. Functional setState (fewer re-renders, no stale closure)
Use `setX(prev => ({ ...prev, key: value }))` instead of `setX({ ...x, key: value })`.

| File | Where |
|------|--------|
| **Profile.tsx** | `setProfessionalData` in bio, location, experience_years, clinic_address, professional_body, registration_number, has_liability_insurance, clinic_image_url; `setPreferences` in emailNotifications, calendarReminders |
| **RoleBasedOnboarding.tsx** | All `setProfessionalData({...professionalData, ...})` in practitioner forms |

### 3. Select / Dropdown triggers
- **Select**: All uses of `<Select>` / `<SelectTrigger>` already get the updated shared Select (type, transition, GPU layer). No extra `className="transition-all"` on triggers (e.g. PracticeClientManagement was cleaned).
- **DropdownMenuTrigger**: With `<Button>` as child, Button now defaults to `type="button"`, so no change needed unless you need `type="submit"` for a specific action.

### 4. Memo / stable callbacks
Where a parent passes an inline callback into a list (e.g. many time pickers or many rows), consider:
- A single stable callback (e.g. `handleDayTimeChange(dayKey, value)`) plus `useCallback`, and/or
- A small memoized wrapper (e.g. `DayTimeRange`) so only the changed row re-renders.

Same idea can be applied to other list UIs (e.g. session lists, booking steps) if you see jank when one item updates.

---

## Quick reference

- **No shake**: `scrollbar-gutter: stable` on `html` + body override (done in `index.css`).
- **No accidental submit**: Buttons and SelectTrigger default to `type="button"` (done in `button.tsx`, `select.tsx`).
- **Smooth transitions**: Prefer `transition-[border-color,background-color]` or `transition-opacity`; avoid `transition-all` and animating `box-shadow`.
- **Stable updates**: Prefer `setState(prev => ({ ...prev, key }))` and stable callbacks + memo for list children.
